// Ensambla la fábrica a partir de piezas ya creadas. Sin nada de Node: lo
// usan el servidor (factory.js) y la versión online (cloud/boot.js).
import { createRegistry } from "./agents/index.js";
import { createEventBus } from "./events.js";
import { createOrchestrator } from "./orchestrator.js";

export function assembleFactory({ config, db, services, registry = createRegistry() }) {
  const bus = createEventBus();
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
