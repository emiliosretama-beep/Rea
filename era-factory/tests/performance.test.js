import assert from "node:assert/strict";
import { test } from "node:test";
import { baseline, cleanResults, engagement, parseNumber, resultsSignature } from "../public/metrics.js";
import { createRoutes } from "../src/routes.js";
import { CHANNEL, makeFactory } from "./helpers.js";

test("parseNumber entiende cómo se escriben las cifras", () => {
  assert.equal(parseNumber("1234"), 1234);
  assert.equal(parseNumber("1,234"), 1234);
  assert.equal(parseNumber("1.234"), 1234);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseNumber("12,5"), 12.5);
  assert.equal(parseNumber("1.2k"), 1200);
  assert.equal(parseNumber("3 mil"), 3000);
  assert.equal(parseNumber("1.5M"), 1.5e6);
  assert.equal(parseNumber("45 %"), 45);
  assert.equal(parseNumber(""), null);
  assert.ok(Number.isNaN(parseNumber("muchas")));
  assert.ok(Number.isNaN(parseNumber("-5")));
});

test("cleanResults: vistas obligatorias, límites y fechas", () => {
  assert.deepEqual(cleanResults({}).errors, ["Vistas: es obligatorio"]);
  assert.ok(cleanResults({ views: "100", stayedPct: "130" }).errors[0].startsWith("% que se quedó"));
  // En Shorts la retención media puede pasar de 100 % (lo repiten).
  assert.equal(cleanResults({ views: "100", avgViewPct: "130" }).value.metrics.avgViewPct, 130);
  assert.ok(cleanResults({ views: "100", publishedAt: "2999-01-01" }).errors[0].includes("futuro"));
  const { value } = cleanResults({ views: "1.2k", likes: "60", platform: "TikTok", notes: "  hola  " });
  assert.deepEqual(value, { platform: "TikTok", publishedAt: null, metrics: { views: 1200, likes: 60 }, notes: "hola" });
  assert.equal(cleanResults({ views: "1", platform: "MySpace" }).value.platform, "YouTube Shorts");
});

test("baseline compara con la mediana del canal, de la misma plataforma si hay 2+", () => {
  const r = (platform, views) => ({ platform, metrics: { views, likes: views / 10 } });
  const mine = r("TikTok", 300);
  const b = baseline([r("TikTok", 100), r("TikTok", 200), r("YouTube Shorts", 9000)], mine);
  assert.equal(b.n, 2);
  assert.equal(b.samePlatform, true);
  assert.deepEqual(b.rows.find((x) => x.k === "views"), { k: "views", label: "Vistas", actual: 300, mediana: 150, n: 2 });
  assert.equal(engagement({ views: 1000, likes: 50, shares: 10 }), 6);
  // Con una sola de la misma plataforma se compara con todas.
  assert.equal(baseline([r("TikTok", 100), r("YouTube Shorts", 9000)], mine).samePlatform, false);
});

async function setup(t, fixtures) {
  const { factory, llm } = await makeFactory({ fixtures });
  t.after(() => factory.close());
  const routes = createRoutes(factory);
  const call = async (method, path, body) => {
    for (const [m, re, handler] of routes) {
      const match = m === method && path.match(re);
      if (match) return handler(match.slice(1), body, new URL(path, "http://x"));
    }
    throw new Error(`Sin ruta ${method} ${path}`);
  };
  const channel = factory.db.createChannel({ ...CHANNEL, format: "short" });
  const make = (title) => {
    const p = factory.db.createProduction({ channelId: channel.id, title, steps: [] });
    factory.db.updateProduction(p.id, { status: "completed" });
    return p;
  };
  return { factory, llm, call, channel, make };
}

test("el analista no entra en la cadena de producción", async (t) => {
  const { factory } = await setup(t);
  assert.equal(factory.registry.pipeline().some((a) => a.id === "performance-analyst"), false);
  assert.equal(factory.registry.describe().find((a) => a.id === "performance-analyst").standalone, true);
});

test("guardar y analizar: aprendizajes al equipo, sin duplicar al reanalizar", async (t) => {
  const { factory, llm, call, channel, make } = await setup(t);
  const p = make("Video uno");

  await assert.rejects(call("POST", `/api/productions/${p.id}/analyze`), { status: 400 });
  await assert.rejects(call("PUT", `/api/productions/${p.id}/results`, { views: "" }), (e) => e.status === 400 && e.details[0].startsWith("Vistas"));

  const saved = await call("PUT", `/api/productions/${p.id}/results`, { views: "2.5k", stayedPct: "71", platform: "YouTube Shorts" });
  assert.deepEqual(saved.settings.results.metrics, { views: 2500, stayedPct: 71 });

  const done = await call("POST", `/api/productions/${p.id}/analyze`);
  const a = done.settings.analysis;
  assert.equal(a.verdict, "sin_referencia");
  assert.equal(a.learnings.length, 2);
  assert.equal(a.basedOn, resultsSignature(done.settings.results));
  const prompt = llm.calls.find((c) => c.name === "performance.analyze").prompt;
  assert.ok(prompt.includes("- Vistas: 2,500"));
  assert.ok(prompt.includes("Ninguno: es el primer video del canal con métricas."));

  let insights = factory.db.listInsights(channel.id);
  assert.equal(insights.length, 1);
  assert.equal(insights[0].content.productionId, p.id);
  assert.ok(insights[0].content.aprendizajes[0].startsWith("[Guionista]"));

  await call("POST", `/api/productions/${p.id}/analyze`);
  insights = factory.db.listInsights(channel.id);
  assert.equal(insights.length, 1, "reanalizar sustituye los aprendizajes del video");

  // Un video nuevo compara con el anterior y ve sus aprendizajes.
  const q = make("Video dos");
  await call("PUT", `/api/productions/${q.id}/results`, { views: "5000", platform: "YouTube Shorts" });
  await call("POST", `/api/productions/${q.id}/analyze`);
  const second = llm.calls.filter((c) => c.name === "performance.analyze").at(-1).prompt;
  assert.ok(second.includes("### Video uno (YouTube Shorts)"));
  assert.ok(second.includes("[Guionista]"));
  assert.equal(factory.db.listInsights(channel.id).length, 2);
});

test("con 2+ videos el veredicto del modelo se respeta; un fallo queda en el registro", async (t) => {
  let fail = false;
  const { factory, call, make } = await setup(t, {
    "performance.analyze": () => {
      if (fail) throw Object.assign(new Error("Sin conexión con Claude."), { kind: "network" });
      return {
        verdict: "arriba",
        summary: "Bien.",
        worked: ["a"],
        didnt: ["b"],
        learnings: [{ for: "investigador", text: "Más historia.", evidence: "Vistas 2× la mediana." }],
        nextTest: "Cambiar el titular.",
      };
    },
  });
  for (const [title, views] of [["A", "100"], ["B", "200"]]) {
    const p = make(title);
    await call("PUT", `/api/productions/${p.id}/results`, { views });
  }
  const p = make("C");
  await call("PUT", `/api/productions/${p.id}/results`, { views: "900" });
  const done = await call("POST", `/api/productions/${p.id}/analyze`);
  assert.equal(done.settings.analysis.verdict, "arriba");
  assert.equal(done.settings.analysis.baseline.rows[0].mediana, 150);

  fail = true;
  await assert.rejects(call("POST", `/api/productions/${p.id}/analyze`), { status: 502, message: "Sin conexión con Claude." });
  const logs = factory.db.listLogs({ productionId: p.id });
  assert.equal(logs.at(-1).level, "error");
  // El análisis anterior se conserva.
  assert.equal(factory.db.getProduction(p.id).settings.analysis.verdict, "arriba");
});
