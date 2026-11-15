// Voz del navegador simulada (speechSynthesis) para las pruebas. Guarda lo que
// la página manda decir en window.__spoken y dispara los mismos eventos que el
// navegador. Con window.__JARVIS_SPEECH__ = { mute: true } la voz nunca arranca,
// como en Safari cuando no hubo un toque antes.
(() => {
  const config = { ms: 250, mute: false, ...window.__JARVIS_SPEECH__ };
  const spoken = (window.__spoken = []);
  let queue = [];
  let current = null;
  let timer = null;

  class FakeUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.voice = null;
      this.volume = 1;
    }
  }

  function next() {
    if (current || queue.length === 0) return;
    current = queue.shift();
    if (config.mute) return;
    const utterance = current;
    timer = setTimeout(() => {
      utterance.onstart?.({});
      timer = setTimeout(() => {
        current = null;
        utterance.onend?.({});
        next();
      }, config.ms);
    }, 20);
  }

  const synth = {
    getVoices: () => [
      { lang: "en-US", name: "Samantha" },
      { lang: "es-ES", name: "Mónica" },
      { lang: "es-MX", name: "Paulina" },
    ],
    speak(utterance) {
      spoken.push({
        text: utterance.text,
        lang: utterance.lang,
        voice: utterance.voice?.name ?? null,
        volume: utterance.volume,
      });
      queue.push(utterance);
      next();
    },
    cancel() {
      clearTimeout(timer);
      const dropped = [current, ...queue].filter(Boolean);
      current = null;
      queue = [];
      for (const utterance of dropped)
        utterance.onerror?.({ error: "canceled" });
    },
    addEventListener() {},
  };

  Object.defineProperty(window, "speechSynthesis", {
    value: synth,
    configurable: true,
  });
  window.SpeechSynthesisUtterance = FakeUtterance;
})();
