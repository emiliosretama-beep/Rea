import assert from "node:assert/strict";
import { test } from "node:test";
import { PALETTES, checkSpec } from "../public/thumbs/catalog.js";
import { thumbnailDesigner } from "../src/agents/thumbnail-designer.js";
import { MOCK_FIXTURES } from "../src/mock-fixtures.js";
import { CHANNEL, makeFactory, tasksOf } from "./helpers.js";

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test("paletas: el texto se lee sobre los dos fondos y sobre el acento (WCAG)", () => {
  for (const [name, p] of Object.entries(PALETTES)) {
    assert.ok(contrast(p.text, p.bg1) >= 4.5, `${name}: texto/bg1`);
    assert.ok(contrast(p.text, p.bg2) >= 4.5, `${name}: texto/bg2`);
    assert.ok(contrast(p.accentText, p.accent) >= 3, `${name}: texto sobre acento (texto grande)`);
  }
});

test("checkSpec: catálogo, longitud y palabra resaltada", () => {
  const ok = { layout: "center", background: "solid", palette: "noche", icon: "ninguno", headline: "Hola mundo", accentWord: "mundo" };
  assert.deepEqual(checkSpec(ok), []);
  const bad = checkSpec({ ...ok, layout: "x", headline: "uno dos tres cuatro cinco seis siete", accentWord: "otra" });
  assert.equal(bad.length, 4); // diseño, palabras, caracteres y palabra resaltada
});

async function toThumbnails(fixtures = {}) {
  const made = await makeFactory({ fixtures });
  const { factory } = made;
  const channel = factory.db.createChannel(CHANNEL);
  const production = factory.orchestrator.startProduction({ channelId: channel.id });
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).scriptwriter.id);
  await factory.orchestrator.idle();
  factory.orchestrator.approve(tasksOf(factory, production.id).narrator.id);
  await factory.orchestrator.idle();
  return { ...made, production, task: tasksOf(factory, production.id)["thumbnail-designer"] };
}

test("10 propuestas variadas, 3 recomendadas, en espera de que elijas", async (t) => {
  const { factory, llm, task } = await toThumbnails();
  t.after(() => factory.close());
  assert.equal(task.status, "awaiting_approval");
  assert.equal(task.output.proposals.length, 10);
  assert.equal(task.output.recommended.length, 3);
  assert.equal(task.output.final, null);
  const prompt = llm.calls.find((c) => c.name === "thumbs.design").prompt;
  assert.match(prompt, /No uses cifras/);
  assert.match(prompt, /Diseños: split-left/);
});

test("la revisión rechaza cifras inventadas y propuestas repetidas, y se repite con correcciones", async (t) => {
  let attempt = 0;
  const { factory, llm, task } = await toThumbnails({
    "thumbs.design": () => {
      attempt++;
      const data = structuredClone(MOCK_FIXTURES["thumbs.design"]);
      if (attempt === 1) {
        data.proposals[1].headline = "El 97% falla";
        for (const p of data.proposals) p.layout = "center";
      }
      return data;
    },
  });
  t.after(() => factory.close());
  assert.equal(task.status, "awaiting_approval");
  assert.equal(task.attempt, 2);
  const retry = llm.calls.filter((c) => c.name === "thumbs.design")[1].prompt;
  assert.match(retry, /cifras que no están en el guion \(97\)/);
  assert.match(retry, /al menos 5 diseños/);
});

test("la elegida editada se guarda como final; una edición rota se rechaza", async (t) => {
  const { factory, task } = await toThumbnails();
  t.after(() => factory.close());
  const final = { ...task.output.proposals[2].spec, headline: "  Mi titular  ", palette: "era", accentWord: "titular" };
  assert.throws(
    () => factory.orchestrator.approve(task.id, { output: { ...task.output, selected: 2, final: { ...final, headline: "" } } }),
    /problemas/,
  );
  const saved = factory.orchestrator.approve(task.id, { output: { ...task.output, selected: 2, final } });
  assert.equal(saved.output.final.headline, "Mi titular");
  assert.equal(saved.output.selected, 2);
  assert.equal(thumbnailDesigner.approvalCheck(saved.output), null);
});
