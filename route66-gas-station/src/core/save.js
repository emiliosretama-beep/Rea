// Guardado automático en localStorage. Todo va en try/catch: en modo privado o dentro de un iframe
// el almacenamiento puede fallar, y el juego debe seguir funcionando aunque no se pueda guardar.
const KEY = 'route66:save';
const VERSION = 1;

// Campos del estado del negocio que se guardan tal cual
export const SAVED_FIELDS = [
  'money', 'earned', 'rep', 'served', 'lost', 'fuel', 'sodas', 'snacks',
  'boards', 'power', 'open', 'litterPicked', 'upgrades', 'mission', 'missionProgress', 'legendary',
];

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Formatos futuros: aquí se migrarían versiones viejas
    if (!data || data.v !== VERSION || typeof data.state !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

// world: { boardsOff: [índices], litter: [índices] }
export function saveGame(state, world) {
  const out = { v: VERSION, at: Date.now(), state: {}, world };
  for (const k of SAVED_FIELDS) out.state[k] = state[k];
  try {
    localStorage.setItem(KEY, JSON.stringify(out));
    return true;
  } catch {
    return false;
  }
}

export function clearGame() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
}

// Copia los campos guardados a un estado recién creado (ignora lo que no conozca)
export function applyState(state, saved) {
  for (const k of SAVED_FIELDS) {
    if (!(k in saved)) continue;
    const v = saved[k];
    if (k === 'upgrades') state.upgrades = v && typeof v === 'object' ? { ...v } : {};
    else if (typeof v === typeof state[k]) state[k] = v;
  }
}
