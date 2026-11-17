import { loadConfig } from "../src/config.js";
import { createFactory } from "../src/factory.js";
import { openMemoryDatabase } from "../src/db-memory.js";
import { mockLLM } from "../src/llm.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";

export const CHANNEL = {
  name: "Canal de prueba",
  niche: "tecnología",
  language: "Español",
  audience: "Jóvenes de 18 a 30 años",
  videoType: "Explicaciones de 8 minutos",
  frequency: "2 por semana",
};

export const offlineYouTube = { connected: false, topVideos: async () => null };

export async function makeFactory({ fixtures = {}, youtube = offlineYouTube, env = {} } = {}) {
  const config = loadConfig({ FACTORY_MAX_ATTEMPTS: "3", ...env });
  const llm = mockLLM({ ...MOCK_FIXTURES, ...fixtures });
  // FACTORY_TEST_DB=memory corre la misma batería contra la base de la versión online.
  const db = process.env.FACTORY_TEST_DB === "memory" ? openMemoryDatabase() : undefined;
  const factory = await createFactory(config, { dbPath: ":memory:", db, llm, youtube });
  const events = [];
  factory.bus.subscribe((e) => events.push(e));
  return { factory, llm, events };
}

export const tasksOf = (factory, productionId) =>
  Object.fromEntries(factory.db.listTasks(productionId).map((t) => [t.agentId, t]));
