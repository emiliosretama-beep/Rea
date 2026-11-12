// Motor de misiones: lleva la cuenta de la misión actual y entrega el premio.
import { MISSIONS, LOOP_MISSION } from '../data/missions.js';
import { fmtMoney } from './state.js';
import { t } from '../core/i18n.js';

export function createMissions(state, onComplete) {
  const current = () => MISSIONS[state.mission] || LOOP_MISSION;
  const progress = (m) => (m.value ? Math.min(m.n, m.value(state)) : state.missionProgress);
  let busy = false;

  function complete(m) {
    state.mission++;
    state.missionProgress = 0;
    if (m.money) state.addMoney(m.money);
    if (m.rep) state.addRep(m.rep);
    onComplete(m);
  }

  // Misiones que leen el estado (tablas, luz, basura, abrir): se revisan cuando algo cambia
  function checkValues() {
    if (busy) return;
    busy = true;
    for (let m = current(); m.value && m.value(state) >= m.n; m = current()) complete(m);
    busy = false;
  }
  state.onChange(checkValues);

  function handle(name, data) {
    const m = current();
    if (m.value) return;
    if (m.resetOn === name) { state.missionProgress = 0; state.changed(); return; }
    if (m.on !== name) return;
    if (m.if && !m.if(data, state)) {
      if (m.strict && state.missionProgress > 0) { state.missionProgress = 0; state.changed(); }
      return;
    }
    state.missionProgress = Math.min(m.n, state.missionProgress + (m.unit === 'money' ? data.amount : m.unit === 'time' ? data : 1));
    if (state.missionProgress >= m.n - 1e-9) complete(m);
    state.changed();
  }
  state.onEvent(handle);

  return {
    current,
    // Para misiones de tiempo ("mantén la reputación..."): se llama cada frame
    tick(dt) { if (current().on === 'tick') handle('tick', dt); },
    title() { const m = current(); return t(m.text, { n: m.unit === 'money' ? fmtMoney(m.n) : m.n }); },
    progressText() {
      const m = current(), p = progress(m);
      if (m.unit === 'money') return `${fmtMoney(p)} / ${fmtMoney(m.n)}`;
      if (m.unit === 'time') return `${Math.floor(p)} / ${m.n} s`;
      return `${p} / ${m.n}`;
    },
    fraction() { const m = current(); return progress(m) / m.n; },
    // short: para la tarjeta (estrella en vez de la palabra "reputación")
    reward(m = current(), short = true) {
      const parts = [];
      if (m.money) parts.push(`+${fmtMoney(m.money)}`);
      if (m.rep) parts.push(short ? `+${m.rep} ★` : `+${m.rep} ${t('repShort')}`);
      return parts.join(' · ');
    },
    doneText(m) { return `${t('missionDone')}: ${this.reward(m, false)}`; },
  };
}
