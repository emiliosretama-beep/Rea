// Arranque de la versión online (dentro de claude.ai). Crea la misma fábrica
// que el servidor, pero con Claude vía `sample`, datos vía `db` y sin red
// externa, y expone un "backend" que la interfaz usa en lugar de fetch/SSE.
import { LLMError } from "../errors.js";
import { assembleFactory } from "../factory-core.js";
import { createRegistry } from "../agents/index.js";
import { OrchestratorError } from "../orchestrator.js";
import { HttpError, createRoutes } from "../routes.js";
import { cloudLLM } from "./llm-cloud.js";
import { openCloudStore, openLocalStore } from "./store.js";

const TAKEOVER_RETRY_MS = 30_000;
const MUTATING = new Set(["POST", "PUT", "DELETE"]);

// Tareas largas en el modelo con más capacidad; el resto, en el normal.
const tierFor = (name) => (name === "script.write" || name === "trends.research" ? "complex" : "default");

const CONFIG = {
  llm: { mode: "cloud", model: null },
  youtube: { apiKey: null, regionCode: "MX" },
  // Un solo trabajo a la vez: cada llamada gasta el uso de tu cuenta.
  orchestrator: { maxAttempts: 3, concurrency: 1 },
};

// La voz necesita Python, Kokoro y ffmpeg: no caben en una página de claude.ai.
const ONLINE_REGISTRY = createRegistry({
  unavailable: { narrator: "solo funciona en la versión con servidor (Kokoro necesita Python y ffmpeg)" },
});

const unavailableLLM = {
  mode: "none",
  webSearch: false,
  async json() {
    throw new LLMError("Claude no está disponible en esta vista. Abre ERA Factory en claude.ai con tu sesión iniciada.", {
      kind: "config",
    });
  },
  async research() {
    return this.json();
  },
};

const use = async (name) => {
  try {
    return (await globalThis.claude?.use?.(name)) ?? null;
  } catch {
    return null;
  }
};

export async function bootCloud() {
  const [sample, dbCap, user] = await Promise.all([use("sample"), use("db"), use("user")]);
  const userId = user ? await user.id().catch(() => null) : null;
  const holder = `tab-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

  const listeners = new Set();
  const emit = (event) => listeners.forEach((fn) => fn(event));
  const cloud = { storage: "local", readOnly: false, saving: false, error: null, savedAt: null };
  const setCloud = (patch) => {
    Object.assign(cloud, patch);
    emit({ type: "cloud", payload: { ...cloud }, at: new Date().toISOString() });
  };

  const store =
    dbCap && userId
      ? await openCloudStore({ db: dbCap, userId, holder, onStatus: setCloud })
      : openLocalStore({ onStatus: setCloud });
  cloud.storage = store.kind;

  const services = {
    llm: sample ? cloudLLM(sample, { tierFor }) : unavailableLLM,
    youtube: { connected: false, topVideos: async () => null },
  };
  if (!sample) CONFIG.llm.mode = "none";

  let current = null; // { factory, routes, saver, off }
  let renewTimer = null;
  let takeoverTimer = null;

  async function start() {
    const { memory, saver } = await store.open();
    const factory = assembleFactory({ config: CONFIG, db: memory, services, registry: ONLINE_REGISTRY });
    const off = factory.bus.subscribe(emit);
    current = { factory, routes: createRoutes(factory), saver, off };
    const turn = await store.takeTurn();
    cloud.readOnly = !turn;
    if (turn) {
      factory.orchestrator.recover();
      if (store.renewEveryMs) renewTimer = setInterval(renew, store.renewEveryMs);
    } else {
      takeoverTimer = setInterval(() => document.visibilityState === "visible" && takeOver(), TAKEOVER_RETRY_MS);
    }
    setCloud({});
    emit({ type: "reset", payload: null, at: new Date().toISOString() });
  }

  async function stopCurrent() {
    clearInterval(renewTimer);
    clearInterval(takeoverTimer);
    if (!current) return;
    await current.saver.flushNow().catch(() => {});
    current.saver.stop();
    current.off();
    await current.factory.orchestrator.stop();
    current = null;
  }

  // Se perdió el turno (otro dispositivo lo tomó): dejar de trabajar aquí.
  async function renew() {
    if (await store.takeTurn()) return;
    clearInterval(renewTimer);
    // Primero se desconecta el guardado: lo que pase aquí al detenerse (tareas
    // canceladas) no debe pisar lo que ya hace el otro dispositivo.
    if (current) {
      current.saver.stop();
      current.saver = { flushNow: async () => {}, stop() {} };
      await current.factory.orchestrator.stop();
    }
    setCloud({ readOnly: true });
    takeoverTimer = setInterval(() => document.visibilityState === "visible" && takeOver(), TAKEOVER_RETRY_MS);
  }

  // Tomar el turno: se releen los datos (el otro dispositivo pudo cambiarlos).
  async function takeOver() {
    if (!cloud.readOnly) return true;
    if (!(await store.takeTurn())) return false;
    await stopCurrent();
    await start();
    return !cloud.readOnly;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") current?.saver.flushNow().catch(() => {});
  });

  await start();

  return {
    mode: "cloud",
    takeOver,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async request(method, path, body = {}) {
      const url = new URL(path, "https://era.local");
      if (MUTATING.has(method) && cloud.readOnly)
        throw {
          status: 423,
          message: "ERA Factory está trabajando en otro dispositivo. Pulsa «Usar en este dispositivo» para cambiar.",
        };
      const route = current?.routes.find(([m, re]) => m === method && re.test(url.pathname));
      if (!route) throw { status: 404, message: "Ruta no encontrada." };
      try {
        const params = url.pathname.match(route[1]).slice(1);
        const result = await route[2](params, structuredClone(body), url);
        const data = structuredClone(result);
        if (url.pathname === "/api/status") data.cloud = { ...cloud };
        return data;
      } catch (err) {
        if (err instanceof HttpError || err instanceof OrchestratorError)
          throw { status: err.status, message: err.message, details: err.details };
        console.error(err);
        throw { status: 500, message: "Error interno de ERA Factory." };
      }
    },
  };
}
