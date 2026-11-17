// ERA Factory — arranque de la interfaz: navegación, rutas y eventos en vivo.
import { esc, icon, toast } from "./lib.js";
import { debounce, refreshStatus, store } from "./store.js";
import { dashboardView } from "./views/dashboard.js";
import { channelsView } from "./views/channels.js";
import { productionsView } from "./views/productions.js";
import { productionView } from "./views/production.js";
import { agentsView } from "./views/agents.js";

const NAV = [
  { href: "#/", label: "Centro", icon: "centro", match: /^\/$/ },
  { href: "#/canales", label: "Canales", icon: "canales", match: /^\/canales/ },
  { href: "#/producciones", label: "Producciones", icon: "producciones", match: /^\/producciones/ },
  { href: "#/agentes", label: "Agentes", icon: "agentes", match: /^\/agentes/ },
];

const ROUTES = [
  [/^\/$/, dashboardView],
  [/^\/canales(?:\/(nuevo|[\w-]+))?$/, channelsView],
  [/^\/producciones$/, productionsView],
  [/^\/producciones\/([\w-]+)$/, productionView],
  [/^\/agentes$/, agentsView],
];

const root = document.getElementById("view");
let current = null; // { view, params }
let lastHash = location.hash;

function renderNav() {
  const path = location.hash.slice(1) || "/";
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
    mock: ["st-awaiting_approval", "Simulación (sin IA real)"],
    none: ["st-failed", "Sin API key de Anthropic"],
  }[s.llm.mode];
  document.getElementById("side-status").innerHTML =
    `<span class="pill ${llm[0]}">${esc(llm[1])}</span>` +
    `<span class="pill ${s.youtube.connected ? "st-done" : "st-pending"}">YouTube ${s.youtube.connected ? "conectado" : "sin conectar"}</span>`;
}

async function route() {
  const path = location.hash.slice(1) || "/";
  const found = ROUTES.find(([re]) => re.test(path));
  if (current?.view.canLeave && !current.view.canLeave()) {
    history.replaceState(null, "", lastHash || "#/");
    return;
  }
  lastHash = location.hash;
  renderNav();
  current?.view.leave?.();
  if (!found) {
    root.innerHTML = `<div class="empty"><strong>Esta página no existe.</strong><a class="btn" href="#/">Ir al centro</a></div>`;
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

// Eventos en vivo del coordinador (SSE). EventSource reconecta solo.
function connect() {
  const source = new EventSource("/api/events");
  const statusLater = debounce(() => refreshStatus().catch(() => {}), 250);
  source.onmessage = (msg) => {
    const event = JSON.parse(msg.data);
    statusLater();
    current?.view.onEvent?.(event, current.params);
  };
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

store.listeners.add(() => {
  renderNav();
  renderSideStatus();
});
window.addEventListener("hashchange", route);
await refreshStatus().catch(() => {});
await route();
connect();
