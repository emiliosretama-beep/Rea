// Levanta el Worker de Jarvis en local (`wrangler dev`, el motor real de
// Cloudflare) apuntando a un Claude simulado. Lo usan worker.test.mjs y
// site.mjs. No usa internet ni gasta saldo.
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export const CLAVE = "clave-de-prueba";

const sse = (event, data) =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;

// Claude simulado: contesta `reply.text` en el formato de streaming de la API
// (o un error con `reply.status`). Guarda cada petición en `received`.
function createMock(received, reply) {
  return createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      received.push({
        headers: request.headers,
        body: JSON.parse(raw || "{}"),
      });
      const { text = "", stop = "end_turn", status = 200 } = reply.current;
      if (status !== 200) {
        response.writeHead(status, { "content-type": "application/json" });
        return response.end(
          JSON.stringify({
            type: "error",
            error: {
              type: "authentication_error",
              message: "invalid x-api-key",
            },
          }),
        );
      }
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(
        sse("message_start", {
          message: {
            id: "msg_prueba",
            type: "message",
            role: "assistant",
            model: "claude-opus-5-5",
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 10, output_tokens: 1 },
          },
        }),
      );
      response.write(
        sse("content_block_start", {
          index: 0,
          content_block: { type: "text", text: "" },
        }),
      );
      for (const piece of text.match(/.{1,8}/gs) ?? [])
        response.write(
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: piece },
          }),
        );
      response.write(sse("content_block_stop", { index: 0 }));
      response.write(
        sse("message_delta", {
          delta: { stop_reason: stop, stop_sequence: null },
          usage: { output_tokens: 12 },
        }),
      );
      response.write(sse("message_stop", {}));
      response.end();
    });
  });
}

async function waitFor(url, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((done) => setTimeout(done, 300));
    }
  }
  throw new Error(`El Worker no arrancó en ${ms} ms`);
}

export async function startLocalWorker({ mockPort, port }) {
  const received = [];
  const reply = { current: { text: "Hola, Emilio." } };
  const mock = createMock(received, reply);
  await new Promise((done) => mock.listen(mockPort, "127.0.0.1", done));
  await writeFile(
    `${root}.dev.vars`,
    [
      "ANTHROPIC_API_KEY=sk-ant-falsa",
      `JARVIS_CLAVE=${CLAVE}`,
      `ANTHROPIC_BASE_URL=http://127.0.0.1:${mockPort}`,
    ].join("\n"),
  );
  // Empezar sin datos guardados de corridas anteriores.
  await rm(`${root}.wrangler`, { recursive: true, force: true });
  const worker = spawn(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--inspector-port",
      "0",
    ],
    {
      cwd: root,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  worker.stdout.on("data", (chunk) => (log += chunk));
  worker.stderr.on("data", (chunk) => (log += chunk));
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitFor(`${base}/`, 90_000);
  } catch (error) {
    worker.kill("SIGTERM");
    mock.close();
    throw new Error(`${error.message}\n${log}`);
  }
  return {
    base,
    received,
    setReply(next) {
      reply.current = next;
    },
    async stop() {
      worker.kill("SIGTERM");
      mock.close();
      await rm(`${root}.dev.vars`, { force: true });
    },
  };
}
