// Bus de eventos en memoria: el orquestador publica y el servidor lo reenvía a
// cada navegador conectado por SSE (/api/events) para el progreso en vivo.
import { EventEmitter } from "node:events";

export function createEventBus() {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(100);
  return {
    publish(type, payload) {
      emitter.emit("event", { type, payload, at: new Date().toISOString() });
    },
    subscribe(listener) {
      emitter.on("event", listener);
      return () => emitter.off("event", listener);
    },
  };
}
