// La IA y la memoria de la versión independiente de Jarvis, a través del
// Worker (ver site.js y worker/index.js). Exponen la misma interfaz que las de
// la página de Claude (backend.js y store.js), así que app.js no distingue.
import { AskError, createRunner, runMarkers, splitMarkers } from "./backend.js";
import { MODES, buildInput, buildInstructions } from "./prompt.js";
import { SiteError, api } from "./site.js";
import { createSessionStore } from "./store.js";

// "quick" contesta casi al instante; "default" piensa más a fondo.
const EFFORT = { quick: "low", default: "medium" };

// Lee la respuesta SSE del Worker: `delta` {text}, `error` {message}, `done`.
async function readEvents(response, onEvent) {
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let cut;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const event = raw.match(/^event: (.*)$/m)?.[1];
      const data = raw.match(/^data: (.*)$/m)?.[1];
      if (event) onEvent(event, data ? JSON.parse(data) : {});
    }
  }
}

// Jarvis actúa sobre tareas y memoria con órdenes de texto ([[tarea: …]]),
// como en la página de Claude cuando no hay herramientas.
export function createSiteBackend() {
  return {
    mode: "server",
    acts: "markers",
    async ask(request) {
      const { mode, turns, tasks, memories, spoken, actions, signal } = request;
      const runner = createRunner({
        actions,
        tasks,
        memories,
        onAction: request.onAction,
      });
      const system = buildInstructions({
        mode,
        tasks,
        memories,
        spoken,
        persistent: true,
        now: new Date(),
        actMode: "markers",
      });
      let text = "";
      let failure = null;
      let truncated = false;
      try {
        const response = await api("/api/chat", {
          method: "POST",
          signal,
          body: {
            effort: EFFORT[MODES[mode]?.tier] ?? "low",
            system,
            messages: buildInput(system, turns).slice(1),
          },
        });
        await readEvents(response, (event, data) => {
          if (event === "delta") {
            text += data.text ?? "";
            request.onText(splitMarkers(text).visible);
          } else if (event === "error") failure = data;
          else if (event === "done") truncated = data.truncated === true;
        });
      } catch (error) {
        const partial = splitMarkers(text).visible || undefined;
        if (error?.name === "AbortError")
          throw new AskError("Detenido.", { cancelled: true, partial });
        throw new AskError(
          error instanceof SiteError
            ? error.message
            : "Se cortó la conexión con Jarvis. Vuelve a intentarlo.",
          { partial },
        );
      }
      const { visible, commands } = splitMarkers(text);
      if (failure)
        throw new AskError(failure.message, {
          code: failure.code ?? "",
          partial:
            failure.code === "refused" ? undefined : visible || undefined,
        });
      await runMarkers(commands, runner, request.onAction);
      return { text: visible || "Listo.", truncated };
    },
  };
}

// Tareas y memoria guardadas en el Worker. Por dentro es el almacén de sesión;
// tras cada cambio se manda el estado completo, uno a la vez, y al volver a la
// página se recarga lo que haya cambiado en otro dispositivo.
export function createSiteStore(onChange = () => {}) {
  let sync = "loading";
  let loaded = false;
  let saving = Promise.resolve();
  let pendingSaves = 0;

  const store = createSessionStore(() => {
    onChange();
    if (loaded) queueSave();
  });

  function queueSave() {
    pendingSaves += 1;
    saving = saving
      .then(() => api("/api/data", { method: "PUT", body: store.snapshot() }))
      .then(() => {
        if (sync === "error") sync = "ok";
      })
      .catch((error) => {
        if (!error?.locked) sync = "error";
        onChange();
      })
      .finally(() => {
        pendingSaves -= 1;
      });
  }

  async function load() {
    try {
      const response = await api("/api/data");
      const state = await response.json();
      // No pisar un cambio propio que todavía va de camino.
      if (pendingSaves > 0) return;
      loaded = false;
      store.replace({
        tasks: Array.isArray(state.tasks) ? state.tasks : [],
        memories: Array.isArray(state.memories) ? state.memories : [],
      });
      loaded = true;
      sync = "ok";
    } catch (error) {
      if (!loaded && !error?.locked) sync = "error";
    }
    onChange();
  }

  load();
  globalThis.document?.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") load();
  });

  return {
    ...store,
    persistent: true,
    get sync() {
      return sync;
    },
    get tasks() {
      return store.tasks;
    },
    get memories() {
      return store.memories;
    },
    retry: load,
  };
}
