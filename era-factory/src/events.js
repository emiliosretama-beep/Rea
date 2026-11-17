// Bus de eventos en memoria: el coordinador publica y la interfaz escucha
// (por SSE en el servidor, directamente en la versión online). Sin
// dependencias de Node para que corra igual en el navegador.
export function createEventBus() {
  const listeners = new Set();
  return {
    publish(type, payload) {
      const event = { type, payload, at: new Date().toISOString() };
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (err) {
          console.error(err);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
