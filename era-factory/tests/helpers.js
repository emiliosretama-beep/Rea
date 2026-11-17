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

// Voz simulada: devuelve tiempos como Kokoro, sin generar audio.
export function fakeTTS({ fail } = {}) {
  const calls = [];
  return {
    calls,
    engine: "Kokoro (simulado)",
    availability: () => ({ ok: true, reason: null }),
    async narrate(job) {
      calls.push(job);
      if (fail) throw fail;
      let clock = 0;
      const segments = job.segments.map((s) => {
        const duration = Math.max(1, s.text.split(" ").length / 2.5);
        const seg = { id: s.id, file: `narration-x/${s.id}.mp3`, start: clock, end: clock + duration, duration };
        clock += duration + 0.6;
        job.onProgress?.({ index: 1, total: job.segments.length, id: s.id, duration });
        return seg;
      });
      return { folder: "narration-x", segments, full: { file: "narration-x/full.mp3", duration: clock - 0.6 } };
    },
    removed: [],
    async removeProduction(id) {
      this.removed.push(id);
    },
  };
}

export async function makeFactory({ fixtures = {}, youtube = offlineYouTube, tts = fakeTTS(), env = {} } = {}) {
  const config = loadConfig({ FACTORY_MAX_ATTEMPTS: "3", ...env });
  const llm = mockLLM({ ...MOCK_FIXTURES, ...fixtures });
  // FACTORY_TEST_DB=memory corre la misma batería contra la base de la versión online.
  const db = process.env.FACTORY_TEST_DB === "memory" ? openMemoryDatabase() : undefined;
  const factory = await createFactory(config, { dbPath: ":memory:", db, llm, youtube, tts });
  const events = [];
  factory.bus.subscribe((e) => events.push(e));
  return { factory, llm, events };
}

export const tasksOf = (factory, productionId) =>
  Object.fromEntries(factory.db.listTasks(productionId).map((t) => [t.agentId, t]));
