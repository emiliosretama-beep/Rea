// Interfaz sobre el juego. Solo toca el DOM cuando un valor cambia.
import { t } from '../core/i18n.js';
import { BAL } from '../config.js';
import { fmtMoney } from '../game/state.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    prompt: $('prompt'), promptText: $('prompt-text'), toast: $('toast'), fps: $('fps'), btn: $('btn-interact'),
    money: $('money'), rep: $('rep'),
    cust: $('cust'), custName: $('cust-name'), custState: $('cust-state'), custBar: $('cust-bar'),
    fuel: $('fuel'), fuelFill: $('fuel-fill'), fuelText: $('fuel-text'),
  };
  // Zona "exacta" y marca del pedido, en % del ancho de la barra (la barra llega al 112 %)
  const pct = (r) => `${(r / BAL.overfillMax) * 100}%`;
  $('fuel-zone').style.left = pct(BAL.perfectMin);
  $('fuel-zone').style.width = `${((BAL.perfectMax - BAL.perfectMin) / BAL.overfillMax) * 100}%`;
  $('fuel-mark').style.left = pct(1);

  const last = { prompt: null, money: null, rep: null, cust: '', custBar: -1, fuel: '', fuelOn: false };
  let toastTimer = 0;
  let frames = 0, acc = 0;

  return {
    setPrompt(text, holdable) {
      if (text === last.prompt) return;
      last.prompt = text;
      el.prompt.classList.toggle('on', !!text);
      el.btn.classList.toggle('ready', !!text);
      el.prompt.classList.toggle('hold', !!holdable);
      if (text) el.promptText.textContent = text;
    },
    toast(text) {
      el.toast.textContent = text;
      el.toast.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove('on'), 3400);
    },
    setStats(state) {
      if (state.money !== last.money) { last.money = state.money; el.money.textContent = fmtMoney(state.money); }
      const rep = Math.round(state.rep);
      if (rep !== last.rep) { last.rep = rep; el.rep.textContent = rep; }
    },
    // Tarjeta del cliente: tipo, pedido, estado y paciencia
    setCustomer(bay) {
      const c = bay.c;
      const show = c && (bay.phase === 'waiting' || bay.phase === 'fueling' || bay.phase === 'toPay');
      const key = show ? `${c.name}|${c.want}|${bay.phase === 'toPay'}|${document.documentElement.lang}` : '';
      if (key !== last.cust) {
        last.cust = key;
        el.cust.classList.toggle('on', !!show);
        if (show) {
          el.custName.textContent = `${t(c.name)} · ${t('wants', { n: c.want })}`;
          el.custState.textContent = t(bay.phase === 'toPay' ? 'stPay' : 'stWaiting');
        }
      }
      if (!show) return;
      const p = Math.max(0, c.patience / c.patienceMax);
      const step = Math.round(p * 100);
      if (step !== last.custBar) {
        last.custBar = step;
        el.custBar.style.transform = `scaleX(${p})`;
        el.custBar.className = p > 0.5 ? '' : p > 0.25 ? 'warn' : 'bad';
      }
    },
    // Barra de llenado: visible mientras apuntas a la bomba con un cliente esperando
    setFuel(c, visible) {
      if (visible !== last.fuelOn) { last.fuelOn = visible; el.fuel.classList.toggle('on', visible); }
      if (!visible) return;
      const txt = `${c.got.toFixed(1)} / ${c.want} gal`;
      if (txt !== last.fuel) {
        last.fuel = txt;
        el.fuelText.textContent = txt;
        el.fuelFill.style.transform = `scaleX(${Math.min(1, c.got / (c.want * BAL.overfillMax))})`;
        el.fuelFill.classList.toggle('over', c.got > c.want * BAL.perfectMax);
      }
    },
    tickFps(dt) {
      frames++; acc += dt;
      if (acc >= 0.5) { el.fps.textContent = `${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
    },
    showFps(on) { el.fps.hidden = !on; },
  };
}
