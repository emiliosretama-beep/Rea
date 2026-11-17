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
    media: {
      root: env.FACTORY_MEDIA || fileURLToPath(new URL("../data/media", import.meta.url)),
    },
    tts: {
      python: env.FACTORY_PYTHON || "python3",
      script: fileURLToPath(new URL("../tools/tts_kokoro.py", import.meta.url)),
      modelPath: env.KOKORO_MODEL || fileURLToPath(new URL("../tools/models/kokoro-v1.0.int8.onnx", import.meta.url)),
      voicesPath: env.KOKORO_VOICES || fileURLToPath(new URL("../tools/models/voices-v1.0.bin", import.meta.url)),
      ffmpeg: env.FACTORY_FFMPEG || "ffmpeg",
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
