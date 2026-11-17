// ERA Factory — servidor local: interfaz (public/), API REST y eventos en vivo (SSE).
// Sin autenticación: por eso escucha solo en 127.0.0.1 salvo que HOST diga otra cosa.
import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./src/config.js";
import { createFactory } from "./src/factory.js";
import { OrchestratorError } from "./src/orchestrator.js";
import { HttpError, createRoutes } from "./src/routes.js";

const PUBLIC = fileURLToPath(new URL("./public/", import.meta.url));
const MAX_BODY = 2 * 1024 * 1024;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

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

// Audio generado: /media/<producción>/<carpeta>/<archivo>.mp3. Safari en
// iPhone/iPad solo reproduce audio si el servidor acepta peticiones por rangos.
async function serveMedia(factory, req, res, pathname) {
  const match = /^\/media\/([\w-]+)\/(narration-[\w-]+)\/([\w-]+\.mp3)$/.exec(pathname);
  if (!match) return res.writeHead(404).end();
  const file = join(factory.config.media.root, match[1], match[2], match[3]);
  let info;
  try {
    info = await stat(file);
  } catch {
    return res.writeHead(404).end();
  }
  const headers = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=31536000, immutable" };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (!range) {
    res.writeHead(200, { ...headers, "Content-Length": info.size });
    return createReadStream(file).pipe(res);
  }
  let start = range[1] === "" ? info.size - Number(range[2]) : Number(range[1]);
  let end = range[1] !== "" && range[2] !== "" ? Number(range[2]) : info.size - 1;
  end = Math.min(end, info.size - 1);
  if (!(start >= 0) || start > end) {
    res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
    return res.end();
  }
  res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
  createReadStream(file, { start, end }).pipe(res);
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
    if (url.pathname.startsWith("/media/")) return serveMedia(factory, req, res, url.pathname);
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
