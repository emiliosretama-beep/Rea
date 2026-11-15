// La conversación en curso se guarda solo en este dispositivo. Es una
// comodidad: el almacenamiento puede faltar (ventana privada, datos
// bloqueados) y la página funciona igual. Tareas y memoria viven en `db`.
import { MODE_IDS } from "./prompt.js";

const CHAT_KEY = "jarvis:chat:v1";
const KEEP_MESSAGES = 60;
const ROLES = ["user", "assistant", "mode"];

// Devuelve { mode, messages } con lo guardado (validado campo por campo), o
// null si no hay nada que recuperar.
export function readChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null");
    if (!Array.isArray(saved?.messages)) return null;
    const messages = [];
    for (const item of saved.messages) {
      if (!ROLES.includes(item?.role)) continue;
      if (typeof item.content !== "string" || !item.content) continue;
      messages.push({
        role: item.role,
        content: item.content,
        status: item.status === "stopped" ? "stopped" : "done",
        truncated: item.truncated === true,
        actions: Array.isArray(item.actions)
          ? item.actions.filter((action) => typeof action?.label === "string")
          : [],
      });
    }
    return {
      mode: MODE_IDS.includes(saved.mode) ? saved.mode : null,
      messages,
    };
  } catch {
    return null;
  }
}

// Guarda los últimos mensajes terminados; los que fallaron no se conservan.
export function writeChat(mode, messages) {
  try {
    const kept = messages
      .filter(
        (message) => message.role !== "assistant" || message.status !== "error",
      )
      .filter((message) => message.content)
      .slice(-KEEP_MESSAGES)
      .map(({ role, content, status, truncated, actions }) => ({
        role,
        content,
        status,
        truncated,
        actions,
      }));
    localStorage.setItem(CHAT_KEY, JSON.stringify({ mode, messages: kept }));
  } catch {
    // Si no se puede guardar, la conversación sigue en pantalla.
  }
}
