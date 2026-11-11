// Estado del negocio: datos puros, sin nada de Three.js ni del DOM.
// (En la Etapa 5 esto es lo que se guarda en localStorage.)
import { BAL } from '../config.js';

export function createState() {
  const listeners = [];
  const s = {
    money: 0,
    rep: BAL.startRep, // 0 a 100
    served: 0,
    lost: 0,
    onChange(fn) { listeners.push(fn); },
    addMoney(v) { s.money = Math.round((s.money + v) * 100) / 100; emit(); },
    addRep(v) { s.rep = Math.max(0, Math.min(100, s.rep + v)); emit(); },
  };
  function emit() { listeners.forEach((fn) => fn(s)); }
  return s;
}

export const fmtMoney = (v) => `$${v.toFixed(2)}`;
