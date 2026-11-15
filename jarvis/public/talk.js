// Hablarle a Jarvis sin escribir. Según lo que ofrezca la vista hay dos caminos:
// - "platform": el micrófono de la capability `dictation` (Chrome y la app de
//   escritorio). Un toque en el micrófono y se habla.
// - "keyboard": en teléfonos y tabletas sin esa capability (iPhone, iPad) la
//   página no puede abrir el micrófono; abre el teclado para usar su dictado.
// En los dos, el mensaje se envía solo cuando se hace una pausa y Jarvis
// contesta hablando.

const PAUSE_PLATFORM_MS = 1600;
const PAUSE_KEYBOARD_MS = 2200;
const HINTS = {
  platform: "Te escucho. Envío solo cuando hagas una pausa.",
  keyboard:
    "Toca el micrófono de tu teclado y habla. Envío solo cuando hagas una pausa.",
};

// Une lo dictado con lo que ya había, sin duplicar ni comerse espacios.
export function glue(base, piece) {
  if (!base) return piece.trimStart();
  if (!piece) return base;
  return /\s$/.test(base) || /^\s/.test(piece)
    ? base + piece
    : `${base} ${piece}`;
}

// `ui` trae los elementos (input, micButton, sendButton, hint) y tres avisos:
// `onText()`: la página cambió el texto de la caja. `onSpoken(text)`: hay un
// mensaje dictado listo para enviar. `onChange()`: empezó o terminó de escuchar.
export function createTalk(ui) {
  const { input, micButton, sendButton, hint, onText, onSpoken, onChange } = ui;
  let listen = null; // micrófono de la plataforma, si existe
  let kind = null; // "platform" | "keyboard" | null
  let canKeyboard = false;
  let active = false;
  let base = ""; // lo ya dictado y confirmado
  let timer = null;

  function disarm() {
    clearTimeout(timer);
    timer = null;
    sendButton.classList.remove("is-arming");
  }

  function setActive(on) {
    if (!on) disarm();
    if (active === on) return;
    active = on;
    micButton.setAttribute("aria-pressed", String(on));
    hint.hidden = !on;
    if (on) hint.textContent = HINTS[kind];
    onChange();
  }

  // Termina la pausa: se envía lo dictado.
  async function deliver() {
    disarm();
    if (kind === "platform") await listen.stop();
    const text = input.value.trim();
    // Cerrar el teclado corta su dictado: así no se cuela la voz de Jarvis.
    if (kind === "keyboard") input.blur();
    setActive(false);
    if (text) onSpoken(text);
  }

  // Cuenta la pausa; el anillo del botón de enviar muestra cuánto falta.
  function arm(ms) {
    disarm();
    sendButton.style.setProperty("--arm", `${ms}ms`);
    // Leer el ancho obliga a reiniciar la animación del anillo.
    if (sendButton.offsetWidth >= 0) sendButton.classList.add("is-arming");
    timer = setTimeout(deliver, ms);
  }

  function show(text) {
    input.value = text;
    onText();
  }

  function setKind() {
    kind = listen ? "platform" : canKeyboard ? "keyboard" : null;
    micButton.hidden = !kind;
  }

  return {
    get active() {
      return active;
    },
    // `platformListen`: el micrófono de voice.js o null. `touch`: hay teclado
    // en pantalla con tecla de dictado.
    attach(platformListen, touch) {
      listen = platformListen;
      canKeyboard = touch;
      setKind();
    },
    // Clic en el micrófono. Debe llamarse directo desde el toque.
    toggle() {
      if (kind === "platform") return listen.toggle();
      if (kind !== "keyboard") return;
      if (active) return setActive(false);
      base = "";
      setActive(true);
      input.focus();
    },
    // Enviar a mano o empezar otra cosa apaga el modo voz.
    cancel() {
      if (!active) return;
      if (kind === "platform") listen.stop();
      setActive(false);
    },
    // La caja cambió por el usuario o por el dictado del teclado.
    onInput() {
      base = input.value;
      if (!active || kind !== "keyboard") return;
      if (input.value.trim()) arm(PAUSE_KEYBOARD_MS);
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
        show(glue(base, text));
        if (text) disarm();
      },
      onFinal(text) {
        base = glue(base, text);
        show(base);
        if (base.trim()) arm(PAUSE_PLATFORM_MS);
      },
      onDictationGone() {
        listen = null;
        setKind();
        setActive(false);
      },
    },
  };
}
