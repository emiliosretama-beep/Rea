// ERA Factory — arranque de la interfaz: navegación, rutas y eventos en vivo.
// Rutas como #nombre simple (claude.ai solo admite eso): #centro, #canales,
// #canales-nuevo, #canal-<id>, #producciones, #produccion-<id>, #agentes.
import { backend, esc, icon, toast } from "./lib.js";
import { debounce, refreshStatus, store } from "./store.js";
import { llmBanner } from "./views/common.js";
import { dashboardView } from "./views/dashboard.js";
import { channelsView } from "./views/channels.js";
import { productionsView } from "./views/productions.js";
import { productionView } from "./views/production.js";
import { agentsView } from "./views/agents.js";

const NAV = [
  { href: "#centro", label: "Centro", icon: "centro", match: /^(centro)?$/ },
  { href: "#canales", label: "Canales", icon: "canales", match: /^canal/ },
  { href: "#producciones", label: "Producciones", icon: "producciones", match: /^produccion/ },
  { href: "#agentes", label: "Agentes", icon: "agentes", match: /^agentes$/ },
];

const ROUTES = [
  [/^(?:centro)?$/, dashboardView],
  [/^canales$/, channelsView],
  [/^canales-(nuevo)$/, channelsView],
  [/^canal-([\w-]+)$/, channelsView],
  [/^producciones$/, productionsView],
  [/^produccion-([\w-]+)$/, productionView],
  [/^agentes$/, agentsView],
];

const root = document.getElementById("view");
let current = null; // { view, params }
let lastHash = location.hash;

const currentPath = () => location.hash.slice(1);

function renderNav() {
  const path = currentPath();
  const waiting = store.status?.summary.awaitingApproval ?? 0;
  document.getElementById("nav").innerHTML = NAV.map((item) => {
    const active = item.match.test(path) ? ' aria-current="page"' : "";
    const badge =
      item.icon === "producciones" && waiting
        ? `<span class="badge-dot" aria-label="${waiting} esperan aprobación">${waiting}</span>`
        : "";
    return `<a href="${item.href}"${active}>${icon(item.icon)}<span>${item.label}</span>${badge}</a>`;
  }).join("");
}

function renderSideStatus() {
  const s = store.status;
  if (!s) return;
  const llm = {
    claude: ["st-done", `IA real · ${s.llm.model}`],
    cloud: ["st-done", "Claude · tu cuenta"],
    mock: ["st-awaiting_approval", "Simulación (sin IA real)"],
    none: ["st-failed", s.cloud ? "Claude no disponible aquí" : "Sin API key de Anthropic"],
  }[s.llm.mode];
  const pills = [`<span class="pill ${llm[0]}">${esc(llm[1])}</span>`];
  if (s.cloud) {
    const c = s.cloud;
    const save = c.error
      ? ["st-failed", "Error al guardar"]
      : c.storage === "cloud"
        ? ["st-done", c.saving ? "Guardando…" : "Guardado en la nube"]
        : ["st-awaiting_approval", "Guardado solo aquí"];
    pills.push(`<span class="pill ${save[0]}">${esc(save[1])}</span>`);
    if (c.readOnly) pills.push(`<span class="pill st-awaiting_approval">Modo lectura</span>`);
  } else {
    pills.push(
      `<span class="pill ${s.youtube.connected ? "st-done" : "st-pending"}">YouTube ${s.youtube.connected ? "conectado" : "sin conectar"}</span>`,
    );
  }
  document.getElementById("side-status").innerHTML = pills.join("");
}

// Avisos que valen para todas las pantallas (modo de IA, modo lectura, guardado).
let lastNotice = "";
function renderNotice() {
  const html = llmBanner();
  if (html === lastNotice) return;
  lastNotice = html;
  document.getElementById("notice").innerHTML = html;
}

async function route() {
  const path = currentPath();
  const found = ROUTES.find(([re]) => re.test(path));
  if (current?.view.canLeave && !current.view.canLeave(location.hash)) {
    history.replaceState(null, "", lastHash || "#centro");
    return;
  }
  lastHash = location.hash;
  renderNav();
  current?.view.leave?.();
  if (!found) {
    root.innerHTML = `<div class="empty"><strong>Esta página no existe.</strong><a class="btn" href="#centro">Ir al centro</a></div>`;
    current = null;
    return;
  }
  const params = path.match(found[0]).slice(1);
  current = { view: found[1], params };
  root.innerHTML = `<div class="skeleton"></div>`;
  try {
    await found[1].render(root, params);
  } catch (err) {
    root.innerHTML = `<div class="banner error">${icon("alert")}<div><strong>No se pudo cargar.</strong><p>${esc(err.message)}</p></div></div>`;
  }
  root.focus({ preventScroll: true });
}

function handleEvent(event) {
  statusLater();
  if (event.type === "reset") {
    // La versión online recargó los datos (p. ej. al tomar el turno): redibujar.
    current?.view.leave?.();
    current = null;
    route();
    return;
  }
  if (event.type === "cloud") {
    // Cambió el modo lectura: los avisos y botones de la vista dependen de él.
    if (event.payload.readOnly !== lastReadOnly) {
      lastReadOnly = event.payload.readOnly;
      refreshStatus().then(route).catch(() => {});
    }
    return;
  }
  current?.view.onEvent?.(event, current.params);
}
let lastReadOnly = false;
const statusLater = debounce(() => refreshStatus().catch(() => {}), 250);

// Eventos en vivo: directos en la versión online; por SSE con el servidor.
function connect() {
  const b = backend();
  if (b) {
    b.subscribe(handleEvent);
    return;
  }
  const source = new EventSource("/api/events");
  source.onmessage = (msg) => handleEvent(JSON.parse(msg.data));
  let warned = false;
  source.onerror = () => {
    if (!warned) toast("Se perdió la conexión en vivo. Reintentando…", "error");
    warned = true;
  };
  source.onopen = () => {
    if (warned) toast("Conexión en vivo recuperada.");
    warned = false;
  };
}

// Botón «Usar en este dispositivo» (versión online, modo lectura).
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-takeover]");
  if (!button || !backend()) return;
  button.disabled = true;
  const ok = await backend().takeOver();
  if (!ok) {
    toast("El otro dispositivo sigue trabajando. Ciérralo allí o espera un minuto y vuelve a intentarlo.", "error");
    button.disabled = false;
  } else toast("Listo: ERA Factory trabaja ahora en este dispositivo.");
});

export async function startApp() {
  store.listeners.add(() => {
    renderNav();
    renderSideStatus();
    renderNotice();
  });
  window.addEventListener("hashchange", route);
  await refreshStatus().catch(() => {});
  await route();
  connect();
}

// Con el servidor arranca sola; la versión online la arranca cloud/entry.js.
if (!globalThis.__ERA_CLOUD__) startApp();
