// Estado del negocio: datos puros, sin nada de Three.js ni del DOM.
// (En la Etapa 5 esto es lo que se guarda en localStorage.)
import { BAL } from '../config.js';

export function createState() {
  const changeFns = [];
  const eventFns = [];
  const s = {
    money: 0,
    earned: 0, // total ganado con ventas (sin contar premios)
    rep: BAL.startRep, // 0 a 100
    served: 0,
    lost: 0,
    fuel: BAL.fuelStart,
    sodas: BAL.sodaStart,
    carrying: false, // llevas un refresco en la mano
    // Restauración inicial
    boards: 0, // tablas quitadas
    power: false, // luz arreglada
    open: false, // gasolinera abierta al público
    litterPicked: 0,
    mission: 0, // índice de la misión actual
    missionProgress: 0,

    onChange(fn) { changeFns.push(fn); },
    // Eventos del juego ('served', 'angry', 'litter', 'order', 'earn'...) para misiones y sonido
    onEvent(fn) { eventFns.push(fn); },
    emit(name, data) { eventFns.forEach((fn) => fn(name, data)); },
    changed,

    addMoney(v, isSale) {
      s.money = Math.round((s.money + v) * 100) / 100;
      if (isSale) { s.earned = Math.round((s.earned + v) * 100) / 100; s.emit('earn', { amount: v }); }
      changed();
    },
    addRep(v) { s.rep = Math.max(0, Math.min(100, s.rep + v)); changed(); },
    useFuel(gal) { s.fuel = Math.max(0, s.fuel - gal); changed(); },
    takeSoda() { if (s.sodas > 0 && !s.carrying) { s.sodas--; s.carrying = true; changed(); } },
    setCarrying(on) { s.carrying = on; changed(); },

    // ---- Proveedor ----
    fuelOrder() {
      const gal = Math.min(BAL.fuelOrder, BAL.fuelCap - Math.floor(s.fuel));
      return { gal, cost: Math.round(gal * BAL.fuelCost * 100) / 100 };
    },
    sodaOrder() {
      const n = Math.min(BAL.sodaOrder, BAL.sodaCap - s.sodas);
      return { n, cost: Math.round(n * BAL.sodaCost * 100) / 100 };
    },
    // Sin dinero y casi sin gasolina se permite pedir a crédito: así nunca te quedas atorado
    canBuyFuel() {
      const o = s.fuelOrder();
      if (o.gal <= 0) return 'full';
      if (s.money >= o.cost) return 'ok';
      return s.fuel < BAL.fuelLow ? 'credit' : 'poor';
    },
    canBuySodas() {
      const o = s.sodaOrder();
      if (o.n <= 0) return 'full';
      return s.money >= o.cost ? 'ok' : 'poor';
    },
    buyFuel() {
      const can = s.canBuyFuel();
      if (can !== 'ok' && can !== 'credit') return false;
      const o = s.fuelOrder();
      s.fuel += o.gal;
      s.addMoney(-o.cost);
      s.emit('order', { kind: 'fuel' });
      return true;
    },
    buySodas() {
      if (s.canBuySodas() !== 'ok') return false;
      const o = s.sodaOrder();
      s.sodas += o.n;
      s.addMoney(-o.cost);
      s.emit('order', { kind: 'soda' });
      return true;
    },
  };
  function changed() { changeFns.forEach((fn) => fn(s)); }
  return s;
}

export const fmtMoney = (v) => (v < 0 ? `-$${(-v).toFixed(2)}` : `$${v.toFixed(2)}`);
