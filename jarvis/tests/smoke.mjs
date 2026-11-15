// Prueba de humo de Jarvis en Chromium: recorre los flujos principales con el
// visor simulado y en modo demo, a varios tamaños, y guarda capturas.
//   npm run test:browser
// Variables: JARVIS_SHOTS (carpeta de capturas, por defecto tests/.shots) y
// JARVIS_FONTS (carpeta con las fuentes, ver harness.mjs).
// Lo que NO cubre: Safari real, la IA real ni la base de datos real de claude.ai.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, overflow, say, settled } from "./harness.mjs";

const shots =
  process.env.JARVIS_SHOTS ??
  fileURLToPath(new URL("./.shots/", import.meta.url));
await mkdir(shots, { recursive: true });

const browser = await launch();
const results = [];

async function scenario(name, options, run) {
  const { page, context, errors } = await browser.open(options);
  const shot = (file) => page.screenshot({ path: join(shots, `${file}.png`) });
  try {
    await run(page, shot);
    const { scroll, client } = await overflow(page);
    assert.ok(scroll <= client, `scroll horizontal: ${scroll} > ${client}`);
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
// Espera a que la línea de estado diga exactamente `value`.
const status = (page, value) =>
  page.waitForFunction(
    (wanted) => document.querySelector("#status").textContent === wanted,
    value,
  );
const online = (page) => status(page, "en línea");
const count = (page, selector) => page.locator(selector).count();
const lastCall = (page) =>
  page.evaluate(() => window.__fakeCalls.sample.at(-1));

// Tamaño mínimo de los controles táctiles visibles.
function smallTargets(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("button, input[type=text], textarea")]
      .filter((node) => node.offsetParent !== null)
      .map((node) => ({ node, box: node.getBoundingClientRect() }))
      .filter(({ box }) => box.height < 40 || box.width < 40)
      .map(
        ({ node, box }) =>
          `${node.id || node.className || node.textContent}: ${Math.round(box.width)}x${Math.round(box.height)}`,
      ),
  );
}

const PHONE = { width: 390, height: 844, mobile: true, scale: 2 };
const SMALL = { width: 360, height: 640, mobile: true, scale: 2 };

await scenario("demo-360", SMALL, async (page, shot) => {
  assert.equal(await text(page, "#status"), "modo demo");
  assert.ok(await page.isVisible("#notice"));
  // En teléfono el micrófono siempre está: sin dictation usa el del teclado.
  assert.ok(await page.isVisible("#mic"));
  assert.deepEqual(await smallTargets(page), []);
  await shot("01-demo-inicio-360");
  await say(page, "anota comprar cartulina");
  await settled(page);
  assert.match(await text(page, ".msg--assistant .md"), /Anotado/);
  assert.equal(await text(page, "#taskCount"), "1");
  await page.click("#openTasks");
  assert.equal(await count(page, "#taskList .row"), 1);
  assert.ok(await page.evaluate(() => document.querySelector("#shell").inert));
  await shot("02-demo-tareas-360");
  await page.keyboard.press("Escape");
  assert.equal(await page.getAttribute("#app", "data-panel"), "");
  await page.click("#noticeButton");
  assert.ok(await page.isHidden("#notice"));
});

await scenario("chat-390", { ...PHONE, fake: {} }, async (page, shot) => {
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "en línea",
  );
  assert.ok(await page.isHidden("#notice"));
  assert.deepEqual(await smallTargets(page), []);
  await shot("03-inicio-390");

  await say(page, "anota estudiar mate para mañana");
  await page.waitForTimeout(250);
  assert.equal(await page.getAttribute("#app", "data-core"), "thinking");
  assert.equal(await text(page, "#status"), "pensando…");
  await shot("04-pensando-390");
  await page.waitForFunction(
    () => document.querySelector("#app").dataset.core === "speaking",
  );
  assert.equal(await text(page, "#status"), "respondiendo…");
  await settled(page);
  assert.equal(await page.getAttribute("#app", "data-core"), "idle");
  assert.match(
    await text(page, ".act"),
    /Tarea creada: estudiar mate para mañana/,
  );
  assert.equal(await text(page, "#taskCount"), "1");
  assert.equal((await lastCall(page)).modelTier, "quick");
  assert.equal((await lastCall(page)).turns[0].role, "user");

  await say(page, "dame código para mover al jugador");
  await settled(page);
  assert.equal(await count(page, ".code pre"), 1);
  assert.deepEqual(await smallTargets(page), []);
  await shot("05-codigo-390");
  // El historial viaja completo y termina en el mensaje nuevo.
  const call = await lastCall(page);
  assert.equal(call.turns.length, 4);
  assert.equal(call.turns.at(-1).content, "dame código para mover al jugador");

  // Modos: cambia el modelo y deja una marca en la conversación.
  await page.click('#modes [data-mode="escuela"]');
  assert.match(await text(page, ".msg--mode"), /Modo Escuela/);
  await say(page, "explícame fracciones");
  await settled(page);
  assert.equal((await lastCall(page)).modelTier, "default");
  assert.match((await lastCall(page)).turns[0].content, /Modo actual: Escuela/);

  // Detener a media respuesta conserva lo escrito.
  await say(page, "más código por favor");
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "respondiendo…",
  );
  await page.click("#send");
  await settled(page);
  assert.match(
    await text(page, ".msg--assistant:last-child .msg-note"),
    /Detenido/,
  );

  // Un error se explica y ofrece reintentar.
  await say(page, "esto falla");
  await settled(page);
  assert.match(
    await text(page, ".msg--assistant:last-child .msg-note"),
    /Se cortó la conexión/,
  );
  assert.equal(
    await count(page, '.msg--assistant:last-child [data-act="retry"]'),
    1,
  );
  await shot("06-error-390");

  // La conversación y el modo sobreviven a recargar la página.
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("#status").textContent === "en línea",
  );
  assert.equal(await page.getAttribute("#app", "data-view"), "chat");
  assert.equal(
    await page.getAttribute('#modes [data-mode="escuela"]', "aria-pressed"),
    "true",
  );
  assert.ok((await count(page, ".msg--user")) >= 4);

  // Nueva conversación, con deshacer.
  await page.click("#newChat");
  assert.equal(await page.getAttribute("#app", "data-view"), "empty");
  await page.click("#toast button");
  assert.equal(await page.getAttribute("#app", "data-view"), "chat");
});

await scenario(
  "tareas-memoria-390",
  { ...PHONE, fake: {} },
  async (page, shot) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    await page.click("#openTasks");
    for (const task of [
      "Estudiar mate",
      "Subir build a itch.io",
      "Comprar cartulina",
    ]) {
      await page.fill("#taskInput", task);
      await page.click("#taskForm button");
      await page.waitForFunction(
        (label) =>
          document.querySelector("#taskList").textContent.includes(label),
        task,
      );
    }
    // Por texto y no por posición: al completarse, la tarea baja al final.
    await page
      .locator("#taskList .row", { hasText: "Subir build" })
      .locator("input")
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll("#taskList .row--done").length === 1,
    );
    assert.equal(await text(page, "#taskTotal"), "2 pendientes · 1 hecha");
    // La hecha baja al final.
    assert.match(await text(page, "#taskList .row:last-child"), /Subir build/);
    assert.deepEqual(await smallTargets(page), []);
    await shot("07-tareas-390");

    await page.click("#taskList .row:first-child .row-del");
    await page.waitForFunction(
      () => document.querySelectorAll("#taskList .row").length === 2,
    );
    await page.waitForSelector("#toast:not([hidden])");
    assert.match(await text(page, "#toast"), /Tarea borrada/);
    await page.click("#toast button");
    await page.waitForFunction(
      () => document.querySelectorAll("#taskList .row").length === 3,
    );

    await page.click('#side [data-pane="memory"]');
    await page.fill("#memoryInput", "Mi examen de física es el viernes");
    await page.click("#memoryForm button");
    await page.waitForFunction(
      () => document.querySelectorAll("#memoryList .row").length === 1,
    );
    await shot("08-memoria-390");
    await page.click("#closeSide");

    // Jarvis ve la lista numerada y actúa sobre ella.
    assert.equal(await text(page, "#telemetry"), "2 pendientes · 1 recuerdo");
    await say(page, "ya hice la tarea 1");
    await settled(page);
    assert.match(await text(page, ".act"), /Tarea hecha: Estudiar mate/);
    // Tras completarla, la lista que ve Jarvis es: 1 Comprar cartulina,
    // 2 Estudiar mate (hecha), 3 Subir build (hecha).
    await say(page, "borra la tarea 2");
    await settled(page);
    assert.match(
      await text(page, ".msg--assistant:last-child .act"),
      /Tarea borrada: Estudiar mate/,
    );
    assert.equal(await count(page, "#taskList .row"), 2);
    await page.click(".msg--assistant:last-child .act button");
    await page.waitForFunction(
      () => document.querySelectorAll("#taskList .row").length === 3,
    );
    await page.waitForFunction(() =>
      document
        .querySelector(".msg--assistant:last-child .act")
        .textContent.includes("restaurado"),
    );
    await say(page, "recuerda que mi motor es JavaScript puro");
    await settled(page);
    assert.match(
      (await lastCall(page)).turns[0].content,
      /1\. Mi examen de física es el viernes/,
    );
    await shot("09-acciones-390");

    // Todo lo guardado sigue ahí al recargar (la base simulada persiste).
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("#taskCount").textContent === "1",
    );
    await page.click("#openMemory");
    assert.equal(await count(page, "#memoryList .row"), 2);
  },
);

await scenario(
  "marcadores-390",
  { ...PHONE, fake: { tools: false } },
  async (page) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    await say(page, "anota llevar la cartulina");
    await settled(page);
    assert.equal((await lastCall(page)).tools, null);
    assert.match(await text(page, ".act"), /Tarea creada: llevar la cartulina/);
    assert.ok(!(await text(page, ".msg--assistant .md")).includes("[["));
  },
);

await scenario(
  "sin-memoria-390",
  { ...PHONE, fake: { db: false } },
  async (page, shot) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    assert.match(await text(page, "#noticeText"), /Sin memoria en esta vista/);
    await say(page, "anota algo de prueba");
    await settled(page);
    assert.equal(await text(page, "#taskCount"), "1");
    assert.match(
      (await lastCall(page)).turns[0].content,
      /no hay memoria guardada/,
    );
    await shot("10-sin-memoria-390");
  },
);

await scenario(
  "guardado-falla-390",
  { ...PHONE, fake: { dbFail: "quota_exceeded" } },
  async (page) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    await page.click("#openTasks");
    await page.fill("#taskInput", "No cabe");
    await page.click("#taskForm button");
    await page.waitForSelector("#toast:not([hidden])");
    assert.match(await text(page, "#toast"), /La memoria está llena/);
    assert.equal(await page.inputValue("#taskInput"), "No cabe");
  },
);

await scenario(
  "movimiento-reducido-390",
  { ...PHONE, fake: {}, reducedMotion: true },
  async (page) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await say(page, "hola");
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    assert.equal(await text(page, "#status"), "pensando…");
    await settled(page);
  },
);

const DESKTOP = { width: 1280, height: 800, scale: 2 };

const spokenTexts = (page) =>
  page.evaluate(() => window.__spoken.filter((item) => item.text.trim()));
const pressed = (page) => page.getAttribute("#mic", "aria-pressed");
const dictate = (page, phrase) =>
  page.evaluate((heard) => window.__fakeDictate(heard), phrase);
const users = (page, total) =>
  page.waitForFunction(
    (wanted) => document.querySelectorAll(".msg--user").length === wanted,
    total,
  );
// Lo que tarda Jarvis en volver a escuchar después de callar.
const GRACE = 900;

// Con el micrófono de la plataforma: un toque abre la conversación y sigue
// escuchando turno tras turno. La voz es la del navegador, elegida como la del
// copiloto de Born to Rally.
await scenario(
  "voz-escritorio",
  { ...DESKTOP, fake: { dictation: true }, speech: { ms: 900 } },
  async (page, shot) => {
    await online(page);
    await page.waitForSelector("#mic:not([hidden])");
    await page.click("#mic");
    await status(page, "escuchando…");
    assert.equal(await pressed(page), "true");
    assert.match(await text(page, "#voiceHintText"), /Te escucho/);
    assert.deepEqual(await page.evaluate(() => window.__fakeCalls.dictation), [
      { language: "es" },
    ]);
    // El visor simulado dicta "anota comprar cartulina": se envía sola.
    await users(page, 1);
    assert.equal(
      await text(page, ".msg--user .bubble"),
      "anota comprar cartulina",
    );
    assert.match((await lastCall(page)).turns[0].content, /leer en voz alta/);
    await status(page, "hablando…");
    const said = await spokenTexts(page);
    assert.deepEqual(
      [said[0].voice, said[0].lang, said[0].rate, said[0].pitch],
      ["Jorge", "es-ES", 1.1, 0.9],
    );
    // Mientras Jarvis habla no escucha: si no, se contestaría a sí mismo.
    assert.equal(await dictate(page, " esto es el eco de Jarvis"), true);
    await status(page, "escuchando…");
    assert.equal(await count(page, ".msg--user"), 1);
    assert.equal(await page.inputValue("#input"), "");
    assert.equal(await pressed(page), "true");
    await shot("11-voz-escritorio");
    // Segundo turno sin tocar nada.
    await page.waitForTimeout(GRACE);
    await dictate(page, " y recuerda que mi examen es el viernes");
    await users(page, 2);
    assert.equal(
      await text(page, ".msg--user:nth-of-type(3) .bubble"),
      "y recuerda que mi examen es el viernes",
    );
    await status(page, "hablando…");
    await status(page, "escuchando…");
    // "Descansa" cierra la conversación sin pasar por la IA.
    const asked = await page.evaluate(() => window.__fakeCalls.sample.length);
    await page.waitForTimeout(GRACE);
    await dictate(page, " Jarvis, descansa");
    await page.waitForFunction(
      () =>
        document.querySelector("#mic").getAttribute("aria-pressed") === "false",
    );
    assert.equal(
      await page.evaluate(() => window.__fakeCalls.sample.length),
      asked,
    );
    assert.equal((await spokenTexts(page)).at(-1).text, "Aquí estaré.");
    await online(page);
    // Lo escrito a mano (Enter en teclado físico) no se lee en voz alta.
    const before = (await spokenTexts(page)).length;
    await page.fill("#input", "hola");
    await page.press("#input", "Enter");
    await settled(page);
    assert.equal(await count(page, ".msg--user"), 3);
    assert.equal((await spokenTexts(page)).length, before);
  },
);

// En iPhone y iPad no hay micrófono de la plataforma: se usa el dictado del
// teclado (aquí simulado tecleando) y el teclado se queda abierto entre turnos.
await scenario(
  "voz-teclado-390",
  { ...PHONE, fake: {}, speech: { ms: 700 } },
  async (page, shot) => {
    await online(page);
    assert.ok(await page.isVisible("#mic"));
    await page.click("#mic");
    assert.match(await text(page, "#voiceHintText"), /micrófono de tu teclado/);
    assert.equal(await page.evaluate(() => document.activeElement.id), "input");
    assert.equal(await text(page, "#status"), "escuchando…");
    assert.equal(await page.getAttribute("#app", "data-core"), "listening");
    // El toque en el micrófono desbloquea la voz con una frase muda.
    assert.equal(await page.evaluate(() => window.__spoken[0].volume), 0);
    await page.keyboard.type("qué tengo pendiente", { delay: 15 });
    assert.ok(
      await page.evaluate(() =>
        document.querySelector("#send").classList.contains("is-arming"),
      ),
    );
    await shot("16-voz-teclado-390");
    // Tras la pausa se envía solo y la conversación sigue abierta.
    await users(page, 1);
    assert.equal(await text(page, ".msg--user .bubble"), "qué tengo pendiente");
    assert.ok(await page.isVisible("#voiceHint"));
    assert.equal(await pressed(page), "true");
    assert.equal(await page.evaluate(() => document.activeElement.id), "input");
    assert.match((await lastCall(page)).turns[0].content, /leer en voz alta/);
    await status(page, "hablando…");
    assert.equal(await page.getAttribute("#send", "aria-label"), "Detener voz");
    // Lo que el dictado oiga mientras Jarvis habla se tira.
    await page.keyboard.type("eco", { delay: 10 });
    assert.equal(await page.inputValue("#input"), "");
    const said = await spokenTexts(page);
    assert.equal(said[0].voice, "Jorge");
    assert.match(said.map((item) => item.text).join(" "), /Respuesta simulada/);
    await shot("17-voz-hablando-390");
    await status(page, "escuchando…");
    await page.waitForTimeout(GRACE);
    // Segundo turno sin tocar ningún botón. Si el dictado vuelve a escribir lo
    // ya enviado, solo sale lo nuevo.
    await page.keyboard.type("qué tengo pendiente y anota comprar leche", {
      delay: 10,
    });
    await users(page, 2);
    assert.equal(
      await text(page, ".msg--user:nth-of-type(3) .bubble"),
      "y anota comprar leche",
    );
    await status(page, "hablando…");
    await status(page, "escuchando…");
    // El micrófono cierra la conversación y el teclado.
    await page.click("#mic");
    assert.ok(await page.isHidden("#voiceHint"));
    assert.notEqual(
      await page.evaluate(() => document.activeElement.id),
      "input",
    );
    await online(page);
    // Un mensaje escrito y enviado a mano no se lee.
    const before = (await spokenTexts(page)).length;
    await say(page, "hola");
    await settled(page);
    assert.equal((await spokenTexts(page)).length, before);
  },
);

// El panel Voz: mismas voces y mismo orden que el copiloto de Born to Rally.
await scenario(
  "voz-ajustes-390",
  { ...PHONE, fake: {} },
  async (page, shot) => {
    await online(page);
    await page.click("#openTasks");
    await page.click('#side [data-pane="voice"]');
    assert.ok(await page.isVisible("#paneVoice"));
    assert.ok(await page.isHidden("#paneTasks"));
    assert.deepEqual(
      await page.$$eval("#voiceSelect option", (nodes) =>
        nodes.map((node) => node.textContent),
      ),
      [
        "Automática (Jorge · ES ♂)",
        "Jorge · ES ♂",
        "Mónica · ES",
        "Juan · MX ♂",
        "Paulina · MX",
      ],
    );
    assert.deepEqual(await smallTargets(page), []);
    await shot("18-voz-ajustes-390");
    // Elegir una voz la deja oír al momento.
    await page.selectOption("#voiceSelect", "Juan");
    await page.waitForFunction(() =>
      window.__spoken.some((item) => item.text.includes("Soy Jarvis")),
    );
    let said = await spokenTexts(page);
    assert.ok(said.every((item) => item.voice === "Juan"));
    // El volumen también.
    await page.$eval("#voiceVolume", (node) => {
      node.value = "50";
      node.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForFunction(() => window.__spoken.at(-1).volume === 0.5);
    // Lo elegido se recuerda en el dispositivo.
    await page.reload();
    await online(page);
    assert.equal(await page.inputValue("#voiceSelect"), "Juan");
    assert.equal(await page.inputValue("#voiceVolume"), "50");
    // Con la voz apagada, la conversación sigue pero sin leer las respuestas.
    await page.click("#openTasks");
    await page.click('#side [data-pane="voice"]');
    await page.uncheck("#voiceOn");
    await page.click("#closeSide");
    await page.click("#mic");
    await page.keyboard.type("hola Jarvis", { delay: 15 });
    await users(page, 1);
    await settled(page);
    said = await spokenTexts(page);
    assert.equal(said.length, 0);
  },
);

await scenario(
  "voz-sin-arranque-390",
  { ...PHONE, fake: {}, speech: { mute: true } },
  async (page) => {
    await online(page);
    await page.click("#mic");
    await page.keyboard.type("hola Jarvis", { delay: 15 });
    await users(page, 1);
    await settled(page);
    // Si el navegador no arranca la voz, se avisa y queda el botón Escuchar.
    await page.waitForSelector("#toast:not([hidden])");
    assert.match(await text(page, "#toast"), /no dejó que Jarvis hablara/);
    assert.equal(
      await text(page, '.msg--assistant [data-act="speak"]'),
      "Escuchar",
    );
    await status(page, "escuchando…");
  },
);

await scenario(
  "sin-voz-escritorio",
  { ...DESKTOP, fake: {}, speech: null },
  async (page) => {
    await online(page);
    // Sin micrófono de la plataforma ni teclado táctil no hay botón de hablar,
    // y sin voz en el navegador el panel lo dice.
    assert.ok(await page.isHidden("#mic"));
    assert.ok(await page.isDisabled("#voiceSelect"));
    assert.match(await text(page, "#voiceNote"), /no tiene voz/);
    await say(page, "dame código para mover al jugador");
    await settled(page);
    assert.equal(await count(page, '[data-act="speak"]'), 0);
    assert.equal(await count(page, '.msg--assistant [data-act="copy"]'), 1);
  },
);

await scenario(
  "escritorio-1280",
  { ...DESKTOP, fake: {} },
  async (page, shot) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    assert.ok(await page.isVisible("#paneTasks"));
    assert.ok(await page.isVisible("#paneMemory"));
    assert.ok(await page.isHidden("#openTasks"));
    await page.fill("#taskInput", "Estudiar mate");
    await page.press("#taskInput", "Enter");
    await page.fill("#memoryInput", "Mi examen de física es el viernes");
    await page.press("#memoryInput", "Enter");
    await page.waitForFunction(
      () => document.querySelectorAll("#memoryList .row").length === 1,
    );
    await shot("12-inicio-escritorio");
    await say(page, "anota subir el build a itch.io");
    await settled(page);
    await say(page, "dame código para mover al jugador");
    await settled(page);
    assert.equal(await count(page, "#taskList .row"), 2);
    await shot("13-chat-escritorio");
  },
);

await scenario(
  "ipad-horizontal",
  { width: 1180, height: 820, mobile: true, scale: 2, fake: {} },
  async (page, shot) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    assert.ok(await page.isVisible("#paneTasks"));
    await say(page, "dame una tabla comparando opciones");
    await settled(page);
    assert.equal(await count(page, ".table-wrap table"), 1);
    await shot("14-ipad-horizontal");
  },
);

await scenario(
  "ipad-vertical",
  { width: 820, height: 1180, mobile: true, scale: 2, fake: {} },
  async (page, shot) => {
    await page.waitForFunction(
      () => document.querySelector("#status").textContent === "en línea",
    );
    assert.ok(await page.isVisible("#openTasks"));
    await shot("15-ipad-vertical");
  },
);

await browser.close();
console.log(results.join("\n"));
if (results.some((line) => line.startsWith("FALLO"))) process.exitCode = 1;
