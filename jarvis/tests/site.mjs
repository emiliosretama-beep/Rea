// Prueba de punta a punta de la versión independiente: la página que sirve el
// Worker real (`wrangler dev`), un Claude simulado, y el micrófono y la voz
// del navegador simulados. Recorre una conversación por voz sin tocar botones.
//   node scripts/build-online.mjs && node tests/site.mjs
// Lo que NO cubre: Safari real, el micrófono real ni la IA real.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { routeFonts, settled } from "./harness.mjs";
import { CLAVE, startLocalWorker } from "./localworker.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = fileURLToPath(new URL("./", import.meta.url));
const shots =
  process.env.JARVIS_SHOTS ??
  fileURLToPath(new URL("./.shots/", import.meta.url));
await mkdir(shots, { recursive: true });

const local = await startLocalWorker({ mockPort: 8793, port: 8794 });
const browser = await chromium.launch();
const results = [];

async function scenario(name, { recognition = {} } = {}, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "es-MX",
  });
  await routeFonts(context);
  await context.addInitScript(
    `window.__JARVIS_RECOGNITION__ = ${JSON.stringify(recognition)};
     window.__JARVIS_SPEECH__ = { ms: 300 };`,
  );
  await context.addInitScript({ path: join(here, "fake-recognition.js") });
  await context.addInitScript({ path: join(here, "fake-speech.js") });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !/401/.test(message.text()))
      errors.push(message.text());
  });
  const shot = (file) => page.screenshot({ path: join(shots, `${file}.png`) });
  try {
    await page.goto(local.base);
    await run(page, shot);
    assert.deepEqual(errors, [], "errores en consola");
    results.push(`ok    ${name}`);
  } catch (error) {
    await shot(`FALLO-${name}`).catch(() => {});
    results.push(`FALLO ${name}: ${error.message}`);
  } finally {
    await context.close();
  }
}

const text = (page, selector) => page.textContent(selector);
const status = (page, value) =>
  page.waitForFunction(
    (wanted) => document.querySelector("#status").textContent === wanted,
    value,
    { timeout: 15000 },
  );
const hear = (page, words) =>
  page.waitForFunction((heard) => window.__hear(heard), words, {
    timeout: 15000,
  });
const users = (page, total) =>
  page.waitForFunction(
    (wanted) => document.querySelectorAll(".msg--user").length === wanted,
    total,
  );
const spoken = (page) =>
  page.evaluate(() =>
    window.__spoken.filter((item) => item.text.trim()).map((item) => item.text),
  );
const lastAsked = () => local.received.at(-1)?.body;
const ASLEEP = "esperando «Jarvis»";

async function unlock(page) {
  await page.waitForSelector("#keyGate:not([hidden])");
  await page.fill("#keyInput", CLAVE);
  await page.press("#keyInput", "Enter");
  await page.waitForSelector("#keyGate", { state: "hidden" });
}

await scenario("clave-y-manos-libres", {}, async (page, shot) => {
  // La clave equivocada no entra.
  await page.waitForSelector("#keyGate:not([hidden])");
  await shot("20-clave-390");
  await page.fill("#keyInput", "otra-clave");
  await page.press("#keyInput", "Enter");
  await page.waitForFunction(() =>
    document
      .querySelector("#keyError")
      .textContent.includes("no es la de Jarvis"),
  );
  await page.fill("#keyInput", CLAVE);
  await page.press("#keyInput", "Enter");
  await page.waitForSelector("#keyGate", { state: "hidden" });

  // Escucha solo, dormido: lo que no empieza con «Jarvis» no se envía.
  await status(page, ASLEEP);
  assert.equal(
    await page.evaluate(() => window.__recognition.langs[0]),
    "es-MX",
  );
  await hear(page, "hola a todos qué tal");
  await page.waitForTimeout(1500);
  assert.equal(await page.locator(".msg--user").count(), 0);
  assert.equal(local.received.length, 0);
  await shot("21-esperando-390");

  // «Jarvis, …» sí: se envía solo, Claude contesta y Jarvis lo dice en voz alta.
  local.setReply({ text: "No tienes pendientes, Emilio. ¿Anoto algo?" });
  await hear(page, "Jarvis, qué tengo pendiente");
  await users(page, 1);
  assert.equal(await text(page, ".msg--user .bubble"), "qué tengo pendiente");
  await status(page, "hablando…");
  // Mientras habla, el micrófono se apaga para no oírse.
  assert.equal(await page.evaluate(() => window.__recognition.active), null);
  assert.ok((await page.evaluate(() => window.__recognition.aborts)) >= 1);
  assert.match(lastAsked().system, /leer en voz alta/);
  assert.deepEqual(lastAsked().output_config, { effort: "low" });
  await shot("22-hablando-390");

  // Al callar vuelve a escuchar, y hay unos segundos para seguir sin «Jarvis».
  await status(page, "escuchando…");
  local.setReply({ text: "Listo, ya lo anoté.\n[[tarea: comprar leche]]" });
  await hear(page, "anota comprar leche");
  await users(page, 2);
  await settled(page);
  assert.match(
    await text(page, ".msg--assistant:last-child .act"),
    /Tarea creada: comprar leche/,
  );
  assert.ok(
    !(await text(page, ".msg--assistant:last-child .md")).includes("[["),
  );
  assert.equal(await text(page, "#taskCount"), "1");
  const said = await spoken(page);
  assert.ok(said.includes("Listo, ya lo anoté."));
  assert.ok(!said.join(" ").includes("[["));

  // La tarea quedó guardada en el Worker.
  await page.waitForFunction(async (clave) => {
    const response = await fetch("/api/data", {
      headers: { authorization: `Bearer ${clave}` },
    });
    const state = await response.json();
    return state.tasks.some((task) => task.text === "comprar leche");
  }, CLAVE);

  // «Descansa» lo duerme hasta volver a oír «Jarvis».
  await status(page, "escuchando…");
  const asked = local.received.length;
  await hear(page, "descansa");
  await status(page, ASLEEP);
  assert.equal(local.received.length, asked);

  // Solo «Jarvis»: contesta «Dime.» y espera la orden.
  await hear(page, "Jarvis");
  await page.waitForFunction(() =>
    window.__spoken.some((item) => item.text === "Dime."),
  );
  await status(page, "escuchando…");

  // Al volver a abrir: la clave y las tareas siguen ahí, y escucha solo.
  await page.reload();
  await status(page, ASLEEP);
  assert.ok(await page.isHidden("#keyGate"));
  await page.waitForFunction(
    () => document.querySelector("#taskCount").textContent === "1",
  );
});

await scenario(
  "safari-pide-un-toque",
  { recognition: { needsGesture: true } },
  async (page, shot) => {
    await unlock(page);
    // Sin un toque el navegador no deja escuchar: espera el primero.
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => window.__recognition.active), null);
    assert.equal(await text(page, "#status"), "en línea");
    // Un toque en cualquier parte (no en un botón concreto) lo enciende.
    await page.mouse.click(195, 420);
    await status(page, "escuchando…");
    await shot("23-tras-un-toque-390");
    local.setReply({ text: "Aquí estoy." });
    await hear(page, "cuánto es dos más dos");
    await users(page, 1);
    // Tras hablar vuelve a escuchar solo, sin otro toque.
    await status(page, "escuchando…");
  },
);

await scenario("apagar-el-microfono", {}, async (page) => {
  await unlock(page);
  await status(page, ASLEEP);
  await page.click("#mic");
  await status(page, "en línea");
  // Se recuerda: al volver ya no escucha solo.
  await page.reload();
  await page.waitForTimeout(800);
  assert.equal(await text(page, "#status"), "en línea");
  assert.equal(await page.evaluate(() => window.__recognition.starts), 0);
  // El micrófono lo vuelve a encender, ya despierto.
  await page.click("#mic");
  await status(page, "escuchando…");
});

await browser.close();
await local.stop();
console.log(results.join("\n"));
if (results.some((line) => line.startsWith("FALLO"))) process.exitCode = 1;
