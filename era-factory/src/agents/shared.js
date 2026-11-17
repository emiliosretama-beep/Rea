// Piezas comunes de los prompts de los agentes.

export function channelBrief(channel) {
  return [
    `Canal: ${channel.name}`,
    `Nicho / temática: ${channel.niche}`,
    `Idioma de los videos: ${channel.language}`,
    `Público objetivo: ${channel.audience}`,
    `Tipo de videos: ${channel.videoType}`,
    `Frecuencia de publicación: ${channel.frequency}`,
  ].join("\n");
}

export function feedbackBlock(ctx) {
  return ctx.feedback ? `\n\n## Correcciones obligatorias para esta versión\n${ctx.feedback}` : "";
}

export function insightsBlock(insights) {
  if (!insights?.length) return "\n\nNo hay métricas de videos publicados todavía.";
  const lines = insights.map((i) => `- (${i.source}, ${i.createdAt.slice(0, 10)}) ${JSON.stringify(i.content)}`);
  return `\n\n## Aprendizajes de videos anteriores (analista de rendimiento)\n${lines.join("\n")}`;
}

export function sourcesBlock(sources) {
  if (!sources?.length) return "(sin fuentes)";
  return sources.map((s) => `[${s.id}] ${s.title} — ${s.url}`).join("\n");
}

export const today = () => new Date().toISOString().slice(0, 10);

export const LANGUAGE_RULE =
  "Escribe todo el contenido destinado al video (títulos, ganchos, narración) en el idioma del canal. " +
  "No inventes datos, cifras, fechas ni citas: si algo no está en las fuentes, dilo como opinión o no lo digas.";

export function invalidSourceIds(ids, sources) {
  const valid = new Set(sources.map((s) => s.id));
  return (ids || []).filter((id) => !valid.has(id));
}
