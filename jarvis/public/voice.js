// Voz de Jarvis: hablarle y escucharlo.
// - Hablarle: la capability `dictation` (el micrófono lo abre la plataforma).
//   En Safari y en las apps móviles no existe; ahí talk.js usa el dictado del
//   teclado.
// - Escucharlo: la voz del propio navegador (speechSynthesis), con el mismo
//   sistema que el copiloto de Born to Rally: se puntúan las voces del
//   dispositivo para elegir la mejor en español (de hombre y de alta calidad
//   si las hay), y se puede cambiar a mano, probarla y ajustar su volumen.

const CHUNK_LIMIT = 240; // frases cortas: la voz arranca antes y no se corta
const START_LIMIT_MS = 3000;
const SENTENCE_END = ".!?…:";
const VOICE_KEY = "jarvis:voice:v1";
const RATE = 1.1; // el copiloto canta notas a 1.28; para conversar, más calmado
const PITCH = 0.9; // igual que el copiloto
const SAMPLE = "Hola, Emilio. Soy Jarvis, y así voy a sonar.";

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
    let cut = CHUNK_LIMIT;
    if (comma > CHUNK_LIMIT / 2) cut = comma + 1;
    else if (space > 0) cut = space;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

// Frases para decir. Con `done` en false (streaming) la última frase se guarda
// hasta que llegue completa.
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

// ---------- Elegir la voz (sistema del copiloto de Born to Rally) ----------

// Nombres con los que los sistemas llaman a sus voces de hombre.
const MALE_VOICES = new Set(
  (
    "jorge pablo alvaro álvaro diego enrique carlos raul raúl jordi dario darío " +
    "jose josé arnau juan gerardo elias elías saul saúl teo andres andrés daniel " +
    "oliver george ryan guy thomas arthur christopher eric roger andrew brian " +
    "steffan aaron alex tom lee reed eddy rocko male hombre masculino masculina"
  ).split(" "),
);

// Voces de broma que traen iPhone, iPad y Mac: no sirven para un asistente.
const JOKE_VOICES = new Set(
  (
    "albert bahh bells campanas boing bubbles burbujas cellos chelos violonchelos " +
    "deranged trastornado hysterical histérico histerico organ pipeorgan órgano " +
    "organo princess princesa trinoids trinoides whisper susurro zarvox fred " +
    "junior kathy ralph jester bufón bufon superstar superestrella wobble " +
    "bamboleo news goodnews badnews noticias grandma grandpa abuela abuelo espeak"
  ).split(" "),
);

const HIGH_QUALITY =
  /natural|neural|online|premium|enhanced|mejorad|wavenet|studio/i;

const voiceName = (voice) => `${voice.name ?? ""} ${voice.voiceURI ?? ""}`;
const voiceWords = (voice) =>
  voiceName(voice)
    .toLowerCase()
    .split(/[^a-záéíóúñü]+/);
const isJokeVoice = (voice) =>
  voiceWords(voice).some((word) => JOKE_VOICES.has(word));
const isMaleVoice = (voice) =>
  voiceWords(voice).some((word) => MALE_VOICES.has(word));

// Preferencia: acento de España, voces de alta calidad y de hombre; las voces
// antiguas y robóticas, al final. Son los mismos pesos que usa el copiloto.
export function scoreVoice(voice) {
  const name = voiceName(voice);
  let score = 0;
  if (/^es[-_]ES/i.test(voice.lang)) score += 40;
  else if (/^es[-_](MX|US|419)/i.test(voice.lang)) score += 12;
  if (HIGH_QUALITY.test(name)) score += 25;
  if (/google/i.test(name)) score += 12;
  if (isMaleVoice(voice)) score += 22;
  if (/eloquence/i.test(name)) score -= 20;
  if (voice.default) score += 3;
  return score;
}

// Las voces en español del dispositivo, de la mejor a la peor y sin repetir.
export function rankVoices(voices) {
  const seen = new Set();
  return voices
    .filter((voice) => /^es/i.test(voice.lang ?? "") && !isJokeVoice(voice))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))
    .filter((voice) => !seen.has(voice.name) && seen.add(voice.name));
}

// Nombre corto para el selector: "Jorge · ES ♂ ★".
export function voiceLabel(voice) {
  const name =
    (voice.name ?? "")
      .replace(/^(Microsoft|Google|Apple)\s+/i, "")
      .replace(/\s+-\s+.*$/, "")
      .replace(/\s*\((?:[^()]|\([^()]*\))*\)\s*$/, "")
      .replace(/\s+online/i, "")
      .trim() || voice.lang;
  const region = (voice.lang ?? "").split(/[-_]/)[1] ?? "";
  return (
    name +
    (region ? ` · ${region.toUpperCase()}` : "") +
    (isMaleVoice(voice) ? " ♂" : "") +
    (HIGH_QUALITY.test(voiceName(voice)) ? " ★" : "")
  );
}

// La voz elegida y su volumen se recuerdan en este dispositivo: cada aparato
// tiene sus propias voces.
function loadSettings() {
  const settings = { name: "", volume: 1, muted: false };
  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_KEY) ?? "null") ?? {};
    if (typeof saved.name === "string") settings.name = saved.name;
    if (Number.isFinite(saved.volume))
      settings.volume = Math.min(1, Math.max(0, saved.volume));
    settings.muted = saved.muted === true;
  } catch {
    // Sin almacenamiento: se usan los valores de fábrica.
  }
  return settings;
}

function saveSettings(settings) {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(settings));
  } catch {
    // Si no se puede guardar, el ajuste vale solo para esta visita.
  }
}

// ---------- Hablar ----------

// Lee en voz alta, frase por frase. `pick()` da la voz a usar y `settings` el
// volumen. Avisa de su estado con handlers.onSpeechState.
function createReader(synth, handlers, pick, settings) {
  let session = null; // { id, queued, pending, closed, started, watchdog, poll, keep }

  function end(mine) {
    clearTimeout(mine.watchdog);
    clearInterval(mine.poll);
    if (session !== mine) return;
    session = null;
    handlers.onSpeechState?.("idle", null);
  }

  function stop() {
    if (!session) return;
    end(session);
    synth.cancel();
  }

  function say(mine, chunk) {
    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = pick();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "es-ES";
    utterance.rate = RATE;
    utterance.pitch = PITCH;
    utterance.volume = settings.volume;
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
    try {
      synth.resume(); // como el copiloto: por si la voz quedó en pausa
    } catch {
      // No todos los navegadores lo tienen.
    }
    synth.speak(utterance);
  }

  // Dos vigilancias: que la voz arranque (Safari exige un toque previo) y que
  // no se quede "hablando" para siempre si el navegador pierde el evento final.
  function watch(mine) {
    if (mine.watchdog) return;
    handlers.onSpeechState?.("starting", mine.id);
    mine.watchdog = setTimeout(() => {
      if (session !== mine || mine.started) return;
      stop();
      handlers.onNotice?.(
        "El navegador no dejó que Jarvis hablara solo. Toca «Escuchar» en la respuesta.",
      );
    }, START_LIMIT_MS);
    let quiet = 0;
    mine.poll = setInterval(() => {
      const silent =
        mine.started && mine.closed && !synth.speaking && !synth.pending;
      quiet = silent ? quiet + 1 : 0;
      if (quiet >= 2) end(mine);
    }, 700);
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
      poll: null,
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
    begin,
    feed,
    stop,
    // Lee una respuesta entera, o calla si ya suena.
    toggle(id, text) {
      if (session?.id === id) return stop();
      begin(id);
      feed(id, text, true);
    },
    // Dice una frase suelta.
    say(text) {
      begin("frase");
      feed("frase", text, true);
    },
  };
}

// Lo que expone la voz:
//   unlock()              llamar dentro de un toque: Safari solo deja hablar
//                         después de uno
//   begin(id)             empieza a leer la respuesta `id`
//   feed(id, text, done)  texto acumulado de la respuesta; `done` al terminar
//   toggle(id, text)      lee una respuesta entera, o calla si ya suena
//   say(text) / test()    dice una frase suelta / la frase de prueba
//   stop()
//   voices(), settings, setVoice(), setVolume(), setMuted(), onVoices()
function setupSpeech(synth, handlers) {
  const settings = loadSettings();
  let primed = false;
  let voicesChanged = null;

  function ranked() {
    try {
      return rankVoices(synth.getVoices() ?? []);
    } catch {
      return [];
    }
  }
  // La voz elegida a mano si sigue en el dispositivo; si no, la mejor puntuada.
  function pick() {
    const list = ranked();
    return (
      list.find((voice) => voice.name === settings.name) ?? list[0] ?? null
    );
  }
  const reader = createReader(synth, handlers, pick, settings);

  const notify = () => voicesChanged?.();
  if (synth.addEventListener) synth.addEventListener("voiceschanged", notify);
  else synth.onvoiceschanged = notify;

  return {
    ...reader,
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
    test: () => reader.say(SAMPLE),
    voices: () =>
      ranked().map((voice) => ({ name: voice.name, label: voiceLabel(voice) })),
    get settings() {
      return { ...settings };
    },
    setVoice(name) {
      settings.name = name;
      saveSettings(settings);
    },
    setVolume(volume) {
      settings.volume = Math.min(1, Math.max(0, volume));
      saveSettings(settings);
    },
    setMuted(muted) {
      settings.muted = muted;
      saveSettings(settings);
    },
    // El dispositivo carga sus voces con retraso: avisa cuando ya están.
    onVoices(callback) {
      voicesChanged = callback;
    },
  };
}

// ---------- Escuchar (micrófono de la plataforma) ----------

const DICTATION_NOTES = {
  rate_limited: "Hay demasiados dictados a la vez. Intenta en un momento.",
  upstream_error: "Falló el micrófono o el servicio de voz.",
  not_granted: "El dictado está desactivado para esta página.",
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
    stop: () => dictation.stop().catch(() => {}),
  };
}

// ---------- Escuchar (micrófono del navegador) ----------

const RESTART_MS = 250;
const MAX_FAILED_STARTS = 4;
const BLOCKED = new Set(["not-allowed", "service-not-allowed"]);
const RECOGNITION_NOTES = {
  blocked:
    "El navegador no deja usar el micrófono. Permítelo en los ajustes de Safari para este sitio.",
  gesture: "Toca la pantalla para que Jarvis siga escuchando.",
  "audio-capture": "No encuentro el micrófono.",
  network: "El reconocimiento de voz necesita internet.",
};

// El reconocimiento de voz del propio navegador (Web Speech API), para la
// versión independiente: en una página normal Safari sí deja escuchar. Escucha
// frase por frase y se vuelve a encender solo; mientras Jarvis habla se apaga
// (pause/resume) para no oírse a sí mismo. Entrega los mismos eventos que el
// micrófono de la plataforma. `handsFree`: no hace falta tocar nada entre
// turnos (talk.js usa la palabra «Jarvis»).
function setupRecognition(Recognition, handlers) {
  let recognition = null;
  let wanted = false; // Emilio quiere que escuche
  let paused = false; // Jarvis está hablando
  let failedStarts = 0;
  let restartTimer = null;
  let fromGesture = false;

  function notice(key) {
    handlers.onNotice?.(RECOGNITION_NOTES[key] ?? RECOGNITION_NOTES.network);
  }

  // Sin permiso: se deja de intentar. Si el intento no vino de un toque,
  // probablemente Safari solo pide uno: se espera el siguiente toque.
  function blocked() {
    const needsGesture = !fromGesture;
    wanted = false;
    handlers.onDictationState?.("idle");
    if (needsGesture) handlers.onNeedsGesture?.();
    else notice("blocked");
  }

  function create() {
    const next = new Recognition();
    next.lang = "es-MX";
    next.continuous = false; // una frase por vez: en iPhone es lo más estable
    next.interimResults = true;
    next.maxAlternatives = 1;
    next.onstart = () => {
      failedStarts = 0;
      handlers.onDictationState?.("listening");
    };
    next.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) handlers.onFinal?.(` ${text.trim()}`);
        else interim += text;
      }
      handlers.onPartial?.(interim.trim());
    };
    next.onerror = (event) => {
      if (BLOCKED.has(event.error)) return blocked();
      if (event.error === "audio-capture" || event.error === "network") {
        wanted = false;
        notice(event.error);
      }
      // "no-speech" y "aborted" son normales: se vuelve a escuchar.
    };
    next.onend = () => {
      if (recognition === next) recognition = null;
      if (wanted && !paused) scheduleRestart();
      else if (!wanted) handlers.onDictationState?.("idle");
    };
    return next;
  }

  function begin() {
    clearTimeout(restartTimer);
    if (recognition || !wanted || paused) return;
    recognition = create();
    try {
      recognition.start();
    } catch {
      recognition = null;
      scheduleRestart();
    }
  }

  function scheduleRestart() {
    failedStarts += 1;
    if (failedStarts > MAX_FAILED_STARTS) {
      wanted = false;
      handlers.onDictationState?.("idle");
      handlers.onNeedsGesture?.();
      return notice("gesture");
    }
    clearTimeout(restartTimer);
    restartTimer = setTimeout(begin, RESTART_MS);
  }

  function halt() {
    clearTimeout(restartTimer);
    const current = recognition;
    recognition = null;
    try {
      current?.abort();
    } catch {
      // Ya estaba apagado.
    }
  }

  return {
    handsFree: true,
    // `gesture`: la llamada viene directo de un toque de Emilio.
    start(gesture = false) {
      fromGesture = gesture;
      wanted = true;
      paused = false;
      failedStarts = 0;
      begin();
    },
    stop() {
      wanted = false;
      halt();
      handlers.onDictationState?.("idle");
    },
    toggle() {
      if (wanted) this.stop();
      else this.start(true);
    },
    pause() {
      paused = true;
      halt();
    },
    resume() {
      if (!paused) return;
      paused = false;
      failedStarts = 0;
      begin();
    },
    get wanted() {
      return wanted;
    },
  };
}

// Nunca lanza. `listen` es null si la vista no ofrece micrófono; `speech` es
// null si el navegador no tiene voz. `site`: la versión independiente, donde
// el micrófono del navegador sí está permitido.
export async function createVoice(handlers = {}, { site = false } = {}) {
  const claude = globalThis.window?.claude;
  const dictation = claude?.use
    ? await claude.use("dictation").catch(() => null)
    : null;
  const Recognition =
    globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
  let listen = null;
  if (dictation) listen = setupDictation(dictation, handlers);
  else if (site && Recognition)
    listen = setupRecognition(Recognition, handlers);
  const synth = globalThis.speechSynthesis;
  const canSpeak = Boolean(synth && globalThis.SpeechSynthesisUtterance);
  return {
    listen,
    speech: canSpeak ? setupSpeech(synth, handlers) : null,
  };
}
