// Calidad gráfica: alta (sombras finas), media (sombras normales, menos resolución) y baja (sin sombras reales).
// Se guarda la elección; si no hay, táctil empieza en media y PC en alta.
const KEY = 'route66:quality';
export const LEVELS = {
  high: { shadow: 2048, pixelRatio: 2 },
  medium: { shadow: 1024, pixelRatio: 1.5 },
  low: { shadow: 0, pixelRatio: 1 },
};
export const ORDER = ['high', 'medium', 'low'];

export function loadQuality() {
  let q = null;
  try { q = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
  if (LEVELS[q]) return q;
  return window.matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
}

export function saveQuality(q) {
  try { localStorage.setItem(KEY, q); } catch { /* sin almacenamiento */ }
}
