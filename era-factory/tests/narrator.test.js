import assert from "node:assert/strict";
import { test } from "node:test";
import { narrationSegments, speakable } from "../src/agents/narrator.js";
import { LLMError } from "../src/errors.js";
import { narrationLanguage, resolveNarration, voicesFor } from "../src/voices.js";
import { CHANNEL, fakeTTS, makeFactory, tasksOf } from "./helpers.js";

async function toNarration(factory, channelInput = CHANNEL) {
  const channel = factory.db.createChannel(channelInput);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).scriptwriter.id);
  await factory.orchestrator.idle();
  return production;
}

test("texto narrable: quita formato, acotaciones y enlaces; una sección por parte del guion", () => {
  assert.equal(speakable("**Hola** [música] mira https://x.com  ya"), "Hola mira ya");
  const segs = narrationSegments({
    hook: "Gancho",
    sections: [{ heading: "Uno", narration: "Texto uno" }, { heading: "", narration: "[solo acotación]" }],
    outro: "Fin.",
    callToAction: "Suscríbete.",
  });
  assert.deepEqual(segs.map((s) => [s.id, s.label, s.text]), [
    ["hook", "Gancho", "Gancho"],
    ["s1", "Uno", "Texto uno"],
    ["outro", "Cierre", "Fin. Suscríbete."],
  ]);
});

test("voces: idioma del canal, voz por defecto y velocidad dentro de límites", () => {
  assert.equal(narrationLanguage("Español"), "es");
  assert.equal(narrationLanguage("Alemán"), null);
  assert.deepEqual(resolveNarration("Español"), { language: "es", voice: "em_alex", speed: 1 });
  assert.deepEqual(resolveNarration("Español", { voice: "af_heart", speed: 3 }), { language: "en-us", voice: "af_heart", speed: 1.3 });
  assert.match(resolveNarration("Alemán").error, /no tiene voces/);
  assert.deepEqual(voicesFor("es").map((v) => v.id), ["ef_dora", "em_alex", "em_santa"]);
});

test("el narrador lee el guion aprobado con la voz del idioma del canal y marca los tiempos", async (t) => {
  const tts = fakeTTS();
  const { factory } = await makeFactory({ tts });
  t.after(() => factory.close());
  const production = await toNarration(factory);
  const task = tasksOf(factory, production.id).narrator;
  assert.equal(task.status, "awaiting_approval");
  assert.equal(tts.calls[0].voice, "em_alex");
  assert.equal(tts.calls[0].language, "es");
  assert.equal(tts.calls[0].productionId, production.id);
  const script = tasksOf(factory, production.id).scriptwriter.output;
  assert.equal(task.output.segments.length, script.sections.length + 2);
  assert.ok(task.output.segments.every((s, i, all) => i === 0 || s.start >= all[i - 1].end));
  assert.ok(factory.db.listLogs({ productionId: production.id }).some((l) => /Narrando \d+ secciones con la voz Alex/.test(l.message)));
});

test("cambiar de voz: se guarda en la producción y la narración se rehace con ella", async (t) => {
  const tts = fakeTTS();
  const { factory } = await makeFactory({ tts });
  t.after(() => factory.close());
  const production = await toNarration(factory);
  factory.db.updateProduction(production.id, { settings: { narration: { voice: "ef_dora", speed: 1.1 } } });
  factory.orchestrator.requestChanges(tasksOf(factory, production.id).narrator.id, "Nueva voz: Dora");
  await factory.orchestrator.idle();
  assert.equal(tts.calls.at(-1).voice, "ef_dora");
  assert.equal(tts.calls.at(-1).speed, 1.1);
  assert.equal(tasksOf(factory, production.id).narrator.output.voiceLabel, "Dora");
});

test("idioma sin voces o Kokoro sin instalar: falla una vez con instrucciones claras", async (t) => {
  const { factory } = await makeFactory();
  t.after(() => factory.close());
  const production = await toNarration(factory, { ...CHANNEL, language: "Alemán" });
  const task = tasksOf(factory, production.id).narrator;
  assert.equal(task.status, "failed");
  assert.equal(task.attempt, 1);
  assert.match(task.error, /no tiene voces en «Alemán»/);

  const missing = fakeTTS({ fail: new LLMError("Falta kokoro-onnx. Ejecuta: bash tools/setup_kokoro.sh", { kind: "config" }) });
  const second = await makeFactory({ tts: missing });
  t.after(() => second.factory.close());
  const p2 = await toNarration(second.factory);
  assert.match(tasksOf(second.factory, p2.id).narrator.error, /setup_kokoro/);
});

test("versión online: el narrador queda fuera de la cadena y explica por qué", async () => {
  const { createRegistry } = await import("../src/agents/index.js");
  const registry = createRegistry({ unavailable: { narrator: "solo funciona en la versión con servidor" } });
  assert.deepEqual(registry.pipeline().map((a) => a.id), ["trend-researcher", "audience-analyst", "scriptwriter", "thumbnail-designer"]);
  const info = registry.describe().find((a) => a.id === "narrator");
  assert.equal(info.implemented, false);
  assert.match(info.unavailableReason, /versión con servidor/);
});
