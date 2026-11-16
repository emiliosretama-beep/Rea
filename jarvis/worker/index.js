// Worker de Cloudflare para Jarvis en su propia página (fuera de Claude).
// - Sirve la página (carpeta site/, ver wrangler.toml).
// - POST /api/chat: habla con Claude en streaming con la clave de la API de
//   Emilio, que vive aquí como secreto y nunca llega al navegador.
// - GET/PUT /api/data: tareas y memoria, en un Durable Object.
// Todo /api pide la clave de Jarvis (secreto JARVIS_CLAVE) en la cabecera
// Authorization, para que nadie más gaste su saldo.
import Anthropic from "@anthropic-ai/sdk";
import { DurableObject } from "cloudflare:workers";

const MAX_TOKENS = 16000;
const EFFORTS = new Set(["low", "medium", "high"]);
const LIMITS = {
  body: 400_000, // bytes de una petición de chat
  system: 60_000, // caracteres de las instrucciones
  turns: 60,
  turnChars: 40_000,
  tasks: 200,
  memories: 100,
  taskChars: 280,
  memoryChars: 500,
};

// ---------- Utilidades ----------

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const fail = (status, message) => json({ error: message }, status);

// Compara la clave sin filtrar por el tiempo cuánto acierta.
function sameSecret(given, expected) {
  const encoder = new TextEncoder();
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  if (a.byteLength !== b.byteLength) {
    crypto.subtle.timingSafeEqual(b, b);
    return false;
  }
  return crypto.subtle.timingSafeEqual(a, b);
}

function authorized(request, env) {
  if (!env.JARVIS_CLAVE) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  return given.length > 0 && sameSecret(given, env.JARVIS_CLAVE);
}

async function readJson(request, maxBytes) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const cleanText = (value, max) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// ---------- Chat ----------

// Deja una conversación válida para la API: empieza y termina en el usuario,
// sin turnos vacíos y con los turnos seguidos del mismo rol unidos.
export function normalizeTurns(raw) {
  if (!Array.isArray(raw)) return null;
  const turns = [];
  for (const turn of raw.slice(-LIMITS.turns)) {
    if (turn?.role !== "user" && turn?.role !== "assistant") return null;
    if (typeof turn.content !== "string") return null;
    const content = turn.content.trim().slice(0, LIMITS.turnChars);
    if (!content) continue;
    const last = turns.at(-1);
    if (last?.role === turn.role) last.content += `\n\n${content}`;
    else turns.push({ role: turn.role, content });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  if (turns.at(-1)?.role !== "user") return null;
  return turns;
}

export function parseChat(body) {
  if (!body || typeof body !== "object") return null;
  const messages = normalizeTurns(body.messages);
  const system =
    typeof body.system === "string" ? body.system.slice(0, LIMITS.system) : "";
  const effort = EFFORTS.has(body.effort) ? body.effort : "low";
  if (!messages || !system) return null;
  return { messages, system, effort };
}

const API_ERRORS = [
  [
    Anthropic.AuthenticationError,
    "La clave de la API de Anthropic no es válida. Revísala en Cloudflare.",
  ],
  [
    Anthropic.PermissionDeniedError,
    "Tu cuenta de Anthropic no tiene permiso para este modelo.",
  ],
  [
    Anthropic.RateLimitError,
    "Llegaste al límite de uso de la API. Espera un poco o revisa tu saldo.",
  ],
  [
    Anthropic.BadRequestError,
    "Claude no aceptó la petición. Empieza una conversación nueva.",
  ],
  [
    Anthropic.InternalServerError,
    "Claude está saturado. Vuelve a intentarlo en un momento.",
  ],
  [
    Anthropic.APIConnectionError,
    "No pude conectar con Claude. Vuelve a intentarlo.",
  ],
];

function errorMessage(error) {
  for (const [type, message] of API_ERRORS)
    if (type && error instanceof type) return message;
  return "Se cortó la conexión con Claude. Vuelve a intentarlo.";
}

// Responde en SSE: `delta` {text} con cada trozo, `error` {message} si algo
// falla y `done` {truncated} al terminar.
function streamChat(chat, env) {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    // Solo para las pruebas locales con un Claude simulado.
    ...(env.ANTHROPIC_BASE_URL && { baseURL: env.ANTHROPIC_BASE_URL }),
  });
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const send = (event, data) =>
    writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );

  (async () => {
    try {
      const stream = client.beta.messages.stream({
        model: env.MODEL || "claude-opus-5-5",
        max_tokens: MAX_TOKENS,
        // Si un filtro de seguridad rechaza la respuesta, la API la repite con
        // otro modelo dentro de la misma llamada.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: chat.effort },
        system: chat.system,
        messages: chat.messages,
      });
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        )
          await send("delta", { text: event.delta.text });
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal")
        await send("error", {
          code: "refused",
          message: "No puedo responder a eso. Prueba a pedirlo de otra forma.",
        });
      else
        await send("done", { truncated: final.stop_reason === "max_tokens" });
    } catch (error) {
      console.error("chat", error?.status ?? "", error?.message ?? error);
      await send("error", { message: errorMessage(error) }).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function handleChat(request, env) {
  if (request.method !== "POST") return fail(405, "Usa POST.");
  if (!env.ANTHROPIC_API_KEY)
    return fail(500, "Falta el secreto ANTHROPIC_API_KEY en Cloudflare.");
  const chat = parseChat(await readJson(request, LIMITS.body));
  if (!chat) return fail(400, "La petición no es válida.");
  return streamChat(chat, env);
}

// ---------- Tareas y memoria ----------

// Solo se guardan campos conocidos y con su tipo: lo que llega del navegador
// no se toma tal cual.
export function cleanState(raw) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const id = (value) => cleanText(value, 80).replace(/[^\w.:-]/g, "");
  const tasks = list(raw?.tasks)
    .slice(0, LIMITS.tasks)
    .map((task) => ({
      id: id(task?.id),
      text: cleanText(task?.text, LIMITS.taskChars),
      done: task?.done === true,
      createdAt: Number(task?.createdAt) || 0,
      doneAt: Number(task?.doneAt) || null,
    }))
    .filter((task) => task.id && task.text);
  const memories = list(raw?.memories)
    .slice(0, LIMITS.memories)
    .map((memory) => ({
      id: id(memory?.id),
      text: cleanText(memory?.text, LIMITS.memoryChars),
      createdAt: Number(memory?.createdAt) || 0,
    }))
    .filter((memory) => memory.id && memory.text);
  return { tasks, memories };
}

// Un solo objeto con todo el estado de Emilio.
export class JarvisData extends DurableObject {
  async read() {
    return (await this.ctx.storage.get("state")) ?? { tasks: [], memories: [] };
  }

  async write(state) {
    await this.ctx.storage.put("state", state);
  }
}

async function handleData(request, env) {
  const store = env.DATA.get(env.DATA.idFromName("emilio"));
  if (request.method === "GET") return json(await store.read());
  if (request.method !== "PUT") return fail(405, "Usa GET o PUT.");
  const body = await readJson(request, 400_000);
  if (!body) return fail(400, "Los datos no son válidos.");
  const state = cleanState(body);
  await store.write(state);
  return json(state);
}

// ---------- Entrada ----------

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!authorized(request, env))
      return fail(401, "Falta la clave de Jarvis o no es correcta.");
    if (pathname === "/api/chat") return handleChat(request, env);
    if (pathname === "/api/data") return handleData(request, env);
    return fail(404, "No existe.");
  },
};
