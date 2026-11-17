// Piezas de interfaz que comparten varias vistas.
import { STATUS_LABEL, esc, icon, pill, timeAgo, clock } from "../lib.js";
import { agentName, store } from "../store.js";

// Aviso honesto del modo de IA: sin key no hay agentes; en mock nada es real.
export function llmBanner() {
  const mode = store.status?.llm.mode;
  if (mode === "none")
    return `<div class="banner error">${icon("alert")}<div><strong>Los agentes no pueden trabajar todavía.</strong>
      <p>Falta <span class="mono">ANTHROPIC_API_KEY</span> en <span class="mono">era-factory/.env</span>. Copia <span class="mono">.env.example</span>, pega tu key y reinicia el servidor.</p></div></div>`;
  if (mode === "mock")
    return `<div class="banner warn">${icon("alert")}<div><strong>Modo simulación.</strong>
      <p>Los resultados son datos de prueba fijos, no IA ni investigación real. Quita <span class="mono">FACTORY_LLM=mock</span> para trabajar de verdad.</p></div></div>`;
  return "";
}

export function productionRow(p) {
  const agents = store.status?.agents ?? [];
  const dots = agents
    .map((a) => {
      const task = p.tasks?.find((t) => t.agentId === a.id);
      const cls = task ? task.status : "planned";
      return `<i class="${esc(cls)}" title="${esc(a.name)}: ${esc(STATUS_LABEL[cls] ?? cls)}"></i>`;
    })
    .join("");
  return `<a class="row" href="#/producciones/${esc(p.id)}">
    <div class="grow">
      <div class="title">${esc(p.title)}</div>
      <div class="meta">${esc(p.channelName)} · ${esc(timeAgo(p.updatedAt))}</div>
      <div class="dots" style="margin-top:7px" aria-hidden="true">${dots}</div>
    </div>
    ${pill(p.status)}
  </a>`;
}

export function logList(logs, { showAgent = true, tall = false } = {}) {
  if (!logs.length) return `<p class="muted">Sin actividad todavía.</p>`;
  return `<ol class="log${tall ? " tall" : ""}">${logs
    .map(
      (l) => `<li><time datetime="${esc(l.createdAt)}">${esc(clock(l.createdAt))}</time>
      <div class="${esc(l.level)}">${showAgent && l.agentId && !l.message.startsWith(agentName(l.agentId)) ? `<span class="who">${esc(agentName(l.agentId))} · </span>` : ""}${esc(l.message)}</div></li>`,
    )
    .join("")}</ol>`;
}

export function agentCard(agent, task, { compact = false } = {}) {
  const busy = Boolean(task);
  const state = !agent.implemented ? pill("planned", `Fase ${agent.phase}`) : busy ? pill("running") : pill("pending", "Libre");
  const doing = !agent.implemented
    ? "Aún no programado."
    : busy
      ? `Trabajando · <a href="#/producciones/${esc(task.productionId)}">ver producción</a>`
      : "Esperando una tarea.";
  return `<div class="agent${busy ? " busy" : ""}${agent.implemented ? "" : " planned"}">
    <div class="avatar">${icon(agent.id)}</div>
    <div class="grow">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <strong>${esc(agent.name)}</strong>${state}
      </div>
      <div class="doing">${doing}</div>
      ${compact ? "" : `<p class="muted" style="margin:8px 0 0;font-size:13.5px">${esc(agent.description)}</p>`}
    </div>
  </div>`;
}
