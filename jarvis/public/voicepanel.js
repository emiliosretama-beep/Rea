// Panel "Voz": elegir la voz de Jarvis, probarla, ajustar su volumen y decidir
// si contesta hablando. Las voces son las del dispositivo, ordenadas como en
// el copiloto de Born to Rally (ver voice.js).
import { $, el } from "./ui.js";

const VOICE_NOTES = {
  ready:
    "Son las voces de tu dispositivo: ♂ es voz de hombre y ★ de alta calidad. Para tener más, en el iPhone: Ajustes, Accesibilidad, Contenido leído, Voces.",
  loading:
    "Tu dispositivo todavía no muestra voces en español. Toca «Probar» para despertarlas.",
  none: "Este navegador no tiene voz: Jarvis contesta solo con texto.",
};

// `speech` es la voz de voice.js, o null si el navegador no tiene.
export function bindVoicePanel(speech) {
  const select = $("#voiceSelect");
  const volume = $("#voiceVolume");
  const spoken = $("#voiceOn");
  const note = $("#voiceNote");
  if (!speech) {
    for (const control of [select, volume, spoken, $("#voiceTest")])
      control.disabled = true;
    note.textContent = VOICE_NOTES.none;
    return;
  }

  function fill() {
    const voices = speech.voices();
    const best = voices[0] ? `Automática (${voices[0].label})` : "Automática";
    select.replaceChildren(
      el("option", { value: "", text: best }),
      ...voices.map((voice) =>
        el("option", { value: voice.name, text: voice.label }),
      ),
    );
    const chosen = speech.settings.name;
    select.value = voices.some((voice) => voice.name === chosen) ? chosen : "";
    note.textContent = voices.length ? VOICE_NOTES.ready : VOICE_NOTES.loading;
  }

  fill();
  speech.onVoices(fill);
  volume.value = String(Math.round(speech.settings.volume * 100));
  spoken.checked = !speech.settings.muted;

  // Cada cambio se oye al momento, como en las opciones del juego.
  select.addEventListener("change", () => {
    speech.setVoice(select.value);
    speech.test();
  });
  volume.addEventListener("change", () => {
    speech.setVolume(Number(volume.value) / 100);
    speech.test();
  });
  spoken.addEventListener("change", () => {
    speech.setMuted(!spoken.checked);
    if (!spoken.checked) speech.stop();
  });
  $("#voiceTest").addEventListener("click", () => {
    fill();
    speech.test();
  });
}
