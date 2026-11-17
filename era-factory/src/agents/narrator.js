// AGENTE 4 — Narrador.
// Convierte el guion aprobado en narración con Kokoro (voz e idioma a elegir)
// y marca cuándo empieza y termina cada sección en la pista completa.
// No usa Claude: el texto es el del guion aprobado, tal cual. Necesita tu
// aprobación (escúchalo antes de seguir).
import { LLMError } from "../errors.js";
import { LANGUAGES, resolveNarration, voiceById } from "../voices.js";

// Limpia lo que no se debe leer en voz alta (marcas de formato, acotaciones).
export function speakable(text) {
  return String(text || "")
    .replace(/\[[^\]]*\]/g, " ") // [acotaciones]
    .replace(/[*_#`>]+/g, " ") // markdown
    .replace(/https?:\/\/\S+/g, " ") // enlaces
    .replace(/\s+/g, " ")
    .trim();
}

export function narrationSegments(script) {
  const segments = [
    { id: "hook", label: "Gancho", text: speakable(script.hook) },
    ...(script.sections || []).map((s, i) => ({ id: `s${i + 1}`, label: s.heading || `Sección ${i + 1}`, text: speakable(s.narration) })),
    { id: "outro", label: "Cierre", text: speakable([script.outro, script.callToAction].filter(Boolean).join(" ")) },
  ];
  return segments.filter((s) => s.text.length > 0);
}

export const narrator = {
  id: "narrator",
  name: "Narrador",
  role: "Voz",
  phase: 2,
  implemented: true,
  description: "Convierte el guion aprobado en narración con Kokoro TTS, con la voz e idioma que elijas, y marca los tiempos de cada sección.",
  dependsOn: ["scriptwriter"],
  requiresApproval: true,

  async run(ctx) {
    const { tts } = ctx.services;
    if (!tts) throw new LLMError("Esta versión de ERA Factory no puede generar audio.", { kind: "config" });
    const settings = resolveNarration(ctx.channel.language, ctx.production.settings?.narration);
    if (settings.error) throw new LLMError(settings.error, { kind: "config" });
    const script = ctx.inputs.scriptwriter;
    const segments = narrationSegments(script);
    if (!segments.length) throw new LLMError("El guion no tiene texto para narrar.", { kind: "config" });

    const voice = voiceById(settings.voice);
    ctx.log(
      `Narrando ${segments.length} secciones con la voz ${voice.label} (${LANGUAGES[settings.language].label}, velocidad ${settings.speed}).`,
    );
    const result = await tts.narrate({
      productionId: ctx.production.id,
      segments,
      voice: settings.voice,
      language: settings.language,
      speed: settings.speed,
      signal: ctx.signal,
      onProgress: (e) => ctx.log(`Sección ${e.index} de ${e.total} lista (${e.duration.toFixed(1)} s).`),
    });

    const byId = new Map(result.segments.map((s) => [s.id, s]));
    return {
      engine: tts.engine,
      voice: settings.voice,
      voiceLabel: voice.label,
      language: settings.language,
      speed: settings.speed,
      generatedAt: new Date().toISOString(),
      full: result.full,
      targetSeconds: script.targetSeconds ?? null,
      segments: segments.map((s) => ({ ...s, ...byId.get(s.id) })),
    };
  },

  validate(output, ctx) {
    const issues = [];
    const warnings = [];
    const expected = ctx.inputs?.scriptwriter ? narrationSegments(ctx.inputs.scriptwriter).map((s) => s.id) : null;
    const got = new Set((output.segments || []).filter((s) => s.duration > 0.3 && s.file).map((s) => s.id));
    for (const id of expected ?? []) if (!got.has(id)) issues.push(`Falta el audio de la sección «${id}».`);
    if (!(output.full?.duration > 0) || !output.full?.file) issues.push("Falta la pista de narración completa.");
    if (output.targetSeconds && output.full?.duration) {
      const ratio = output.full.duration / output.targetSeconds;
      if (ratio < 0.7 || ratio > 1.4)
        warnings.push(
          `La narración dura ${Math.round(output.full.duration)} s y el objetivo era ${output.targetSeconds} s. Ajusta la velocidad o el guion.`,
        );
    }
    return { issues, warnings };
  },
};
