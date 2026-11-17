// Estado compartido de la interfaz: lo que dice /api/status (modo de IA,
// agentes, actividad, resumen). Se refresca con cada evento en vivo.
import { api } from "./lib.js";

export const store = { status: null, listeners: new Set() };

let pending = null;
export function refreshStatus() {
  pending ??= api("GET", "/api/status")
    .then((status) => {
      store.status = status;
      for (const fn of store.listeners) fn(status);
      return status;
    })
    .finally(() => (pending = null));
  return pending;
}

export const agentName = (id) => store.status?.agents.find((a) => a.id === id)?.name ?? id;

// Agrupa muchas llamadas seguidas en una sola (los eventos llegan en ráfagas).
export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
