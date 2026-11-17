// AGENTE 3 — Guionista.
// 1) Escribe el guion completo a partir de la investigación y la decisión de audiencia.
// 2) Extrae las afirmaciones de hecho y una segunda pasada las contrasta con las
//    notas de investigación (respaldado / sin respaldo / contradicho).
// La cadena se detiene aquí: el guion necesita tu aprobación (puedes editarlo).
import { FORMATS, formatOf, targetSecondsOf } from "../../public/formats.js";
import { LANGUAGE_RULE, channelBrief, feedbackBlock, invalidSourceIds, sourcesBlock } from "./shared.js";

// Ritmo de narración típico en voz en off (palabras por minuto).
export const WORDS_PER_MINUTE = 150;

const SCRIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "hook", "sections", "outro", "callToAction", "claims", "description", "tags"],
  properties: {
    title: { type: "string" },
    hook: { type: "string", description: "Primeros 10-20 segundos: promesa clara y tensión." },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "narration", "visualNotes"],
        properties: {
          heading: { type: "string" },
          narration: { type: "string", description: "Texto exacto que se narra." },
          visualNotes: { type: "string", description: "Qué se ve en pantalla mientras tanto." },
        },
      },
    },
    outro: { type: "string" },
    callToAction: { type: "string" },
    claims: {
      type: "array",
      description: "Cada afirmación de hecho verificable del guion (cifras, fechas, nombres, eventos).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "sourceId"],
        properties: {
          text: { type: "string" },
          sourceId: { anyOf: [{ type: "integer" }, { type: "null" }] },
        },
      },
    },
    description: { type: "string", description: "Descripción para YouTube." },
    tags: { type: "array", items: { type: "string" } },
  },
};

const CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["checks"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claimIndex", "verdict", "note"],
        properties: {
          claimIndex: { type: "integer" },
          verdict: { type: "string", enum: ["respaldado", "sin_respaldo", "contradicho"] },
          note: { type: "string" },
        },
      },
    },
  },
};

const countWords = (text) => (String(text || "").match(/\S+/g) || []).length;

export function scriptStats(script) {
  const words =
    countWords(script.hook) +
    (script.sections || []).reduce((n, s) => n + countWords(s.narration), 0) +
    countWords(script.outro) +
    countWords(script.callToAction);
  return { wordCount: words, estimatedSeconds: Math.round((words / WORDS_PER_MINUTE) * 60) };
}

export const scriptwriter = {
  id: "scriptwriter",
  name: "Guionista",
  role: "Guion",
  phase: 1,
  implemented: true,
  description: "Escribe el guion completo con gancho, secciones y llamada a la acción, y verifica sus datos.",
  dependsOn: ["trend-researcher", "audience-analyst"],
  requiresApproval: true,

  async run(ctx) {
    const research = ctx.inputs["trend-researcher"];
    const audience = ctx.inputs["audience-analyst"];
    const idea = research.ideas[audience.chosenIdeaIndex];
    const d = audience.decision;
    const format = formatOf(ctx.channel);
    const targetSeconds = targetSecondsOf(d);
    const targetWords = Math.round((targetSeconds / 60) * WORDS_PER_MINUTE);
    const structure =
      format === FORMATS.short
        ? `Es un Short vertical: un solo mensaje. Gancho de máximo ${format.maxHookWords} palabras que se diga en ` +
          `2 segundos; de 2 a 3 secciones muy cortas (momentos rápidos, una idea cada una); cierre con UNA llamada ` +
          `a la acción de máximo 3 segundos. Nada de introducciones ni despedidas largas.`
        : `Escribe el guion completo: gancho, de 4 a 8 secciones con la narración exacta y notas visuales, cierre y llamada a la acción.`;

    ctx.log(`Escribiendo el guion de «${d.title}» (~${targetWords} palabras)…`);
    const script = await ctx.services.llm.json({
      name: "script.write",
      system:
        "Eres el guionista principal de una productora de YouTube. Escribes guiones que enganchan desde " +
        "la primera frase y mantienen la atención, con datos exactos y voz natural para narrar.",
      schema: SCRIPT_SCHEMA,
      effort: "high",
      signal: ctx.signal,
      prompt:
        `${channelBrief(ctx.channel)}\n\n## Video decidido\nTítulo: ${d.title}\nEnfoque: ${d.angle}\n` +
        `Formato: ${d.format}\nDuración objetivo: ${targetSeconds} s (~${targetWords} palabras narradas)\n` +
        `Tono: ${d.tone}\nGancho propuesto: ${idea?.hook ?? ""}\n\n## Espectador tipo\n${audience.persona.description}\n` +
        `Motivaciones: ${audience.persona.motivations.join("; ")}\nFrustraciones: ${audience.persona.frustrations.join("; ")}\n\n` +
        `## Plan de retención\n- ${audience.retentionPlan.join("\n- ")}\n\n## Notas de investigación\n${research.researchNotes}\n\n` +
        `## Fuentes numeradas\n${sourcesBlock(research.sources)}\n\n` +
        `${structure} Cada sección lleva la narración exacta y notas visuales. ` +
        `Lista en claims cada dato verificable que uses con el número de su fuente, o null ` +
        `si no tiene. ${LANGUAGE_RULE}` +
        feedbackBlock(ctx),
    });

    let checks = [];
    if (script.claims.length) {
      ctx.log(`Verificando ${script.claims.length} afirmaciones contra la investigación…`);
      const result = await ctx.services.llm.json({
        name: "script.factcheck",
        system:
          "Eres el verificador de datos de la productora. Eres estricto: si las notas no respaldan " +
          "claramente una afirmación, es 'sin_respaldo'.",
        schema: CHECK_SCHEMA,
        signal: ctx.signal,
        prompt:
          `## Notas de investigación\n${research.researchNotes}\n\n## Fuentes\n${sourcesBlock(research.sources)}\n\n` +
          `## Afirmaciones del guion\n${script.claims.map((c, i) => `${i}. ${c.text} [fuente: ${c.sourceId ?? "ninguna"}]`).join("\n")}\n\n` +
          `Para cada afirmación (claimIndex) di si las notas y fuentes la respaldan, no la respaldan o la contradicen, con una nota breve.`,
      });
      checks = result.checks;
    }
    const claims = script.claims.map((claim, i) => {
      const check = checks.find((c) => c.claimIndex === i);
      return { ...claim, verdict: check?.verdict ?? "sin_respaldo", note: check?.note ?? "No se pudo verificar." };
    });

    return { ...script, claims, ...scriptStats(script), targetSeconds };
  },

  validate(output, ctx) {
    const issues = [];
    const warnings = [];
    const sources = ctx.inputs?.["trend-researcher"]?.sources || [];
    if (!output.title?.trim()) issues.push("Falta el título.");
    if (!output.hook?.trim()) issues.push("Falta el gancho inicial.");
    const format = formatOf(ctx.channel);
    if (output.hook?.trim() && countWords(output.hook) > format.maxHookWords)
      issues.push(`El gancho es demasiado largo (más de ${format.maxHookWords} palabras para ${format.label}).`);
    if ((output.sections || []).length < format.minSections)
      issues.push(`El guion necesita al menos ${format.minSections} secciones.`);
    for (const [i, s] of (output.sections || []).entries())
      if (!s.narration?.trim()) issues.push(`La sección ${i + 1} no tiene narración.`);

    const bad = invalidSourceIds(
      (output.claims || []).map((c) => c.sourceId).filter((id) => id !== null),
      sources,
    );
    if (bad.length) issues.push(`Hay afirmaciones que citan fuentes inexistentes: ${bad.join(", ")}.`);
    for (const c of output.claims || []) {
      // En una versión editada por una persona, la decisión final es suya: se avisa, no se bloquea.
      if (c.verdict === "contradicho")
        (ctx.edited ? warnings : issues).push(`Dato contradicho por la investigación: «${c.text}». ${c.note}`);
      else if (c.verdict === "sin_respaldo") warnings.push(`Dato sin respaldo, revísalo antes de aprobar: «${c.text}».`);
    }

    const { estimatedSeconds } = scriptStats(output);
    if (output.targetSeconds) {
      const ratio = estimatedSeconds / output.targetSeconds;
      if (ratio < 0.4 || ratio > 2)
        issues.push(
          `La duración estimada (${Math.round(estimatedSeconds / 60)} min) está muy lejos del objetivo (${Math.round(output.targetSeconds / 60)} min).`,
        );
      else if (ratio < 0.75 || ratio > 1.35)
        warnings.push(`Duración estimada ${Math.round(estimatedSeconds / 60)} min frente a ${Math.round(output.targetSeconds / 60)} min de objetivo.`);
    }
    return { issues, warnings };
  },

  // Recalcula lo que depende del texto cuando el usuario edita el guion.
  normalize: (output) => ({ ...output, ...scriptStats(output) }),

  titleFrom: (output) => output.title?.trim() || null,
};
