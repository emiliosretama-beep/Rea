// ERA Studio — servidor local.
// Sirve la interfaz (carpeta public/) y expone POST /api/generate, que pide a
// Claude la página completa y la reenvía al navegador en streaming (SSE).
// Sin credenciales funciona en "modo demo" con plantillas locales.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { buildDemoSite } from "./public/demo.js";
import { SYSTEM_PROMPT, buildUserMessage } from "./public/prompt.js";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const MODEL = process.env.REA_MODEL || "claude-opus-5-5";
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const hasCredentials = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
);
const client = hasCredentials ? new Anthropic() : null;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES)
      throw new Error("La petición es demasiado grande.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function streamFromClaude(body, res, signal) {
  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(body) }],
    },
    { signal },
  );

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      sse(res, "delta", { text: event.delta.text });
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    sse(res, "error", {
      message: "El modelo rechazó esta petición. Prueba a reformularla.",
    });
  } else if (final.stop_reason === "max_tokens") {
    sse(res, "error", {
      message: "La respuesta se cortó por longitud. Pide una página más corta.",
    });
  }
}

async function streamDemo(body, res, signal) {
  const text = buildDemoSite(body.prompt || "", body.currentHtml || "");
  // Simula el streaming en trozos para que la interfaz se comporte igual.
  for (let i = 0; i < text.length; i += 180) {
    if (signal.aborted) return;
    sse(res, "delta", { text: text.slice(i, i + 180) });
    await new Promise((r) => setTimeout(r, 12));
  }
}

async function handleGenerate(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }
  if (!body.prompt || typeof body.prompt !== "string") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Falta el campo prompt." }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    if (client) await streamFromClaude(body, res, controller.signal);
    else await streamDemo(body, res, controller.signal);
    sse(res, "done", {});
  } catch (err) {
    if (controller.signal.aborted) return;
    let message = "Error inesperado al generar la página.";
    if (err instanceof Anthropic.AuthenticationError)
      message = "La API key no es válida. Revisa tu archivo .env.";
    else if (err instanceof Anthropic.RateLimitError)
      message = "Límite de uso alcanzado. Espera un momento y reintenta.";
    else if (err instanceof Anthropic.APIError)
      message = `Error de la API (${err.status ?? "red"}): ${err.message}`;
    console.error(err);
    sse(res, "error", { message });
  } finally {
    res.end();
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(
    /^([/\\])+/,
    "",
  );
  const filePath = join(ROOT, rel || "index.html");
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    // Rutas desconocidas vuelven a la app (navegación del lado del cliente).
    const index = await readFile(join(ROOT, "index.html"));
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(index);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate")
    return handleGenerate(req, res);
  if (req.method === "GET" && req.url === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        mode: client ? "ai" : "demo",
        model: client ? MODEL : null,
      }),
    );
    return;
  }
  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405).end();
});

server.listen(PORT, () => {
  console.log(`\n  ERA Studio listo en http://localhost:${PORT}`);
  console.log(
    client
      ? `  Modo IA (${MODEL})\n`
      : "  Modo demo: añade ANTHROPIC_API_KEY en .env para usar IA real\n",
  );
});
