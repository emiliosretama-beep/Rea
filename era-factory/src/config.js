// Configuración única de la fábrica. Todo lo que viene del entorno se lee y se
// interpreta aquí, una sola vez; el resto del código recibe este objeto.
// Las API keys nunca salen del servidor: /api/status solo dice si existen.
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

function intFrom(value, fallback) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env = process.env) {
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  // FACTORY_LLM=mock activa datos de prueba (solo desarrollo). Sin key y sin
  // mock, los agentes que necesitan IA fallan con un mensaje claro.
  const llmMode = env.FACTORY_LLM === "mock" ? "mock" : hasAnthropic ? "claude" : "none";
  return {
    root: ROOT,
    port: intFrom(env.PORT, 5180),
    dbPath: env.FACTORY_DB || fileURLToPath(new URL("../data/factory.db", import.meta.url)),
    llm: {
      mode: llmMode,
      model: env.FACTORY_MODEL || "claude-opus-5-5",
      maxSearches: intFrom(env.FACTORY_MAX_SEARCHES, 6),
    },
    youtube: {
      apiKey: env.YOUTUBE_API_KEY || null,
      regionCode: env.YOUTUBE_REGION || "MX",
    },
    orchestrator: {
      maxAttempts: intFrom(env.FACTORY_MAX_ATTEMPTS, 3),
      concurrency: intFrom(env.FACTORY_CONCURRENCY, 2),
    },
  };
}

// Lo que la interfaz puede saber de la configuración (sin secretos).
export function publicStatus(config) {
  return {
    llm: { mode: config.llm.mode, model: config.llm.mode === "claude" ? config.llm.model : null },
    youtube: { connected: Boolean(config.youtube.apiKey), region: config.youtube.regionCode },
  };
}
