// Reconocimiento de voz del navegador simulado (webkitSpeechRecognition), para
// probar el modo manos libres. Las pruebas "hablan" con window.__hear(texto):
// llega un resultado provisional, luego el final, y la sesión termina como en
// Safari. Con window.__JARVIS_RECOGNITION__ = { needsGesture: true } el primer
// arranque sin un toque falla con "not-allowed", como suele pasar en iPhone.
(() => {
  const config = { needsGesture: false, ...window.__JARVIS_RECOGNITION__ };
  const log = (window.__recognition = {
    starts: 0,
    aborts: 0,
    active: null,
    granted: false,
    langs: [],
  });

  class FakeRecognition {
    constructor() {
      this.lang = "";
      this.continuous = true;
      this.interimResults = false;
    }
    start() {
      if (log.active) throw new DOMException("ya escucha", "InvalidStateError");
      log.starts += 1;
      log.langs.push(this.lang);
      const gesture = navigator.userActivation?.isActive === true;
      if (config.needsGesture && !gesture && !log.granted) {
        setTimeout(() => {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        }, 10);
        return;
      }
      log.granted = true;
      log.active = this;
      setTimeout(() => this.onstart?.(), 10);
    }
    abort() {
      if (log.active !== this) return;
      log.active = null;
      log.aborts += 1;
      setTimeout(() => {
        this.onerror?.({ error: "aborted" });
        this.onend?.();
      }, 5);
    }
    stop() {
      this.abort();
    }
  }

  const result = (transcript, isFinal) =>
    Object.assign([{ transcript }], { isFinal });

  window.__hear = (text) => {
    const recognition = log.active;
    if (!recognition) return false;
    const half = text
      .split(" ")
      .slice(0, Math.ceil(text.split(" ").length / 2));
    recognition.onresult?.({
      resultIndex: 0,
      results: [result(half.join(" "), false)],
    });
    setTimeout(() => {
      recognition.onresult?.({ resultIndex: 0, results: [result(text, true)] });
      log.active = null;
      recognition.onend?.();
    }, 30);
    return true;
  };

  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = FakeRecognition;
})();
