import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { FORMATS, formatOf } from "../public/formats.js";
import { buildPackage, checkPackage, packageFilename } from "../public/package.js";
import { automaticPlan, producePackage } from "../scripts/produce-package.mjs";
import { checkPlan } from "../src/agents/producer.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";
import { loadConfig } from "../src/config.js";
import { createTTS } from "../src/services/tts.js";
import { createVideo } from "../src/services/video.js";
import { subtitleCues, timeSentences, toAss } from "../src/timeline.js";
import { CHANNEL, chooseThumbnail, makeFactory, tasksOf } from "./helpers.js";

test("formato por canal: Shorts verticales con sus reglas; canales antiguos, horizontales", () => {
  assert.equal(formatOf({ format: "short" }).height, 1920);
  assert.equal(formatOf({}).width, 1920, "sin formato = horizontal (canales anteriores)");
  assert.equal(FORMATS.short.maxSeconds, 60);
  assert.equal(FORMATS.short.burnSubtitles, true);
});

test("Shorts: el analista pide segundos, el guionista estructura corta y el productor monta vertical", async (t) => {
  const { factory, llm } = await makeFactory({
    fixtures: {
      "audience.analyze": () => {
        const data = structuredClone(MOCK_FIXTURES["audience.analyze"]);
        data.decision.targetLengthSeconds = 45;
        return data;
      },
    },
  });
  t.after(() => factory.close());
  const channel = factory.db.createChannel({ ...CHANNEL, format: "short" });
  assert.equal(factory.db.getChannel(channel.id).format, "short");
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  const audiencePrompt = llm.calls.find((c) => c.name === "audience.analyze").prompt;
  assert.match(audiencePrompt, /entre 15 y 60/);
  assert.match(llm.calls.find((c) => c.name === "script.write").prompt, /Es un Short vertical/);
  factory.orchestrator.approve(tasksOf(factory, production.id).scriptwriter.id);
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).narrator.id);
  await factory.orchestrator.idle();
  chooseThumbnail(factory, tasksOf(factory, production.id)["thumbnail-designer"]);
  await factory.orchestrator.idle();
  const job = factory.services.video.calls[0];
  assert.deepEqual(job.size, { width: 1080, height: 1920 });
  assert.equal(job.burnSubtitles, true, "los Shorts llevan subtítulos incrustados por defecto");
  assert.match(job.ass, /PlayResY: 1920/);
  assert.match(llm.calls.find((c) => c.name === "producer.beats").prompt, /cada 2 a 4 segundos/);
  assert.match(llm.calls.find((c) => c.name === "thumbs.design").prompt, /PORTADA VERTICAL 9:16/);

  // El paquete exportado lleva lo necesario para producir fuera.
  const detail = { production: factory.db.getProduction(production.id), channel: factory.db.getChannel(channel.id), tasks: factory.db.listTasks(production.id) };
  const pkg = buildPackage(detail);
  assert.deepEqual(checkPackage(pkg), []);
  assert.equal(pkg.channel.format, "short");
  assert.ok(pkg.thumbnail?.palette);
  assert.match(packageFilename(pkg), /^era-[a-z0-9-]+\.json$/);
});

test("Shorts: subtítulos de 3 palabras en una línea y ASS con el tamaño del video", () => {
  const timed = timeSentences([{ id: "hook", label: "G", text: "Uno dos tres cuatro cinco seis siete.", start: 0, end: 3.5, duration: 3.5 }]);
  const cues = subtitleCues(timed, { maxWords: 3 });
  assert.deepEqual(cues.map((c) => c.lines), [["Uno dos tres"], ["cuatro cinco seis"], ["siete."]]);
  const ass = toAss(cues, { width: 1080, height: 1920, vertical: true });
  assert.match(ass, /PlayResX: 1080/);
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:01\.50,Default,,0,0,0,,Uno dos tres/);
});

test("paquete: rechaza archivos ajenos o incompletos; exige guion aprobado", () => {
  assert.deepEqual(checkPackage({ kind: "otro" }), ["No es un paquete de ERA Factory."]);
  assert.ok(checkPackage({ kind: "era-factory-package", version: 1, script: {}, channel: {} }).length >= 2);
  assert.throws(() => buildPackage({ production: {}, channel: {}, tasks: [] }), /Aprueba el guion/);
});

test("plan automático: frases reales recortadas y válidas para el revisor", () => {
  const timed = timeSentences([
    { id: "hook", label: "G", text: "Hola.", start: 0, end: 1, duration: 1 },
    { id: "s1", label: "Uno", text: "Una frase bastante larga con muchas palabras de más. Otra corta.", start: 1.6, end: 6, duration: 4.4 },
    { id: "outro", label: "C", text: "Adiós.", start: 6.6, end: 7, duration: 0.4 },
  ]);
  const plan = automaticPlan(timed, FORMATS.short);
  assert.deepEqual(plan.s1.map((b) => b.onScreen), ["Una frase bastante larga con muchas…", "Otra corta"]);
  assert.deepEqual(checkPlan(plan, timed, { title: "", hook: "", sections: [], outro: "" }), []);
});

const config = loadConfig({});
const ready =
  createTTS({ ...config.tts, mediaRoot: tmpdir() }).availability().ok && createVideo({ ...config.video, mediaRoot: tmpdir() }).availability().ok;

test("producir un paquete real: Short 1080×1920 con voz, subtítulos y descripción", { skip: !ready && "faltan Kokoro, Pillow o las fuentes" }, async (t) => {
  const out = await mkdtemp(join(tmpdir(), "era-pkg-"));
  t.after(() => rm(out, { recursive: true, force: true }));
  const pkg = {
    kind: "era-factory-package",
    version: 1,
    channel: { name: "Canal", niche: "ia", language: "Español", format: "short" },
    production: { id: "abc", title: "Prueba" },
    narration: { voice: "ef_dora", speed: 1.2 },
    script: { title: "Prueba", hook: "Mira esto.", sections: [{ heading: "Idea", narration: "Una idea corta. Otra más." }], outro: "Fin.", callToAction: "Síguenos.", description: "Descripción.", tags: ["ia"] },
    thumbnail: { palette: "menta" },
  };
  // Portada roja de 1080×1920: debe acabar siendo el último fotograma del Short.
  const coverPath = join(out, "rojo.png");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=red:s=1080x1920", "-frames:v", "1", "-y", coverPath]);
  pkg.coverPng = `data:image/png;base64,${(await readFile(coverPath)).toString("base64")}`;
  const r = await producePackage(pkg, { out, log: () => {} });
  const last = join(out, "ultimo.png");
  execFileSync("ffmpeg", ["-v", "error", "-sseof", "-0.4", "-i", r.video, "-frames:v", "1", "-y", last]);
  const pixel = execFileSync("python3", ["-c", `from PIL import Image; print(Image.open("${last}").convert("RGB").getpixel((540, 200)))`]).toString().trim();
  const [red, green, blue] = pixel.replace(/[()]/g, "").split(",").map(Number);
  assert.ok(red > 200 && green < 60 && blue < 60, `el último fotograma es la portada (pixel ${pixel})`);
  assert.ok(r.cover, "la portada también se entrega como archivo");
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "json", r.video]));
  const v = probe.streams.find((s) => s.codec_type === "video");
  assert.deepEqual([v.width, v.height], [1080, 1920]);
  assert.equal(r.burnSubtitles, true);
  assert.ok((await stat(r.subtitles)).size > 0);
  assert.ok((await stat(r.description)).size > 0);
});
