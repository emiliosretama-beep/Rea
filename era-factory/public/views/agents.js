// Panel de agentes: qué hace cada uno, de quién depende y qué está haciendo ahora.
import { esc } from "../lib.js";
import { agentName, debounce, refreshStatus } from "../store.js";
import { agentCard } from "./common.js";

let root = null;

async function draw() {
  const status = await refreshStatus();
  const busy = new Map(status.activity.map((t) => [t.agentId, t]));
  const ready = status.agents.filter((a) => a.implemented).length;
  root.innerHTML = `
    <header class="page-head"><div><h1>Agentes</h1>
      <p>${ready} de ${status.agents.length} agentes trabajan ya. Los demás están en el plan por fases y no se ejecutan hasta estar programados.</p></div></header>
    <div class="agent-grid">${status.agents
      .map(
        (a) => `<section class="card"><div class="core">${agentCard(a, busy.get(a.id))}
        <p class="muted" style="font-size:12.5px;margin:12px 0 0">
          ${a.dependsOn.length ? `Recibe de: ${a.dependsOn.map((d) => esc(agentName(d))).join(", ")}` : "Primer eslabón de la cadena."}
          ${a.requiresApproval ? " · Necesita tu aprobación" : ""}</p>
      </div></section>`,
      )
      .join("")}</div>`;
}

const redraw = debounce(() => root && draw().catch(() => {}), 300);

export const agentsView = {
  async render(el) {
    root = el;
    await draw();
  },
  onEvent: (e) => (e.type === "task" ? redraw() : null),
  leave: () => (root = null),
};
