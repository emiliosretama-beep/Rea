// Estado del negocio: datos puros, sin nada de Three.js ni del DOM.
// (En la Etapa 5 esto es lo que se guarda en localStorage.)
import { BAL } from '../config.js';
import { UPGRADES, LEVEL_AT } from '../data/upgrades.js';

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
    snacks: BAL.snackStart,
    // Restauración inicial
    boards: 0, // tablas quitadas
    power: false, // luz arreglada
    open: false, // gasolinera abierta al público
    litterPicked: 0,
    upgrades: {}, // id -> true
    mission: 0, // índice de la misión actual
    missionProgress: 0,

    onChange(fn) { changeFns.push(fn); },
    // Eventos del juego ('served', 'angry', 'litter', 'order', 'upgrade'...) para misiones y sonido
    onEvent(fn) { eventFns.push(fn); },
    emit(name, data) { eventFns.forEach((fn) => fn(name, data)); },
    changed,

    addMoney(v, isSale) {
      s.money = Math.round((s.money + v) * 100) / 100;
      if (isSale) { s.earned = Math.round((s.earned + v) * 100) / 100; s.emit('earn', { amount: v }); }
      changed();
    },
    // Subir reputación cuesta más mientras más alta está (de 50 hacia arriba)
    addRep(v) {
      if (v > 0) v *= Math.min(1, (100 - s.rep) / 50);
      s.rep = Math.max(0, Math.min(100, s.rep + v));
      changed();
    },
    useFuel(gal) { s.fuel = Math.max(0, s.fuel - gal); changed(); },
    // Mercancía de la tienda: kind = 'soda' | 'snack'
    stockOf(kind) { return kind === 'soda' ? s.sodas : s.snacks; },
    // Quita hasta n del inventario y devuelve cuántos se pudieron tomar (n negativo = devolver)
    takeStock(kind, n) {
      const key = kind === 'soda' ? 'sodas' : 'snacks';
      const got = n > 0 ? Math.min(n, s[key]) : n;
      s[key] = Math.min(s.itemCap(kind), s[key] - got);
      changed();
      return got;
    },

    // ---- Mejoras y nivel ----
    has(id) { return !!s.upgrades[id]; },
    upgradeCount() { return Object.keys(s.upgrades).length; },
    level() {
      const n = s.upgradeCount();
      let lv = 1;
      for (let i = 0; i < LEVEL_AT.length; i++) if (n >= LEVEL_AT[i]) lv = i + 1;
      return lv;
    },
    // 'owned' | 'locked' (falta nivel) | 'poor' (falta dinero) | 'ok'
    canBuyUpgrade(u) {
      if (s.has(u.id)) return 'owned';
      if (s.level() < u.level) return 'locked';
      if (u.needs && !s.has(u.needs)) return 'needs';
      return s.money >= u.cost ? 'ok' : 'poor';
    },
    buyUpgrade(id) {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u || s.canBuyUpgrade(u) !== 'ok') return false;
      const before = s.level();
      s.upgrades[id] = true;
      s.addMoney(-u.cost);
      s.emit('upgrade', { id });
      if (s.level() > before) s.emit('level', { level: s.level() });
      changed();
      return true;
    },
    fuelCap() { return BAL.fuelCap * (s.has('storage') ? BAL.storageMult : 1); },
    itemCap(kind) { return BAL[`${kind}Cap`] * (s.has('storage') ? BAL.storageMult : 1); },
    shopChance() { return s.has('shop') ? BAL.shopChanceShop : BAL.shopChance; },
    stallCount() { return s.has('parking') ? 4 : 2; },

    // ---- Proveedor ----
    fuelOrder() {
      const gal = Math.max(0, Math.min(BAL.fuelOrder, s.fuelCap() - Math.floor(s.fuel)));
      return { gal, cost: Math.round(gal * BAL.fuelCost * 100) / 100 };
    },
    itemOrder(kind) {
      const n = Math.max(0, Math.min(BAL[`${kind}Order`], s.itemCap(kind) - s.stockOf(kind)));
      return { n, cost: Math.round(n * BAL[`${kind}Cost`] * 100) / 100 };
    },
    // Sin dinero y casi sin gasolina se permite pedir a crédito: así nunca te quedas atorado
    canBuyFuel() {
      const o = s.fuelOrder();
      if (o.gal <= 0) return 'full';
      if (s.money >= o.cost) return 'ok';
      return s.fuel < BAL.fuelLow ? 'credit' : 'poor';
    },
    canBuyItem(kind) {
      const o = s.itemOrder(kind);
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
    buyItem(kind) {
      if (s.canBuyItem(kind) !== 'ok') return false;
      const o = s.itemOrder(kind);
      s.takeStock(kind, -o.n);
      s.addMoney(-o.cost);
      s.emit('order', { kind });
      return true;
    },
  };
  function changed() { changeFns.forEach((fn) => fn(s)); }
  return s;
}

export const fmtMoney = (v) => (v < 0 ? `-$${(-v).toFixed(2)}` : `$${v.toFixed(2)}`);
