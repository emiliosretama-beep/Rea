// Prueba del Worker con el motor real de Cloudflare (`wrangler dev`, local) y
// un Claude simulado que contesta en el formato de streaming de la API.
//   node --test tests/worker.test.mjs
// No usa internet ni gasta saldo: la clave de la API es falsa y el Worker
// apunta al simulador con ANTHROPIC_BASE_URL (solo existe en estas pruebas).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { CLAVE, startLocalWorker } from "./localworker.mjs";

const auth = { authorization: `Bearer ${CLAVE}` };
let local;
let BASE;
let received;
const setReply = (next) => local.setReply(next);

before(async () => {
  local = await startLocalWorker({ mockPort: 8791, port: 8792 });
  BASE = local.base;
  received = local.received;
});
after(() => local?.stop());

// Lee los eventos SSE de la respuesta del chat.
async function chatEvents(body, headers = auth) {
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const events = [...text.matchAll(/event: (\w+)\ndata: (.*)\n\n/g)].map(
    ([, event, data]) => ({ event, data: JSON.parse(data) }),
  );
  return { status: response.status, events, text };
}

const CHAT = {
  effort: "medium",
  system: "Eres Jarvis.",
  messages: [
    { role: "assistant", content: "turno huérfano que se descarta" },
    { role: "user", content: "hola" },
    { role: "user", content: "¿qué tal?" },
  ],
};

// ---------- Pruebas ----------

test("worker: sirve la página independiente", async () => {
  const response = await fetch(`${BASE}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("window.JARVIS_SITE = true"));
  assert.ok(html.includes('id="keyGate"'));
});

test("worker: /api pide la clave de Jarvis", async () => {
  assert.equal((await fetch(`${BASE}/api/data`)).status, 401);
  const wrong = await fetch(`${BASE}/api/data`, {
    headers: { authorization: "Bearer otra-clave-distinta" },
  });
  assert.equal(wrong.status, 401);
  const chat = await chatEvents(CHAT, { authorization: "Bearer x" });
  assert.equal(chat.status, 401);
  assert.equal(received.length, 0, "sin clave no se llama a Claude");
});

test("worker: guarda tareas y memoria limpias", async () => {
  const empty = await fetch(`${BASE}/api/data`, { headers: auth });
  assert.deepEqual(await empty.json(), { tasks: [], memories: [] });
  const put = await fetch(`${BASE}/api/data`, {
    method: "PUT",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({
      tasks: [
        {
          id: "t1",
          text: "  Estudiar   mate ",
          done: true,
          createdAt: 5,
          extra: "x",
        },
        { id: "t2", text: "" },
        { id: "<script>", text: "id raro" },
      ],
      memories: [{ id: "m1", text: "Examen el viernes", createdAt: 7 }],
      otraCosa: true,
    }),
  });
  assert.equal(put.status, 200);
  const saved = await (
    await fetch(`${BASE}/api/data`, { headers: auth })
  ).json();
  assert.deepEqual(saved, {
    tasks: [
      {
        id: "t1",
        text: "Estudiar mate",
        done: true,
        createdAt: 5,
        doneAt: null,
      },
      {
        id: "script",
        text: "id raro",
        done: false,
        createdAt: 0,
        doneAt: null,
      },
    ],
    memories: [{ id: "m1", text: "Examen el viernes", createdAt: 7 }],
  });
});

test("worker: el chat llega en streaming desde Claude", async () => {
  received.length = 0;
  setReply({ text: "Hola, Emilio. Todo listo." });
  const { status, events } = await chatEvents(CHAT);
  assert.equal(status, 200);
  const text = events
    .filter((item) => item.event === "delta")
    .map((item) => item.data.text)
    .join("");
  assert.equal(text, "Hola, Emilio. Todo listo.");
  assert.deepEqual(events.at(-1), {
    event: "done",
    data: { truncated: false },
  });
  // Lo que recibió Claude.
  const { headers, body } = received[0];
  // La librería oficial 1.x manda la clave de la API como Bearer.
  assert.equal(headers.authorization, "Bearer sk-ant-falsa");
  assert.match(headers["anthropic-beta"], /server-side-fallback-2026-07-01/);
  assert.equal(body.model, "claude-opus-5-5");
  assert.equal(body.fallbacks, "default");
  assert.equal(body.stream, true);
  assert.deepEqual(body.output_config, { effort: "medium" });
  assert.equal(body.system, "Eres Jarvis.");
  assert.deepEqual(body.messages, [
    { role: "user", content: "hola\n\n¿qué tal?" },
  ]);
});

test("worker: avisa si la respuesta se cortó o si Claude la rechazó", async () => {
  setReply({ text: "Una respuesta lar", stop: "max_tokens" });
  let { events } = await chatEvents(CHAT);
  assert.deepEqual(events.at(-1), { event: "done", data: { truncated: true } });
  setReply({ text: "Empiezo y", stop: "refusal" });
  ({ events } = await chatEvents(CHAT));
  assert.equal(events.at(-1).event, "error");
  assert.equal(events.at(-1).data.code, "refused");
});

test("worker: un error de Claude llega con un mensaje claro", async () => {
  setReply({ text: "", status: 401 });
  const { events } = await chatEvents(CHAT);
  assert.equal(events.at(-1).event, "error");
  assert.match(events.at(-1).data.message, /clave de la API de Anthropic/);
  setReply({ text: "Hola" });
});

test("worker: rechaza peticiones mal formadas", async () => {
  for (const body of [
    {},
    { system: "x", messages: [] },
    { system: "x", messages: [{ role: "user", content: 3 }] },
    { system: "x", messages: [{ role: "assistant", content: "solo yo" }] },
    { system: "", messages: [{ role: "user", content: "hola" }] },
  ]) {
    const { status } = await chatEvents(body);
    assert.equal(status, 400, JSON.stringify(body));
  }
});
