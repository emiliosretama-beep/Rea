import assert from "node:assert/strict";
import { test } from "node:test";
import { LLMError } from "../src/llm.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";
import { CHANNEL, chooseThumbnail, makeFactory, tasksOf } from "./helpers.js";

test("la cadena avanza sola hasta el guion y espera aprobación", async (t) => {
  const { factory, llm, events } = await makeFactory();
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();

  const tasks = tasksOf(factory, production.id);
  assert.equal(tasks["trend-researcher"].status, "done");
  assert.equal(tasks["audience-analyst"].status, "done");
  assert.equal(tasks.scriptwriter.status, "awaiting_approval");
  assert.equal(factory.db.getProduction(production.id).status, "awaiting_approval");
  // El título del video lo decide el guionista.
  assert.match(factory.db.getProduction(production.id).title, /Idea de video 1/);
  // Las fuentes las pone el código a partir de la búsqueda, numeradas.
  assert.deepEqual(
    tasks["trend-researcher"].output.sources.map((s) => s.id),
    [1, 2, 3],
  );
  // Los datos sin respaldo llegan como avisos, no bloquean.
  assert.ok(tasks.scriptwriter.review.warnings.some((w) => w.includes("sin respaldo")));
  assert.deepEqual(
    llm.calls.map((c) => c.name),
    ["trends.research", "trends.structure", "audience.analyze", "script.write", "script.factcheck"],
  );
  assert.ok(events.some((e) => e.type === "task" && e.payload.status === "running"));

  factory.orchestrator.approve(tasks.scriptwriter.id);
  await factory.orchestrator.idle();
  // Tras el guion, el narrador genera la voz y vuelve a esperar tu aprobación.
  const narration = tasksOf(factory, production.id).narrator;
  assert.equal(narration.status, "awaiting_approval");
  factory.orchestrator.approve(narration.id);
  await factory.orchestrator.idle();
  // Después, 10 miniaturas: aprobar exige elegir una.
  const thumbs = tasksOf(factory, production.id)["thumbnail-designer"];
  assert.equal(thumbs.status, "awaiting_approval");
  assert.equal(thumbs.output.proposals.length, 10);
  assert.throws(() => factory.orchestrator.approve(thumbs.id), /Elige una miniatura/);
  chooseThumbnail(factory, thumbs, 3);
  await factory.orchestrator.idle();
  assert.equal(tasksOf(factory, production.id)["thumbnail-designer"].output.final.layout, "big-number");
  // Por último, el productor monta el video y espera la aprobación final.
  const video = tasksOf(factory, production.id).producer;
  assert.equal(video.status, "awaiting_approval");
  factory.orchestrator.approve(video.id);
  await factory.orchestrator.idle();
  assert.equal(factory.db.getProduction(production.id).status, "completed");
});

test("la revisión rechaza fuentes inventadas y repite la tarea con las correcciones", async (t) => {
  let attempt = 0;
  const { factory, llm } = await makeFactory({
    fixtures: {
      "trends.structure": () => {
        attempt++;
        const data = structuredClone(MOCK_FIXTURES["trends.structure"]);
        if (attempt === 1) data.ideas[0].sourceIds = [99];
        return data;
      },
    },
  });
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();

  const research = tasksOf(factory, production.id)["trend-researcher"];
  assert.equal(research.status, "done");
  assert.equal(research.attempt, 2);
  const second = llm.calls.filter((c) => c.name === "trends.structure")[1];
  assert.match(second.prompt, /fuentes que no existen: 99/);
});

test("tras agotar los intentos la tarea queda fallida y se puede reintentar", async (t) => {
  let broken = true;
  const { factory } = await makeFactory({
    fixtures: {
      "audience.analyze": () => {
        const data = structuredClone(MOCK_FIXTURES["audience.analyze"]);
        if (broken) data.chosenIdeaIndex = 42;
        return data;
      },
    },
  });
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();

  let tasks = tasksOf(factory, production.id);
  assert.equal(tasks["audience-analyst"].status, "failed");
  assert.equal(tasks["audience-analyst"].attempt, 3);
  assert.match(tasks["audience-analyst"].error, /no existe/);
  assert.equal(tasks.scriptwriter.status, "pending");
  assert.equal(factory.db.getProduction(production.id).status, "failed");

  broken = false;
  factory.orchestrator.retry(tasks["audience-analyst"].id);
  await factory.orchestrator.idle();
  tasks = tasksOf(factory, production.id);
  assert.equal(tasks.scriptwriter.status, "awaiting_approval");
});

test("sin API key los agentes fallan con un error claro y sin reintentos inútiles", async (t) => {
  const { factory } = await makeFactory();
  t.after(() => factory.close());
  factory.services.llm.research = async () => {
    throw new LLMError("Falta ANTHROPIC_API_KEY", { kind: "config" });
  };
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  const research = tasksOf(factory, production.id)["trend-researcher"];
  assert.equal(research.status, "failed");
  assert.equal(research.attempt, 1);
  assert.match(research.error, /ANTHROPIC_API_KEY/);
});

test("pedir cambios rehace la tarea con tus notas e invalida lo que dependía de ella", async (t) => {
  const { factory, llm } = await makeFactory();
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  const before = tasksOf(factory, production.id);

  factory.orchestrator.requestChanges(before["audience-analyst"].id, "Prefiero un tono más serio.");
  const reset = tasksOf(factory, production.id);
  assert.equal(reset.scriptwriter.status, "pending");
  assert.equal(reset.scriptwriter.output, null);
  await factory.orchestrator.idle();

  const lastAudience = llm.calls.filter((c) => c.name === "audience.analyze").at(-1);
  assert.match(lastAudience.prompt, /tono más serio/);
  assert.equal(tasksOf(factory, production.id).scriptwriter.status, "awaiting_approval");
});

test("aprobar una versión editada la revisa, recalcula la duración y la marca como tuya", async (t) => {
  const { factory } = await makeFactory();
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  const script = tasksOf(factory, production.id).scriptwriter;

  const broken = { ...script.output, sections: script.output.sections.slice(0, 1) };
  assert.throws(() => factory.orchestrator.approve(script.id, { output: broken }), /problemas/);

  const edited = { ...script.output, title: "Mi título editado", wordCount: 1 };
  const saved = factory.orchestrator.approve(script.id, { output: edited });
  assert.equal(saved.status, "done");
  assert.equal(saved.editedByUser, true);
  assert.ok(saved.output.wordCount > 100, "el recuento de palabras se recalcula");
  assert.equal(factory.db.getProduction(production.id).title, "Mi título editado");
});

test("cancelar detiene la tarea en curso y reintentar la reanuda", async (t) => {
  const { factory } = await makeFactory();
  t.after(() => factory.close());
  let release;
  const gate = new Promise((r) => (release = r));
  const original = factory.services.llm.research;
  factory.services.llm.research = async (args) => {
    await new Promise((resolve, reject) => {
      gate.then(resolve);
      args.signal.addEventListener("abort", () => reject(new LLMError("Tarea cancelada.", { kind: "cancelled" })));
    });
    return original(args);
  };
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(factory.orchestrator.activity().length, 1);

  factory.orchestrator.cancel(production.id);
  await factory.orchestrator.idle();
  const tasks = tasksOf(factory, production.id);
  assert.equal(tasks["trend-researcher"].status, "cancelled");
  assert.equal(tasks["audience-analyst"].status, "cancelled");
  assert.equal(factory.db.getProduction(production.id).status, "cancelled");

  release();
  factory.orchestrator.retry(tasks["trend-researcher"].id);
  await factory.orchestrator.idle();
  assert.equal(tasksOf(factory, production.id).scriptwriter.status, "awaiting_approval");
});

test("las tareas interrumpidas por un reinicio vuelven a la cola", async (t) => {
  const { factory } = await makeFactory();
  t.after(() => factory.close());
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.db.createProduction({
    channelId: channel.id,
    title: "x",
    steps: factory.orchestrator.steps(),
  });
  const first = factory.db.listTasks(production.id)[0];
  factory.db.updateTask(first.id, { status: "running", attempt: 1 });
  factory.db.updateProduction(production.id, { status: "running" });

  factory.orchestrator.recover();
  await factory.orchestrator.idle();
  assert.equal(tasksOf(factory, production.id).scriptwriter.status, "awaiting_approval");
});
