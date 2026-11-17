// AGENTE 1 — Investigador de tendencias.
// 1) Si hay YOUTUBE_API_KEY, trae los videos más vistos del nicho (datos reales).
// 2) Investiga en la web con la herramienta de búsqueda de Claude.
// 3) Estructura el resultado: tendencias + ideas de video, cada una citando
//    fuentes por número. Las fuentes las pone el código, no el modelo.
import { YouTubeError } from "../services/youtube.js";
import { LANGUAGE_RULE, channelBrief, feedbackBlock, insightsBlock, invalidSourceIds, sourcesBlock, today } from "./shared.js";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "trends", "ideas"],
  properties: {
    summary: { type: "string", description: "Resumen de 3-5 frases del estado del nicho ahora mismo." },
    trends: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "whyNow", "competition", "sourceIds"],
        properties: {
          topic: { type: "string" },
          whyNow: { type: "string", description: "Por qué es relevante ahora, con la evidencia." },
          competition: { type: "string", enum: ["baja", "media", "alta"] },
          sourceIds: { type: "array", items: { type: "integer" } },
        },
      },
    },
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "angle", "hook", "whyItWorks", "opportunityScore", "sourceIds"],
        properties: {
          title: { type: "string", description: "Título de video atractivo y honesto (sin clickbait engañoso)." },
          angle: { type: "string", description: "El enfoque diferencial frente a lo que ya existe." },
          hook: { type: "string", description: "Primera frase del video para captar atención." },
          whyItWorks: { type: "string" },
          opportunityScore: { type: "integer", description: "1 (poca) a 10 (mucha oportunidad)." },
          sourceIds: { type: "array", items: { type: "integer" } },
        },
      },
    },
  },
};

const SYSTEM =
  "Eres el investigador de tendencias de una productora de YouTube. Buscas temas con demanda real y " +
  "poca saturación. Basas cada afirmación en lo que encuentras, nunca en suposiciones.";

function formatViews(n) {
  return n === null ? "?" : n.toLocaleString("es-MX");
}

export const trendResearcher = {
  id: "trend-researcher",
  name: "Investigador de tendencias",
  role: "Investigación",
  phase: 1,
  implemented: true,
  description: "Busca tendencias y temas emergentes del nicho (web + YouTube) y propone ideas de video con fuentes.",
  dependsOn: [],
  requiresApproval: false,

  async run(ctx) {
    const { channel, production, services, signal } = ctx;
    const focus = production.topicHint ? `${channel.niche} ${production.topicHint}` : channel.niche;

    let youtubeVideos = null;
    if (services.youtube.connected) {
      ctx.log("Consultando los videos más vistos del nicho en YouTube (últimos 30 días)…");
      try {
        youtubeVideos = await services.youtube.topVideos(focus, { language: channel.language, signal });
        ctx.log(`YouTube devolvió ${youtubeVideos.length} videos.`);
      } catch (err) {
        if (!(err instanceof YouTubeError)) throw err;
        ctx.log(`YouTube no disponible: ${err.message} Se sigue solo con la web.`, "warn");
      }
    } else {
      ctx.log("Sin YOUTUBE_API_KEY: la investigación usa solo búsqueda web.", "warn");
    }

    const ytBlock = youtubeVideos?.length
      ? youtubeVideos
          .map((v) => `- "${v.title}" (${v.channel}) · ${formatViews(v.views)} vistas · ${v.publishedAt?.slice(0, 10)}`)
          .join("\n")
      : "No hay datos de YouTube disponibles.";

    ctx.log("Investigando tendencias en la web…");
    const research = await services.llm.research({
      name: "trends.research",
      system: SYSTEM,
      signal,
      prompt:
        `Fecha de hoy: ${today()}.\n\n${channelBrief(channel)}\n` +
        (production.topicHint ? `\nEl productor quiere un video sobre: ${production.topicHint}\n` : "") +
        `\n## Videos más vistos del nicho en YouTube (últimos 30 días)\n${ytBlock}` +
        insightsBlock(ctx.insights) +
        `\n\nInvestiga en la web qué temas del nicho tienen interés AHORA (noticias, lanzamientos, debates, ` +
        `preguntas frecuentes, temas emergentes) para este público y en este idioma. Identifica huecos: temas ` +
        `con demanda y poca oferta de calidad. Escribe tus hallazgos con detalle y menciona de dónde sale cada uno.` +
        feedbackBlock(ctx),
    });

    const sources = [
      ...research.sources.map((s) => ({ url: s.url, title: s.title, kind: "web" })),
      ...(youtubeVideos || []).map((v) => ({ url: v.url, title: `${v.title} (${v.channel})`, kind: "youtube" })),
    ].map((s, i) => ({ id: i + 1, ...s }));
    ctx.log(`Investigación terminada con ${sources.length} fuentes. Estructurando ideas…`);

    const structured = await services.llm.json({
      name: "trends.structure",
      system: SYSTEM,
      schema: SCHEMA,
      signal,
      prompt:
        `${channelBrief(channel)}\n\n## Notas de investigación\n${research.text}\n\n## Fuentes numeradas\n` +
        `${sourcesBlock(sources)}\n\nConvierte la investigación en: un resumen, de 3 a 6 tendencias y de 5 a 8 ` +
        `ideas de video concretas para este canal. Cita en sourceIds SOLO números de la lista de fuentes. ` +
        `${LANGUAGE_RULE}` +
        feedbackBlock(ctx),
    });

    return {
      generatedAt: new Date().toISOString(),
      dataSources: { web: research.sources.length, youtube: youtubeVideos ? youtubeVideos.length : null },
      sources,
      youtubeVideos: youtubeVideos || [],
      researchNotes: research.text,
      ...structured,
    };
  },

  validate(output) {
    const issues = [];
    const warnings = [];
    const sources = output.sources || [];
    if (!sources.length) issues.push("La investigación no encontró ninguna fuente verificable.");
    if ((output.trends || []).length < 3) issues.push("Se necesitan al menos 3 tendencias.");
    if ((output.ideas || []).length < 4) issues.push("Se necesitan al menos 4 ideas de video.");
    for (const [i, item] of [...(output.trends || []), ...(output.ideas || [])].entries()) {
      const label = item.title || item.topic || `elemento ${i + 1}`;
      if (!item.sourceIds?.length) issues.push(`«${label}» no cita ninguna fuente.`);
      const bad = invalidSourceIds(item.sourceIds, sources);
      if (bad.length) issues.push(`«${label}» cita fuentes que no existen: ${bad.join(", ")}.`);
    }
    for (const idea of output.ideas || [])
      if (!(idea.opportunityScore >= 1 && idea.opportunityScore <= 10))
        issues.push(`La puntuación de «${idea.title}» debe estar entre 1 y 10.`);
    if (output.dataSources?.youtube === null)
      warnings.push("Investigación sin datos de YouTube (añade YOUTUBE_API_KEY para ver vistas reales).");
    return { issues, warnings };
  },
};
