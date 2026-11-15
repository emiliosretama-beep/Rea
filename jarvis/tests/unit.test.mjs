// Pruebas de la lógica de Jarvis que no necesita navegador:
//   node --test tests/unit.test.mjs
// Las partes que hablan con claude.ai se prueban contra el visor simulado de
// fake-claude.js, no contra la plataforma real.
import assert from "node:assert/strict";
import { test } from "node:test";

// El visor simulado espera un navegador: se le da lo mínimo antes de cargarlo.
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.__JARVIS_FAKE__ = { thinkMs: 5, chunkMs: 1, dbMs: 1, useMs: 1 };
await import("./fake-claude.js");

const { renderMarkdown } = await import("../public/markdown.js");
const { MODES, MODE_IDS, buildInput, buildInstructions } =
  await import("../public/prompt.js");
const { StoreError, createSessionStore, createStore, sortTasks } =
  await import("../public/store.js");
const { AskError, createBackend, createRunner, splitMarkers } =
  await import("../public/backend.js");
const { rankVoices, scoreVoice, speechChunks, speechText, voiceLabel } =
  await import("../public/voice.js");
const { glue, withoutSent } = await import("../public/talk.js");
const { greeting, noticeFor, statusText, telemetry } =
  await import("../public/status.js");
const { readChat, writeChat } = await import("../public/session.js");

const tick = (ms = 20) => new Promise((done) => setTimeout(done, ms));

// ---------- Markdown ----------

test("markdown: el HTML del modelo se muestra como texto, nunca se ejecuta", () => {
  const html = renderMarkdown(
    "Hola <img src=x onerror=alert(1)> <script>alert(2)</script> [x](javascript:alert(3))",
  );
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes('href="javascript'));
  assert.ok(html.includes("&lt;img"));
});

test("markdown: un enlace no puede romper su atributo", () => {
  const html = renderMarkdown('[ok](https://a.com/?q="><b>)');
  assert.match(html, /href="https:\/\/a\.com\/\?q=&quot;&gt;&lt;b&gt;"/);
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test("markdown: negritas con código dentro y multiplicaciones intactas", () => {
  const html = renderMarkdown(
    "Usa **`requestAnimationFrame`**. 2 * 3 * 4 = 24, x*y*z, a_b_c",
  );
  assert.ok(
    html.includes("<strong><code>requestAnimationFrame</code></strong>"),
  );
  assert.ok(html.includes("2 * 3 * 4 = 24, x*y*z, a_b_c"));
});

test("markdown: listas numeradas con bloque de código dentro", () => {
  const html = renderMarkdown(
    "1. Uno\n2. Dos:\n   ```js\n   const a = 1 < 2;\n   ```\n3. Tres",
  );
  assert.match(html, /^<ol><li>Uno<\/li><li>Dos:<div class="code">/);
  assert.ok(html.includes("const a = 1 &lt; 2;"));
  assert.ok(html.endsWith("<li>Tres</li></ol>"));
});

test("markdown: un bloque de código sin cerrar (streaming) llega hasta el final", () => {
  const html = renderMarkdown('Mira:\n```html\n<div class="a">hola</div>\n');
  assert.ok(
    html.includes("<pre><code>&lt;div class=&quot;a&quot;&gt;hola&lt;/div&gt;"),
  );
});

test("markdown: tablas dentro de un contenedor con scroll propio", () => {
  const html = renderMarkdown("| A | B |\n|---|---|\n| 1 | **2** |");
  assert.ok(html.startsWith('<div class="table-wrap"><table>'));
  assert.ok(html.includes("<td><strong>2</strong></td>"));
});

test("markdown: álgebra con signo menos no se vuelve lista", () => {
  assert.equal(renderMarkdown("-3x = 9\nx = -3"), "<p>-3x = 9<br>x = -3</p>");
});

// ---------- Instrucciones ----------

const TASKS = [
  { id: "a", text: "Estudiar mate", done: false },
  { id: "b", text: "Subir build", done: true },
];
const MEMORIES = [{ id: "m", text: "Examen de física el viernes" }];
const NOW = new Date("2026-11-15T18:30:00");

test("instrucciones: llevan modo, fecha, tareas y recuerdos numerados", () => {
  const text = buildInstructions({
    mode: "escuela",
    tasks: TASKS,
    memories: MEMORIES,
    now: NOW,
    actMode: "tools",
    persistent: true,
  });
  assert.ok(text.includes("Modo actual: Escuela"));
  assert.ok(
    text.includes("1. [pendiente] Estudiar mate\n2. [hecha] Subir build"),
  );
  assert.ok(text.includes("1. Examen de física el viernes"));
  assert.ok(text.includes("15 de noviembre de 2026"));
  assert.ok(!text.includes("[[tarea:"));
  assert.ok(!text.includes("no hay memoria guardada"));
});

test("instrucciones: sin herramientas explican los marcadores; sin db lo avisan", () => {
  const text = buildInstructions({
    mode: "general",
    tasks: [],
    memories: [],
    now: NOW,
    actMode: "markers",
    persistent: false,
  });
  assert.ok(text.includes("[[tarea: texto de la tarea]]"));
  assert.ok(text.includes("Sin tareas."));
  assert.ok(text.includes("no hay memoria guardada"));
});

test("instrucciones: cada modo tiene nombre, reglas y sugerencias", () => {
  assert.deepEqual(MODE_IDS, ["general", "juegos", "escuela", "organizar"]);
  for (const id of MODE_IDS) {
    assert.ok(MODES[id].rules.length > 0);
    assert.ok(MODES[id].suggestions.length > 0);
    assert.ok(["quick", "default"].includes(MODES[id].tier));
  }
});

test("historial: instrucciones al frente y se recorta por el lado viejo", () => {
  const turns = Array.from({ length: 50 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `mensaje ${i}`,
  }));
  turns.push({ role: "user", content: "el último" });
  const input = buildInput("REGLAS", turns);
  assert.equal(input[0].content, "REGLAS");
  assert.equal(input[0].role, "user");
  assert.equal(input.at(-1).content, "el último");
  assert.equal(input.length, 31);
});

// ---------- Tareas y memoria ----------

test("store de sesión: agregar, completar, borrar y deshacer", async () => {
  let changes = 0;
  const store = createSessionStore(() => changes++);
  const first = await store.addTask("  Estudiar   mate ");
  const second = await store.addTask("Subir build");
  assert.equal(first.text, "Estudiar mate");
  await store.setTaskDone(first.id, true);
  assert.deepEqual(
    store.tasks.map((task) => task.text),
    ["Subir build", "Estudiar mate"],
  );
  const removed = await store.removeTask(second.id);
  assert.equal(store.tasks.length, 1);
  await store.restoreTask(removed);
  assert.equal(store.tasks.length, 2);
  assert.ok(changes >= 5);
  assert.equal(store.persistent, false);
  await assert.rejects(() => store.addTask("   "), StoreError);
  await assert.rejects(() => store.removeTask("no-existe"), StoreError);
});

test("orden: pendientes primero, hechas al final", () => {
  const sorted = sortTasks([
    { id: 1, done: true, doneAt: 5, createdAt: 1 },
    { id: 2, done: false, createdAt: 3 },
    { id: 3, done: false, createdAt: 2 },
  ]);
  assert.deepEqual(
    sorted.map((task) => task.id),
    [3, 2, 1],
  );
});

test("store con db: guarda bajo data/users/<id>/jarvis y refleja los cambios", async () => {
  const store = await createStore(() => {});
  assert.equal(store.persistent, true);
  const task = await store.addTask("Comprar cartulina");
  const memory = await store.addMemory("Mi motor es JavaScript puro");
  await tick();
  assert.equal(store.sync, "ok");
  assert.deepEqual(
    store.tasks.map((item) => item.text),
    ["Comprar cartulina"],
  );
  await store.setTaskDone(task.id, true);
  await tick();
  assert.equal(store.tasks[0].done, true);

  // Lo guardado está donde debe: el subárbol privado del usuario.
  const db = await globalThis.claude.use("db");
  const saved = await db
    .collection("data/users/u_fake1")
    .doc("jarvis")
    .collection("tareas")
    .get();
  assert.equal(saved.size, 1);
  assert.equal(saved.docs[0].data().text, "Comprar cartulina");

  const removed = await store.removeMemory(memory.id);
  await tick();
  assert.equal(store.memories.length, 0);
  await store.restoreMemory(removed);
  await tick();
  assert.equal(store.memories[0].text, "Mi motor es JavaScript puro");
  await store.removeTask(task.id);
  await store.removeMemory(memory.id);
});

// ---------- Acciones de Jarvis ----------

test("marcadores: se separan del texto y uno a medias no se muestra", () => {
  const done = splitMarkers(
    "Listo.\n[[tarea: Estudiar mate]]\n[[recuerda: examen el viernes]]",
  );
  assert.equal(done.visible, "Listo.");
  assert.deepEqual(done.commands, [
    { kind: "tarea", value: "Estudiar mate" },
    { kind: "recuerda", value: "examen el viernes" },
  ]);
  assert.equal(splitMarkers("Va.\n[[tarea: Estu").visible, "Va.");
});

test("runner: numera como las instrucciones y avisa si el número no existe", async () => {
  const store = createSessionStore();
  const existing = await store.addTask("Estudiar mate");
  const actions = [];
  const runner = createRunner({
    actions: store,
    tasks: store.tasks,
    memories: store.memories,
    onAction: (action) => actions.push(action),
  });
  assert.equal(
    await runner.createTask("Subir build"),
    "Tarea 2 creada: Subir build",
  );
  await runner.completeTask(1);
  assert.equal(store.tasks.find((task) => task.id === existing.id).done, true);
  await runner.deleteTask(2);
  assert.equal(store.tasks.length, 1);
  assert.equal(actions.at(-1).undo.kind, "task");
  await assert.rejects(() => runner.deleteTask(2), /Ya se borró/);
  await assert.rejects(
    () => runner.completeTask(9),
    /No existe la tarea número 9/,
  );
  assert.equal(runner.count, 3);
});

// ---------- Conexión con Claude (visor simulado) ----------

function ask(backend, store, text, extra = {}) {
  const seen = [];
  const actions = [];
  const promise = backend.ask({
    mode: "general",
    turns: [{ role: "user", content: text }],
    tasks: store.tasks,
    memories: store.memories,
    persistent: store.persistent,
    actions: store,
    onText: (shown) => seen.push(shown),
    onAction: (action) => actions.push(action),
    ...extra,
  });
  return { promise, seen, actions };
}

test("backend: con herramientas crea la tarea y el texto llega en streaming", async () => {
  const backend = await createBackend();
  const store = createSessionStore();
  assert.equal(backend.mode, "cloud");
  assert.equal(backend.acts, "tools");
  const { promise, seen, actions } = ask(
    backend,
    store,
    "anota comprar cartulina",
  );
  const { text } = await promise;
  assert.equal(store.tasks[0].text, "comprar cartulina");
  assert.equal(actions[0].label, "Tarea creada: comprar cartulina");
  assert.ok(seen.length > 1);
  assert.equal(seen.at(-1), text);
  const call = globalThis.__fakeCalls.sample.at(-1);
  assert.equal(call.modelTier, "quick");
  assert.equal(call.cache, false);
  assert.equal(call.tools.length, 5);
});

test("backend: Escuela y Juegos piden el modelo que piensa", async () => {
  const backend = await createBackend();
  const store = createSessionStore();
  await ask(backend, store, "explícame fracciones", { mode: "escuela" })
    .promise;
  assert.equal(globalThis.__fakeCalls.sample.at(-1).modelTier, "default");
});

test("backend: errores con mensaje para Emilio y detener conserva lo escrito", async () => {
  const backend = await createBackend();
  const store = createSessionStore();
  await assert.rejects(
    () => ask(backend, store, "esto falla").promise,
    (error) =>
      error instanceof AskError &&
      error.code === "upstream_error" &&
      !error.cancelled,
  );
  const refused = await ask(backend, store, "algo prohibido").promise.catch(
    (error) => error,
  );
  assert.equal(refused.code, "refused");
  assert.equal(refused.partial, undefined);

  const controller = new AbortController();
  const { promise, seen } = ask(backend, store, "dame código", {
    signal: controller.signal,
  });
  while (seen.length < 3) await tick(2);
  controller.abort();
  const stopped = await promise.catch((error) => error);
  assert.equal(stopped.cancelled, true);
  assert.equal(stopped.partial, seen.at(-1));
});

test("backend: sin herramientas usa marcadores y no los enseña", async () => {
  globalThis.__JARVIS_FAKE__.tools = false;
  const previous = globalThis.claude;
  await import("./fake-claude.js?sin-herramientas");
  try {
    const backend = await createBackend();
    const store = createSessionStore();
    assert.equal(backend.acts, "markers");
    const { promise, seen, actions } = ask(
      backend,
      store,
      "anota estudiar mate",
    );
    const { text } = await promise;
    assert.equal(store.tasks[0].text, "estudiar mate");
    assert.equal(actions[0].label, "Tarea creada: estudiar mate");
    assert.ok(seen.every((shown) => !shown.includes("[[")));
    assert.ok(!text.includes("[["));
    assert.equal(globalThis.__fakeCalls.sample.at(-1).tools, null);
  } finally {
    globalThis.claude = previous;
  }
});

test("backend: sin visor queda en modo demo y entiende órdenes simples", async () => {
  const previous = globalThis.claude;
  delete globalThis.claude;
  try {
    const backend = await createBackend();
    const store = createSessionStore();
    assert.equal(backend.mode, "demo");
    const { text } = await ask(backend, store, "anota comprar cartulina")
      .promise;
    assert.equal(store.tasks[0].text, "comprar cartulina");
    assert.match(text, /Anotado/);
    const other = await ask(backend, store, "hola").promise;
    assert.match(other.text, /modo demo/);
  } finally {
    globalThis.claude = previous;
  }
});

// ---------- Textos de estado y conversación guardada ----------

test("estado: saludo por hora, resumen y avisos", () => {
  assert.equal(
    greeting(new Date("2026-11-15T08:00:00")),
    "Buenos días, Emilio",
  );
  assert.equal(
    greeting(new Date("2026-11-15T15:00:00")),
    "Buenas tardes, Emilio",
  );
  assert.equal(
    greeting(new Date("2026-11-15T23:00:00")),
    "Buenas noches, Emilio",
  );
  assert.equal(telemetry(null), "Conectando con tu memoria…");
  assert.equal(
    telemetry({ tasks: [{ done: false }, { done: true }], memories: [{}] }),
    "1 pendiente · 1 recuerdo",
  );
  assert.equal(
    telemetry({ tasks: [], memories: [] }),
    "Sin pendientes · sin recuerdos",
  );
  assert.equal(statusText({ phase: "idle", backend: null }), "conectando…");
  assert.equal(
    statusText({ phase: "thinking", backend: { mode: "cloud" } }),
    "pensando…",
  );
  assert.equal(
    statusText({ phase: "idle", backend: { mode: "demo" } }),
    "modo demo",
  );
  const cloud = { mode: "cloud" };
  assert.equal(
    noticeFor({ backend: cloud, store: { persistent: true, sync: "ok" } }),
    null,
  );
  assert.match(
    noticeFor({ backend: { mode: "demo" }, store: { persistent: false } }).text,
    /Modo demo y sin memoria/,
  );
  assert.equal(
    noticeFor({ backend: cloud, store: { persistent: true, sync: "error" } })
      .action,
    "Reintentar",
  );
});

test("conversación guardada: valida lo que lee y descarta lo que falló", () => {
  const previous = globalThis.localStorage;
  const saved = new Map();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  try {
    writeChat("escuela", [
      { role: "user", content: "hola" },
      { role: "assistant", content: "", status: "error" },
      {
        role: "assistant",
        content: "respuesta",
        status: "done",
        actions: [{ label: "Tarea creada: x" }, { sinEtiqueta: true }],
      },
    ]);
    const back = readChat();
    assert.equal(back.mode, "escuela");
    assert.deepEqual(
      back.messages.map((message) => message.content),
      ["hola", "respuesta"],
    );
    assert.equal(back.messages[1].actions.length, 1);
    saved.set("jarvis:chat:v1", "{no es json");
    assert.equal(readChat(), null);
  } finally {
    globalThis.localStorage = previous;
  }
});

// ---------- Modo voz ----------

test("voz: el texto para decir no lleva símbolos, enlaces crudos ni código", () => {
  const said = speechText(
    [
      "## Título",
      "",
      "Usa **`requestAnimationFrame`** y mira [la guía](https://a.com/x).",
      "",
      "```js",
      "const a = 1;",
      "```",
      "",
      "- uno",
      "- dos",
      "",
      "2 * 3 = 6 y https://itch.io/dashboard",
    ].join("\n"),
  );
  assert.ok(!/[#*`[\]]/.test(said));
  assert.ok(said.includes("Usa requestAnimationFrame y mira la guía."));
  assert.ok(said.includes("(bloque de código)"));
  assert.ok(!said.includes("const a"));
  assert.ok(said.includes("2 por 3 = 6 y enlace"));
});

test("voz: en streaming solo se dicen frases completas y lo dicho no cambia", () => {
  assert.deepEqual(speechChunks("Hola Emilio. Estoy pens", false), [
    "Hola Emilio.",
  ]);
  assert.deepEqual(speechChunks("Hola Emilio. Estoy pensando.", true), [
    "Hola Emilio.",
    "Estoy pensando.",
  ]);
  const early = speechChunks("Paso uno: abre el archivo.\nPaso dos", false);
  const late = speechChunks("Paso uno: abre el archivo.\nPaso dos: guarda.");
  assert.deepEqual(early, ["Paso uno:", "abre el archivo."]);
  assert.deepEqual(late.slice(0, early.length), early);
  // Un bloque de código a medias no se lee ni cambia lo anterior.
  assert.deepEqual(speechChunks("Mira:\n```js\nconst a", false), ["Mira:"]);
  assert.deepEqual(speechChunks("Mira:\n```js\nconst a = 1;\n```\nListo."), [
    "Mira:",
    "(bloque de código)",
    "Listo.",
  ]);
  // Las horas y los decimales no cortan la frase.
  assert.deepEqual(speechChunks("Nos vemos a las 8:30 con 3.5 puntos."), [
    "Nos vemos a las 8:30 con 3.5 puntos.",
  ]);
});

test("voz: las frases largas se parten y nada queda vacío", () => {
  const chunks = speechChunks(`${"palabra ".repeat(120)}fin. --- ✓`);
  assert.ok(chunks.length > 3);
  assert.ok(
    chunks.every((chunk) => chunk.length <= 240 && /\p{L}/u.test(chunk)),
  );
});

test("voz: lo dictado se une a lo escrito sin pegar ni duplicar espacios", () => {
  assert.equal(glue("", " hola"), "hola");
  assert.equal(glue("Jarvis,", " anota esto"), "Jarvis, anota esto");
  assert.equal(glue("hola", "mundo"), "hola mundo");
  assert.equal(glue("hola ", "mundo"), "hola mundo");
  assert.equal(glue("hola", ""), "hola");
});

test("instrucciones: una respuesta hablada pide frases cortas y sin código", () => {
  const base = {
    mode: "general",
    tasks: [],
    memories: [],
    now: NOW,
    actMode: "tools",
    persistent: true,
  };
  assert.ok(!buildInstructions(base).includes("leer en voz alta"));
  assert.ok(
    buildInstructions({ ...base, spoken: true }).includes("leer en voz alta"),
  );
});

// ---------- La voz del copiloto de Born to Rally ----------

const DEVICE_VOICES = [
  { lang: "en-US", name: "Samantha" },
  { lang: "es-MX", name: "Paulina" },
  { lang: "es-ES", name: "Mónica" },
  { lang: "es-MX", name: "Juan" },
  { lang: "es-ES", name: "Jorge" },
  { lang: "es-ES", name: "Abuelo", voiceURI: "com.apple.voice.Grandpa" },
  { lang: "es-ES", name: "Jorge" },
];

test("voz: elige como el copiloto, hombre y de España primero, sin voces de broma", () => {
  const ranked = rankVoices(DEVICE_VOICES).map((voice) => voice.name);
  assert.deepEqual(ranked, ["Jorge", "Mónica", "Juan", "Paulina"]);
  // Mismos pesos que en el juego.
  assert.equal(scoreVoice({ lang: "es-ES", name: "Jorge" }), 62);
  assert.equal(scoreVoice({ lang: "es-MX", name: "Paulina" }), 12);
});

test("voz: una voz mejorada del dispositivo gana a la normal", () => {
  const ranked = rankVoices([
    { lang: "es-ES", name: "Jorge" },
    { lang: "es-MX", name: "Juan (mejorada)" },
    { lang: "es-ES", name: "Eloquence Jorge" },
  ]);
  assert.deepEqual(
    ranked.map((voice) => voice.name),
    ["Jorge", "Juan (mejorada)", "Eloquence Jorge"],
  );
  assert.equal(scoreVoice(ranked[1]), 12 + 25 + 22);
});

test("voz: el nombre del selector es corto y marca hombre y calidad", () => {
  assert.equal(voiceLabel({ lang: "es-ES", name: "Jorge" }), "Jorge · ES ♂");
  assert.equal(
    voiceLabel({ lang: "es-MX", name: "Juan (mejorada)" }),
    "Juan · MX ♂ ★",
  );
  assert.equal(
    voiceLabel({
      lang: "es-ES",
      name: "Microsoft Elvira Online (Natural) - Spanish (Spain)",
    }),
    "Elvira · ES ★",
  );
});

test("voz: no se reenvía lo que el dictado del teclado vuelve a escribir", () => {
  const sent = ["qué tengo pendiente", "anota comprar leche"];
  assert.equal(
    withoutSent("Qué tengo pendiente. Anota comprar leche y pan", sent),
    "y pan",
  );
  assert.equal(
    withoutSent("anota comprar leche, ¿y mañana?", sent),
    "¿y mañana?",
  );
  assert.equal(
    withoutSent("  otra cosa distinta ", sent),
    "otra cosa distinta",
  );
  // Repetir la misma frase tal cual es un mensaje nuevo, no texto viejo.
  assert.equal(withoutSent("anota comprar leche", sent), "anota comprar leche");
  assert.equal(withoutSent("hola", []), "hola");
});
