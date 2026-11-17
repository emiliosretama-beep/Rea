// Ensambla la fábrica: base de datos, bus de eventos, servicios, agentes y
// coordinador. El servidor y los tests la crean igual; los tests inyectan un
// LLM y un YouTube de prueba.
import { createRegistry } from "./agents/index.js";
import { createEventBus } from "./events.js";
import { createLLM } from "./llm.js";
import { openDatabase } from "./db.js";
import { createOrchestrator } from "./orchestrator.js";
import { createYouTube } from "./services/youtube.js";

export async function createFactory(config, overrides = {}) {
  const db = openDatabase(overrides.dbPath ?? config.dbPath);
  const bus = createEventBus();
  const services = {
    llm: overrides.llm ?? (await createLLM(config)),
    youtube: overrides.youtube ?? createYouTube(config.youtube),
  };
  const registry = overrides.registry ?? createRegistry();
  const orchestrator = createOrchestrator({ db, bus, registry, services, config });
  return {
    config,
    db,
    bus,
    services,
    registry,
    orchestrator,
    async close() {
      await orchestrator.stop();
      db.close();
    },
  };
}
