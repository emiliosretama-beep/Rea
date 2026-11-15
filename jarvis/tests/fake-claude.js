// Visor simulado de claude.ai para probar Jarvis sin publicarlo.
// Imita lo que promete el contrato de las capabilities (sample, db, user,
// dictation, tts) tal como lo leímos en sus definiciones de tipos. NO es la
// plataforma real: sirve para comprobar la lógica de la página, no a Claude.
//
// Se inyecta antes que los scripts de la página. La configuración va en
// window.__JARVIS_FAKE__ = { sample, tools, db, user, dictation, tts, ... }.
(() => {
  const config = {
    sample: true,
    tools: true,
    db: true,
    user: true,
    dictation: false,
    tts: false,
    useMs: 30,
    thinkMs: 500,
    chunkMs: 45,
    dbMs: 40,
    dbFail: "",
    ...window.__JARVIS_FAKE__,
  };
  const calls = (window.__fakeCalls = { sample: [], speak: [], dictation: [] });
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  // ---------- sample ----------

  const LONG_ANSWER = [
    "Claro. Para mover al jugador con el dedo usa **eventos de puntero**, que sirven igual en iPhone y en escritorio:",
    "",
    "1. Guarda dónde empezó el toque.",
    "2. En cada movimiento calcula la diferencia:",
    "   ```js",
    '   canvas.addEventListener("pointermove", (event) => {',
    "     const dx = event.clientX - start.x; // puede ser negativo si arrastra a la izquierda",
    "     player.x += dx * 0.5;",
    "   });",
    "   ```",
    "3. Suelta el control en `pointerup`.",
    "",
    "Prueba en tu iPhone que el juego no haga scroll: pon `touch-action: none` en el canvas.",
  ].join("\n");

  const TABLE_ANSWER = [
    "Te dejo la comparación:",
    "",
    "| Opción | Ventaja | Contra |",
    "|---|---|---|",
    "| Canvas 2D | Simple y ligero | Sin 3D |",
    "| WebGL | Muy rápido | Más difícil |",
    "",
    "Para tu caso empezaría con **Canvas 2D**.",
  ].join("\n");

  // Guion del modelo simulado: qué acción toma según el último mensaje.
  // `marker` es la orden de texto que usa cuando no hay herramientas.
  const SCRIPTED_ACTIONS = [
    {
      match: /^(?:anota|agrega)\s*:?\s+(.+)$/i,
      tool: "crear_tarea",
      args: (found) => ({ texto: found[1] }),
      marker: (found) => `[[tarea: ${found[1]}]]`,
      done: (found) => `Listo, Emilio. Anoté **${found[1]}** en tus tareas.`,
    },
    {
      match: /^recuerda(?:\s+que)?\s+(.+)$/i,
      tool: "recordar",
      args: (found) => ({ dato: found[1] }),
      marker: (found) => `[[recuerda: ${found[1]}]]`,
      done: () => "Guardado. Lo voy a tener presente.",
    },
    {
      match: /^borra la tarea (\d+)/i,
      tool: "borrar_tarea",
      args: (found) => ({ numero: Number(found[1]) }),
      marker: (found) => `[[borrar: ${found[1]}]]`,
      done: () => "Borrada.",
    },
    {
      match: /^ya hice la tarea (\d+)/i,
      tool: "completar_tarea",
      args: (found) => ({ numero: Number(found[1]) }),
      marker: (found) => `[[hecha: ${found[1]}]]`,
      done: () => "Marcada como hecha. Bien ahí.",
    },
    {
      match: /^olvida el recuerdo (\d+)/i,
      tool: "olvidar",
      args: (found) => ({ numero: Number(found[1]) }),
      marker: (found) => `[[olvida: ${found[1]}]]`,
      done: () => "Olvidado.",
    },
  ];

  // Palabras que hacen fallar la llamada con un código concreto.
  const SCRIPTED_FAILURES = [
    [/\bfalla\b/i, "upstream_error"],
    [/\blímite\b/i, "rate_limited"],
  ];

  function reject(code, message, text) {
    return { code, message, ...(text !== undefined && { text }) };
  }

  function checkCall(input, options) {
    const turns =
      typeof input === "string" ? [{ role: "user", content: input }] : input;
    if (!Array.isArray(turns) || turns.length === 0)
      throw reject("invalid_request", "input");
    if (turns[0].role !== "user" || turns.at(-1).role !== "user")
      throw reject("invalid_request", "turns must start and end on user");
    if (turns.some((turn) => typeof turn.content !== "string" || !turn.content))
      throw reject("invalid_request", "empty turn");
    if (options.signal && !(options.signal instanceof AbortSignal))
      throw reject("invalid_request", "signal");
    if (options.tools && options.cache !== undefined && options.cache !== false)
      throw reject("invalid_request", "cache with tools");
    if (options.tools && !config.tools)
      throw reject("tools_unavailable", "no tools here");
    return turns;
  }

  // Respuesta de solo texto, según lo que se pida.
  function plainReply(last, instructions) {
    if (/c[oó]digo/i.test(last)) return LONG_ANSWER;
    if (/tabla/i.test(last)) return TABLE_ANSWER;
    if (/pendientes/i.test(last)) {
      const tasks =
        instructions.split("Tareas de Emilio:\n")[1]?.split("\n\n")[0] ?? "";
      return `Esto es lo que veo en tu lista:\n\n${tasks}`;
    }
    const mode = instructions.match(/Modo actual: (\S+)/)?.[1] ?? "?";
    return `Respuesta simulada en modo ${mode}. Dijiste: «${last.slice(0, 80)}».`;
  }

  // Ejecuta la acción con la herramienta si la hay; si no, escribe el marcador
  // (cuando las instrucciones lo explican). Devuelve el resultado o null.
  async function runAction(action, found, { options, instructions, emit }) {
    const tool = options.tools?.find((item) => item.name === action.tool);
    if (tool) {
      const context = {
        signal: options.signal ?? new AbortController().signal,
      };
      try {
        return String(await tool.execute(action.args(found), context));
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
    if (!instructions.includes("[[tarea:")) return null;
    await emit(`${action.marker(found)}\n`);
    return "ok";
  }

  async function sample(input, options = {}) {
    const turns = checkCall(input, options);
    const instructions = turns[0].content;
    const last = turns.at(-1).content;
    calls.sample.push({
      turns,
      modelTier: options.modelTier,
      tools: options.tools?.map((tool) => tool.name) ?? null,
      cache: options.cache,
    });

    let text = "";
    const stopped = () => reject("cancelled", "aborted", text || undefined);
    async function emit(piece) {
      for (let i = 0; i < piece.length; i += 14) {
        if (options.signal?.aborted) throw stopped();
        const delta = piece.slice(i, i + 14);
        text += delta;
        options.onText?.({ text, delta });
        await wait(config.chunkMs);
      }
    }

    await wait(config.thinkMs);
    if (options.signal?.aborted) throw stopped();
    for (const [pattern, code] of SCRIPTED_FAILURES)
      if (pattern.test(last)) throw reject(code, "scripted failure");
    if (/\bprohibido\b/i.test(last)) {
      await emit("Empiezo a contestar y me detengo");
      throw reject("refused", "declined");
    }

    const action = SCRIPTED_ACTIONS.find((item) => item.match.test(last));
    if (action) {
      const found = last.match(action.match);
      const result = await runAction(action, found, {
        options,
        instructions,
        emit,
      });
      if (result === null) await emit("Aquí no puedo anotar nada.");
      else if (result.startsWith("Error")) await emit(`No pude: ${result}`);
      else await emit(action.done(found));
    } else await emit(plainReply(last, instructions));

    return {
      text,
      truncated: false,
      modelTierApplied: options.modelTier ?? "default",
    };
  }
  sample.limits = async () => ({
    maxPromptBytes: 262144,
    ...(config.tools && { tools: { maxCount: 16 } }),
  });

  // ---------- db (documentos en memoria, guardados en localStorage) ----------

  const DB_KEY = "__fake_claude_db__";
  const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;

  // Misma gramática que la capability: pares = documento, impares = colección.
  function checkPath(path, parity) {
    const parts = String(path).split("/");
    for (const part of parts)
      if (!SEGMENT.test(part) || part === "." || part === "..")
        throw new TypeError(`db: segmento inválido en "${path}"`);
    if (parts.length % 2 !== parity)
      throw new TypeError(`db: "${path}" tiene ${parts.length} segmentos`);
  }

  function loadDocs() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY) ?? "{}");
    } catch {
      return {};
    }
  }

  function makeDb() {
    const docs = loadDocs();
    const listeners = new Set();
    const meta = { fromCache: false, hasPendingWrites: false };
    let minted = 0;

    const docSnap = (path) => {
      const data = docs[path];
      return {
        id: path.split("/").at(-1),
        exists: data !== undefined,
        data: () => (data === undefined ? undefined : structuredClone(data)),
        metadata: meta,
      };
    };
    function collectionSnap(path) {
      const prefix = `${path}/`;
      const list = Object.keys(docs)
        .filter(
          (key) =>
            key.startsWith(prefix) && !key.slice(prefix.length).includes("/"),
        )
        .sort()
        .map(docSnap);
      return {
        docs: list,
        size: list.length,
        empty: !list.length,
        docChanges: () => [],
        metadata: meta,
      };
    }
    // El cambio propio se ve enseguida en los listeners, antes de confirmarse.
    async function write(path, change) {
      if (config.dbFail) throw { code: config.dbFail, message: "fake failure" };
      change();
      localStorage.setItem(DB_KEY, JSON.stringify(docs));
      const parent = path.split("/").slice(0, -1).join("/");
      for (const listener of listeners)
        if (listener.path === parent)
          queueMicrotask(() => listener.next(collectionSnap(parent)));
      await wait(config.dbMs);
    }
    function docRef(path) {
      checkPath(path, 0);
      return {
        id: path.split("/").at(-1),
        path,
        get: async () => docSnap(path),
        set(data) {
          if (!data || typeof data !== "object" || Array.isArray(data))
            return Promise.reject({
              code: "invalid_argument",
              message: "body",
            });
          return write(path, () => {
            docs[path] = structuredClone(data);
          });
        },
        update(data) {
          if (docs[path] === undefined)
            return Promise.reject({
              code: "invalid_argument",
              message: "missing doc",
            });
          return write(path, () => {
            docs[path] = { ...docs[path], ...structuredClone(data) };
          });
        },
        delete: () =>
          write(path, () => {
            delete docs[path];
          }),
        collection: (sub) => collectionRef(`${path}/${sub}`),
      };
    }
    function collectionRef(path) {
      checkPath(path, 1);
      const mint = () =>
        `f${Date.now().toString(36)}${(minted++).toString(36)}`;
      return {
        path,
        doc: (id) => docRef(`${path}/${id ?? mint()}`),
        get: async () => collectionSnap(path),
        onSnapshot(next) {
          const listener = { path, next };
          listeners.add(listener);
          setTimeout(
            () => listeners.has(listener) && next(collectionSnap(path)),
            config.dbMs,
          );
          return () => listeners.delete(listener);
        },
      };
    }
    return { doc: docRef, collection: collectionRef };
  }

  // ---------- user ----------

  const user = {
    id: async () => "u_fake1",
    isOwner: async () => true,
    canEdit: async () => true,
    can: async () => true,
  };

  // ---------- dictation ----------

  function makeDictation() {
    let state = "idle";
    let timers = [];
    const handlers = { partial: new Set(), final: new Set(), state: new Set() };
    const on = (set) => (handler) => {
      set.add(handler);
      return () => set.delete(handler);
    };
    const tell = (set, event) => {
      for (const handler of set) handler(event);
    };
    const setState = (next, reason) => {
      state = next;
      tell(handlers.state, { state: next, ...(reason && { reason }) });
    };
    // Simula a alguien diciendo "anota comprar cartulina".
    function listen() {
      setState("listening");
      let partial = "";
      ["anota", " comprar", " cartulina"].forEach((word, i) =>
        timers.push(
          setTimeout(
            () => {
              partial += word;
              tell(handlers.partial, { text: partial });
            },
            150 * (i + 1),
          ),
        ),
      );
      timers.push(
        setTimeout(() => {
          tell(handlers.partial, { text: "" });
          tell(handlers.final, { text: " anota comprar cartulina" });
        }, 700),
      );
    }
    return {
      start(options) {
        calls.dictation.push(options ?? null);
        if (state !== "idle") return Promise.resolve();
        setState("starting");
        return wait(120).then(listen);
      },
      stop() {
        timers.forEach(clearTimeout);
        timers = [];
        if (state === "idle") return Promise.resolve();
        setState("finishing");
        return wait(60).then(() => setState("idle", "stopped"));
      },
      active: () => state !== "idle",
      onPartial: on(handlers.partial),
      onFinal: on(handlers.final),
      onState: on(handlers.state),
    };
  }

  // ---------- tts ----------

  function makeTts() {
    let state = "idle";
    let pending = null;
    let timer = null;
    const handlers = new Set();
    const setState = (next, reason) => {
      state = next;
      for (const handler of handlers)
        handler({ state: next, ...(reason && { reason }) });
    };
    function end(reason) {
      clearTimeout(timer);
      const waiting = pending;
      pending = null;
      if (state !== "idle") setState("idle", reason);
      if (!waiting) return;
      if (reason === "completed") waiting.resolve({ playedMs: 1200 });
      else waiting.reject({ code: "stopped", message: reason, reason });
    }
    return {
      speak(what, options) {
        const lines = typeof what === "string" ? [{ text: what }] : what;
        const valid =
          lines.length > 0 &&
          lines.every((line) => line.text && line.text.length <= 2000);
        if (!valid)
          return Promise.reject({ code: "invalid_argument", message: "lines" });
        calls.speak.push({ lines, options: options ?? null });
        if (pending) end("replaced");
        setState("starting");
        timer = setTimeout(() => {
          setState("speaking");
          timer = setTimeout(() => end("completed"), 1800);
        }, 150);
        return new Promise((resolve, rejectSpeak) => {
          pending = { resolve, reject: rejectSpeak };
        });
      },
      stop: async () => end("stopped"),
      active: () => state !== "idle",
      languages: async () => ["en", "es"],
      onState(handler) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
    };
  }

  const capabilities = {
    sample: config.sample ? sample : null,
    db: config.db ? makeDb() : null,
    user: config.user ? user : null,
    dictation: config.dictation ? makeDictation() : null,
    tts: config.tts ? makeTts() : null,
  };

  window.claude = {
    use: (name) => wait(config.useMs).then(() => capabilities[name] ?? null),
  };
})();
