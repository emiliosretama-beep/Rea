// Voz de Jarvis: hablarle y escucharlo.
// - Hablarle: la capability `dictation` (el micrófono lo abre la plataforma).
//   En Safari y en las apps móviles no existe; ahí talk.js usa el dictado del
//   teclado.
// - Escucharlo: la capability `tts`. Si esta vista no la ofrece, se usa la voz
//   del propio navegador (speechSynthesis), que sí existe en iPhone y iPad.
//
// Las dos voces exponen lo mismo:
//   unlock()              llamar dentro de un toque: Safari solo deja hablar
//                         después de uno
//   begin(id)             empieza a leer la respuesta `id`
//   feed(id, text, done)  texto acumulado de la respuesta; `done` al terminar
//   toggle(id, text)      lee una respuesta entera, o calla si ya suena
//   stop()

const SPEAK_LIMIT = 1800; // `tts` acepta hasta 2,000 caracteres por línea
const SPEAK_MAX_LINES = 100;
const CHUNK_LIMIT = 240; // frases cortas: la voz del navegador arranca antes
const START_LIMIT_MS = 3000;
const SENTENCE_END = ".!?…:";

// Parte un texto en líneas que `tts` acepta: un párrafo por línea, sin bloques
// de código (se sustituyen por una frase corta). La plataforma quita ella
// misma las marcas de Markdown.
export function speakLines(text) {
  const prose = String(text ?? "").replace(
    /```[\s\S]*?(?:```|$)/g,
    "\n\n(bloque de código)\n\n",
  );
  const lines = [];
  for (const paragraph of prose.split(/\n{2,}/)) {
    let rest = paragraph.replace(/\s+/g, " ").trim();
    while (rest.length > SPEAK_LIMIT) {
      const cut = rest.lastIndexOf(". ", SPEAK_LIMIT);
      const end = cut > SPEAK_LIMIT / 2 ? cut + 1 : SPEAK_LIMIT;
      lines.push(rest.slice(0, end).trim());
      rest = rest.slice(end).trim();
    }
    if (rest) lines.push(rest);
  }
  return lines.slice(0, SPEAK_MAX_LINES).map((line) => ({ text: line }));
}

// Markdown a texto que se pueda decir: sin símbolos, sin código y con los
// enlaces por su nombre. Un bloque de código sin cerrar (streaming) se calla
// hasta el final, así lo ya dicho no cambia cuando llega más texto.
export function speechText(markdown) {
  return String(markdown ?? "")
    .replace(/```[\s\S]*?(?:```|$)/g, "\n(bloque de código)\n")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s)]*\)?/g, "$1")
    .replace(/https?:\/\/\S+/g, "enlace")
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\d)\s*\*\s*(\d)/g, "$1 por $2")
    .replace(/\|/g, ", ")
    .replace(/[*_~]+/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Corta una frase larga por una coma o un espacio cercano al límite.
function splitLong(piece) {
  const parts = [];
  let rest = piece;
  while (rest.length > CHUNK_LIMIT) {
    const comma = rest.lastIndexOf(", ", CHUNK_LIMIT);
    const space = rest.lastIndexOf(" ", CHUNK_LIMIT);
    const cut =
      comma > CHUNK_LIMIT / 2 ? comma + 1 : space > 0 ? space : CHUNK_LIMIT;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

// Frases para la voz del navegador. Con `done` en false (streaming) la última
// frase se guarda hasta que llegue completa.
export function speechChunks(markdown, done = true) {
  const plain = speechText(markdown);
  const pieces = [];
  let start = 0;
  for (let i = 0; i < plain.length; i++) {
    const char = plain[i];
    const closes = SENTENCE_END.includes(char) && /\s/.test(plain[i + 1] ?? "");
    if (char !== "\n" && !closes) continue;
    pieces.push(plain.slice(start, i + 1));
    start = i + 1;
  }
  if (done) pieces.push(plain.slice(start));
  return pieces
    .map((piece) => piece.trim())
    .filter((piece) => /[\p{L}\p{N}]/u.test(piece))
    .flatMap(splitLong);
}

const DICTATION_NOTES = {
  rate_limited: "Hay demasiados dictados a la vez. Intenta en un momento.",
  upstream_error: "Falló el micrófono o el servicio de voz.",
  not_granted: "El dictado está desactivado para esta página.",
};

const SPEAK_NOTES = {
  busy: "Termina de dictar para poder escuchar la respuesta.",
  rate_limited: "Demasiada lectura en voz alta por ahora. Intenta más tarde.",
  upstream_error: "Falló la lectura en voz alta.",
  no_gesture: "Toca «Escuchar» en la respuesta para oírla.",
};

function setupDictation(dictation, handlers) {
  // Se pide español; si no se ofrece, el siguiente intento usa el idioma del
  // dispositivo, y si tampoco, el micrófono de la plataforma se da por perdido.
  let language = "es";
  let listened = false;
  const drop = () => handlers.onDictationGone?.();

  dictation.onPartial(({ text }) => handlers.onPartial?.(text));
  dictation.onFinal(({ text }) => handlers.onFinal?.(text));
  dictation.onState(({ state, reason }) => {
    handlers.onDictationState?.(state);
    if (state === "listening") listened = true;
    if (state !== "idle") return;
    // Un arranque fallido lo atiende fail(); aquí solo lo que corta un dictado
    // que ya estaba escuchando.
    if (reason === "not_granted" || (listened && reason === "unavailable"))
      drop();
    listened = false;
  });

  function fail(error) {
    const code = error?.code;
    if (code === "unavailable" && language) {
      language = null;
      handlers.onNotice?.(
        "No hay dictado en español aquí. Toca otra vez para usar el idioma de tu dispositivo.",
      );
    } else if (code === "unavailable" || code === "not_granted") {
      handlers.onNotice?.(DICTATION_NOTES.not_granted);
      drop();
    } else if (DICTATION_NOTES[code])
      handlers.onNotice?.(DICTATION_NOTES[code]);
  }

  return {
    // Debe llamarse directo desde el clic: start() exige el gesto del usuario.
    toggle() {
      if (dictation.active()) {
        dictation.stop().catch(() => {});
        return;
      }
      dictation.start(language ? { language } : undefined).catch(fail);
    },
    // Resuelve cuando ya llegaron las últimas palabras.
    stop: () => dictation.stop().catch(() => {}),
    active: () => dictation.active(),
  };
}

function setupPlatformSpeech(tts, handlers) {
  let speakingId = null;
  let spanish = false;
  Promise.resolve()
    .then(() => tts.languages?.())
    .then((languages) => {
      spanish = Array.isArray(languages) && languages.includes("es");
    })
    .catch(() => {});

  const drop = () => handlers.onSpeechGone?.();

  tts.onState(({ state, reason }) => {
    // "replaced": otra lectura tomó su lugar; el id nuevo ya está puesto.
    if (state === "idle" && reason === "replaced") return;
    handlers.onSpeechState?.(state, speakingId);
    if (state !== "idle") return;
    speakingId = null;
    if (reason === "not_granted" || reason === "unavailable") drop();
  });

  function speak(id, text) {
    const lines = speakLines(text);
    if (lines.length === 0) return;
    speakingId = id;
    tts
      .speak(lines, spanish ? { language: "es" } : undefined)
      .catch((error) => {
        const code = error?.code;
        if (code === "not_granted" || code === "unavailable") drop();
        else if (SPEAK_NOTES[code]) handlers.onNotice?.(SPEAK_NOTES[code]);
      });
  }
  const stop = () => {
    if (tts.active()) tts.stop().catch(() => {});
  };

  return {
    kind: "platform",
    unlock() {},
    begin() {},
    // La plataforma lee la respuesta entera, al terminar de llegar.
    feed(id, text, done) {
      if (done) speak(id, text);
    },
    toggle(id, text) {
      if (speakingId === id && tts.active()) stop();
      else speak(id, text);
    },
    stop,
  };
}

// De las voces del dispositivo, la primera en español; de preferencia de México.
function spanishVoice(synth) {
  const order = ["es-mx", "es-us", "es-419", "es-es"];
  const rank = (voice) => {
    const index = order.indexOf(voice.lang.toLowerCase().replace("_", "-"));
    return index < 0 ? order.length : index;
  };
  return (
    synth
      .getVoices()
      .filter((voice) => /^es([-_]|$)/i.test(voice.lang))
      .sort((a, b) => rank(a) - rank(b))[0] ?? null
  );
}

function setupBrowserSpeech(synth, handlers) {
  let session = null; // { id, queued, pending, closed, started, watchdog, keep }
  let primed = false;

  function end(mine) {
    clearTimeout(mine.watchdog);
    if (session !== mine) return;
    session = null;
    handlers.onSpeechState?.("idle", null);
  }

  function stop() {
    if (!session) return;
    const mine = session;
    end(mine);
    synth.cancel();
  }

  function say(mine, chunk) {
    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = spanishVoice(synth);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "es-MX";
    utterance.onstart = () => {
      if (session !== mine || mine.started) return;
      mine.started = true;
      clearTimeout(mine.watchdog);
      handlers.onSpeechState?.("speaking", mine.id);
    };
    const settle = () => {
      mine.pending -= 1;
      if (mine.closed && mine.pending <= 0) end(mine);
    };
    utterance.onend = settle;
    utterance.onerror = settle;
    mine.keep.push(utterance); // sin referencia, el navegador puede perder "end"
    mine.pending += 1;
    synth.speak(utterance);
  }

  // Si el navegador no arranca (Safari exige un toque previo), se avisa en vez
  // de quedarse callado sin explicación.
  function watch(mine) {
    if (mine.watchdog || mine.started) return;
    mine.watchdog = setTimeout(() => {
      if (session !== mine || mine.started) return;
      stop();
      handlers.onNotice?.(
        "El navegador no dejó que Jarvis hablara solo. Toca «Escuchar» en la respuesta.",
      );
    }, START_LIMIT_MS);
  }

  function begin(id) {
    stop();
    session = {
      id,
      queued: 0,
      pending: 0,
      closed: false,
      started: false,
      watchdog: null,
      keep: [],
    };
  }

  function feed(id, text, done) {
    const mine = session;
    if (!mine || mine.id !== id) return;
    const chunks = speechChunks(text, done);
    for (const chunk of chunks.slice(mine.queued)) say(mine, chunk);
    if (chunks.length > mine.queued) watch(mine);
    mine.queued = Math.max(mine.queued, chunks.length);
    if (!done) return;
    mine.closed = true;
    if (mine.pending <= 0) end(mine);
  }

  return {
    kind: "browser",
    unlock() {
      if (primed) return;
      primed = true;
      try {
        const silent = new SpeechSynthesisUtterance(" ");
        silent.volume = 0;
        synth.speak(silent);
      } catch {
        // Sin voz en este navegador: los botones de escuchar no harán nada.
      }
    },
    begin,
    feed,
    toggle(id, text) {
      if (session?.id === id) return stop();
      begin(id);
      feed(id, text, true);
    },
    stop,
  };
}

// Nunca lanza. `listen` es null si la vista no ofrece micrófono; `speech` es
// null si no hay ninguna voz disponible.
export async function createVoice(handlers = {}) {
  const claude = globalThis.window?.claude;
  const [dictation, tts] = claude?.use
    ? await Promise.all([
        claude.use("dictation").catch(() => null),
        claude.use("tts").catch(() => null),
      ])
    : [null, null];
  const synth = globalThis.speechSynthesis;
  const browserVoice = Boolean(synth && globalThis.SpeechSynthesisUtterance);
  let speech = null;
  if (tts) speech = setupPlatformSpeech(tts, handlers);
  else if (browserVoice) speech = setupBrowserSpeech(synth, handlers);
  return {
    listen: dictation ? setupDictation(dictation, handlers) : null,
    speech,
  };
}
