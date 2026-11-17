// Almacenamiento persistente (SQLite incluido en Node, sin dependencias).
// Este módulo es el único dueño del formato en disco: guarda JSON como texto y
// lo devuelve ya parseado, así nadie más vuelve a interpretar las columnas.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  language TEXT NOT NULL,
  audience TEXT NOT NULL,
  video_type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS productions (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic_hint TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  production_id TEXT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 0,
  output TEXT,
  review TEXT,
  feedback TEXT,
  error TEXT,
  edited_by_user INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_production ON tasks(production_id, position);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  production_id TEXT,
  task_id TEXT,
  agent_id TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS logs_production ON logs(production_id, id);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

const now = () => new Date().toISOString();
const toJson = (value) => (value === undefined || value === null ? null : JSON.stringify(value));
const fromJson = (text) => (text === null || text === undefined ? null : JSON.parse(text));

function taskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    productionId: row.production_id,
    agentId: row.agent_id,
    position: row.position,
    requiresApproval: Boolean(row.requires_approval),
    status: row.status,
    attempt: row.attempt,
    output: fromJson(row.output),
    review: fromJson(row.review),
    feedback: row.feedback,
    error: row.error,
    editedByUser: Boolean(row.edited_by_user),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

function channelRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    niche: row.niche,
    language: row.language,
    audience: row.audience,
    videoType: row.video_type,
    frequency: row.frequency,
    createdAt: row.created_at,
  };
}

function productionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    title: row.title,
    topicHint: row.topic_hint,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Campos de tarea que el orquestador puede cambiar, con su conversión a columna.
const TASK_FIELDS = {
  status: ["status", (v) => v],
  attempt: ["attempt", (v) => v],
  output: ["output", toJson],
  review: ["review", toJson],
  feedback: ["feedback", (v) => v ?? null],
  error: ["error", (v) => v ?? null],
  editedByUser: ["edited_by_user", (v) => (v ? 1 : 0)],
  startedAt: ["started_at", (v) => v ?? null],
  finishedAt: ["finished_at", (v) => v ?? null],
};

export function openDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  const stmt = (sql) => db.prepare(sql);

  return {
    close: () => db.close(),

    // ---- canales ----
    createChannel(input) {
      const channel = { id: randomUUID(), createdAt: now(), ...input };
      stmt(
        `INSERT INTO channels (id, name, niche, language, audience, video_type, frequency, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        channel.id,
        channel.name,
        channel.niche,
        channel.language,
        channel.audience,
        channel.videoType,
        channel.frequency,
        channel.createdAt,
      );
      return channel;
    },
    updateChannel(id, input) {
      stmt(
        `UPDATE channels SET name = ?, niche = ?, language = ?, audience = ?, video_type = ?, frequency = ?
         WHERE id = ?`,
      ).run(input.name, input.niche, input.language, input.audience, input.videoType, input.frequency, id);
      return this.getChannel(id);
    },
    getChannel: (id) => channelRow(stmt("SELECT * FROM channels WHERE id = ?").get(id)),
    listChannels: () => stmt("SELECT * FROM channels ORDER BY created_at DESC").all().map(channelRow),
    deleteChannel: (id) => stmt("DELETE FROM channels WHERE id = ?").run(id).changes > 0,

    // ---- producciones (un video) ----
    createProduction({ channelId, title, topicHint, steps }) {
      const id = randomUUID();
      const ts = now();
      db.exec("BEGIN");
      try {
        stmt(
          `INSERT INTO productions (id, channel_id, title, topic_hint, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
        ).run(id, channelId, title, topicHint ?? null, ts, ts);
        const insertTask = stmt(
          `INSERT INTO tasks (id, production_id, agent_id, position, requires_approval, status, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        );
        steps.forEach((step, i) =>
          insertTask.run(randomUUID(), id, step.agentId, i, step.requiresApproval ? 1 : 0, ts),
        );
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return this.getProduction(id);
    },
    getProduction: (id) => productionRow(stmt("SELECT * FROM productions WHERE id = ?").get(id)),
    listProductions({ channelId } = {}) {
      const rows = channelId
        ? stmt("SELECT * FROM productions WHERE channel_id = ? ORDER BY created_at DESC").all(channelId)
        : stmt("SELECT * FROM productions ORDER BY created_at DESC").all();
      return rows.map(productionRow);
    },
    updateProduction(id, { status, title }) {
      if (status !== undefined)
        stmt("UPDATE productions SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
      if (title !== undefined)
        stmt("UPDATE productions SET title = ?, updated_at = ? WHERE id = ?").run(title, now(), id);
      return this.getProduction(id);
    },
    deleteProduction: (id) => stmt("DELETE FROM productions WHERE id = ?").run(id).changes > 0,

    // ---- tareas ----
    getTask: (id) => taskRow(stmt("SELECT * FROM tasks WHERE id = ?").get(id)),
    listTasks: (productionId) =>
      stmt("SELECT * FROM tasks WHERE production_id = ? ORDER BY position").all(productionId).map(taskRow),
    listTasksByStatus: (status) =>
      stmt("SELECT * FROM tasks WHERE status = ? ORDER BY updated_at").all(status).map(taskRow),
    updateTask(id, patch) {
      const sets = [];
      const values = [];
      for (const [key, value] of Object.entries(patch)) {
        const field = TASK_FIELDS[key];
        if (!field) throw new Error(`Campo de tarea desconocido: ${key}`);
        sets.push(`${field[0]} = ?`);
        values.push(field[1](value));
      }
      sets.push("updated_at = ?");
      values.push(now(), id);
      stmt(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...values);
      return this.getTask(id);
    },

    // ---- registro de actividad ----
    addLog({ productionId = null, taskId = null, agentId = null, level = "info", message }) {
      const createdAt = now();
      const { lastInsertRowid } = stmt(
        `INSERT INTO logs (production_id, task_id, agent_id, level, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(productionId, taskId, agentId, level, message, createdAt);
      return { id: Number(lastInsertRowid), productionId, taskId, agentId, level, message, createdAt };
    },
    listLogs({ productionId, limit = 200 } = {}) {
      const rows = productionId
        ? stmt("SELECT * FROM logs WHERE production_id = ? ORDER BY id DESC LIMIT ?").all(productionId, limit)
        : stmt("SELECT * FROM logs ORDER BY id DESC LIMIT ?").all(limit);
      return rows.reverse().map((r) => ({
        id: r.id,
        productionId: r.production_id,
        taskId: r.task_id,
        agentId: r.agent_id,
        level: r.level,
        message: r.message,
        createdAt: r.created_at,
      }));
    },

    // ---- aprendizajes del canal (los usa el analista de rendimiento, fase 5) ----
    addInsight({ channelId, source, content }) {
      const insight = { id: randomUUID(), channelId, source, content, createdAt: now() };
      stmt("INSERT INTO insights (id, channel_id, source, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
        insight.id,
        channelId,
        source,
        JSON.stringify(content),
        insight.createdAt,
      );
      return insight;
    },
    listInsights: (channelId) =>
      stmt("SELECT * FROM insights WHERE channel_id = ? ORDER BY created_at DESC LIMIT 20")
        .all(channelId)
        .map((r) => ({
          id: r.id,
          channelId: r.channel_id,
          source: r.source,
          content: JSON.parse(r.content),
          createdAt: r.created_at,
        })),
  };
}
