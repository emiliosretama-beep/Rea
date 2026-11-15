// Textos que dependen de lo que Jarvis esté haciendo. Funciones puras:
// reciben el estado y devuelven qué mostrar.
import { USER_NAME } from "./prompt.js";

// La línea bajo el nombre, en el encabezado.
export function statusText({ phase, listening, speakingId, backend }) {
  if (phase === "thinking") return "pensando…";
  if (phase === "streaming") return "respondiendo…";
  if (listening) return "escuchando…";
  if (speakingId) return "hablando…";
  if (!backend) return "conectando…";
  return backend.mode === "cloud" ? "en línea" : "modo demo";
}

// El aviso sobre lo que esta vista no puede hacer, o null si todo funciona.
// `action` es el texto del botón cuando el aviso ofrece una salida.
export function noticeFor({ backend, store }) {
  if (store?.sync === "error")
    return { text: "Perdí la conexión con tu memoria.", action: "Reintentar" };
  const demo = backend?.mode === "demo";
  const session = Boolean(store) && !store.persistent;
  if (demo && session)
    return {
      text: "Modo demo y sin memoria: respuestas fijas y nada se guarda al cerrar.",
    };
  if (demo)
    return {
      text: "Modo demo: respuestas fijas. Ábreme desde Claude para usar la IA.",
    };
  if (session)
    return {
      text: "Sin memoria en esta vista: tareas y recuerdos se pierden al cerrar.",
    };
  return null;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  let part = "Buenas noches";
  if (hour >= 5 && hour < 12) part = "Buenos días";
  else if (hour >= 12 && hour < 19) part = "Buenas tardes";
  return `${part}, ${USER_NAME}`;
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// Resumen bajo el saludo: cuántas tareas quedan y cuántos recuerdos hay.
export function telemetry(store) {
  if (!store) return "Conectando con tu memoria…";
  const pending = store.tasks.filter((task) => !task.done).length;
  const memories = store.memories.length;
  const tasks = pending
    ? plural(pending, "pendiente", "pendientes")
    : "Sin pendientes";
  const kept = memories
    ? plural(memories, "recuerdo", "recuerdos")
    : "sin recuerdos";
  return `${tasks} · ${kept}`;
}
