// Historial de producciones, con filtro por estado.
import { api, esc } from "../lib.js";
import { debounce } from "../store.js";
import { productionRow } from "./common.js";

const FILTERS = [
  ["all", "Todas"],
  ["attention", "Necesitan atención"],
  ["active", "En curso"],
  ["completed", "Completadas"],
  ["closed", "Canceladas"],
];
const MATCH = {
  all: () => true,
  attention: (p) => ["awaiting_approval", "failed"].includes(p.status),
  active: (p) => ["running", "queued"].includes(p.status),
  completed: (p) => p.status === "completed",
  closed: (p) => p.status === "cancelled",
};

let root = null;
let filter = "all";

async function draw() {
  const productions = await api("GET", "/api/productions");
  const shown = productions.filter(MATCH[filter]);
  root.innerHTML = `
    <header class="page-head"><div><h1>Producciones</h1><p>Historial de todos los videos de todos tus canales.</p></div></header>
    <div class="filters" role="toolbar" aria-label="Filtrar">${FILTERS.map(
      ([id, label]) =>
        `<button class="btn small${id === filter ? "" : " ghost"}" data-filter="${id}" aria-pressed="${id === filter}">${esc(label)} <span class="mono">${productions.filter(MATCH[id]).length}</span></button>`,
    ).join("")}</div>
    ${
      shown.length
        ? `<div class="list">${shown.map(productionRow).join("")}</div>`
        : `<div class="card"><div class="core empty"><strong>No hay producciones aquí.</strong>${
            productions.length ? "Prueba con otro filtro." : `Lanza la primera desde <a href="#canales">Canales</a>.`
          }</div></div>`
    }`;
  root.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      draw();
    }),
  );
}

const redraw = debounce(() => root && draw().catch(() => {}), 300);

export const productionsView = {
  async render(el) {
    root = el;
    await draw();
  },
  onEvent: (e) => (e.type !== "log" ? redraw() : null),
  leave: () => (root = null),
};
