// Motor de misiones: lleva la cuenta de la misión actual y entrega el premio.
import { MISSIONS, LOOP_MISSION } from '../data/missions.js';
import { fmtMoney } from './state.js';
import { t } from '../core/i18n.js';

export function createMissions(state, onComplete) {
  const current = () => MISSIONS[state.mission] || LOOP_MISSION;

  function add(m, amount) {
    state.missionProgress = Math.min(m.n, state.missionProgress + amount);
    if (state.missionProgress >= m.n - 1e-9) {
      state.mission++;
      state.missionProgress = 0;
      state.addMoney(m.money);
      state.addRep(m.rep);
      onComplete(m);
    }
    state.changed();
  }

  function handle(name, data) {
    const m = current();
    if (m.resetOn === name) { state.missionProgress = 0; state.changed(); return; }
    if (m.on !== name) return;
    if (m.if && !m.if(data, state)) {
      if (m.strict && state.missionProgress > 0) { state.missionProgress = 0; state.changed(); }
      return;
    }
    add(m, m.unit === 'money' ? data.amount : m.unit === 'time' ? data : 1);
  }
  state.onEvent(handle);

  return {
    current,
    // Para misiones de tiempo ("mantén la reputación..."): se llama cada frame
    tick(dt) { if (current().on === 'tick') handle('tick', dt); },
    title() { const m = current(); return t(m.text, { n: m.unit === 'money' ? fmtMoney(m.n) : m.n }); },
    progressText() {
      const m = current(), p = state.missionProgress;
      if (m.unit === 'money') return `${fmtMoney(p)} / ${fmtMoney(m.n)}`;
      if (m.unit === 'time') return `${Math.floor(p)} / ${m.n} s`;
      return `${p} / ${m.n}`;
    },
    fraction() { return state.missionProgress / current().n; },
    rewardText(m) { return t('missionDone', { m: fmtMoney(m.money), r: m.rep }); },
  };
}
