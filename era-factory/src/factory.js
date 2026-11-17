// Fábrica del servidor (Node): SQLite, Claude por API key y YouTube. Los
// tests inyectan una base de datos, un LLM y un YouTube de prueba.
import { openDatabase } from "./db.js";
import { assembleFactory } from "./factory-core.js";
import { createLLM } from "./llm.js";
import { createYouTube } from "./services/youtube.js";

export async function createFactory(config, overrides = {}) {
  return assembleFactory({
    config,
    db: overrides.db ?? openDatabase(overrides.dbPath ?? config.dbPath),
    services: {
      llm: overrides.llm ?? (await createLLM(config)),
      youtube: overrides.youtube ?? createYouTube(config.youtube),
    },
    registry: overrides.registry,
  });
}
