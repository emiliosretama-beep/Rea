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
      this.rate = 1;
      this.pitch = 1;
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

  // Voces como las de un iPhone: dos de España, dos de México, una de broma y
  // una en inglés.
  const voices = [
    { lang: "en-US", name: "Samantha", voiceURI: "com.apple.voice.Samantha" },
    { lang: "es-MX", name: "Paulina", voiceURI: "com.apple.voice.Paulina" },
    { lang: "es-ES", name: "Mónica", voiceURI: "com.apple.voice.Monica" },
    { lang: "es-MX", name: "Juan", voiceURI: "com.apple.voice.Juan" },
    { lang: "es-ES", name: "Jorge", voiceURI: "com.apple.voice.Jorge" },
    { lang: "es-ES", name: "Abuelo", voiceURI: "com.apple.voice.Grandpa" },
  ];

  const synth = {
    get speaking() {
      return Boolean(current);
    },
    get pending() {
      return queue.length > 0;
    },
    getVoices: () => voices,
    resume() {},
    speak(utterance) {
      spoken.push({
        text: utterance.text,
        lang: utterance.lang,
        voice: utterance.voice?.name ?? null,
        volume: utterance.volume,
        rate: utterance.rate,
        pitch: utterance.pitch,
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
