import assert from "node:assert/strict";
import { test } from "node:test";
import { claudeLLM } from "../src/llm.js";
import { createYouTube, languageCode, parseIsoDuration } from "../src/services/youtube.js";

function fakeClient(responses) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        stream(params) {
          requests.push(structuredClone(params));
          const message = responses.shift();
          return { finalMessage: async () => message };
        },
      },
    },
  };
}

test("json() pide salida con schema y devuelve el objeto", async () => {
  const client = fakeClient([{ stop_reason: "end_turn", content: [{ type: "text", text: '{"ok":true}' }] }]);
  const llm = claudeLLM({ model: "claude-opus-5-5", maxSearches: 3 }, client);
  const schema = { type: "object", additionalProperties: false, required: ["ok"], properties: { ok: { type: "boolean" } } };
  assert.deepEqual(await llm.json({ name: "t", system: "s", prompt: "p", schema }), { ok: true });
  const [req] = client.requests;
  assert.equal(req.model, "claude-opus-5-5");
  assert.deepEqual(req.output_config.format, { type: "json_schema", schema });
  assert.equal(req.fallbacks, "default");
});

test("research() continúa los turnos pausados y toma las fuentes de los resultados de búsqueda", async () => {
  const result = (url, title) => ({ type: "web_search_result", url, title });
  const client = fakeClient([
    {
      stop_reason: "pause_turn",
      content: [
        { type: "server_tool_use", id: "a", name: "web_search", input: {} },
        { type: "web_search_tool_result", tool_use_id: "a", content: [result("https://a.test/1", "A")] },
      ],
    },
    {
      stop_reason: "end_turn",
      content: [
        { type: "web_search_tool_result", tool_use_id: "b", content: [result("https://a.test/1", "A"), result("https://b.test/2", "B")] },
        { type: "text", text: "Hallazgos." },
      ],
    },
  ]);
  const llm = claudeLLM({ model: "claude-opus-5-5", maxSearches: 3 }, client);
  const out = await llm.research({ name: "r", system: "s", prompt: "p" });
  assert.equal(out.text, "Hallazgos.");
  assert.deepEqual(out.sources.map((s) => s.url), ["https://a.test/1", "https://b.test/2"]);
  assert.equal(client.requests.length, 2);
  assert.equal(client.requests[0].tools[0].type, "web_search_20260209");
  assert.equal(client.requests[1].messages.at(-1).role, "assistant");
});

test("un rechazo del modelo o una respuesta cortada se reportan como error", async () => {
  const llm = claudeLLM({ model: "m", maxSearches: 1 }, fakeClient([
    { stop_reason: "refusal", content: [] },
    { stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] },
  ]));
  await assert.rejects(llm.json({ name: "x", schema: {}, prompt: "" }), /rechazó/);
  await assert.rejects(llm.json({ name: "y", schema: {}, prompt: "" }), (e) => e.retryable && /longitud/.test(e.message));
});

test("YouTube: busca, completa estadísticas y reporta la cuota agotada", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.pathname.endsWith("/search"))
      return Response.json({ items: [{ id: { videoId: "abc" } }] });
    return Response.json({
      items: [
        {
          id: "abc",
          snippet: { title: "Video", channelTitle: "Canal", publishedAt: "2026-11-01T00:00:00Z" },
          statistics: { viewCount: "1500", likeCount: "20" },
          contentDetails: { duration: "PT8M30S" },
        },
      ],
    });
  };
  const yt = createYouTube({ apiKey: "k", regionCode: "MX" }, { fetchImpl });
  const [video] = await yt.topVideos("ia", { language: "Español" });
  assert.equal(video.views, 1500);
  assert.equal(video.comments, null);
  assert.equal(video.durationSeconds, 510);
  assert.equal(urls[0].searchParams.get("relevanceLanguage"), "es");
  assert.equal(urls[0].searchParams.get("order"), "viewCount");
  assert.equal(urls[1].searchParams.get("id"), "abc");

  const quota = createYouTube({ apiKey: "k" }, {
    fetchImpl: async () => Response.json({ error: { message: "q", errors: [{ reason: "quotaExceeded" }] } }, { status: 403 }),
  });
  await assert.rejects(quota.topVideos("ia"), /cuota/);
  assert.equal(await createYouTube({ apiKey: null }).topVideos("ia"), null);
});

test("utilidades de YouTube", () => {
  assert.equal(parseIsoDuration("PT1H2M3S"), 3723);
  assert.equal(parseIsoDuration("P1DT1S"), 86401);
  assert.equal(parseIsoDuration("raro"), null);
  assert.equal(languageCode("Inglés"), "en");
  assert.equal(languageCode("xx"), "xx");
  assert.equal(languageCode("klingon"), null);
});
