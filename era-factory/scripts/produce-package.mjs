// Produce aquí (con servidor) el video de un paquete exportado desde la
// versión online: voz con Kokoro, escenas y MP4 con ffmpeg.
//
//   node scripts/produce-package.mjs paquete.json [--plan plan.json] [--out carpeta]
//        [--voice em_alex] [--speed 1.1] [--subs on|off]
//
// --plan: qué texto se ve en pantalla en cada momento ({ idSección: [{fromSentence, onScreen, kind}] }).
// Sin plan se usa uno automático: una frase clave por cada 1-2 frases de narración.
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { formatOf } from "../public/formats.js";
import { checkPackage } from "../public/package.js";
import { PALETTES } from "../public/thumbs/catalog.js";
import { narrationSegments } from "../src/agents/narrator.js";
import { checkPlan } from "../src/agents/producer.js";
import { loadConfig } from "../src/config.js";
import { createTTS } from "../src/services/tts.js";
import { createVideo } from "../src/services/video.js";
import { END_CARD_SECONDS, buildScenes, subtitleCues, timeSentences, toAss, toSrt, youtubeChapters } from "../src/timeline.js";
import { resolveNarration } from "../src/voices.js";

// Texto en pantalla automático: la frase recortada a sus primeras palabras.
function keyPhrase(sentence, maxWords) {
  const words = sentence.replace(/[.!?…:;,]+$/u, "").split(/\s+/);
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : words.join(" ");
}

export function automaticPlan(timed, format) {
  const short = format.width < format.height;
  const plan = {};
  for (const seg of timed) {
    if (seg.id === "hook" || seg.id === "outro") {
      plan[seg.id] = [];
      continue;
    }
    const step = short ? 1 : 2;
    plan[seg.id] = seg.sentences
      .map((s, i) => ({ fromSentence: i, onScreen: keyPhrase(s.text, short ? 6 : 9), kind: "point" }))
      .filter((_, i) => i % step === 0)
      .slice(0, 4);
  }
  return plan;
}

export async function producePackage(pkg, { plan, out, voice, speed, subs, config = loadConfig({}), log = console.log } = {}) {
  const problems = checkPackage(pkg);
  if (problems.length) throw new Error(problems.join(" "));
  const format = formatOf(pkg.channel);
  const work = join(out, ".trabajo");
  const id = pkg.production.id.replace(/[^\w-]/g, "").slice(0, 40) || "paquete";
  const tts = createTTS({ ...config.tts, mediaRoot: work });
  const video = createVideo({ ...config.video, python: config.tts.python, ffmpeg: config.tts.ffmpeg, mediaRoot: work });
  for (const service of [tts, video]) {
    const status = service.availability();
    if (!status.ok) throw new Error(status.reason);
  }

  const narration = resolveNarration(pkg.channel.language, { ...pkg.narration, ...(voice && { voice }), ...(speed && { speed }) });
  if (narration.error) throw new Error(narration.error);
  const segments = narrationSegments(pkg.script);
  log(`Narrando ${segments.length} secciones (voz ${narration.voice}, ${narration.speed}×)…`);
  const n = await tts.narrate({ productionId: id, segments, ...narration });
  const timed = timeSentences(segments.map((s) => ({ ...s, ...n.segments.find((x) => x.id === s.id) })));

  const beats = plan ?? automaticPlan(timed, format);
  const issues = checkPlan(beats, timed, pkg.script);
  if (issues.length) throw new Error(`El plan de pantalla tiene problemas: ${issues.join(" ")}`);

  // Portada exportada desde la versión online (PNG del tamaño del formato).
  let coverFile = null;
  if (pkg.coverPng) {
    const png = Buffer.from(String(pkg.coverPng).replace(/^data:image\/png;base64,/, ""), "base64");
    const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (png.toString("ascii", 1, 4) === "PNG" && w === format.width && h === format.height) {
      coverFile = join(work, "portada.png");
      await mkdir(work, { recursive: true });
      await writeFile(coverFile, png);
    } else log(`La portada mide ${w}×${h} y el video ${format.width}×${format.height}: no se usa como última escena.`);
  }

  const total = Math.round((n.full.duration + END_CARD_SECONDS) * 1000) / 1000;
  const scenes = buildScenes(timed, beats, { title: pkg.script.title, channel: pkg.channel.name, callToAction: pkg.script.callToAction, totalDuration: total, sectionCards: format.sectionCards, minGap: format.minGap });
  const size = { width: format.width, height: format.height };
  const cues = subtitleCues(timed, { maxWords: format.subtitleWords });
  const burn = subs === undefined ? format.burnSubtitles : subs;
  log(`Montando ${scenes.length} escenas en ${size.width}×${size.height} (${total.toFixed(1)} s)…`);
  const made = await video.produce({
    productionId: id,
    scenes,
    palette: PALETTES[pkg.thumbnail?.palette] ?? PALETTES.era,
    size,
    audioFile: video.mediaPath(id, n.full.file),
    totalDuration: total,
    srt: toSrt(cues),
    ass: toAss(cues, { ...size, vertical: size.height > size.width }),
    burnSubtitles: burn,
    // En un Short la portada es la última escena: al subirlo, elige ese fotograma.
    coverFile: format.height > format.width ? coverFile : null,
  });

  // Entrega: video, subtítulos y texto para YouTube, con nombres claros.
  await mkdir(out, { recursive: true });
  const files = { video: join(out, "video.mp4"), subtitles: join(out, "subtitulos.srt"), description: join(out, "descripcion.txt") };
  await copyFile(join(work, id, made.video.file), files.video);
  await copyFile(join(work, id, made.subtitles.file), files.subtitles);
  const chapters = format.width > format.height ? youtubeChapters(timed, total).text : "";
  const tags = (pkg.script.tags ?? []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  await writeFile(files.description, [pkg.script.title, "", pkg.script.description, chapters, tags].filter(Boolean).join("\n\n") + "\n");
  if (coverFile) {
    files.cover = join(out, "portada.png");
    await copyFile(coverFile, files.cover);
  }
  await rm(work, { recursive: true, force: true });
  return { ...files, duration: total, size, scenes: scenes.length, burnSubtitles: burn, format: pkg.channel.format };
}

// Uso desde la terminal.
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  if (!file) {
    console.error("Uso: node scripts/produce-package.mjs paquete.json [--plan plan.json] [--out carpeta] [--voice id] [--speed n] [--subs on|off]");
    process.exit(1);
  }
  try {
    const pkg = JSON.parse(await readFile(file, "utf8"));
    const plan = flag("plan") ? JSON.parse(await readFile(flag("plan"), "utf8")) : undefined;
    const subs = flag("subs") === undefined ? undefined : flag("subs") === "on";
    const result = await producePackage(pkg, { plan, out: flag("out") ?? "salida", voice: flag("voice"), speed: flag("speed"), subs });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`No se pudo producir: ${err.message}`);
    process.exit(1);
  }
}
