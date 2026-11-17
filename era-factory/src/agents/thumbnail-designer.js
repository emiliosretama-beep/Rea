// AGENTE 5 — Diseñador de miniaturas.
// Claude propone 10 miniaturas DISTINTAS como especificaciones (diseño,
// paleta, fondo, icono, titular corto…) y recomienda 3. El dibujador
// (public/thumbs/render.js) las pinta igual en el servidor y en la versión
// online. Tú comparas, editas la que te guste y la apruebas.
//
// No genera fotos: ningún servicio de imágenes está conectado. Son
// composiciones gráficas con tipografía, icono y color.
import { BACKGROUNDS, ICONS, LAYOUTS, LIMITS, PALETTES, checkSpec } from "../../public/thumbs/catalog.js";
import { LANGUAGE_RULE, channelBrief, feedbackBlock } from "./shared.js";

export const PROPOSALS = 10;

const SPEC_PROPS = {
  layout: { type: "string", enum: Object.keys(LAYOUTS) },
  background: { type: "string", enum: Object.keys(BACKGROUNDS) },
  palette: { type: "string", enum: Object.keys(PALETTES) },
  icon: { type: "string", enum: Object.keys(ICONS) },
  headline: { type: "string", description: `Máximo ${LIMITS.headlineWords} palabras y ${LIMITS.headlineChars} caracteres.` },
  accentWord: { type: "string", description: "Una palabra EXACTA del titular para resaltar, o cadena vacía." },
  subline: { type: "string", description: `Opcional, máximo ${LIMITS.sublineChars} caracteres; cadena vacía si no hace falta.` },
  badge: { type: "string", description: `Etiqueta opcional, máximo ${LIMITS.badgeChars} caracteres; cadena vacía si no hace falta.` },
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["proposals", "recommended"],
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["concept", "rationale", ...Object.keys(SPEC_PROPS)],
        properties: {
          concept: { type: "string", description: "Nombre corto de la idea (ej. «Curiosidad», «Comparación»)." },
          rationale: { type: "string", description: "Por qué haría clic este público." },
          ...SPEC_PROPS,
        },
      },
    },
    recommended: {
      type: "array",
      description: "Las 3 mejores, de más a menos recomendada.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "reason"],
        properties: { index: { type: "integer" }, reason: { type: "string" } },
      },
    },
  },
};

const catalogText = () =>
  [
    `Diseños: ${Object.entries(LAYOUTS).map(([k, v]) => `${k} (${v})`).join("; ")}`,
    `Fondos: ${Object.entries(BACKGROUNDS).map(([k, v]) => `${k} (${v})`).join("; ")}`,
    `Paletas: ${Object.entries(PALETTES).map(([k, v]) => `${k} (${v.label})`).join("; ")}`,
    `Iconos: ${Object.entries(ICONS).map(([k, v]) => `${k} (${v.label})`).join("; ")}`,
  ].join("\n");

// Números que aparecen en un texto (2026, 3, 8,5…). Sirve para no inventar cifras.
const numbersIn = (text) => String(text || "").match(/\d+(?:[.,]\d+)?/g) ?? [];

function scriptText(script) {
  if (!script) return "";
  return [script.title, script.hook, ...(script.sections || []).map((s) => `${s.heading} ${s.narration}`), script.outro].join(" ");
}

const specOf = ({ layout, background, palette, icon, headline, accentWord, subline, badge }) => ({
  layout,
  background,
  palette,
  icon,
  headline: String(headline || "").trim(),
  accentWord: String(accentWord || "").trim(),
  subline: String(subline || "").trim(),
  badge: String(badge || "").trim(),
});

export const thumbnailDesigner = {
  id: "thumbnail-designer",
  name: "Diseñador de miniaturas",
  role: "Miniaturas",
  phase: 3,
  implemented: true,
  description: "Propone 10 miniaturas 1280×720 distintas, recomienda las 3 mejores y te deja comparar, editar y elegir la final.",
  dependsOn: ["scriptwriter", "audience-analyst"],
  requiresApproval: true,

  async run(ctx) {
    const script = ctx.inputs.scriptwriter;
    const audience = ctx.inputs["audience-analyst"];
    ctx.log(`Diseñando ${PROPOSALS} miniaturas para «${script.title}»…`);
    const result = await ctx.services.llm.json({
      name: "thumbs.design",
      system:
        "Eres el diseñador de miniaturas de una productora de YouTube. Una miniatura se entiende en medio " +
        "segundo y en un celular: pocas palabras, enormes, con contraste y una sola idea. Nunca prometes algo " +
        "que el video no cumple.",
      schema: SCHEMA,
      signal: ctx.signal,
      prompt:
        `${channelBrief(ctx.channel)}\n\n## El video\nTítulo: ${script.title}\nGancho: ${script.hook}\n` +
        `Secciones: ${script.sections.map((s) => s.heading).join(" · ")}\n\n## Espectador tipo\n${audience.persona.description}\n` +
        `Le mueve: ${audience.persona.motivations.join("; ")}\n\n## Lo que puedes usar\n${catalogText()}\n\n` +
        `Propón exactamente ${PROPOSALS} miniaturas MUY distintas entre sí: usa al menos 5 diseños y 4 paletas ` +
        `diferentes y prueba ángulos distintos (curiosidad, beneficio, comparación, advertencia, número, pregunta). ` +
        `El titular de la miniatura NO repite el título del video: lo complementa. Máximo ${LIMITS.headlineWords} ` +
        `palabras. No uses cifras, fechas ni datos que no estén en el guion. Después elige las 3 mejores para este ` +
        `público (índices desde 0) y explica por qué. ${LANGUAGE_RULE}` +
        feedbackBlock(ctx),
    });
    return {
      generatedAt: new Date().toISOString(),
      proposals: result.proposals.map((p, i) => ({ id: i, concept: p.concept, rationale: p.rationale, spec: specOf(p) })),
      recommended: result.recommended,
      selected: null,
      final: null,
    };
  },

  validate(output, ctx) {
    const issues = [];
    const warnings = [];
    const proposals = output.proposals || [];
    if (proposals.length !== PROPOSALS) issues.push(`Se pidieron ${PROPOSALS} propuestas y llegaron ${proposals.length}.`);
    const allowedNumbers = new Set(numbersIn(scriptText(ctx.inputs?.scriptwriter)));
    proposals.forEach((p, i) => {
      for (const problem of checkSpec(p.spec)) issues.push(`Propuesta ${i + 1}: ${problem}.`);
      const invented = numbersIn(`${p.spec.headline} ${p.spec.subline} ${p.spec.badge}`).filter((n) => !allowedNumbers.has(n));
      if (invented.length) issues.push(`Propuesta ${i + 1}: usa cifras que no están en el guion (${invented.join(", ")}).`);
    });
    if (new Set(proposals.map((p) => p.spec.layout)).size < 5) issues.push("Las propuestas se parecen demasiado: usa al menos 5 diseños distintos.");
    if (new Set(proposals.map((p) => p.spec.palette)).size < 4) issues.push("Usa al menos 4 paletas distintas.");
    const headlines = new Set(proposals.map((p) => p.spec.headline.toLowerCase()));
    if (headlines.size < Math.min(PROPOSALS, 7)) issues.push("Hay demasiados titulares repetidos.");
    const rec = (output.recommended || []).map((r) => r.index);
    if (rec.length !== 3 || new Set(rec).size !== 3 || rec.some((i) => !(i >= 0 && i < proposals.length)))
      issues.push("Recomienda exactamente 3 propuestas distintas que existan.");

    // Al aprobar: tiene que haber una elegida y su versión final debe poder dibujarse.
    if (output.final) {
      for (const problem of checkSpec(output.final)) issues.push(`Tu miniatura final: ${problem}.`);
      if (!(output.selected >= 0 && output.selected < proposals.length)) issues.push("La miniatura elegida no existe.");
    }
    return { issues, warnings };
  },

  // La aprobación exige elegir una (y guarda tu versión editada como final).
  approvalCheck: (output) => (output?.final ? null : "Elige una miniatura antes de aprobar."),
  normalize: (output) => (output.final ? { ...output, final: specOf(output.final) } : output),
};
