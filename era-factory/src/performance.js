// FASE 5 — Analista de rendimiento.
// No entra en la cadena de producción: trabaja cuando el usuario pega las
// métricas de un video ya publicado (pestaña «Resultados»). Compara con los
// otros videos del canal y guarda aprendizajes (insights) que leen el
// investigador, el analista de audiencia, el guionista y el de miniaturas.
// Solo usa las cifras que escribe el usuario: nada de promedios inventados.
import { LEARNING_FOR, baseline, cleanResults, metricLines, resultsSignature, todayLocal } from "../public/metrics.js";
import { channelBrief } from "./agents/shared.js";
import { HttpError } from "./http-error.js";

const AGENT_ID = "performance-analyst";
const MAX_COMPARE = 12;
const MAX_PREVIOUS = 8;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "worked", "didnt", "learnings", "nextTest"],
  properties: {
    verdict: { type: "string", enum: ["arriba", "en_linea", "abajo", "sin_referencia"] },
    summary: { type: "string", description: "2-4 frases: cómo le fue y por qué, citando las cifras." },
    worked: { type: "array", items: { type: "string" }, description: "De 1 a 4 cosas que funcionaron, cada una con su evidencia." },
    didnt: { type: "array", items: { type: "string" }, description: "De 1 a 4 cosas que no funcionaron o que faltan por medir." },
    learnings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["for", "text", "evidence"],
        properties: {
          for: { type: "string", enum: Object.keys(LEARNING_FOR) },
          text: { type: "string", description: "Instrucción concreta para ese agente en los próximos videos." },
          evidence: { type: "string", description: "La cifra o comparación que lo respalda." },
        },
      },
    },
    nextTest: { type: "string", description: "Un solo experimento para el próximo video: cambiar UNA cosa y qué cifra mirar." },
  },
};

const SYSTEM =
  "Eres el analista de rendimiento de una productora de videos cortos y de YouTube. Lees las métricas reales de un " +
  "video publicado, explicas qué funcionó y qué no, y conviertes eso en instrucciones concretas para el equipo. " +
  "Eres honesto: con pocos datos hablas de hipótesis, no de verdades.";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function createPerformance({ db, bus, llm }) {
  const running = new Map(); // productionId -> actividad (para la Oficina y el Centro)

  const log = (productionId, message, level = "info") =>
    bus.publish("log", db.addLog({ productionId, taskId: `pf-${productionId}`, agentId: AGENT_ID, level, message }));

  function save(productionId, form) {
    const production = db.getProduction(productionId);
    if (!production) throw new HttpError(404, "Producción no encontrada.");
    const { value, errors } = cleanResults(form);
    if (errors) throw new HttpError(400, "Revisa las métricas.", errors);
    const updated = db.updateProduction(productionId, {
      settings: { ...production.settings, results: { ...value, updatedAt: new Date().toISOString() } },
    });
    bus.publish("production", updated);
    return updated;
  }

  function buildPrompt({ production, channel, results, others, base, previous, tasks }) {
    const output = (id) => tasks.find((t) => t.agentId === id && t.status === "done")?.output;
    const decision = output("audience-analyst")?.decision;
    const script = output("scriptwriter");
    const thumb = output("thumbnail-designer")?.final;
    const seconds = decision?.targetLengthSeconds ?? (decision?.targetLengthMinutes ? decision.targetLengthMinutes * 60 : null);
    const days = results.publishedAt
      ? Math.max(0, Math.floor((Date.now() - Date.parse(`${results.publishedAt}T12:00:00`)) / 864e5))
      : null;
    return `Fecha de hoy: ${todayLocal()}.

${channelBrief(channel)}

## El video
Título: ${production.title}
Plataforma: ${results.platform}
Publicado: ${results.publishedAt ? `${results.publishedAt} (hace ${plural(days, "día")})` : "fecha no indicada"}
${decision ? `Formato decidido: ${decision.format} · duración objetivo ${seconds ?? "?"} s · tono ${decision.tone}\nEnfoque: ${decision.angle}` : "Sin decisión de audiencia guardada."}
Gancho: ${script?.hook ?? "—"}
Secciones: ${script?.sections?.map((s) => s.heading).join(" · ") || "—"}
Llamada a la acción: ${script?.callToAction ?? "—"}
Miniatura o portada: ${thumb ? `«${thumb.headline}» (diseño ${thumb.layout}, paleta ${thumb.palette})` : "sin miniatura aprobada"}

## Métricas de este video
${metricLines(results.metrics)}
Notas del productor: ${results.notes || "ninguna"}

## Otros videos del canal con métricas
${
  others.length
    ? others
        .map((o) => {
          const r = o.settings.results;
          return `### ${o.title} (${r.platform}${r.publishedAt ? `, ${r.publishedAt}` : ""})\n${metricLines(r.metrics)}`;
        })
        .join("\n")
    : "Ninguno: es el primer video del canal con métricas."
}
${
  base.rows.length
    ? `\n## Comparación (mediana de ${plural(base.n, "video")}${base.samePlatform ? " de la misma plataforma" : ""})\n` +
      base.rows.map((r) => `- ${r.label}: este ${r.actual} · mediana ${r.mediana}`).join("\n")
    : ""
}

## Aprendizajes que el equipo ya tiene (no los repitas; confírmalos o corrígelos si las cifras lo justifican)
${previous.length ? previous.map((i) => `- ${JSON.stringify(i.content.aprendizajes ?? i.content)}`).join("\n") : "Ninguno todavía."}

Reglas:
- Usa SOLO las cifras de arriba. No inventes promedios de la industria, porcentajes ni datos. Si mencionas referencias generales de la plataforma, dilas como orientación aproximada y sin números.
- verdict: "arriba", "en_linea" o "abajo" solo si hay al menos 2 videos para comparar; si no, "sin_referencia".
- Con menos de 3 videos para comparar, dilo en el resumen y plantea los aprendizajes como hipótesis a probar.
- Si el video tiene menos de 2 días publicado o no hay fecha, avisa que las cifras aún pueden cambiar.
- Si falta una métrica clave (por ejemplo la retención), dilo en «didnt» como algo que conviene medir.
- De 2 a 5 aprendizajes. Cada uno es una instrucción accionable para UN agente: investigador (qué temas o ángulos buscar), audiencia (formato, duración, tono), guionista (gancho, ritmo, cierre, llamada a la acción) o miniaturas (portada y titular). Incluye la evidencia.
- nextTest: un solo experimento para el próximo video (cambiar UNA cosa) y qué cifra mirar para saber si funcionó.
- Escribe en español, con frases cortas y claras.`;
  }

  async function analyze(productionId) {
    const production = db.getProduction(productionId);
    if (!production) throw new HttpError(404, "Producción no encontrada.");
    const results = production.settings?.results;
    if (!results) throw new HttpError(400, "Primero guarda las métricas del video.");
    if (running.has(productionId)) throw new HttpError(409, "El analista ya está revisando este video.");

    const channel = db.getChannel(production.channelId);
    const others = db
      .listProductions({ channelId: production.channelId })
      .filter((p) => p.id !== productionId && p.settings?.results)
      .slice(0, MAX_COMPARE);
    const base = baseline(others.map((p) => p.settings.results), results);
    const previous = db
      .listInsights(production.channelId)
      .filter((i) => i.content?.productionId !== productionId)
      .slice(0, MAX_PREVIOUS);

    running.set(productionId, { id: `pf-${productionId}`, agentId: AGENT_ID, productionId, startedAt: new Date().toISOString() });
    bus.publish("production", production);
    try {
      log(productionId, `Analista de rendimiento: revisando las métricas de «${production.title}»${others.length ? ` contra ${plural(others.length, "video")} del canal` : ""}…`);
      const out = await llm.json({
        name: "performance.analyze",
        system: SYSTEM,
        schema: SCHEMA,
        prompt: buildPrompt({ production, channel, results, others, base, previous, tasks: db.listTasks(productionId) }),
      });
      const analysis = {
        // Con menos de 2 videos no hay con qué comparar, diga lo que diga el modelo.
        verdict: others.length < 2 ? "sin_referencia" : out.verdict,
        summary: out.summary,
        worked: out.worked.slice(0, 4),
        didnt: out.didnt.slice(0, 4),
        learnings: out.learnings.filter((l) => LEARNING_FOR[l.for] && l.text?.trim()).slice(0, 5),
        nextTest: out.nextTest,
        baseline: base,
        analyzedAt: new Date().toISOString(),
        basedOn: resultsSignature(results),
      };
      if (!analysis.learnings.length) throw new HttpError(502, "El analista no devolvió aprendizajes. Pulsa Volver a analizar.");
      const now = db.getProduction(productionId);
      if (!now) throw new HttpError(404, "La producción se eliminó durante el análisis.");
      db.updateProduction(productionId, { settings: { ...now.settings, analysis } });
      // Un solo bloque de aprendizajes por video: el nuevo sustituye al anterior.
      db.removeInsights((i) => i.content?.productionId === productionId);
      db.addInsight({
        channelId: production.channelId,
        source: "Analista de rendimiento",
        content: {
          productionId,
          video: production.title,
          plataforma: results.platform,
          resultado: analysis.verdict,
          metricas: results.metrics,
          aprendizajes: analysis.learnings.map((l) => `[${LEARNING_FOR[l.for]}] ${l.text}`),
          proximaPrueba: analysis.nextTest,
        },
      });
      log(productionId, `Analista de rendimiento: ${plural(analysis.learnings.length, "aprendizaje")} enviado${analysis.learnings.length === 1 ? "" : "s"} al equipo.`, "success");
      return db.getProduction(productionId);
    } catch (err) {
      const message = err?.message || "No se pudo analizar.";
      log(productionId, `Analista de rendimiento: ${message}`, "error");
      throw err instanceof HttpError ? err : new HttpError(err?.kind === "config" ? 503 : 502, message);
    } finally {
      running.delete(productionId);
      const p = db.getProduction(productionId);
      if (p) bus.publish("production", p);
    }
  }

  return { save, analyze, activity: () => [...running.values()] };
}
