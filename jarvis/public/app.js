// Jarvis, el asistente personal de Emilio. Este archivo une las piezas: estado
// de la conversación, envío de mensajes, modos, voz y paneles.
import { AskError, createBackend } from "./backend.js";
import { createChatView } from "./chat.js";
import { coreMarkup, createCore, dockCore } from "./core.js";
import { createPanels } from "./panels.js";
import { MODES, MODE_IDS } from "./prompt.js";
import { readChat, writeChat } from "./session.js";
import { greeting, noticeFor, statusText, telemetry } from "./status.js";
import { StoreError, createStore } from "./store.js";
import { createTalk } from "./talk.js";
import { $, copyText, createToast, el, icon, selectContents } from "./ui.js";
import { createVoice } from "./voice.js";

const INPUT_MAX_HEIGHT = 132;

const state = {
  mode: "general",
  messages: [],
  phase: "idle", // "idle" | "thinking" | "streaming"
  controller: null,
  backend: null, // llegan cuando la vista responde (ver boot)
  store: null,
  voice: { listen: null, speech: null }, // ver voice.js
  spoken: false, // el último mensaje se dictó: Jarvis contesta hablando
  speakingId: null,
  dismissedNotice: "",
  nextId: 1,
};
const ready = { backend: null, store: null };

const app = $("#app");
const input = $("#input");
const sendButton = $("#send");
const micButton = $("#mic");
const core = createCore(app);
const toast = createToast($("#toast"));
const chat = createChatView({ scroller: $("#main"), log: $("#log") });
const coarsePointer = globalThis.matchMedia("(pointer: coarse)");
// Modo voz: dictar el mensaje y que se envíe solo tras una pausa (talk.js).
const talk = createTalk({
  input,
  micButton,
  sendButton,
  hint: $("#voiceHint"),
  onText() {
    fitInput();
    renderSend();
  },
  onSpoken: (text) => send(text, { spoken: true }),
  onChange: () => setPhase(state.phase),
});

// ---------- Conversación guardada (ver session.js) ----------

function loadChat() {
  const saved = readChat();
  if (!saved) return;
  if (saved.mode) state.mode = saved.mode;
  for (const message of saved.messages)
    state.messages.push({ id: state.nextId++, ...message });
}

const saveChat = () => writeChat(state.mode, state.messages);

// ---------- Mensajes ----------

const isLast = (message) => message === state.messages.at(-1);
const repaint = (message) => chat.upsert(message, { isLast: isLast(message) });

function repaintAll() {
  for (const message of state.messages)
    if (message.role === "assistant") repaint(message);
}

function pushMessage(fields) {
  const message = { id: state.nextId++, actions: [], ...fields };
  const previous = state.messages.at(-1);
  state.messages.push(message);
  if (previous) repaint(previous); // deja de ser el último: ya no ofrece Reintentar
  chat.upsert(message, { isLast: true, stick: true });
  return message;
}

function dropMessage(message) {
  state.messages = state.messages.filter((item) => item !== message);
  chat.remove(message.id);
  const last = state.messages.at(-1);
  if (last) repaint(last);
}

function historyTurns(before) {
  const turns = [];
  for (const message of state.messages) {
    if (message === before) break;
    if (message.role !== "mode" && message.content)
      turns.push({ role: message.role, content: message.content });
  }
  return turns;
}

// ---------- Estado visible ----------

function syncCore() {
  const speaking = state.phase === "streaming" || Boolean(state.speakingId);
  if (state.phase === "thinking") core.set("thinking");
  else if (speaking) core.set("speaking");
  else core.set(talk.active ? "listening" : "idle");
  core.talk(state.phase === "idle" && Boolean(state.speakingId));
}

// El botón naranja envía; mientras Jarvis contesta o habla, lo detiene.
function renderSend() {
  const busy = state.phase !== "idle";
  const talking = !busy && Boolean(state.speakingId) && !input.value.trim();
  sendButton.innerHTML = icon(busy || talking ? "stop" : "send");
  let label = "Enviar mensaje";
  if (busy) label = "Detener respuesta";
  else if (talking) label = "Detener voz";
  sendButton.setAttribute("aria-label", label);
  sendButton.classList.toggle(
    "is-empty",
    !busy && !talking && !input.value.trim(),
  );
}

function setPhase(phase) {
  state.phase = phase;
  renderSend();
  syncCore();
  $("#status").textContent = statusText({ ...state, listening: talk.active });
}

function renderNotice() {
  const notice = noticeFor(state);
  const show = notice && notice.text !== state.dismissedNotice;
  $("#notice").hidden = !show;
  if (!show) return;
  $("#noticeText").textContent = notice.text;
  $("#noticeButton").textContent = notice.action ?? "Entendido";
}

function renderStore() {
  panels.render(state.store);
  $("#greeting").textContent = greeting();
  $("#telemetry").textContent = telemetry(state.store);
  const pending = state.store?.tasks.filter((task) => !task.done).length ?? 0;
  $("#taskCount").textContent = String(pending);
  $("#taskCount").hidden = pending === 0;
  $("#openTasks").setAttribute(
    "aria-label",
    pending ? `Tareas, ${pending} pendientes` : "Tareas",
  );
  renderNotice();
}

function renderMode() {
  const mode = MODES[state.mode];
  for (const button of $("#modes").querySelectorAll("button"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.mode === state.mode),
    );
  input.placeholder = mode.placeholder;
  const chips = mode.suggestions.map((suggestion) => {
    const chip = el("button", {
      type: "button",
      class: "chip",
      text: suggestion.label,
    });
    chip.addEventListener("click", () => {
      if (!suggestion.fill) return send(suggestion.text);
      input.value = suggestion.text;
      fitInput();
      renderSend();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    return chip;
  });
  $("#chips").replaceChildren(...chips);
}

function setMode(mode) {
  if (mode === state.mode || !MODES[mode]) return;
  state.mode = mode;
  // Un cambio de modo deja una marca en la conversación; dos seguidos, una sola.
  const last = state.messages.at(-1);
  if (last?.role === "mode") dropMessage(last);
  if (state.messages.length)
    pushMessage({ role: "mode", content: MODES[mode].name });
  renderMode();
  saveChat();
}

// ---------- Vista: pantalla vacía o conversación ----------

function enterChat(animate) {
  if (app.dataset.view === "chat") return;
  const hero = $("#hero");
  const box = hero.getBoundingClientRect();
  app.dataset.view = "chat";
  $("#newChat").hidden = false;
  if (!animate) return core.refresh();
  // El núcleo grande vuela a su sitio en el encabezado. El inicio se queda
  // clavado donde estaba mientras dura el vuelo.
  for (const side of ["left", "top", "width", "height"])
    hero.style[side] = `${box[side]}px`;
  app.classList.add("is-docking");
  dockCore($("#heroCore .core"), $("#miniCore .core")).then(() => {
    app.classList.remove("is-docking");
    hero.removeAttribute("style");
    core.refresh();
  });
}

function leaveChat() {
  app.dataset.view = "empty";
  $("#newChat").hidden = true;
  core.refresh();
}

function newChat() {
  if (state.phase !== "idle" || state.messages.length === 0) return;
  const old = state.messages;
  talk.cancel();
  state.voice.speech?.stop();
  state.messages = [];
  chat.clear();
  leaveChat();
  saveChat();
  toast.show("Conversación borrada", {
    action: "Deshacer",
    onAction() {
      if (state.messages.length) return;
      state.messages = old;
      for (const message of old)
        chat.upsert(message, { isLast: isLast(message) });
      enterChat(false);
      chat.toBottom();
      saveChat();
    },
  });
}

// ---------- Enviar y recibir ----------

function settleFailure(reply, error) {
  if (error?.cancelled) {
    const kept =
      typeof error.partial === "string" ? error.partial : reply.content;
    if (!kept && reply.actions.length === 0) return dropMessage(reply);
    reply.content = kept;
    reply.status = "stopped";
    return;
  }
  const known = error instanceof AskError || error instanceof StoreError;
  if (!known) console.error(error);
  // Sin `partial` (p. ej. "refused") el texto mostrado se retira.
  reply.content = typeof error?.partial === "string" ? error.partial : "";
  reply.status = "error";
  reply.error = known ? error.message : "Algo falló. Vuelve a intentarlo.";
}

async function runTurn() {
  const reply = pushMessage({
    role: "assistant",
    content: "",
    status: "thinking",
  });
  const controller = new AbortController();
  state.controller = controller;
  setPhase("thinking");
  // Si el mensaje se dictó, la respuesta se lee en voz alta según va llegando.
  const speech = state.spoken ? state.voice.speech : null;
  reply.spoken = Boolean(speech);
  speech?.begin(reply.id);
  let shown = 0;
  try {
    const store = await ready.store;
    await ready.backend;
    const result = await state.backend.ask({
      mode: state.mode,
      turns: historyTurns(reply),
      tasks: store.tasks,
      memories: store.memories,
      persistent: store.persistent,
      spoken: Boolean(speech),
      actions: store,
      signal: controller.signal,
      onText(text) {
        if (state.phase !== "streaming") setPhase("streaming");
        core.kick(Math.max(0, text.length - shown));
        shown = text.length;
        reply.content = text;
        reply.status = "streaming";
        repaint(reply);
        speech?.feed(reply.id, text, false);
      },
      onAction(action) {
        reply.actions.push(action);
        repaint(reply);
      },
    });
    reply.content = result.text;
    reply.truncated = result.truncated;
    reply.status = "done";
    speech?.feed(reply.id, reply.content, true);
  } catch (error) {
    speech?.stop();
    settleFailure(reply, error);
  } finally {
    state.controller = null;
    setPhase("idle");
    if (state.messages.includes(reply)) repaint(reply);
    saveChat();
  }
}

// `spoken`: el mensaje llegó por voz, así que Jarvis también contesta hablando.
function send(raw, { spoken = false } = {}) {
  const text = raw.trim();
  if (!text || state.phase !== "idle") return;
  state.spoken = spoken || talk.active;
  talk.cancel();
  state.voice.speech?.stop();
  pushMessage({ role: "user", content: text });
  enterChat(true);
  input.value = "";
  fitInput();
  runTurn();
}

function retry(message) {
  if (state.phase !== "idle" || !isLast(message)) return;
  dropMessage(message);
  if (state.messages.at(-1)?.role === "user") runTurn();
}

async function undoAction(message, index) {
  const action = message.actions[index];
  if (!action?.undo || action.undone) return;
  try {
    const store = await ready.store;
    if (action.undo.kind === "task") await store.restoreTask(action.undo.item);
    else await store.restoreMemory(action.undo.item);
    action.undone = true;
    repaint(message);
    saveChat();
  } catch (error) {
    toast.show(
      error instanceof StoreError ? error.message : "No se pudo deshacer.",
    );
  }
}

// ---------- Tareas y memoria desde los paneles ----------

// Ejecuta un cambio y muestra el motivo si falla. Devuelve null en ese caso.
async function saving(change) {
  try {
    return await change(await ready.store);
  } catch (error) {
    toast.show(
      error instanceof StoreError ? error.message : "No se pudo guardar.",
    );
    return null;
  }
}

const panels = createPanels({
  onAddTask: async (text) =>
    Boolean(await saving((store) => store.addTask(text))),
  onToggleTask: (id, done) => saving((store) => store.setTaskDone(id, done)),
  async onRemoveTask(id) {
    const task = await saving((store) => store.removeTask(id));
    if (!task) return;
    toast.show("Tarea borrada", {
      action: "Deshacer",
      onAction: () => saving((store) => store.restoreTask(task)),
    });
  },
  onAddMemory: async (text) =>
    Boolean(await saving((store) => store.addMemory(text))),
  async onRemoveMemory(id) {
    const memory = await saving((store) => store.removeMemory(id));
    if (!memory) return;
    toast.show("Recuerdo borrado", {
      action: "Deshacer",
      onAction: () => saving((store) => store.restoreMemory(memory)),
    });
  },
  onRetry: () => state.store?.retry(),
});

// ---------- Caja de texto ----------

function fitInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, INPUT_MAX_HEIGHT)}px`;
}

const voiceHandlers = {
  onNotice: (text) => toast.show(text),
  ...talk.events,
  onSpeechState(speechState, id) {
    state.speakingId = speechState === "idle" ? null : id;
    chat.setSpeaking(state.speakingId);
    repaintAll();
    setPhase(state.phase);
  },
  // La plataforma retiró su voz: no se sustituye por otra.
  onSpeechGone() {
    state.voice = { ...state.voice, speech: null };
    state.speakingId = null;
    chat.setCanSpeak(false);
    chat.setSpeaking(null);
    repaintAll();
    setPhase(state.phase);
  },
};

// ---------- Eventos ----------

async function copyFrom(button, text, source) {
  if (await copyText(text)) {
    const label = button.textContent;
    button.textContent = "Copiado";
    setTimeout(() => {
      button.textContent = label;
    }, 1400);
    return;
  }
  selectContents(source);
  toast.show(
    "No pude copiar solo. El texto quedó seleccionado para que lo copies.",
  );
}

function onLogClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const row = button.closest(".msg");
  if (button.hasAttribute("data-copy")) {
    const code = button.closest(".code")?.querySelector("code");
    if (code) copyFrom(button, code.textContent, code);
    return;
  }
  const message = state.messages.find(
    (item) => String(item.id) === row?.dataset.id,
  );
  if (!message) return;
  if (button.dataset.undo !== undefined)
    undoAction(message, Number(button.dataset.undo));
  else if (button.dataset.act === "copy")
    copyFrom(button, message.content, row.querySelector(".md"));
  // La voz exige que la llamada salga directo del clic.
  else if (button.dataset.act === "speak")
    state.voice.speech?.toggle(message.id, message.content);
  else if (button.dataset.act === "retry") retry(message);
}

function bindEvents() {
  $("#composer").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.phase !== "idle") state.controller?.abort();
    else if (state.speakingId && !input.value.trim())
      state.voice.speech?.stop();
    else send(input.value);
  });
  input.addEventListener("input", () => {
    fitInput();
    renderSend();
    talk.onInput();
  });
  // En teclado físico Enter envía; en pantalla táctil hace salto de línea.
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    if (coarsePointer.matches) return;
    event.preventDefault();
    send(input.value);
  });
  // El toque en el micrófono también desbloquea la voz: Safari solo deja que
  // Jarvis hable si antes hubo un toque.
  micButton.addEventListener("click", () => {
    state.voice.speech?.unlock();
    state.voice.speech?.stop();
    talk.toggle();
  });
  // Que el botón no le quite el foco a la caja (cerraría el teclado).
  micButton.addEventListener("mousedown", (event) => event.preventDefault());
  $("#modes").addEventListener("click", (event) => {
    const mode = event.target.closest("button")?.dataset.mode;
    if (mode) setMode(mode);
  });
  $("#openTasks").addEventListener("click", (event) =>
    panels.open("tasks", event.currentTarget),
  );
  $("#openMemory").addEventListener("click", (event) =>
    panels.open("memory", event.currentTarget),
  );
  $("#newChat").addEventListener("click", newChat);
  $("#log").addEventListener("click", onLogClick);
  $("#noticeButton").addEventListener("click", () => {
    const notice = noticeFor(state);
    if (notice?.action) return state.store?.retry();
    state.dismissedNotice = notice?.text ?? "";
    renderNotice();
  });
}

// ---------- Arranque ----------

function boot() {
  $("#heroCore").innerHTML = coreMarkup("hero");
  $("#miniCore").innerHTML = coreMarkup("mini");
  $("#openTasks").insertAdjacentHTML("afterbegin", icon("tasks"));
  $("#openMemory").insertAdjacentHTML("afterbegin", icon("memory"));
  $("#newChat").innerHTML = icon("plus");
  $("#closeSide").innerHTML = icon("close");
  micButton.innerHTML = icon("mic");
  $("#modes").replaceChildren(
    ...MODE_IDS.map((id) =>
      el("button", {
        type: "button",
        class: "mode",
        "data-mode": id,
        text: MODES[id].name,
      }),
    ),
  );

  loadChat();
  bindEvents();
  renderMode();
  renderStore();
  setPhase("idle");
  if (state.messages.length) {
    for (const message of state.messages)
      chat.upsert(message, { isLast: isLast(message) });
    enterChat(false);
    chat.toBottom();
  }

  // La página se pinta ya; cada capability se enciende cuando la vista responde.
  ready.backend = createBackend({
    onGone(demo) {
      state.backend = demo;
      setPhase(state.phase);
      renderNotice();
    },
  }).then((backend) => {
    state.backend = backend;
    setPhase(state.phase);
    renderNotice();
    return backend;
  });
  ready.store = createStore(renderStore).then((store) => {
    state.store = store;
    renderStore();
    return store;
  });
  createVoice(voiceHandlers).then((voice) => {
    state.voice = voice;
    talk.attach(voice.listen, coarsePointer.matches);
    chat.setCanSpeak(Boolean(voice.speech));
    repaintAll();
  });
}

boot();
