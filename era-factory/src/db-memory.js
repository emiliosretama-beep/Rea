// Base de datos en memoria con la MISMA interfaz que db.js (SQLite). La usa
// la versión online: el coordinador trabaja aquí de forma síncrona y
// cloud-store.js copia cada cambio a la base de datos de claude.ai.
//
// Unidad de guardado ("documento"): un canal, un aprendizaje, o una
// producción completa con sus tareas y su registro. onChange avisa de cada
// documento que cambió para que se guarde.

const MAX_LOGS_PER_PRODUCTION = 150;
const MAX_LOOSE_LOGS = 60;
const now = () => new Date().toISOString();
const clone = (v) => (v === undefined ? undefined : structuredClone(v));

const TASK_FIELDS = new Set([
  "status",
  "attempt",
  "output",
  "review",
  "feedback",
  "error",
  "editedByUser",
  "startedAt",
  "finishedAt",
]);

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export function openMemoryDatabase(initial = {}) {
  const channels = new Map();
  const productions = new Map(); // id -> { production, tasks: [], logs: [] }
  const insights = new Map();
  let looseLogs = [];
  let logSeq = 0;
  const listeners = new Set();

  const changed = (collection, id, deleted = false) => {
    for (const fn of listeners) fn({ collection, id, deleted });
  };

  function load({ channels: cs = [], productions: ps = [], insights: is = [] } = {}) {
    for (const c of cs) channels.set(c.id, clone(c));
    for (const p of ps) {
      const { tasks = [], logs = [], ...production } = clone(p);
      productions.set(production.id, { production, tasks, logs });
      for (const l of logs) logSeq = Math.max(logSeq, l.id);
    }
    for (const i of is) insights.set(i.id, clone(i));
  }
  load(initial);

  const record = (id) => productions.get(id);
  const findTask = (id) => {
    for (const rec of productions.values()) {
      const task = rec.tasks.find((t) => t.id === id);
      if (task) return { rec, task };
    }
    return null;
  };

  return {
    close() {},
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // El documento tal como se guarda (null si ya no existe).
    exportDoc(collection, id) {
      if (collection === "channels") return clone(channels.get(id)) ?? null;
      if (collection === "insights") return clone(insights.get(id)) ?? null;
      const rec = record(id);
      return rec ? clone({ ...rec.production, tasks: rec.tasks, logs: rec.logs }) : null;
    },

    // ---- canales ----
    createChannel(input) {
      const channel = { id: newId(), createdAt: now(), ...input };
      channels.set(channel.id, channel);
      changed("channels", channel.id);
      return clone(channel);
    },
    updateChannel(id, input) {
      const channel = channels.get(id);
      if (!channel) return null;
      const { name, niche, language, audience, videoType, frequency } = input;
      Object.assign(channel, { name, niche, language, audience, videoType, frequency });
      changed("channels", id);
      return clone(channel);
    },
    getChannel: (id) => clone(channels.get(id)) ?? null,
    listChannels: () => [...channels.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(clone),
    deleteChannel(id) {
      if (!channels.delete(id)) return false;
      changed("channels", id, true);
      for (const [pid, rec] of productions)
        if (rec.production.channelId === id) {
          productions.delete(pid);
          changed("productions", pid, true);
        }
      for (const [iid, insight] of insights)
        if (insight.channelId === id) {
          insights.delete(iid);
          changed("insights", iid, true);
        }
      return true;
    },

    // ---- producciones ----
    createProduction({ channelId, title, topicHint, material, steps }) {
      if (!channels.has(channelId)) throw new Error("FOREIGN KEY: canal inexistente");
      const ts = now();
      const production = {
        id: newId(),
        channelId,
        title,
        topicHint: topicHint ?? null,
        material: material ?? null,
        settings: {},
        status: "queued",
        createdAt: ts,
        updatedAt: ts,
      };
      const tasks = steps.map((step, i) => ({
        id: newId(),
        productionId: production.id,
        agentId: step.agentId,
        position: i,
        requiresApproval: Boolean(step.requiresApproval),
        status: "pending",
        attempt: 0,
        output: null,
        review: null,
        feedback: null,
        error: null,
        editedByUser: false,
        startedAt: null,
        finishedAt: null,
        updatedAt: ts,
      }));
      productions.set(production.id, { production, tasks, logs: [] });
      changed("productions", production.id);
      return clone(production);
    },
    getProduction: (id) => {
      const p = record(id)?.production;
      return p ? clone({ settings: {}, ...p }) : null; // documentos guardados antes de la fase 2 no tienen settings
    },
    listProductions({ channelId } = {}) {
      return [...productions.values()]
        .map((r) => r.production)
        .filter((p) => !channelId || p.channelId === channelId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(clone);
    },
    updateProduction(id, { status, title, settings }) {
      const rec = record(id);
      if (!rec) return null;
      if (status !== undefined) rec.production.status = status;
      if (title !== undefined) rec.production.title = title;
      if (settings !== undefined) rec.production.settings = clone(settings);
      rec.production.updatedAt = now();
      changed("productions", id);
      return clone(rec.production);
    },
    deleteProduction(id) {
      if (!productions.delete(id)) return false;
      changed("productions", id, true);
      return true;
    },

    // ---- tareas ----
    getTask: (id) => clone(findTask(id)?.task) ?? null,
    listTasks: (productionId) => clone(record(productionId)?.tasks ?? []),
    listTasksByStatus(status) {
      return [...productions.values()]
        .flatMap((r) => r.tasks)
        .filter((t) => t.status === status)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
        .map(clone);
    },
    updateTask(id, patch) {
      const found = findTask(id);
      if (!found) return null;
      for (const [key, value] of Object.entries(patch)) {
        if (!TASK_FIELDS.has(key)) throw new Error(`Campo de tarea desconocido: ${key}`);
        found.task[key] = key === "editedByUser" ? Boolean(value) : (clone(value) ?? null);
      }
      found.task.updatedAt = now();
      changed("productions", found.rec.production.id);
      return clone(found.task);
    },

    // ---- registro ----
    addLog({ productionId = null, taskId = null, agentId = null, level = "info", message }) {
      const entry = { id: ++logSeq, productionId, taskId, agentId, level, message, createdAt: now() };
      const rec = productionId && record(productionId);
      if (rec) {
        rec.logs.push(entry);
        if (rec.logs.length > MAX_LOGS_PER_PRODUCTION) rec.logs = rec.logs.slice(-MAX_LOGS_PER_PRODUCTION);
        changed("productions", productionId);
      } else {
        looseLogs = [...looseLogs, entry].slice(-MAX_LOOSE_LOGS);
      }
      return clone(entry);
    },
    listLogs({ productionId, limit = 200 } = {}) {
      const all = productionId
        ? (record(productionId)?.logs ?? [])
        : [...productions.values()].flatMap((r) => r.logs).concat(looseLogs);
      return clone(all.sort((a, b) => a.id - b.id).slice(-limit));
    },

    // ---- aprendizajes ----
    addInsight({ channelId, source, content }) {
      const insight = { id: newId(), channelId, source, content: clone(content), createdAt: now() };
      insights.set(insight.id, insight);
      changed("insights", insight.id);
      return clone(insight);
    },
    listInsights: (channelId) =>
      [...insights.values()]
        .filter((i) => i.channelId === channelId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20)
        .map(clone),
  };
}
