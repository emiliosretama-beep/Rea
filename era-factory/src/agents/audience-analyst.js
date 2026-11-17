// AGENTE 2 — Analista de audiencia.
// Cruza el perfil del público con la investigación y elige qué video producir.
// Si hay aprendizajes de videos publicados (fase 5) los usa; si no, lo dice:
// nunca presenta métricas que no tiene.
import { LANGUAGE_RULE, channelBrief, feedbackBlock, insightsBlock } from "./shared.js";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["persona", "contentPreferences", "chosenIdeaIndex", "decision", "retentionPlan"],
  properties: {
    persona: {
      type: "object",
      additionalProperties: false,
      required: ["name", "description", "ageRange", "motivations", "frustrations"],
      properties: {
        name: { type: "string", description: "Nombre ficticio del espectador tipo." },
        description: { type: "string" },
        ageRange: { type: "string" },
        motivations: { type: "array", items: { type: "string" } },
        frustrations: { type: "array", items: { type: "string" } },
      },
    },
    contentPreferences: { type: "array", items: { type: "string" } },
    chosenIdeaIndex: { type: "integer", description: "Índice (desde 0) de la idea elegida en la lista." },
    decision: {
      type: "object",
      additionalProperties: false,
      required: ["title", "angle", "format", "targetLengthMinutes", "tone", "why"],
      properties: {
        title: { type: "string" },
        angle: { type: "string" },
        format: { type: "string", description: "Ej.: explicación, top, tutorial, historia, análisis." },
        targetLengthMinutes: { type: "integer" },
        tone: { type: "string" },
        why: { type: "string", description: "Por qué esta idea y no las demás para este público." },
      },
    },
    retentionPlan: {
      type: "array",
      items: { type: "string" },
      description: "Recursos concretos para mantener la retención en este video.",
    },
  },
};

export const audienceAnalyst = {
  id: "audience-analyst",
  name: "Analista de audiencia",
  role: "Audiencia",
  phase: 1,
  implemented: true,
  description: "Define al espectador tipo, elige la mejor idea para él y fija formato, duración y tono.",
  dependsOn: ["trend-researcher"],
  requiresApproval: false,

  async run(ctx) {
    const research = ctx.inputs["trend-researcher"];
    const ideas = research.ideas
      .map((idea, i) => `${i}. ${idea.title} — ${idea.angle} (oportunidad ${idea.opportunityScore}/10)`)
      .join("\n");
    ctx.log("Analizando al público y eligiendo la idea con más potencial…");
    const result = await ctx.services.llm.json({
      name: "audience.analyze",
      system:
        "Eres el analista de audiencia de una productora de YouTube. Piensas en lo que el espectador " +
        "necesita y en qué le hace quedarse hasta el final.",
      schema: SCHEMA,
      signal: ctx.signal,
      prompt:
        `${channelBrief(ctx.channel)}\n` +
        (ctx.production.topicHint ? `\nEl productor pidió este tema: ${ctx.production.topicHint}\n` : "") +
        `\n## Resumen de tendencias\n${research.summary}\n\n## Ideas propuestas\n${ideas}` +
        insightsBlock(ctx.insights) +
        `\n\nDescribe al espectador tipo, elige UNA idea (chosenIdeaIndex) y define el video: título final, ` +
        `enfoque, formato, duración objetivo en minutos, tono y por qué. Añade de 3 a 6 recursos de retención. ` +
        `Si no hay métricas, basa tus recomendaciones en la investigación y dilo. ${LANGUAGE_RULE}` +
        feedbackBlock(ctx),
    });
    // Lo que sabemos de métricas lo decide el código, no el modelo.
    result.metrics = ctx.insights.length
      ? { available: true, note: `Se usaron ${ctx.insights.length} aprendizajes de videos publicados.` }
      : { available: false, note: "Sin métricas reales todavía: recomendaciones basadas en la investigación." };
    return result;
  },

  validate(output, ctx) {
    const issues = [];
    const ideas = ctx.inputs?.["trend-researcher"]?.ideas || [];
    if (!Number.isInteger(output.chosenIdeaIndex) || output.chosenIdeaIndex < 0 || output.chosenIdeaIndex >= ideas.length)
      issues.push(`La idea elegida (${output.chosenIdeaIndex}) no existe en la lista de ${ideas.length} ideas.`);
    const minutes = output.decision?.targetLengthMinutes;
    if (!(minutes >= 1 && minutes <= 60)) issues.push("La duración objetivo debe estar entre 1 y 60 minutos.");
    if (!output.decision?.title?.trim()) issues.push("Falta el título del video.");
    if ((output.retentionPlan || []).length < 3) issues.push("El plan de retención necesita al menos 3 recursos.");
    return { issues, warnings: [] };
  },
};
