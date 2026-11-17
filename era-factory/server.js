// ERA Factory — servidor local: interfaz (public/), API REST y eventos en vivo (SSE).
// Sin autenticación: por eso escucha solo en 127.0.0.1 salvo que HOST diga otra cosa.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, publicStatus } from "./src/config.js";
import { createFactory } from "./src/factory.js";
import { OrchestratorError } from "./src/orchestrator.js";

const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const MAX_BODY = 2 * 1024 * 1024;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const CHANNEL_FIELDS = {
  name: 80,
  niche: 200,
  language: 40,
  audience: 400,
  videoType: 200,
  frequency: 80,
};

// Valida el formulario de canal una vez, en la frontera.
function parseChannel(body) {
  const out = {};
  const missing = [];
  for (const [field, max] of Object.entries(CHANNEL_FIELDS)) {
    const value = typeof body?.[field] === "string" ? body[field].trim() : "";
    if (!value) missing.push(field);
    else if (value.length > max) throw new HttpError(400, `El campo ${field} supera ${max} caracteres.`);
    out[field] = value;
  }
  if (missing.length) throw new HttpError(400, "Faltan campos del canal.", missing);
  return out;
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "La petición es demasiado grande.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "El cuerpo no es JSON válido.");
  }
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

export function createRoutes(factory) {
  const { db, orchestrator, registry, config } = factory;

  const productionDetail = (id) => {
    const production = db.getProduction(id);
    if (!production) throw new HttpError(404, "Producción no encontrada.");
    return {
      production,
      channel: db.getChannel(production.channelId),
      tasks: db.listTasks(id),
      logs: db.listLogs({ productionId: id, limit: 300 }),
    };
  };

  const summary = () => {
    const productions = db.listProductions();
    const count = (s) => productions.filter((p) => p.status === s).length;
    return {
      channels: db.listChannels().length,
      productions: productions.length,
      active: count("running") + count("queued"),
      awaitingApproval: count("awaiting_approval"),
      failed: count("failed"),
      completed: count("completed"),
    };
  };

  // [método, patrón, manejador(params, body, url)]
  return [
    ["GET", /^\/api\/status$/, () => ({
      ...publicStatus(config),
      agents: registry.describe(),
      activity: orchestrator.activity(),
      summary: summary(),
    })],
    ["GET", /^\/api\/channels$/, () => db.listChannels()],
    ["POST", /^\/api\/channels$/, (_, body) => db.createChannel(parseChannel(body))],
    ["PUT", /^\/api\/channels\/([\w-]+)$/, ([id], body) => {
      if (!db.getChannel(id)) throw new HttpError(404, "Canal no encontrado.");
      return db.updateChannel(id, parseChannel(body));
    }],
    ["DELETE", /^\/api\/channels\/([\w-]+)$/, ([id]) => {
      for (const p of db.listProductions({ channelId: id }))
        if (["running", "queued"].includes(p.status)) orchestrator.cancel(p.id);
      if (!db.deleteChannel(id)) throw new HttpError(404, "Canal no encontrado.");
      return { ok: true };
    }],
    ["GET", /^\/api\/productions$/, (_, __, url) => {
      const channels = new Map(db.listChannels().map((c) => [c.id, c]));
      return db.listProductions({ channelId: url.searchParams.get("channelId") || undefined }).map((p) => ({
        ...p,
        channelName: channels.get(p.channelId)?.name ?? "",
        tasks: db.listTasks(p.id).map(({ agentId, status }) => ({ agentId, status })),
      }));
    }],
    ["POST", /^\/api\/productions$/, (_, body) => {
      const topicHint = typeof body.topicHint === "string" ? body.topicHint.trim().slice(0, 300) : "";
      return orchestrator.startProduction({ channelId: String(body.channelId || ""), topicHint });
    }],
    ["GET", /^\/api\/productions\/([\w-]+)$/, ([id]) => productionDetail(id)],
    ["DELETE", /^\/api\/productions\/([\w-]+)$/, ([id]) => {
      if (db.getProduction(id)?.status === "running") orchestrator.cancel(id);
      if (!db.deleteProduction(id)) throw new HttpError(404, "Producción no encontrada.");
      return { ok: true };
    }],
    ["POST", /^\/api\/productions\/([\w-]+)\/cancel$/, ([id]) => orchestrator.cancel(id)],
    ["POST", /^\/api\/tasks\/([\w-]+)\/approve$/, ([id], body) => orchestrator.approve(id, { output: body.output })],
    ["POST", /^\/api\/tasks\/([\w-]+)\/changes$/, ([id], body) => orchestrator.requestChanges(id, body.notes)],
    ["POST", /^\/api\/tasks\/([\w-]+)\/retry$/, ([id]) => orchestrator.retry(id)],
    ["GET", /^\/api\/logs$/, (_, __, url) => db.listLogs({ limit: Math.min(Number(url.searchParams.get("limit")) || 60, 300) })],
  ];
}

function streamEvents(factory, req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 3000\n\n");
  const unsubscribe = factory.bus.subscribe((event) => res.write(`data: ${JSON.stringify(event)}\n\n`));
  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(ping);
    unsubscribe();
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
  const file = join(PUBLIC, rel || "index.html");
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    const index = await readFile(join(PUBLIC, "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(index);
  }
}

export function createServer(factory) {
  const routes = createRoutes(factory);
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return serveStatic(req, res);
    if (req.method === "GET" && url.pathname === "/api/events") return streamEvents(factory, req, res);
    try {
      const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url.pathname));
      if (!route) throw new HttpError(404, "Ruta no encontrada.");
      const params = url.pathname.match(route[1]).slice(1);
      const body = ["POST", "PUT"].includes(req.method) ? await readJson(req) : {};
      send(res, 200, await route[2](params, body, url));
    } catch (err) {
      if (err instanceof HttpError || err instanceof OrchestratorError)
        return send(res, err.status, { error: err.message, details: err.details });
      console.error(err);
      send(res, 500, { error: "Error interno del servidor." });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = loadConfig();
  const factory = await createFactory(config);
  factory.orchestrator.recover();
  const host = process.env.HOST || "127.0.0.1";
  const server = createServer(factory);
  server.listen(config.port, host, () => {
    const mode = { claude: `IA real (${config.llm.model})`, mock: "SIMULACIÓN (datos de prueba)", none: "SIN API KEY" }[config.llm.mode];
    console.log(`ERA Factory en http://${host === "0.0.0.0" ? "localhost" : host}:${config.port}`);
    console.log(`  IA: ${mode} · YouTube: ${config.youtube.apiKey ? "conectado" : "sin API key"}`);
  });
  const shutdown = async () => {
    server.close();
    await factory.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
