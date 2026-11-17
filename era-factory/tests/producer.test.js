import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPlan } from "../src/agents/producer.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";
import { END_CARD_SECONDS, buildScenes, splitSentences, subtitleCues, timeSentences, toSrt, youtubeChapters } from "../src/timeline.js";
import { CHANNEL, chooseThumbnail, fakeVideo, makeFactory, tasksOf } from "./helpers.js";

const SEGMENTS = [
  { id: "hook", label: "Gancho", text: "¿Sabes qué es esto? Hoy lo vas a entender.", start: 0, end: 4, duration: 4 },
  { id: "s1", label: "Qué es", text: "Uno dos tres cuatro. Cinco seis.", start: 4.6, end: 16.6, duration: 12 },
  { id: "outro", label: "Cierre", text: "Suscríbete.", start: 17.2, end: 19.2, duration: 2 },
];

test("frases: se separan y su tiempo se reparte por palabras dentro de la sección", () => {
  assert.deepEqual(splitSentences("Hola. ¿Qué tal? ¡Bien! Fin…  Ya"), ["Hola.", "¿Qué tal?", "¡Bien!", "Fin…", "Ya"]);
  const [, s1] = timeSentences(SEGMENTS);
  assert.deepEqual(s1.sentences.map((s) => [s.start, s.end]), [[4.6, 12.6], [12.6, 16.6]]); // 4 y 2 palabras de 12 s
});

test("escenas: empiezan en 0, terminan en el total y no dejan huecos ni solapes", () => {
  const timed = timeSentences(SEGMENTS);
  const total = 19.2 + END_CARD_SECONDS;
  const scenes = buildScenes(timed, { s1: [{ fromSentence: 1, onScreen: "Cinco seis", kind: "point" }] }, {
    title: "Título", channel: "Canal", callToAction: "Suscríbete", totalDuration: total,
  });
  assert.deepEqual(scenes.map((s) => s.kind), ["title", "section", "point", "end"]);
  assert.equal(scenes[0].start, 0);
  assert.equal(scenes.at(-1).end, total);
  for (let i = 1; i < scenes.length; i++) assert.equal(scenes[i].start, scenes[i - 1].end);
  assert.ok(scenes.every((s) => s.duration > 0));
  assert.equal(scenes.at(-1).start, 19.2, "la tarjeta final empieza cuando termina la voz");
});

test("subtítulos SRT: máximo 2 líneas de 42 caracteres y formato válido", () => {
  const long = [{ ...SEGMENTS[0], text: "Esta es una frase bastante larga que tiene que repartirse en varios subtítulos para que se lea bien en el celular." }];
  const cues = subtitleCues(timeSentences(long));
  assert.ok(cues.length >= 2);
  assert.ok(cues.every((c) => c.lines.length <= 2 && c.lines.every((l) => l.length <= 42)));
  assert.match(toSrt(cues), /^1\n00:00:00,000 --> 00:00:0\d,\d{3}\n/);
});

test("capítulos de YouTube: solo si cumplen sus reglas (0:00, 3 o más, 10 s mínimo)", () => {
  const long = [
    { id: "hook", label: "Gancho", text: "a.", start: 0, end: 12, duration: 12 },
    { id: "s1", label: "Qué es", text: "b.", start: 12.6, end: 80, duration: 67.4 },
    { id: "outro", label: "Cierre", text: "c.", start: 80.6, end: 95, duration: 14.4 },
  ];
  assert.equal(youtubeChapters(timeSentences(long), 98).text, "0:00 Introducción\n0:12 Qué es\n1:20 Cierre");
  assert.match(youtubeChapters(timeSentences(SEGMENTS), 22).reason, /menos de 10 s/);
});

test("plan: rechaza frases inexistentes, desorden y cifras que no dijo la narración", () => {
  const timed = timeSentences(SEGMENTS);
  const script = { title: "T", hook: "", sections: [{ narration: "uno" }], outro: "" };
  const issues = checkPlan(
    { hook: [{ fromSentence: 5, onScreen: "x", kind: "point" }], s1: [{ fromSentence: 1, onScreen: "El 90% lo usa", kind: "point" }, { fromSentence: 0, onScreen: "y", kind: "point" }] },
    timed,
    script,
  );
  assert.ok(issues.some((i) => /frase 5 no existe/.test(i)));
  assert.ok(issues.some((i) => /cifras que no están en el guion \(90\)/.test(i)));
  assert.ok(issues.some((i) => /en orden/.test(i)));
  assert.ok(issues.some((i) => /Falta el plan de la sección «Cierre»/.test(i)));
});

async function toVideo({ fixtures, video = fakeVideo() } = {}) {
  const made = await makeFactory({ fixtures, video });
  const { factory } = made;
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  factory.db.updateProduction(production.id, { settings: { video: { burnSubtitles: true } } });
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).scriptwriter.id);
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).narrator.id);
  await factory.orchestrator.idle();
  const thumbs = tasksOf(factory, production.id)["thumbnail-designer"];
  chooseThumbnail(factory, thumbs, 5); // paleta «hielo»
  await factory.orchestrator.idle();
  return { ...made, video, production, task: tasksOf(factory, production.id).producer };
}

test("el productor monta con la paleta de la miniatura, la voz aprobada y tus ajustes", async (t) => {
  const { factory, video, task, production } = await toVideo();
  t.after(() => factory.close());
  assert.equal(task.status, "awaiting_approval");
  const job = video.calls[0];
  assert.equal(job.palette.bg1, "#e8f4ff", "paleta de la miniatura elegida");
  assert.equal(job.burnSubtitles, true);
  const narration = tasksOf(factory, production.id).narrator.output;
  assert.equal(job.audioFile, `/media-root/${production.id}/${narration.full.file}`);
  assert.equal(job.totalDuration, Math.round((narration.full.duration + END_CARD_SECONDS) * 1000) / 1000);
  assert.match(job.srt, /^1\n00:00:00,000 -->/);
  assert.equal(job.scenes[0].kind, "title");
  assert.equal(job.scenes.at(-1).kind, "end");
  assert.ok(task.output.chapters);
});

test("un plan con cifras inventadas no se monta: se corrige primero", async (t) => {
  let attempt = 0;
  const { factory, llm, video, task } = await toVideo({
    fixtures: {
      "producer.beats": () => {
        attempt++;
        const data = structuredClone(MOCK_FIXTURES["producer.beats"]);
        if (attempt === 1) data.segments[1].beats[0].onScreen = "El 97% no lo sabe";
        return data;
      },
    },
  });
  t.after(() => factory.close());
  assert.equal(task.status, "awaiting_approval");
  assert.equal(task.attempt, 2);
  assert.equal(video.calls.length, 1, "solo se montó el plan corregido");
  assert.match(llm.calls.filter((c) => c.name === "producer.beats")[1].prompt, /97/);
});

test("rehacer la narración invalida el video montado con la anterior", async (t) => {
  const { factory, production } = await toVideo();
  t.after(() => factory.close());
  factory.orchestrator.requestChanges(tasksOf(factory, production.id).narrator.id, "Otra voz");
  const tasks = tasksOf(factory, production.id);
  assert.equal(tasks.producer.status, "pending");
  assert.equal(tasks.producer.output, null);
});

test("Shorts: sin tarjetas de sección y con cortes rápidos que no se pierden por redondeo", () => {
  const timed = timeSentences([
    { id: "hook", label: "Gancho", text: "Mira esto.", start: 0, end: 1.5, duration: 1.5 },
    { id: "s2", label: "Materiales", text: "Con jabón. Pasta de papel. Pintura. Y pelo real de la barbería.", start: 2.1, end: 6.1, duration: 4 },
    { id: "outro", label: "Cierre", text: "Comenta.", start: 6.7, end: 7.5, duration: 0.8 },
  ]);
  const plan = { s2: ["JABÓN", "PASTA DE PAPEL", "PINTURA", "PELO REAL"].map((onScreen, i) => ({ fromSentence: i, onScreen, kind: "point" })) };
  const scenes = buildScenes(timed, plan, { title: "T", channel: "C", callToAction: "", totalDuration: 10.5, sectionCards: false, minGap: 0.6 });
  assert.equal(scenes.some((s) => s.kind === "section"), false, "sin tarjetas de sección");
  assert.deepEqual(scenes.filter((s) => s.kind === "point").map((s) => s.text), ["JABÓN", "PASTA DE PAPEL", "PINTURA", "PELO REAL"]);
});
