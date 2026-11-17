// AGENTE 6 — Productor.
// Reúne guion, narración y miniatura y monta el video final:
//   1. Claude decide qué texto aparece en pantalla en cada momento, a partir
//      de las frases reales de la narración y las notas visuales del guion.
//   2. La línea de tiempo sale de la duración REAL del audio de cada sección.
//   3. Escenas 1920×1080 con la paleta de la miniatura aprobada + MP4 (ffmpeg),
//      subtítulos .srt y capítulos para la descripción de YouTube.
// Necesita tu aprobación (es el video final).
import { FORMATS, formatOf, formatId } from "../../public/formats.js";
import { PALETTES } from "../../public/thumbs/catalog.js";
import { LLMError } from "../errors.js";
import { END_CARD_SECONDS, buildScenes, subtitleCues, timeSentences, toAss, toSrt, youtubeChapters } from "../timeline.js";
import { LANGUAGE_RULE, channelBrief, feedbackBlock } from "./shared.js";

const KINDS = ["point", "number", "quote"];
const MAX_ON_SCREEN = 60;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["segments"],
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "beats"],
        properties: {
          id: { type: "string" },
          beats: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["fromSentence", "onScreen", "kind"],
              properties: {
                fromSentence: { type: "integer", description: "Índice (desde 0) de la frase en la que aparece." },
                onScreen: { type: "string", description: `Texto en pantalla, máximo ${MAX_ON_SCREEN} caracteres.` },
                kind: { type: "string", enum: KINDS },
              },
            },
          },
        },
      },
    },
  },
};

const numbersIn = (text) => String(text || "").match(/\d+(?:[.,]\d+)?/g) ?? [];

// Revisa el plan de momentos contra las frases reales. Devuelve problemas.
export function checkPlan(plan, timed, script) {
  const issues = [];
  const allowed = new Set(numbersIn([script.title, script.hook, ...(script.sections || []).map((s) => s.narration), script.outro].join(" ")));
  for (const seg of timed) {
    const beats = plan[seg.id];
    if (!beats) {
      issues.push(`Falta el plan de la sección «${seg.label}».`);
      continue;
    }
    let last = -1;
    for (const beat of beats) {
      if (!(beat.fromSentence >= 0 && beat.fromSentence < seg.sentences.length))
        issues.push(`«${seg.label}»: la frase ${beat.fromSentence} no existe (hay ${seg.sentences.length}).`);
      else if (beat.fromSentence <= last) issues.push(`«${seg.label}»: los momentos deben ir en orden y sin repetir frase.`);
      last = Math.max(last, beat.fromSentence);
      if (!beat.onScreen?.trim()) issues.push(`«${seg.label}»: hay un momento sin texto.`);
      if (beat.onScreen?.length > MAX_ON_SCREEN) issues.push(`«${seg.label}»: «${beat.onScreen}» supera ${MAX_ON_SCREEN} caracteres.`);
      const invented = numbersIn(beat.onScreen).filter((n) => !allowed.has(n));
      if (invented.length) issues.push(`«${seg.label}»: «${beat.onScreen}» usa cifras que no están en el guion (${invented.join(", ")}).`);
      if (beat.kind === "number" && !/^\s*\d/.test(beat.onScreen)) issues.push(`«${seg.label}»: un momento «number» debe empezar con la cifra.`);
    }
  }
  return issues;
}

export const producer = {
  id: "producer",
  name: "Productor",
  role: "Producción",
  phase: 4,
  implemented: true,
  description: "Monta el video final: texto en pantalla por momentos, escenas con la paleta de la miniatura, voz, subtítulos y capítulos.",
  dependsOn: ["scriptwriter", "narrator", "thumbnail-designer"],
  requiresApproval: true,

  async run(ctx) {
    const { video } = ctx.services;
    if (!video) throw new LLMError("Esta versión de ERA Factory no puede montar video.", { kind: "config" });
    const status = video.availability();
    if (!status.ok) throw new LLMError(status.reason, { kind: "config" });
    const script = ctx.inputs.scriptwriter;
    const narration = ctx.inputs.narrator;
    const thumbs = ctx.inputs["thumbnail-designer"];
    const timed = timeSentences(narration.segments);
    const format = formatOf(ctx.channel);
    const notes = Object.fromEntries((script.sections || []).map((s, i) => [`s${i + 1}`, s.visualNotes]));

    ctx.log("Planificando qué se ve en pantalla en cada momento…");
    const result = await ctx.services.llm.json({
      name: "producer.beats",
      system:
        "Eres el editor de video de una productora de YouTube. Pones en pantalla textos cortos que refuerzan " +
        "lo que se escucha, sin repetir la narración palabra por palabra.",
      schema: SCHEMA,
      signal: ctx.signal,
      prompt:
        `${channelBrief(ctx.channel)}\n\nVideo: ${script.title}\n\n## Secciones y sus frases (numeradas desde 0)\n` +
        timed
          .map(
            (seg) =>
              `### ${seg.id} — ${seg.label} (${seg.duration.toFixed(0)} s)` +
              (notes[seg.id] ? `\nNotas visuales del guion: ${notes[seg.id]}` : "") +
              `\n${seg.sentences.map((s, i) => `${i}. ${s.text}`).join("\n")}`,
          )
          .join("\n\n") +
        `\n\nFormato: ${format.label}. Ritmo: un cambio de pantalla cada ${format.beatEvery} segundos` +
        (format === FORMATS.short ? "; textos de pocas palabras y muy grandes (se ven en un celular en vertical)." : ".") +
        `\n\nPara CADA sección (usa su id) da de 1 a 4 momentos: en qué frase aparece (fromSentence, en orden), ` +
        `el texto en pantalla (máximo ${MAX_ON_SCREEN} caracteres, idea clave, no la frase completa) y el tipo: ` +
        `point (idea), number (empieza con una cifra que diga la narración), quote (frase para recordar). ` +
        `No uses cifras que no estén en las frases. ${LANGUAGE_RULE}` +
        feedbackBlock(ctx),
    });
    const plan = Object.fromEntries(result.segments.map((s) => [s.id, s.beats]));
    const problems = checkPlan(plan, timed, script);
    // Un plan con problemas no se monta (ahorra tiempo): la revisión lo devuelve con correcciones.
    if (problems.length) return { plan, planIssues: problems, video: null };

    const totalDuration = Math.round((narration.full.duration + END_CARD_SECONDS) * 1000) / 1000;
    const scenes = buildScenes(timed, plan, {
      title: script.title,
      channel: ctx.channel.name,
      callToAction: script.callToAction,
      totalDuration,
    });
    // Si no elegiste nada, manda el formato: los Shorts llevan subtítulos incrustados.
    const chosen = ctx.production.settings?.video?.burnSubtitles;
    const burnSubtitles = chosen === undefined ? format.burnSubtitles : Boolean(chosen);
    const size = { width: format.width, height: format.height };
    const cues = subtitleCues(timed, { maxWords: format.subtitleWords });
    const paletteName = PALETTES[thumbs.final?.palette] ? thumbs.final.palette : "era";
    ctx.log(`Montando ${scenes.length} escenas (${Math.round(totalDuration)} s, ${size.width}×${size.height}${burnSubtitles ? ", subtítulos incrustados" : ""})…`);
    let lastPercent = -1;
    const made = await video.produce({
      productionId: ctx.production.id,
      scenes,
      palette: PALETTES[paletteName],
      size,
      audioFile: video.mediaPath(ctx.production.id, narration.full.file),
      totalDuration,
      srt: toSrt(cues),
      ass: toAss(cues, { ...size, vertical: size.height > size.width }),
      burnSubtitles,
      signal: ctx.signal,
      onProgress(e) {
        if (e.stage === "scenes" && e.index === e.total) ctx.log(`${e.total} escenas dibujadas. Codificando el video…`);
        if (e.stage === "encode" && e.percent >= lastPercent + 25) {
          lastPercent = e.percent - (e.percent % 25);
          ctx.log(`Codificando: ${e.percent} %`);
        }
      },
    });
    return {
      generatedAt: new Date().toISOString(),
      plan,
      planIssues: [],
      palette: paletteName,
      format: formatId(ctx.channel),
      burnSubtitles,
      totalDuration,
      narrationFile: narration.full.file,
      chapters: youtubeChapters(timed, totalDuration),
      ...made,
    };
  },

  validate(output, ctx) {
    const issues = [...(output.planIssues ?? [])];
    const warnings = [];
    if (!issues.length) {
      if (!output.video?.file) issues.push("Falta el archivo de video.");
      const narration = ctx.inputs?.narrator;
      if (narration && output.narrationFile && output.narrationFile !== narration.full.file)
        issues.push("El video se montó con una narración anterior. Vuelve a producirlo.");
      if (output.chapters && !output.chapters.text) warnings.push(`Sin capítulos de YouTube: ${output.chapters.reason}`);
    }
    return { issues, warnings };
  },
};
