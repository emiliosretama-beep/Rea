// Piezas de la versión online que se pueden probar en Node: validador de
// formato, IA vía `sample` (simulada), guardado en `db` (simulada) con turno
// entre dispositivos, y el investigador sin búsqueda web.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudLLM } from "../src/cloud/llm-cloud.js";
import { openCloudStore } from "../src/cloud/store.js";
import { materialSources, trendResearcher } from "../src/agents/trend-researcher.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";
import { pruneToSchema, validateSchema } from "../src/schema.js";
import { CHANNEL, makeFactory, tasksOf } from "./helpers.js";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["n", "tags"],
  properties: {
    n: { type: "integer" },
    tags: { type: "array", items: { type: "string", enum: ["a", "b"] } },
    ref: { anyOf: [{ type: "integer" }, { type: "null" }] },
  },
};

test("validador de schema: tipos, requeridos, enum, anyOf y limpieza", () => {
  assert.deepEqual(validateSchema({ n: 1, tags: ["a"], ref: null }, SCHEMA), []);
  const errors = validateSchema({ n: "1", tags: ["c"], ref: "x" }, SCHEMA);
  assert.equal(errors.length, 3);
  assert.match(validateSchema({ tags: [] }, SCHEMA)[0], /n: falta/);
  assert.deepEqual(pruneToSchema({ n: 1, tags: [], extra: true }, SCHEMA), { n: 1, tags: [] });
});

function fakeSample(answers) {
  const calls = [];
  const fn = async (input, opts) => {
    calls.push({ kind: "text", input, opts });
    return { text: answers.shift(), truncated: false };
  };
  fn.json = async (input, opts) => {
    calls.push({ kind: "json", input, opts });
    const next = answers.shift();
    if (next instanceof Error || next?.code) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
}

test("IA online: valida el JSON, corrige UNA vez y nunca reintenta errores de sample", async () => {
  const sample = fakeSample([{ n: "mal", tags: [] }, { n: 2, tags: ["a"], extra: 1 }]);
  const llm = cloudLLM(sample);
  assert.equal(llm.webSearch, false);
  assert.deepEqual(await llm.json({ name: "t", prompt: "p", schema: SCHEMA }), { n: 2, tags: ["a"] });
  assert.equal(sample.calls.length, 2);
  assert.match(sample.calls[1].input, /Corrección[\s\S]*se esperaba integer/);
  assert.equal(sample.calls[0].opts.cache, false);
  assert.equal("name" in sample.calls[0].opts, false);

  const twiceBad = cloudLLM(fakeSample([{ n: "x", tags: [] }, { n: "y", tags: [] }]));
  await assert.rejects(twiceBad.json({ name: "t", prompt: "p", schema: SCHEMA }), /formato esperado/);

  const limited = fakeSample([{ code: "rate_limited", message: "x" }]);
  await assert.rejects(cloudLLM(limited).json({ name: "t", prompt: "p", schema: SCHEMA }), (e) => {
    assert.equal(e.retryable, false);
    assert.match(e.message, /límite de uso/);
    return true;
  });
  assert.equal(limited.calls.length, 1, "un error de sample no se reintenta");

  const denied = fakeSample([{ code: "not_granted", message: "x" }]);
  await assert.rejects(cloudLLM(denied).json({ name: "t", prompt: "p", schema: SCHEMA }), (e) => e.kind === "config");

  const research = await cloudLLM(fakeSample(["Notas"])).research({ name: "r", prompt: "p" });
  assert.deepEqual(research, { text: "Notas", sources: [] });
});

// Base de datos de claude.ai simulada: documentos por ruta y un lease.
function fakeDb() {
  const docs = new Map();
  const leases = new Map();
  const writes = [];
  let clock = 0;
  const snap = (path) => ({
    id: path.split("/").at(-1),
    exists: docs.has(path),
    data: () => (docs.has(path) ? structuredClone(docs.get(path)) : undefined),
  });
  return {
    docs,
    writes,
    advance: (ms) => (clock += ms),
    doc: (path) => ({
      get: async () => snap(path),
      set: async (data) => {
        writes.push(path);
        docs.set(path, structuredClone(data));
      },
      delete: async () => {
        writes.push(`delete ${path}`);
        docs.delete(path);
      },
      acquire: async ({ holder, ttlMs }) => {
        const lease = leases.get(path);
        if (lease && lease.holder !== holder && lease.until > clock) return { acquired: false };
        leases.set(path, { holder, until: clock + ttlMs });
        return { acquired: true };
      },
    }),
    collection: (path) => ({
      get: async () => ({
        docs: [...docs.keys()]
          .filter((k) => k.startsWith(`${path}/`) && k.split("/").length === path.split("/").length + 1)
          .map(snap),
      }),
    }),
  };
}

test("guardado online: cada cambio llega a la nube y se recupera al reabrir", async () => {
  const db = fakeDb();
  const store = await openCloudStore({ db, userId: "u1", holder: "A" });
  const { memory, saver } = await store.open();
  const channel = memory.createChannel(CHANNEL);
  const production = memory.createProduction({
    channelId: channel.id,
    title: "Video",
    steps: [{ agentId: "trend-researcher", requiresApproval: false }],
  });
  memory.addLog({ productionId: production.id, message: "hola" });
  memory.updateTask(memory.listTasks(production.id)[0].id, { status: "done", output: { ok: 1 } });
  await saver.flushNow();
  assert.ok(db.docs.has(`data/users/u1/channels/${channel.id}`));
  // Una ráfaga de cambios en la producción = una sola escritura de ese documento.
  assert.equal(db.writes.filter((w) => w.endsWith(production.id)).length, 1);

  const again = await (await openCloudStore({ db, userId: "u1", holder: "B" })).open();
  assert.equal(again.memory.getChannel(channel.id).name, CHANNEL.name);
  assert.equal(again.memory.listTasks(production.id)[0].output.ok, 1);
  assert.equal(again.memory.listLogs({ productionId: production.id })[0].message, "hola");

  memory.deleteChannel(channel.id);
  await saver.flushNow();
  assert.equal(db.docs.has(`data/users/u1/productions/${production.id}`), false);
  saver.stop();
});

test("turno entre dispositivos: solo uno trabaja hasta que el otro lo suelta", async () => {
  const db = fakeDb();
  const iphone = await openCloudStore({ db, userId: "u1", holder: "iphone" });
  const ipad = await openCloudStore({ db, userId: "u1", holder: "ipad" });
  assert.equal(await iphone.takeTurn(), true);
  assert.equal(await ipad.takeTurn(), false);
  assert.equal(await iphone.takeTurn(), true, "renovar el propio turno");
  db.advance(60_000); // el iPhone se cerró y dejó de renovar
  assert.equal(await ipad.takeTurn(), true);
  assert.equal(await iphone.takeTurn(), false);
});

test("material aportado: cada línea es una fuente, con su enlace si lo trae", () => {
  const sources = materialSources(
    "1. Video de MrX sobre chips https://youtube.com/watch?v=abc\n\n- Noticia: Apple anuncia algo\nok\n",
  );
  assert.deepEqual(sources, [
    { url: "https://youtube.com/watch?v=abc", title: "Video de MrX sobre chips", kind: "usuario" },
    { url: null, title: "Noticia: Apple anuncia algo", kind: "usuario" },
  ]);
});

test("sin búsqueda web: las ideas sin fuente pasan con aviso y el material se cita", async (t) => {
  const structure = structuredClone(MOCK_FIXTURES["trends.structure"]);
  for (const item of [...structure.trends, ...structure.ideas]) item.sourceIds = [];
  structure.ideas[0].sourceIds = [1];
  const { factory, llm } = await makeFactory({
    fixtures: { "trends.research": { text: "Notas sin internet", sources: [] }, "trends.structure": structure },
  });
  t.after(() => factory.close());
  llm.webSearch = false;
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({
    channelId: channel.id,
    material: "Video viral sobre IA https://youtube.com/watch?v=xyz",
  });
  await factory.orchestrator.idle();
  const research = tasksOf(factory, production.id)["trend-researcher"];
  assert.equal(research.status, "done");
  assert.equal(research.output.dataSources.webSearch, false);
  assert.equal(research.output.sources[0].kind, "usuario");
  assert.ok(research.review.warnings.some((w) => /conocimiento general/.test(w)));
  const prompt = llm.calls.find((c) => c.name === "trends.research").prompt;
  assert.match(prompt, /No tienes acceso a internet/);
  assert.match(prompt, /Video viral sobre IA/);

  // Con búsqueda web, la misma falta de fuentes sí bloquea.
  const strict = trendResearcher.validate({ ...research.output, dataSources: { webSearch: true } });
  assert.ok(strict.issues.some((i) => /no cita ninguna fuente/.test(i)));
});
