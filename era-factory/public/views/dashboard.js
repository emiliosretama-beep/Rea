// Centro de operaciones: qué necesita tu atención, el equipo en vivo y la actividad.
import { api, icon } from "../lib.js";
import { debounce, refreshStatus } from "../store.js";
import { agentCard, llmBanner, logList, productionRow } from "./common.js";

let root = null;

async function draw() {
  const [status, productions, logs] = await Promise.all([
    refreshStatus(),
    api("GET", "/api/productions"),
    api("GET", "/api/logs?limit=40"),
  ]);
  const s = status.summary;
  const attention = productions.filter((p) => ["awaiting_approval", "failed"].includes(p.status));
  const active = productions.filter((p) => ["running", "queued"].includes(p.status));
  const busy = new Map(status.activity.map((t) => [t.agentId, t]));
  const planned = status.agents.filter((a) => !a.implemented);

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Centro de operaciones</h1><p>Tu equipo de agentes investiga, escribe y produce. Tú supervisas y apruebas.</p></div>
      ${s.channels ? `<a class="btn primary" href="#/canales">${icon("play")}Producir un video</a>` : ""}
    </header>
    ${llmBanner()}
    <div class="strip" role="list">
      <div role="listitem"><b>${s.channels}</b><span>Canales</span></div>
      <div role="listitem"><b>${s.active}</b><span>En producción</span></div>
      <div role="listitem"><b>${s.awaitingApproval}</b><span>Esperan aprobación</span></div>
      <div role="listitem"><b>${s.completed}</b><span>Completadas</span></div>
    </div>
    <div class="grid main">
      <div class="stack">
        ${
          !s.channels
            ? `<section class="card"><div class="core empty"><strong>Empieza creando tu primer canal.</strong>
                <p>Dinos el nicho, el idioma y el público; el equipo se encarga del resto.</p>
                <a class="btn primary" href="#/canales/nuevo">${icon("plus")}Crear canal</a></div></section>`
            : ""
        }
        <section class="card"><div class="core">
          <h2>Necesita tu atención</h2>
          ${attention.length ? `<div class="list">${attention.map(productionRow).join("")}</div>` : `<p class="muted">Nada pendiente. Cuando un guion esté listo o algo falle, aparecerá aquí.</p>`}
        </div></section>
        <section class="card"><div class="core">
          <h2>En producción</h2>
          ${active.length ? `<div class="list">${active.map(productionRow).join("")}</div>` : `<p class="muted">No hay videos en marcha.</p>`}
        </div></section>
      </div>
      <div class="stack">
        <section class="card"><div class="core">
          <h2>Equipo en vivo</h2>
          <div class="list">${status.agents
            .filter((a) => a.implemented)
            .map((a) => agentCard(a, busy.get(a.id), { compact: true }))
            .join("")}</div>
          ${planned.length ? `<p class="muted" style="margin:12px 0 0;font-size:13.5px">${planned.length} agentes más en el plan: ${planned.map((a) => a.name).join(", ")}. <a href="#/agentes">Ver plan</a></p>` : ""}
        </div></section>
        <section class="card"><div class="core">
          <h2>Actividad reciente</h2>
          ${logList(logs.slice(-14).reverse())}
        </div></section>
      </div>
    </div>`;
}

const redraw = debounce(() => root && draw().catch(() => {}), 300);

export const dashboardView = {
  async render(el) {
    root = el;
    await draw();
  },
  onEvent: () => redraw(),
  leave: () => (root = null),
};

