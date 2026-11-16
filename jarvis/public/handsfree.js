// Manos libres en la versión independiente: Jarvis empieza a escuchar solo al
// abrir la página. Si el navegador exige un toque antes (Safari suele hacerlo),
// el primer toque en cualquier parte de la pantalla lo enciende. Si Emilio
// apaga el micrófono, se recuerda y ya no arranca solo.

const PREF_KEY = "jarvis:manos-libres:v1";

function readOn() {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

function saveOn(on) {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Si no se puede guardar, vale solo para esta visita.
  }
}

// `talk`: talk.js. `speech`: la voz (para desbloquearla con el mismo toque).
// `skip(target)`: toques que no deben encender el micrófono (el propio botón).
export function setupHandsFree({ talk, speech, toast, skip }) {
  let waitingTouch = false;

  function onTouch(event) {
    if (skip(event.target) || talk.active) return;
    waitingTouch = false;
    document.removeEventListener("pointerdown", onTouch, true);
    speech?.unlock();
    talk.start({ gesture: true, awake: true });
  }

  function waitForTouch() {
    if (waitingTouch || !readOn()) return;
    waitingTouch = true;
    document.addEventListener("pointerdown", onTouch, true);
  }

  // Al abrir: intenta escuchar ya (dormido, a la espera de «Jarvis») y deja
  // preparado el primer toque por si el navegador no lo permite sin uno.
  if (readOn()) {
    talk.start({ gesture: false, awake: false });
    waitForTouch();
  }

  return {
    // El navegador pidió un toque para seguir escuchando.
    needsGesture() {
      if (!readOn()) return;
      waitForTouch();
      toast.show("Toca la pantalla para que Jarvis te escuche.");
    },
    // Emilio tocó el micrófono: guarda si lo quiere encendido.
    remember(on) {
      saveOn(on);
      if (!on) {
        waitingTouch = false;
        document.removeEventListener("pointerdown", onTouch, true);
      }
    },
  };
}
