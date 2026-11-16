// Jarvis en su propia página (fuera de Claude). La IA y la memoria salen del
// Worker de Cloudflare que sirve la página (ver worker/index.js). El Worker
// pide una clave que solo conoce Emilio; aquí se guarda en el dispositivo y
// viaja en cada petición.

const KEY = "jarvis:clave:v1";

// El build marca la versión independiente con window.JARVIS_SITE.
export const isSite = () => globalThis.JARVIS_SITE === true;

function loadClave() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

let clave = loadClave();
let onLocked = () => {};

function saveClave(value) {
  clave = value;
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento la clave vale solo para esta visita.
  }
}

// Error de la API del Worker con un mensaje para Emilio. `locked`: la clave
// falta o no es correcta.
export class SiteError extends Error {
  constructor(message, { locked = false } = {}) {
    super(message);
    this.locked = locked;
  }
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const init = {
    method,
    signal,
    headers: { authorization: `Bearer ${clave}` },
  };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new SiteError("No hay conexión con Jarvis. Revisa tu internet.");
  }
  if (response.status === 401) {
    saveClave("");
    onLocked();
    throw new SiteError("Escribe la clave de Jarvis para continuar.", {
      locked: true,
    });
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new SiteError(data.error || `Jarvis respondió ${response.status}.`);
  }
  return response;
}

// El formulario de la clave. `ready()` resuelve cuando hay una clave que el
// Worker acepta; si más tarde deja de aceptarla, el formulario vuelve.
export function createGate({ gate, form, input, error, onUnlock }) {
  let waiting = [];

  function show(message = "") {
    gate.hidden = false;
    error.textContent = message;
    input.value = "";
    input.focus();
  }

  function unlock() {
    gate.hidden = true;
    const resolve = waiting;
    waiting = [];
    for (const done of resolve) done();
    onUnlock?.();
  }

  onLocked = () =>
    show("La clave no es correcta o cambió. Escríbela otra vez.");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    saveClave(value);
    error.textContent = "Comprobando…";
    try {
      await api("/api/data");
      unlock();
    } catch (failure) {
      error.textContent = failure.locked
        ? "Esa clave no es la de Jarvis."
        : failure.message;
    }
  });

  return {
    ready() {
      if (clave && gate.hidden) return Promise.resolve();
      if (gate.hidden) show();
      return new Promise((resolve) => waiting.push(resolve));
    },
  };
}
