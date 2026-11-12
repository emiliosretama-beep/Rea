// Interfaz sobre el juego. Solo toca el DOM cuando un valor cambia.
import { t } from '../core/i18n.js';
import { BAL } from '../config.js';
import { fmtMoney } from '../game/state.js';
import { UPGRADES } from '../data/upgrades.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    prompt: $('prompt'), promptText: $('prompt-text'), toast: $('toast'), fps: $('fps'), btn: $('btn-interact'),
    money: $('money'), rep: $('rep'), fuelStock: $('fuel-stock'), sodaStock: $('soda-stock'), snackStock: $('snack-stock'),
    chipFuel: $('chip-fuel'), chipSoda: $('chip-soda'), chipSnack: $('chip-snack'), level: $('level'), book: $('btn-book'),
    mission: $('mission'), missionTitle: $('mission-title'), missionBar: $('mission-bar'),
    missionProgress: $('mission-progress'), missionReward: $('mission-reward'),
    cust: $('cust'), custName: $('cust-name'), custState: $('cust-state'), custBar: $('cust-bar'),
    fuel: $('fuel'), fuelFill: $('fuel-fill'), fuelText: $('fuel-text'),
  };
  // Zona "exacta" y marca del pedido, en % del ancho de la barra (la barra llega al 112 %)
  const pct = (r) => `${(r / BAL.overfillMax) * 100}%`;
  $('fuel-zone').style.left = pct(BAL.perfectMin);
  $('fuel-zone').style.width = `${((BAL.perfectMax - BAL.perfectMin) / BAL.overfillMax) * 100}%`;
  $('fuel-mark').style.left = pct(1);

  const last = { fuelStock: null, soda: null, snack: null, level: '', can: null, mTitle: '', mProg: '', prompt: null, money: null, rep: null, cust: '', custBar: -1, bar: '', barOn: false, barWork: null };
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
      const fuel = Math.floor(state.fuel);
      if (fuel !== last.fuelStock) {
        last.fuelStock = fuel;
        el.fuelStock.textContent = `${fuel} gal`;
        el.chipFuel.classList.toggle('low', fuel < BAL.fuelLow);
      }
      if (state.sodas !== last.soda) {
        last.soda = state.sodas;
        el.sodaStock.textContent = state.sodas;
        el.chipSoda.classList.toggle('low', state.sodas === 0);
      }
      if (state.snacks !== last.snack) {
        last.snack = state.snacks;
        el.snackStock.textContent = state.snacks;
        el.chipSnack.classList.toggle('low', state.snacks === 0);
      }
      const level = t('levelN', { l: state.level() });
      if (level !== last.level) { last.level = level; el.level.textContent = level; }
      // Punto en el botón de la libreta cuando alcanza para alguna mejora
      const can = state.open && UPGRADES.some((u) => state.canBuyUpgrade(u) === 'ok');
      if (can !== last.can) { last.can = can; el.book.classList.toggle('can', can); }
    },
    levelPop() {
      el.level.classList.remove('up');
      void el.level.offsetWidth;
      el.level.classList.add('up');
    },
    setMission(missions) {
      const title = missions.title(), prog = missions.progressText();
      if (title !== last.mTitle) {
        last.mTitle = title;
        el.missionTitle.textContent = title;
        el.missionReward.textContent = `${t('reward')}: ${missions.reward()}`;
      }
      if (prog !== last.mProg) {
        last.mProg = prog;
        el.missionProgress.textContent = prog;
        el.missionBar.style.transform = `scaleX(${missions.fraction()})`;
      }
    },
    missionPop() {
      el.mission.classList.remove('done');
      void el.mission.offsetWidth; // reinicia la animación
      el.mission.classList.add('done');
    },
    // Tarjeta del cliente: info = { key, title, status, p } o null
    setCustomer(info) {
      const key = info ? `${info.key}|${document.documentElement.lang}` : '';
      if (key !== last.cust) {
        last.cust = key;
        last.custBar = -1;
        el.cust.classList.toggle('on', !!info);
        if (info) { el.custName.textContent = info.title; el.custState.textContent = info.status; }
      }
      if (!info) return;
      const p = Math.max(0, info.p);
      const step = Math.round(p * 100);
      if (step !== last.custBar) {
        last.custBar = step;
        el.custBar.style.transform = `scaleX(${p})`;
        el.custBar.className = p > 0.5 ? '' : p > 0.25 ? 'warn' : 'bad';
      }
    },
    // Barra central: llenado de gasolina (con zona exacta) o avance de un trabajo
    setBar(c, visible) {
      if (visible !== last.barOn) { last.barOn = visible; el.fuel.classList.toggle('on', visible); }
      if (!visible) return;
      const work = c.kind !== 'fuel';
      if (work !== last.barWork) { last.barWork = work; el.fuel.classList.toggle('work', work); }
      const txt = work ? `${t(c.job)} ${Math.min(100, Math.round((c.done / c.work) * 100))}%` : `${c.got.toFixed(1)} / ${c.want} gal`;
      if (txt === last.bar) return;
      last.bar = txt;
      el.fuelText.textContent = txt;
      el.fuelFill.style.transform = `scaleX(${work ? Math.min(1, c.done / c.work) : Math.min(1, c.got / (c.want * BAL.overfillMax))})`;
      el.fuelFill.classList.toggle('over', !work && c.got > c.want * BAL.perfectMax);
    },
    tickFps(dt) {
      frames++; acc += dt;
      if (acc >= 0.5) { el.fps.textContent = `${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
    },
    showFps(on) { el.fps.hidden = !on; },
  };
}
