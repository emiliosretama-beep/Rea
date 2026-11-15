// Voz de Jarvis: dictado (`dictation`) y lectura en voz alta (`tts`).
// Las dos capabilities resuelven `null` en Safari y en las apps móviles de
// Claude; ahí la interfaz esconde los botones y se escribe con el teclado.
// La plataforma es la dueña del micrófono y del sonido: la página solo recibe
// texto y estados.

const SPEAK_LIMIT = 1800; // la capability acepta hasta 2,000 caracteres por línea
const SPEAK_MAX_LINES = 100;

// Parte un texto en líneas que `tts` acepta: un párrafo por línea, sin bloques
// de código (se sustituyen por una frase corta).
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

const DICTATION_NOTES = {
  rate_limited: "Hay demasiados dictados a la vez. Intenta en un momento.",
  upstream_error: "Falló el micrófono o el servicio de voz.",
  not_granted: "El dictado está desactivado para esta página.",
};

const SPEAK_NOTES = {
  busy: "Termina de dictar para poder escuchar la respuesta.",
  rate_limited: "Demasiada lectura en voz alta por ahora. Intenta más tarde.",
  upstream_error: "Falló la lectura en voz alta.",
  no_gesture: "Toca de nuevo para escuchar.",
};

function setupDictation(dictation, handlers) {
  // Se pide español; si no se ofrece, el siguiente intento usa el idioma del
  // dispositivo, y si tampoco, el botón se esconde.
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

  // Debe llamarse directo desde el clic: start() exige el gesto del usuario.
  return function toggleDictation() {
    if (dictation.active()) {
      dictation.stop().catch(() => {});
      return;
    }
    dictation.start(language ? { language } : undefined).catch(fail);
  };
}

function setupSpeech(tts, handlers) {
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

  return {
    // Llamar desde un clic. Un segundo clic sobre lo que suena lo detiene.
    toggle(id, text) {
      if (speakingId === id && tts.active()) {
        tts.stop().catch(() => {});
        return;
      }
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
    },
    stop() {
      if (tts.active()) tts.stop().catch(() => {});
    },
  };
}

// Nunca lanza. `toggleDictation` y `speech` son null cuando la vista no los ofrece.
export async function createVoice(handlers = {}) {
  const claude = globalThis.window?.claude;
  if (!claude?.use) return { toggleDictation: null, speech: null };
  const [dictation, tts] = await Promise.all([
    claude.use("dictation").catch(() => null),
    claude.use("tts").catch(() => null),
  ]);
  return {
    toggleDictation: dictation ? setupDictation(dictation, handlers) : null,
    speech: tts ? setupSpeech(tts, handlers) : null,
  };
}
