// Lista de mensajes del chat. Cada mensaje es
// { id, role: "user" | "assistant" | "mode", content, status, error,
//   truncated, actions: [{ label, failed, undo, undone }] }.
// Los mensajes de Jarvis se pintan con Markdown; los de Emilio, como texto.
import { renderMarkdown } from "./markdown.js";
import { el } from "./ui.js";

const NOTES = {
  stopped: "Detenido.",
  truncated: "Se cortó por longitud. Pídeme que continúe.",
};
const STICK_DISTANCE = 96;
// Marca de "todavía no hay texto" para no repintar el mismo estado.
const WAITING = Symbol("pensando");
// "Copiar" y "Escuchar" solo en respuestas largas: en una frase corta son ruido.
const LONG_REPLY_CHARS = 240;

function buildRow(message) {
  const row = el("li", {
    class: `msg msg--${message.role}`,
    "data-id": message.id,
  });
  if (message.role === "user")
    row.append(el("div", { class: "bubble", text: message.content }));
  else if (message.role === "mode")
    row.append(el("span", { text: `Modo ${message.content}` }));
  else
    row.append(
      el("div", { class: "md" }),
      el("p", { class: "msg-note", hidden: true }),
      el("ul", { class: "acts", hidden: true }),
      el("div", { class: "msg-tools", hidden: true }),
    );
  return row;
}

function actionItem(action, index) {
  const item = el("li", { class: action.failed ? "act act--failed" : "act" });
  item.append(
    el("span", {
      text: action.undone ? `${action.label} (restaurado)` : action.label,
    }),
  );
  if (action.undo && !action.undone)
    item.append(
      el("button", { type: "button", "data-undo": index, text: "Deshacer" }),
    );
  return item;
}

// El texto pequeño bajo una respuesta: por qué falló, se detuvo o se cortó.
function noteFor(message) {
  if (message.status === "error") return message.error;
  if (message.status === "stopped") return NOTES.stopped;
  return message.truncated ? NOTES.truncated : "";
}

export function createChatView({ scroller, log }) {
  const rows = new Map();
  const painted = new Map();
  let canSpeak = false;
  let speakingId = null;

  const nearBottom = () =>
    scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <
    STICK_DISTANCE;
  const toBottom = () => {
    scroller.scrollTop = scroller.scrollHeight;
  };

  function paintTools(row, message, isLast) {
    const tools = row.querySelector(".msg-tools");
    const settled = ["done", "stopped", "error"].includes(message.status);
    const buttons = [];
    const long = message.content.length >= LONG_REPLY_CHARS;
    const speaking = speakingId === message.id;
    if (settled && long)
      buttons.push(
        el("button", { type: "button", "data-act": "copy", text: "Copiar" }),
      );
    // Escuchar: en respuestas largas y en las que debían sonar (por si la voz
    // no arrancó sola). Mientras suena, el mismo botón la calla.
    const hearable = long || speaking || message.spoken;
    if (settled && canSpeak && hearable && message.status !== "error")
      buttons.push(
        el("button", {
          type: "button",
          "data-act": "speak",
          "aria-pressed": String(speaking),
          text: speaking ? "Detener voz" : "Escuchar",
        }),
      );
    // Con acciones ya ejecutadas no se reintenta: se repetirían.
    const failed = message.status === "error" || message.status === "stopped";
    if (isLast && failed && !message.actions?.length)
      buttons.push(
        el("button", {
          type: "button",
          "data-act": "retry",
          text: "Reintentar",
        }),
      );
    tools.replaceChildren(...buttons);
    tools.hidden = buttons.length === 0;
  }

  function paintJarvis(row, message, isLast) {
    row.dataset.status = message.status;
    const body = row.querySelector(".md");
    const shown =
      !message.content && message.status === "thinking"
        ? WAITING
        : message.content;
    // El Markdown solo se vuelve a generar si el texto cambió.
    if (painted.get(message.id) !== shown) {
      painted.set(message.id, shown);
      if (shown === WAITING)
        body.replaceChildren(el("p", { class: "thinking", text: "Pensando…" }));
      else body.innerHTML = renderMarkdown(shown);
    }
    const note = row.querySelector(".msg-note");
    const noteText = noteFor(message);
    note.textContent = noteText;
    note.hidden = !noteText;
    note.classList.toggle("msg-note--error", message.status === "error");

    const acts = row.querySelector(".acts");
    acts.replaceChildren(...(message.actions ?? []).map(actionItem));
    acts.hidden = !message.actions?.length;
    paintTools(row, message, isLast);
  }

  return {
    // Crea o actualiza un mensaje. `isLast` decide si se ofrece "Reintentar".
    upsert(message, { isLast = false, stick = false } = {}) {
      const follow = stick || nearBottom();
      let row = rows.get(message.id);
      if (!row) {
        row = buildRow(message);
        rows.set(message.id, row);
        log.append(row);
      }
      if (message.role === "assistant") paintJarvis(row, message, isLast);
      if (follow) toBottom();
    },
    remove(id) {
      rows.get(id)?.remove();
      rows.delete(id);
      painted.delete(id);
    },
    clear() {
      log.replaceChildren();
      rows.clear();
      painted.clear();
    },
    toBottom,
    setCanSpeak(value) {
      canSpeak = value;
    },
    setSpeaking(id) {
      speakingId = id;
    },
  };
}
