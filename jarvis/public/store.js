// Tareas y memoria de Jarvis.
// - Con la capability `db`: cada tarea y cada recuerdo es un documento bajo
//   data/users/<id>/jarvis/, el subárbol privado de quien abre la página. Se
//   sincroniza en vivo entre dispositivos con onSnapshot.
// - Sin `db`: todo vive en la memoria de la pestaña y se pierde al cerrar.
// Las dos variantes exponen la misma interfaz.

export const STORE_LIMITS = {
  taskChars: 280,
  memoryChars: 500,
  tasks: 200,
  memories: 100,
};

// Error con un mensaje que se le puede mostrar a Emilio tal cual.
export class StoreError extends Error {}

export function cleanText(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Pendientes primero (las más antiguas arriba); hechas al final (la última
// completada arriba).
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.done
      ? (b.doneAt ?? 0) - (a.doneAt ?? 0)
      : a.createdAt - b.createdAt;
  });
}

function sortMemories(memories) {
  return [...memories].sort((a, b) => a.createdAt - b.createdAt);
}

function newTask(id, text) {
  return { id, text, done: false, createdAt: Date.now(), doneAt: null };
}

function newMemory(id, text) {
  return { id, text, createdAt: Date.now() };
}

function checkRoom(list, limit, what) {
  if (list.length >= limit)
    throw new StoreError(
      `Ya hay ${limit} ${what}. Borra algunos para agregar más.`,
    );
}

function requireText(value, max, what) {
  const text = cleanText(value, max);
  if (!text) throw new StoreError(`Falta el texto ${what}.`);
  return text;
}

let localCounter = 0;
function localId() {
  localCounter += 1;
  return `local-${Date.now().toString(36)}-${localCounter}`;
}

export function createSessionStore(onChange = () => {}) {
  let tasks = [];
  let memories = [];
  const changed = () => onChange();
  return {
    persistent: false,
    get sync() {
      return "ok";
    },
    get tasks() {
      return sortTasks(tasks);
    },
    get memories() {
      return sortMemories(memories);
    },
    async addTask(value) {
      const text = requireText(value, STORE_LIMITS.taskChars, "de la tarea");
      checkRoom(tasks, STORE_LIMITS.tasks, "tareas");
      const task = newTask(localId(), text);
      tasks.push(task);
      changed();
      return task;
    },
    async setTaskDone(id, done) {
      const task = tasks.find((item) => item.id === id);
      if (!task) throw new StoreError("Esa tarea ya no existe.");
      task.done = Boolean(done);
      task.doneAt = task.done ? Date.now() : null;
      changed();
      return task;
    },
    async removeTask(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) throw new StoreError("Esa tarea ya no existe.");
      tasks = tasks.filter((item) => item.id !== id);
      changed();
      return task;
    },
    async restoreTask(task) {
      if (!tasks.some((item) => item.id === task.id)) tasks.push({ ...task });
      changed();
    },
    async addMemory(value) {
      const text = requireText(value, STORE_LIMITS.memoryChars, "del recuerdo");
      checkRoom(memories, STORE_LIMITS.memories, "recuerdos");
      const memory = newMemory(localId(), text);
      memories.push(memory);
      changed();
      return memory;
    },
    async removeMemory(id) {
      const memory = memories.find((item) => item.id === id);
      if (!memory) throw new StoreError("Ese recuerdo ya no existe.");
      memories = memories.filter((item) => item.id !== id);
      changed();
      return memory;
    },
    async restoreMemory(memory) {
      if (!memories.some((item) => item.id === memory.id))
        memories.push({ ...memory });
      changed();
    },
    retry() {},
    // Para la versión con servidor (sitestore.js): todo el estado de una vez.
    snapshot: () => ({
      tasks: tasks.map((task) => ({ ...task })),
      memories: memories.map((memory) => ({ ...memory })),
    }),
    replace(state) {
      tasks = state.tasks.map((task) => ({ ...task }));
      memories = state.memories.map((memory) => ({ ...memory }));
      changed();
    },
  };
}

const DB_MESSAGES = {
  quota_exceeded: "La memoria está llena. Borra algo y vuelve a intentarlo.",
  invalid_argument: "Esta vista no tiene permiso para guardar.",
  resource_exhausted: "Demasiados cambios seguidos. Espera un momento.",
  unavailable: "No pude conectar con la memoria. Vuelve a intentarlo.",
};
const DB_GONE = "Se perdió el acceso a la memoria en esta vista.";

function toStoreError(error) {
  if (error instanceof StoreError) return error;
  return new StoreError(DB_MESSAGES[error?.code] ?? DB_GONE);
}

// Lo que llega de la base se valida campo por campo antes de mostrarlo.
function readTask(doc) {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    text: cleanText(data.text, STORE_LIMITS.taskChars),
    done: data.done === true,
    createdAt: Number(data.createdAt) || 0,
    doneAt: Number(data.doneAt) || null,
  };
}

function readMemory(doc) {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    text: cleanText(data.text, STORE_LIMITS.memoryChars),
    createdAt: Number(data.createdAt) || 0,
  };
}

const LOAD_LIMIT_MS = 10000;

// Una escritura a la vez por documento (regla de la capability `db`). Un
// fallo `unavailable` es pasajero: se reintenta una sola vez tras una pausa.
function createWriter() {
  const chains = new Map();
  function inOrder(id, operation) {
    const previous = chains.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(operation);
    chains.set(id, next);
    next
      .catch(() => {})
      .finally(() => {
        if (chains.get(id) === next) chains.delete(id);
      });
    return next;
  }
  return async function write(id, operation) {
    try {
      return await inOrder(id, async () => {
        try {
          return await operation();
        } catch (error) {
          if (error?.code !== "unavailable") throw error;
          await new Promise((done) =>
            setTimeout(done, 400 + Math.random() * 600),
          );
          return operation();
        }
      });
    } catch (error) {
      throw toStoreError(error);
    }
  };
}

// Se suscribe una sola vez a cada colección y mantiene `state` al día.
// `sync` dice cómo va la carga: "loading", "ok", "late" (pasaron 10 s sin
// respuesta) o "error" (el listener murió; `retry` vuelve a suscribirse).
function watchCollections(collections, state, onChange) {
  const keys = Object.keys(collections);
  const confirmed = {};
  let failed = false;
  let late = false;
  let timer = null;
  let unsubscribe = [];
  const allConfirmed = () => keys.every((key) => confirmed[key]);

  function subscribe() {
    for (const key of keys) confirmed[key] = false;
    failed = false;
    late = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (allConfirmed()) return;
      late = true;
      onChange();
    }, LOAD_LIMIT_MS);
    unsubscribe = keys.map((key) =>
      collections[key].ref.onSnapshot(
        (snapshot) => {
          state[key] = snapshot.docs
            .filter((doc) => doc.exists)
            .map(collections[key].read)
            .filter((item) => item.text);
          if (!snapshot.metadata?.fromCache) confirmed[key] = true;
          if (allConfirmed()) clearTimeout(timer);
          onChange();
        },
        () => {
          failed = true;
          clearTimeout(timer);
          onChange();
        },
      ),
    );
  }

  subscribe();
  return {
    get sync() {
      if (failed) return "error";
      if (allConfirmed()) return "ok";
      return late ? "late" : "loading";
    },
    retry() {
      for (const stop of unsubscribe) stop?.();
      subscribe();
      onChange();
    },
  };
}

export function createCloudStore(db, userId, onChange = () => {}) {
  const root = db.collection(`data/users/${userId}`).doc("jarvis");
  const collections = {
    tasks: { ref: root.collection("tareas"), read: readTask },
    memories: { ref: root.collection("recuerdos"), read: readMemory },
  };
  const state = { tasks: [], memories: [] };
  const write = createWriter();
  const watch = watchCollections(collections, state, onChange);
  const taskDoc = (id) => collections.tasks.ref.doc(id);
  const memoryDoc = (id) => collections.memories.ref.doc(id);

  function find(key, id, missing) {
    const item = state[key].find((entry) => entry.id === id);
    if (!item) throw new StoreError(missing);
    return item;
  }

  return {
    persistent: true,
    get sync() {
      return watch.sync;
    },
    get tasks() {
      return sortTasks(state.tasks);
    },
    get memories() {
      return sortMemories(state.memories);
    },
    async addTask(value) {
      const text = requireText(value, STORE_LIMITS.taskChars, "de la tarea");
      checkRoom(state.tasks, STORE_LIMITS.tasks, "tareas");
      const ref = collections.tasks.ref.doc();
      const task = newTask(ref.id, text);
      const { id, ...data } = task;
      await write(id, () => ref.set(data));
      return task;
    },
    async setTaskDone(id, done) {
      const task = find("tasks", id, "Esa tarea ya no existe.");
      const patch = { done: Boolean(done), doneAt: done ? Date.now() : null };
      await write(id, () => taskDoc(id).update(patch));
      return { ...task, ...patch };
    },
    async removeTask(id) {
      const task = find("tasks", id, "Esa tarea ya no existe.");
      await write(id, () => taskDoc(id).delete());
      return task;
    },
    async restoreTask(task) {
      const { id, ...data } = task;
      await write(id, () => taskDoc(id).set(data));
    },
    async addMemory(value) {
      const text = requireText(value, STORE_LIMITS.memoryChars, "del recuerdo");
      checkRoom(state.memories, STORE_LIMITS.memories, "recuerdos");
      const ref = collections.memories.ref.doc();
      const memory = newMemory(ref.id, text);
      const { id, ...data } = memory;
      await write(id, () => ref.set(data));
      return memory;
    },
    async removeMemory(id) {
      const memory = find("memories", id, "Ese recuerdo ya no existe.");
      await write(id, () => memoryDoc(id).delete());
      return memory;
    },
    async restoreMemory(memory) {
      const { id, ...data } = memory;
      await write(id, () => memoryDoc(id).set(data));
    },
    retry: () => watch.retry(),
  };
}

// Elige la variante según lo que esta vista permita. Nunca lanza.
export async function createStore(onChange) {
  const claude = globalThis.window?.claude;
  if (!claude?.use) return createSessionStore(onChange);
  try {
    const [db, user] = await Promise.all([
      claude.use("db"),
      claude.use("user"),
    ]);
    const userId = db && user ? await user.id() : null;
    if (!userId) return createSessionStore(onChange);
    return createCloudStore(db, userId, onChange);
  } catch {
    return createSessionStore(onChange);
  }
}
