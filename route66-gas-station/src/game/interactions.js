// Detecta qué objeto interactuable está cerca y enfrente del jugador.
import { CFG } from '../config.js';

export function createInteractions(items) {
  let current = null;
  let changeCb = () => {};
  let acc = 0;

  function find(player) {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    let best = null, bestScore = -Infinity;
    for (const it of items) {
      const dx = it.x - player.x, dz = it.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d > CFG.interactRange) continue;
      const facing = d < 0.001 ? 1 : (dx * fx + dz * fz) / d;
      if (facing < 0.55) continue;
      const score = facing * 2 - d / CFG.interactRange;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }

  return {
    items,
    get current() { return current; },
    onChange(fn) { changeCb = fn; },
    // Se revisa ~12 veces por segundo: suficiente y más barato que cada frame
    update(dt, player) {
      acc += dt;
      if (acc < 0.08) return;
      acc = 0;
      const next = find(player);
      if (next !== current) { current = next; changeCb(current); }
    },
    clear() { if (current) { current = null; changeCb(null); } },
  };
}
