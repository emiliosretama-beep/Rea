// Interfaz sobre el juego: aviso de interacción, mensajes y medidor de FPS.
// Solo toca el DOM cuando un valor cambia.
import { t } from '../core/i18n.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const prompt = $('prompt');
  const promptText = $('prompt-text');
  const toast = $('toast');
  const fps = $('fps');
  const btn = $('btn-interact');
  let promptKey = null;
  let toastTimer = 0;
  let frames = 0, acc = 0;

  function renderPrompt() {
    const on = !!promptKey;
    prompt.classList.toggle('on', on);
    btn.classList.toggle('ready', on);
    if (on) promptText.textContent = t(promptKey);
  }

  return {
    setPrompt(key) { if (key !== promptKey) { promptKey = key; renderPrompt(); } },
    toast(key) {
      toast.textContent = t(key);
      toast.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('on'), 3200);
    },
    refreshLanguage: renderPrompt,
    tickFps(dt) {
      frames++; acc += dt;
      if (acc >= 0.5) { fps.textContent = `${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
    },
    showFps(on) { fps.hidden = !on; },
  };
}
