// Guardado de la versión online.
//
// La fábrica trabaja sobre una base en memoria (db-memory.js) y este módulo
// copia cada documento que cambia a la base de datos de claude.ai, en tu
// colección privada data/users/<tu id> (solo tú la ves).
//
// Rutas: en esa base un documento tiene un número PAR de segmentos y
// data/users/<id> ya es una colección, así que todo va directamente dentro,
// con un prefijo por tipo: ch_<id> (canal), pr_<id> (producción con sus
// tareas y registro), in_<id> (aprendizaje) y «runner» (el turno). Escrituras de una en una
// por documento y agrupadas, como pide el contrato de `db`.
//
// Turno: el coordinador solo debe correr en UN dispositivo a la vez (si no,
// iPhone e iPad producirían el mismo video dos veces). El que tiene el turno
// (lease en meta/runner) trabaja; los demás quedan en modo lectura.
import { openMemoryDatabase } from "../db-memory.js";

const PREFIX = { channels: "ch_", productions: "pr_", insights: "in_" };
const FLUSH_DELAY_MS = 600;
const RETRY_DELAY_MS = 15_000;
const LEASE_MS = 45_000;
const RENEW_MS = 15_000;
const LOCAL_KEY = "era-factory:local-v1";

const json = (v) => JSON.parse(JSON.stringify(v));

// ---------- Nube (capability db) ----------

export async function openCloudStore({ db, userId, holder, onStatus = () => {} }) {
  const mine = db.collection(`data/users/${userId}`);
  const lock = mine.doc("runner");

  async function loadAll() {
    const data = { channels: [], productions: [], insights: [] };
    const snap = await mine.get();
    for (const doc of snap.docs) {
      if (!doc.exists) continue;
      const kind = Object.keys(PREFIX).find((k) => doc.id.startsWith(PREFIX[k]));
      if (kind) data[kind].push(json(doc.data()));
    }
    return data;
  }

  // Intenta tomar o renovar el turno. Resuelve true si este dispositivo lo tiene.
  async function takeTurn() {
    try {
      const r = await lock.acquire({ holder, ttlMs: LEASE_MS });
      return r.acquired;
    } catch {
      return false;
    }
  }

  function persist(memory) {
    const pending = new Map(); // "colección/id" -> {collection, id}
    let timer = null;
    let flushing = false;

    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(flush, ms);
    };

    async function flush() {
      if (flushing) return schedule(FLUSH_DELAY_MS);
      flushing = true;
      onStatus({ saving: true });
      try {
        for (const [key, { collection, id }] of [...pending]) {
          pending.delete(key);
          const ref = mine.doc(PREFIX[collection] + id);
          const body = memory.exportDoc(collection, id);
          try {
            if (body) await ref.set(json(body));
            else await ref.delete();
          } catch (err) {
            // Se queda pendiente: se reintenta con calma o con el siguiente cambio.
            if (!pending.has(key)) pending.set(key, { collection, id });
            onStatus({ saving: false, error: errorText(err) });
            schedule(RETRY_DELAY_MS);
            return;
          }
        }
        onStatus({ saving: false, error: null, savedAt: new Date().toISOString() });
      } finally {
        flushing = false; // los cambios llegados durante el guardado ya programaron otro
      }
    }

    const off = memory.onChange(({ collection, id }) => {
      pending.set(`${collection}/${id}`, { collection, id });
      schedule(FLUSH_DELAY_MS);
    });
    return {
      flushNow: () => (pending.size ? flush() : Promise.resolve()),
      stop: () => {
        off();
        clearTimeout(timer);
      },
      get pending() {
        return pending.size;
      },
    };
  }

  // Abre la base: lee todo y devuelve la memoria lista + el guardado enganchado.
  async function open() {
    const memory = openMemoryDatabase(await loadAll());
    return { memory, saver: persist(memory) };
  }

  return { kind: "cloud", open, takeTurn, renewEveryMs: RENEW_MS };
}

function errorText(err) {
  const code = err?.code;
  if (code === "quota_exceeded" || code === "resource_exhausted")
    return "La base de datos está llena. Elimina producciones antiguas.";
  if (code === "invalid_argument") return "Un documento es demasiado grande para guardarse.";
  return "No se pudo guardar en la nube. Se reintentará.";
}

// ---------- Respaldo: solo este navegador (sin capability db) ----------

export function openLocalStore({ onStatus = () => {} } = {}) {
  function read() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    } catch {
      return {};
    }
  }
  return {
    kind: "local",
    renewEveryMs: 0,
    takeTurn: async () => true,
    async open() {
      const memory = openMemoryDatabase(read());
      let timer = null;
      const save = () => {
        const data = {
          channels: memory.listChannels(),
          productions: memory.listProductions().map((p) => memory.exportDoc("productions", p.id)),
          insights: memory.listChannels().flatMap((c) => memory.listInsights(c.id)),
        };
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
          onStatus({ saving: false, error: null, savedAt: new Date().toISOString() });
        } catch {
          onStatus({ saving: false, error: "Este navegador no deja guardar datos; se perderán al cerrar." });
        }
      };
      const off = memory.onChange(() => {
        clearTimeout(timer);
        timer = setTimeout(save, FLUSH_DELAY_MS);
      });
      return {
        memory,
        saver: {
          flushNow: async () => save(),
          stop: () => {
            off();
            clearTimeout(timer);
          },
          pending: 0,
        },
      };
    },
  };
}
