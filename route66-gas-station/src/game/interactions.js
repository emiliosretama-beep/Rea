// Detecta qué objeto interactuable está cerca y enfrente del jugador.
// Cada objeto: { x, z, label(): texto o null si no está disponible, use?(), hold?(dt), release?(), near?(player) }
import { CFG } from '../config.js';

export function createInteractions(items) {
  const state = { current: null, label: null };
  let acc = 1;

  function find(player) {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    let best = null, bestLabel = null, bestScore = -Infinity;
    for (const it of items) {
      if (it.near && !it.near(player)) continue;
      const dx = it.x - player.x, dz = it.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d > CFG.interactRange) continue;
      const facing = d < 0.001 ? 1 : (dx * fx + dz * fz) / d;
      if (facing < 0.55) continue;
      const score = facing * 2 - d / CFG.interactRange;
      if (score <= bestScore) continue;
      const label = it.label();
      if (label === null) continue;
      bestScore = score; best = it; bestLabel = label;
    }
    state.current = best;
    state.label = bestLabel;
  }

  return Object.assign(state, {
    items,
    // Se revisa ~12 veces por segundo: suficiente y más barato que cada frame
    update(dt, player) {
      acc += dt;
      if (acc < 0.08) return;
      acc = 0;
      find(player);
    },
    clear() { state.current = null; state.label = null; },
  });
}
