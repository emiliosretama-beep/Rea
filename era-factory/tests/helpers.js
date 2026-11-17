import { loadConfig } from "../src/config.js";
import { createFactory } from "../src/factory.js";
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
  const factory = await createFactory(config, { dbPath: ":memory:", llm, youtube });
  const events = [];
  factory.bus.subscribe((e) => events.push(e));
  return { factory, llm, events };
}

export const tasksOf = (factory, productionId) =>
  Object.fromEntries(factory.db.listTasks(productionId).map((t) => [t.agentId, t]));
