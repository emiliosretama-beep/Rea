import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "../server.js";
import { CHANNEL, makeFactory } from "./helpers.js";

async function start(t) {
  const { factory } = await makeFactory();
  const server = createServer(factory);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    server.closeAllConnections();
    server.close();
    await factory.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  };
  return { factory, base, api };
}

test("flujo completo por la API: canal, producción, eventos y aprobación", async (t) => {
  const { factory, base, api } = await start(t);

  const status = await api("GET", "/api/status");
  assert.equal(status.data.agents.length, 7);
  assert.equal(status.data.agents.filter((a) => a.implemented).length, 4);
  assert.equal(status.data.tts.ok, true);
  assert.equal(JSON.stringify(status.data).includes("apiKey"), false);

  const bad = await api("POST", "/api/channels", { name: "x" });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.details.includes("niche"));

  const channel = (await api("POST", "/api/channels", CHANNEL)).data;
  assert.equal(channel.name, CHANNEL.name);

  // Escucha el SSE antes de lanzar la producción.
  const controller = new AbortController();
  const sse = await fetch(`${base}/api/events`, { signal: controller.signal });
  const reader = sse.body.getReader();
  const received = [];
  const reading = (async () => {
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        received.push(decoder.decode(value));
      }
    } catch {}
  })();

  const production = (await api("POST", "/api/productions", { channelId: channel.id, topicHint: "chips de IA" })).data;
  await factory.orchestrator.idle();
  for (let i = 0; i < 100 && !received.join("").includes('"status":"awaiting_approval"'); i++)
    await new Promise((r) => setTimeout(r, 10));
  controller.abort();
  await reading;
  assert.ok(received.join("").includes('"status":"awaiting_approval"'), "el SSE transmite los cambios de tarea");

  const detail = (await api("GET", `/api/productions/${production.id}`)).data;
  assert.equal(detail.production.status, "awaiting_approval");
  assert.equal(detail.production.topicHint, "chips de IA");
  assert.ok(detail.logs.length > 3);
  const script = detail.tasks.find((x) => x.agentId === "scriptwriter");

  const changesEmpty = await api("POST", `/api/tasks/${script.id}/changes`, { notes: "  " });
  assert.equal(changesEmpty.status, 400);

  const approved = await api("POST", `/api/tasks/${script.id}/approve`, {});
  assert.equal(approved.data.status, "done");
  const again = await api("POST", `/api/tasks/${script.id}/approve`, {});
  assert.equal(again.status, 409);

  await factory.orchestrator.idle();
  const narration = (await api("GET", `/api/productions/${production.id}`)).data.tasks.find((x) => x.agentId === "narrator");
  assert.equal(narration.status, "awaiting_approval");
  assert.equal((await api("POST", `/api/tasks/${narration.id}/approve`, {})).data.status, "done");
  await factory.orchestrator.idle();
  const list = (await api("GET", "/api/productions")).data;
  assert.equal(list[0].status, "completed");
  assert.equal(list[0].channelName, CHANNEL.name);

  assert.equal((await api("GET", "/api/productions/nope")).status, 404);
  const voices = (await api("GET", "/api/voices")).data;
  assert.ok(voices.voices.some((v) => v.id === "em_alex" && v.language === "es"));
  assert.equal((await api("DELETE", `/api/channels/${channel.id}`)).data.ok, true);
  assert.deepEqual(factory.services.tts.removed, [production.id], "el audio se borra con su producción");
  assert.equal((await api("GET", "/api/productions")).data.length, 0);
});
