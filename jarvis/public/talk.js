// Hablarle a Jarvis sin escribir: una conversación que se queda abierta turno
// tras turno. Según lo que ofrezca la vista hay dos caminos:
// - "platform": el micrófono de la capability `dictation` (Chrome y la app de
//   escritorio). Un toque lo abre y sigue escuchando hasta una hora.
// - "keyboard": en iPhone y iPad la página no puede abrir el micrófono; abre
//   el teclado para usar su dictado y no lo cierra entre turnos.
// - "platform" con el micrófono del navegador (versión independiente): manos
//   libres. Escucha siempre; tras unos segundos sin hablar se duerme y se
//   despierta al oír «Jarvis».
// En todos, cada mensaje se envía solo al hacer una pausa. Mientras Jarvis
// piensa o habla la página se hace la sorda, para no oírse a sí misma.

const PAUSE_PLATFORM_MS = 1600;
const PAUSE_HANDS_FREE_MS = 900; // el navegador ya espera el final de la frase
const PAUSE_KEYBOARD_MS = 2200;
const FOLLOW_UP_MS = 15000; // tiempo para seguir hablando sin decir «Jarvis»
const KEEP_SENT = 6;
const HINTS = {
  platform: "Te escucho. Habla y envío solo cuando hagas una pausa.",
  keyboard:
    "Toca el micrófono de tu teclado y habla. Envío solo cuando hagas una pausa.",
  awake: "Te escucho. Habla y envío solo cuando hagas una pausa.",
  asleep: "Di «Jarvis» y lo que necesites.",
};

// Cómo suele escribir el reconocedor la palabra «Jarvis».
const WAKE_WORD =
  /\b(?:jarvis|j[aá]rvis|jarbis|yarvis|yarbis|llarvis|harvis|garvis)\b[\s,.:;!?¡¿]*/i;

// Lo dicho después de «Jarvis», o null si no lo dijo.
export function afterWakeWord(text) {
  const found = WAKE_WORD.exec(text);
  return found ? text.slice(found.index + found[0].length).trim() : null;
}

// Une lo dictado con lo que ya había, sin duplicar ni comerse espacios.
export function glue(base, piece) {
  if (!base) return piece.trimStart();
  if (!piece) return base;
  return /\s$/.test(base) || /^\s/.test(piece)
    ? base + piece
    : `${base} ${piece}`;
}

// Palabras sin mayúsculas ni signos, para comparar lo oído con lo enviado.
const bare = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);

// El dictado del teclado de iOS a veces vuelve a escribir todo lo dicho en la
// sesión. Quita del principio lo que ya se envió (`sent`, de viejo a nuevo),
// pero solo si después viene algo nuevo: repetir una frase tal cual ("sí",
// "otra vez") es un mensaje legítimo y se envía.
export function withoutSent(text, sent) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const plain = tokens.map((token) => bare(token).join(""));
  for (let from = 0; from < sent.length; from++) {
    const prefix = bare(sent.slice(from).join(" "));
    const repeats =
      prefix.length > 0 &&
      prefix.length < plain.length &&
      prefix.every((word, i) => plain[i] === word);
    if (repeats) return tokens.slice(prefix.length).join(" ");
  }
  return tokens.join(" ");
}

// La pausa antes de enviar. El anillo del botón de enviar muestra cuánto
// falta; `onDone` se llama cuando se cumple.
function createPause(sendButton, onDone) {
  let timer = null;
  function disarm() {
    clearTimeout(timer);
    timer = null;
    sendButton.classList.remove("is-arming");
  }
  function arm(ms) {
    disarm();
    sendButton.style.setProperty("--arm", `${ms}ms`);
    // Leer el ancho obliga a reiniciar la animación del anillo.
    if (sendButton.offsetWidth >= 0) sendButton.classList.add("is-arming");
    timer = setTimeout(onDone, ms);
  }
  return { arm, disarm };
}

// `ui` trae los elementos (input, micButton, sendButton, hint, hintText) y
// tres avisos: `onText()`: la página cambió el texto de la caja.
// `onSpoken(text)`: hay un mensaje dictado listo para enviar. `onChange()`:
// la conversación se abrió o se cerró.
export function createTalk(ui) {
  const { input, micButton, sendButton, hint, hintText } = ui;
  let listen = null; // micrófono de la plataforma, si existe
  let kind = null; // "platform" | "keyboard" | null
  let canKeyboard = false;
  let active = false; // la conversación está abierta
  let deaf = false; // Jarvis piensa o habla: lo que se oiga no cuenta
  let base = ""; // lo ya dictado y confirmado de este turno
  let sent = []; // lo ya enviado en esta conversación
  let awake = true; // manos libres: escucha sin esperar «Jarvis»
  let followTimer = null;
  let replying = false; // Jarvis contesta un mensaje dictado
  const { arm, disarm } = createPause(sendButton, () => deliver());
  const handsFree = () => kind === "platform" && Boolean(listen?.handsFree);

  function refreshHint() {
    if (!active) return;
    if (!handsFree()) hintText.textContent = HINTS[kind];
    else hintText.textContent = awake ? HINTS.awake : HINTS.asleep;
  }

  function wake(on) {
    clearTimeout(followTimer);
    awake = on;
    if (on && handsFree())
      followTimer = setTimeout(() => wake(false), FOLLOW_UP_MS);
    refreshHint();
    ui.onChange();
  }

  function show(text) {
    input.value = text;
    ui.onText();
  }

  function setActive(on) {
    if (!on) disarm();
    if (active === on) return;
    active = on;
    micButton.setAttribute("aria-pressed", String(on));
    hint.hidden = !on;
    refreshHint();
    ui.onChange();
  }

  // Terminó la pausa: se envía lo dictado y la conversación sigue abierta.
  function deliver() {
    disarm();
    const heard =
      kind === "keyboard" ? withoutSent(input.value, sent) : input.value.trim();
    base = "";
    if (!heard) return show("");
    sent = [...sent, heard].slice(-KEEP_SENT);
    replying = true;
    ui.onSpoken(heard);
  }

  // `platformListen`: el micrófono de voice.js o null. `touch`: hay teclado
  // en pantalla con tecla de dictado.
  function setKind(platformListen, touch = canKeyboard) {
    listen = platformListen;
    canKeyboard = touch;
    kind = listen ? "platform" : canKeyboard ? "keyboard" : null;
    micButton.hidden = !kind;
  }

  function stop() {
    clearTimeout(followTimer);
    if (!active) return;
    if (kind === "platform") listen.stop();
    else input.blur();
    setActive(false);
  }

  return {
    get active() {
      return active;
    },
    get handsFree() {
      return active && handsFree();
    },
    // Deja de escuchar mensajes hasta oír «Jarvis» (solo manos libres).
    sleep() {
      replying = false;
      wake(false);
    },
    // Manos libres y dormido: espera a oír «Jarvis».
    get asleep() {
      return active && handsFree() && !awake;
    },
    // Empieza a escuchar sin abrir el teclado (solo con micrófono propio).
    // `gesture`: viene de un toque; `awake`: no hace falta decir «Jarvis».
    start({ gesture = false, awake: startAwake = true } = {}) {
      if (kind !== "platform" || !listen.start) return;
      wake(startAwake);
      listen.start(gesture);
    },
    attach: setKind,
    // Clic en el micrófono: abre o cierra la conversación. Debe llamarse
    // directo desde el toque.
    toggle() {
      if (kind === "platform") {
        wake(true);
        return listen.toggle();
      }
      if (kind !== "keyboard") return;
      if (active) return stop();
      base = "";
      sent = [];
      setActive(true);
      input.focus();
    },
    stop,
    // La página avisa cuando Jarvis empieza y cuando termina de pensar o hablar.
    setDeaf(value) {
      if (deaf === value) return;
      deaf = value;
      if (!active) return;
      disarm();
      base = "";
      // El micrófono del navegador se apaga mientras Jarvis habla; al callar
      // se vuelve a encender y hay unos segundos para seguir sin «Jarvis».
      if (kind === "platform") {
        if (deaf) listen.pause?.();
        else listen.resume?.();
        // Tras contestar (o si ya estaba despierto) hay unos segundos para
        // seguir sin «Jarvis»; tras una frase suelta, como «Aquí estaré», no.
        if (!deaf && handsFree() && (replying || awake)) wake(true);
        if (!deaf) replying = false;
      }
      // Lo que el dictado del teclado haya oído mientras Jarvis hablaba se tira.
      if (!deaf && kind === "keyboard") show("");
    },
    // La caja cambió por el usuario o por el dictado del teclado.
    onInput() {
      if (active && kind === "keyboard" && deaf) return show("");
      base = input.value;
      if (!active || kind !== "keyboard") return;
      if (withoutSent(input.value, sent)) arm(PAUSE_KEYBOARD_MS);
      else disarm();
    },
    // Eventos del micrófono de la plataforma (los entrega voice.js).
    events: {
      onDictationState(dictationState) {
        const on = dictationState !== "idle";
        if (on && !active) base = input.value;
        setActive(on);
      },
      onPartial(text) {
        if (deaf || (handsFree() && !awake)) return;
        show(glue(base, text));
        if (!text) return;
        disarm();
        clearTimeout(followTimer); // está hablando: no dormirse a media frase
      },
      onFinal(text) {
        if (deaf) return;
        let heard = text;
        if (handsFree() && !awake) {
          heard = afterWakeWord(text);
          if (heard === null) return; // no era para Jarvis
          wake(true);
          if (!heard) return ui.onWake?.();
          heard = ` ${heard}`;
        }
        clearTimeout(followTimer);
        base = glue(base, heard);
        show(base);
        if (base.trim())
          arm(handsFree() ? PAUSE_HANDS_FREE_MS : PAUSE_PLATFORM_MS);
      },
      onDictationGone() {
        setKind(null);
        setActive(false);
      },
    },
  };
}
