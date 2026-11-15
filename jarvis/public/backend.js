// De dónde sale la IA de Jarvis. Dos modos con la misma interfaz:
// - "cloud": la página está publicada en claude.ai y usa la cuenta de Claude
//   de quien la abre (capability `sample`), sin API key.
// - "demo": esta vista no puede usar Claude; respuestas fijas.
//
// Jarvis actúa sobre tareas y recuerdos de dos maneras:
// - "tools": herramientas de `sample` (si `limits().tools` lo permite).
// - "markers": órdenes de texto tipo [[tarea: ...]] que la página interpreta.
import { demoReply } from "./demo.js";
import { MODES, buildInput, buildInstructions } from "./prompt.js";

const ASK_ERRORS = {
  not_granted:
    "No diste permiso para usar Claude. Recarga la página y acéptalo para hablar conmigo.",
  sampling_disabled: "Claude no está disponible en esta cuenta.",
  rate_limited:
    "Llegaste al límite de uso por ahora. Espera un poco y vuelve a intentarlo.",
  session_expired: "Tu sesión caducó. Vuelve a iniciar sesión en Claude.",
  prompt_too_large: "La conversación ya es demasiado larga. Empieza una nueva.",
  refused: "No puedo responder a eso. Prueba a pedirlo de otra forma.",
  empty_completion: "No llegó respuesta. Pídelo de otra forma.",
  tools_unavailable:
    "Esta vista no deja usar herramientas. Vuelve a enviar tu mensaje.",
};
const ASK_FALLBACK = "Se cortó la conexión con Claude. Vuelve a intentarlo.";

// Errores que significan "esta vista no puede usar Claude": se pasa a demo.
const ASK_GONE = new Set([
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
]);

// Error con un mensaje para Emilio. `partial` es el texto que puede quedarse
// en pantalla; `cancelled` indica que él mismo detuvo la respuesta.
export class AskError extends Error {
  constructor(message, { code = "", partial, cancelled = false } = {}) {
    super(message);
    this.code = code;
    this.partial = partial;
    this.cancelled = cancelled;
  }
}

// Ejecuta las acciones de Jarvis, vengan de una herramienta, de un marcador o
// del modo demo. Claude nombra tareas y recuerdos por el número con el que
// aparecen en sus instrucciones; `listed` conserva esa numeración.
export function createRunner({ actions, tasks, memories, onAction }) {
  const listed = {
    tasks: tasks.map((task) => ({ ...task })),
    memories: memories.map((memory) => ({ ...memory })),
  };
  let count = 0;
  const report = (action) => {
    count += 1;
    onAction?.(action);
  };
  const pick = (list, number, what) => {
    const item = list[Number.parseInt(number, 10) - 1];
    if (!item)
      throw new Error(
        `No existe ${what} número ${number}. Hay ${list.length}.`,
      );
    if (item.removed) throw new Error(`Ya se borró ${what} número ${number}.`);
    return item;
  };
  return {
    get count() {
      return count;
    },
    async createTask(text) {
      const task = await actions.addTask(text);
      listed.tasks.push({ ...task });
      report({ label: `Tarea creada: ${task.text}` });
      return `Tarea ${listed.tasks.length} creada: ${task.text}`;
    },
    async completeTask(number, done = true) {
      const task = pick(listed.tasks, number, "la tarea");
      await actions.setTaskDone(task.id, done);
      task.done = done;
      report({
        label: `${done ? "Tarea hecha" : "Tarea pendiente otra vez"}: ${task.text}`,
      });
      return `Tarea ${number} marcada como ${done ? "hecha" : "pendiente"}.`;
    },
    async deleteTask(number) {
      const task = pick(listed.tasks, number, "la tarea");
      const removed = await actions.removeTask(task.id);
      task.removed = true;
      report({
        label: `Tarea borrada: ${task.text}`,
        undo: { kind: "task", item: removed },
      });
      return `Tarea ${number} borrada.`;
    },
    async remember(text) {
      const memory = await actions.addMemory(text);
      listed.memories.push({ ...memory });
      report({ label: `Recuerdo guardado: ${memory.text}` });
      return `Guardado como recuerdo ${listed.memories.length}.`;
    },
    async forget(number) {
      const memory = pick(listed.memories, number, "el recuerdo");
      const removed = await actions.removeMemory(memory.id);
      memory.removed = true;
      report({
        label: `Recuerdo borrado: ${memory.text}`,
        undo: { kind: "memory", item: removed },
      });
      return `Recuerdo ${number} borrado.`;
    },
  };
}

const NUMBER_ARG = (what) => ({
  type: "object",
  properties: {
    numero: {
      type: "integer",
      description: `Número ${what} en la lista de las instrucciones.`,
    },
  },
  required: ["numero"],
});

// Herramientas que Claude puede llamar. Lo que devuelven (o el error que
// lanzan) vuelve a Claude como resultado.
function makeTools(runner) {
  const guarded = (run) => async (input, context) => {
    if (context?.signal?.aborted) throw new Error("Cancelado.");
    return run(input ?? {});
  };
  return [
    {
      name: "crear_tarea",
      description:
        "Agrega una tarea a la lista de Emilio y devuelve el número que le tocó. Úsala cuando pida anotar algo por hacer.",
      inputSchema: {
        type: "object",
        properties: {
          texto: {
            type: "string",
            description: "La tarea en una línea, empezando con verbo.",
          },
        },
        required: ["texto"],
      },
      execute: guarded(({ texto }) => runner.createTask(String(texto ?? ""))),
    },
    {
      name: "completar_tarea",
      description:
        "Marca una tarea como hecha, o la regresa a pendiente con hecha=false. Devuelve una confirmación.",
      inputSchema: {
        type: "object",
        properties: {
          numero: {
            type: "integer",
            description: "Número de la tarea en la lista.",
          },
          hecha: {
            type: "boolean",
            description: "true (por defecto) o false para pendiente.",
          },
        },
        required: ["numero"],
      },
      execute: guarded(({ numero, hecha }) =>
        runner.completeTask(numero, hecha !== false),
      ),
    },
    {
      name: "borrar_tarea",
      description:
        "Borra una tarea de la lista. Úsala solo si Emilio pidió borrarla.",
      inputSchema: NUMBER_ARG("de la tarea"),
      execute: guarded(({ numero }) => runner.deleteTask(numero)),
    },
    {
      name: "recordar",
      description:
        "Guarda un dato que Emilio pidió recordar entre conversaciones y devuelve su número.",
      inputSchema: {
        type: "object",
        properties: {
          dato: {
            type: "string",
            description: "El dato, en una frase que se entienda sola.",
          },
        },
        required: ["dato"],
      },
      execute: guarded(({ dato }) => runner.remember(String(dato ?? ""))),
    },
    {
      name: "olvidar",
      description:
        "Borra un recuerdo guardado. Úsala solo si Emilio pidió olvidarlo.",
      inputSchema: NUMBER_ARG("del recuerdo"),
      execute: guarded(({ numero }) => runner.forget(numero)),
    },
  ];
}

const MARKER =
  /\[\[\s*(tarea|hecha|borrar|recuerda|olvida)\s*:\s*([^\]\n]+?)\s*\]\]/gi;

// Separa las órdenes [[...]] del texto que ve Emilio. También esconde una
// orden a medio escribir, porque se llama en cada trozo del streaming.
export function splitMarkers(text) {
  const commands = [];
  const visible = text
    .replace(MARKER, (_, kind, value) => {
      commands.push({ kind: kind.toLowerCase(), value });
      return "";
    })
    .replace(/\[\[[^\]\n]*$/, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { visible, commands };
}

const MARKER_RUN = {
  tarea: (runner, value) => runner.createTask(value),
  hecha: (runner, value) => runner.completeTask(value, true),
  borrar: (runner, value) => runner.deleteTask(value),
  recuerda: (runner, value) => runner.remember(value),
  olvida: (runner, value) => runner.forget(value),
};

async function runMarkers(commands, runner, onAction) {
  for (const { kind, value } of commands) {
    try {
      await MARKER_RUN[kind](runner, value);
    } catch (error) {
      onAction?.({ label: `No se pudo: ${error.message}`, failed: true });
    }
  }
}

async function typeOut(text, { signal, onText }) {
  const step = 5;
  for (let end = step; end < text.length + step; end += step) {
    if (signal?.aborted)
      throw new AskError("Detenido.", {
        cancelled: true,
        partial: text.slice(0, end - step),
      });
    onText(text.slice(0, end));
    await new Promise((done) => setTimeout(done, 22));
  }
}

function demoBackend() {
  return {
    mode: "demo",
    acts: "demo",
    async ask({
      mode,
      turns,
      tasks,
      memories,
      actions,
      signal,
      onText,
      onAction,
    }) {
      const runner = createRunner({ actions, tasks, memories, onAction });
      await new Promise((done) => setTimeout(done, 450));
      if (signal?.aborted) throw new AskError("Detenido.", { cancelled: true });
      let text;
      try {
        text = await demoReply({
          mode,
          text: turns.at(-1)?.content ?? "",
          runner,
        });
      } catch (error) {
        throw new AskError(error.message);
      }
      await typeOut(text, { signal, onText });
      return { text, truncated: false };
    },
  };
}

const TOOL_COUNT = 5;

function cloudBackend(sample, limits, onGone) {
  let acts = (limits?.tools?.maxCount ?? 0) >= TOOL_COUNT ? "tools" : "markers";
  const tiers = limits?.modelTiers;
  const shown = (text) =>
    acts === "markers" ? splitMarkers(text).visible : text;

  return {
    mode: "cloud",
    get acts() {
      return acts;
    },
    async ask({
      mode,
      turns,
      tasks,
      memories,
      persistent,
      spoken,
      actions,
      signal,
      onText,
      onAction,
    }) {
      const runner = createRunner({ actions, tasks, memories, onAction });
      const instructions = buildInstructions({
        mode,
        tasks,
        memories,
        persistent,
        spoken,
        now: new Date(),
        actMode: acts,
      });
      const tier = MODES[mode]?.tier;
      const options = {
        signal,
        cache: false,
        onText: ({ text }) => onText(shown(text)),
        ...(tier && (!tiers || tiers.includes(tier)) && { modelTier: tier }),
        ...(acts === "tools" && { tools: makeTools(runner) }),
      };
      try {
        const { text, truncated } = await sample(
          buildInput(instructions, turns),
          options,
        );
        if (acts !== "markers") return { text, truncated };
        const { visible, commands } = splitMarkers(text);
        await runMarkers(commands, runner, onAction);
        return { text: visible || "Listo.", truncated };
      } catch (error) {
        const code = error?.code ?? "";
        const partial =
          typeof error?.text === "string" ? shown(error.text) : undefined;
        if (code === "cancelled")
          throw new AskError("Detenido.", { cancelled: true, partial });
        // Claude usó herramientas pero no escribió nada: lo hecho, hecho está.
        if (code === "empty_completion" && runner.count > 0)
          return { text: "Listo.", truncated: false };
        if (code === "tools_unavailable") acts = "markers";
        if (ASK_GONE.has(code)) onGone();
        throw new AskError(ASK_ERRORS[code] ?? ASK_FALLBACK, { code, partial });
      }
    },
  };
}

// Nunca lanza. `onGone(demo)` avisa cuando la vista deja de poder usar Claude.
export async function createBackend({ onGone } = {}) {
  const claude = globalThis.window?.claude;
  const demo = demoBackend();
  if (!claude?.use) return demo;
  const sample = await claude.use("sample").catch(() => null);
  if (!sample) return demo;
  // limits() falta en visores antiguos: sin límites conocidos no se usan tools.
  const limits = await Promise.resolve()
    .then(() => sample.limits())
    .catch(() => null);
  return cloudBackend(sample, limits, () => onGone?.(demo));
}
