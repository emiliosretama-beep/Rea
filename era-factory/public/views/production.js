// Detalle de una producción: línea de producción en vivo, resultados de cada
// agente, editor de guion y decisiones (aprobar, pedir cambios, reintentar).
import { buildPackage, packageFilename } from "../package.js";
import { STATUS_LABEL, api, askConfirm, esc, icon, minutes, number, pill, safeUrl, timeAgo, toast, saveFile } from "../lib.js";
import { agentName, debounce, store } from "../store.js";
import { logList } from "./common.js";
import { bindNarration, loadVoices, narrationHtml, revoice } from "./narration.js";
import { bindVideo, remount, videoHtml } from "./video.js";
import { bindThumbnails, resetThumbnailEditor, thumbnailsHtml } from "./thumbnails.js";

const WORDS_PER_MINUTE = 150; // mismo ritmo que usa el guionista en el servidor
const UNSAVED = { title: "Tienes cambios sin guardar", body: "Si sales ahora se pierden.", confirmLabel: "Salir sin guardar", danger: true };
const TABS = [
  { id: "trend-researcher", label: "Investigación" },
  { id: "audience-analyst", label: "Audiencia" },
  { id: "scriptwriter", label: "Guion" },
  { id: "narrator", label: "Voz" },
  { id: "thumbnail-designer", label: "Miniaturas" },
  { id: "producer", label: "Video" },
  { id: "log", label: "Registro" },
];

// follow: mientras el usuario no elija pestaña, la vista sigue al agente activo.
const state = { root: null, id: null, detail: null, tab: null, follow: true, draft: null, dirty: false, signature: "" };

const taskOf = (agentId) => state.detail.tasks.find((t) => t.agentId === agentId);
const sig = (t) => (t ? `${t.status}:${t.attempt}:${t.updatedAt}` : "none");
const countWords = (text) => (String(text || "").match(/\S+/g) || []).length;

function sourceLinks(ids, sources) {
  const items = (ids || [])
    .map((id) => sources.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => {
      const url = safeUrl(s.url);
      return url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.title)}">[${s.id}]</a>`
        : `[${s.id}]`;
    });
  return items.length ? `<span class="src">Fuentes: ${items.join(" ")}</span>` : `<span class="src">Sin fuente</span>`;
}

function defaultTab() {
  const tasks = state.detail.tasks;
  const focus = tasks.find((t) => ["awaiting_approval", "failed", "running", "cancelled"].includes(t.status));
  if (focus) return focus.agentId;
  const done = tasks.filter((t) => t.status === "done").at(-1);
  return done?.agentId ?? "trend-researcher";
}

// ---------- Cabecera y línea de producción ----------

function headerHtml() {
  const { production, channel } = state.detail;
  const canCancel = ["running", "queued"].includes(production.status);
  return `
    <a class="back" href="#producciones">${icon("back")}Producciones</a>
    <header class="page-head">
      <div style="min-width:0"><h1>${esc(production.title)}</h1>
        <p>${esc(channel?.name ?? "")}${production.topicHint ? ` · Tema pedido: ${esc(production.topicHint)}` : ""} · ${esc(timeAgo(production.createdAt))}</p>
        <div style="margin-top:10px">${pill(production.status)}</div></div>
      <div class="actions">
        ${
          taskOf("scriptwriter")?.status === "done"
            ? `<button class="btn primary" data-act="export" title="Guion, miniatura y formato en un archivo para producir el video con servidor">${icon("play")}Exportar para video</button>`
            : ""
        }
        ${canCancel ? `<button class="btn danger" data-act="cancel">${icon("x")}Cancelar</button>` : ""}
        ${!canCancel ? `<button class="btn ghost danger" data-act="delete">${icon("trash")}Eliminar</button>` : ""}
      </div>
    </header>`;
}

function lineHtml() {
  const agents = store.status?.agents ?? [];
  return `<section class="card" aria-label="Línea de producción"><div class="core"><div class="line">${agents
    .map((a) => {
      const task = taskOf(a.id);
      const status = task ? task.status : "planned";
      const sub = task
        ? STATUS_LABEL[status] + (task.attempt > 1 && status !== "done" ? ` · intento ${task.attempt}` : "")
        : a.unavailableReason
          ? "Solo con servidor"
          : `Fase ${a.phase}`;
      const tab = TABS.some((t) => t.id === a.id);
      const current = state.tab === a.id ? ' aria-current="step"' : "";
      const inner = `<div class="avatar">${icon(a.id)}</div><div class="grow"><div class="name">${esc(a.name)}</div><div class="sub">${esc(sub)}</div></div>`;
      return tab
        ? `<a class="node ${esc(status)}" href="#" data-tab="${a.id}"${current}>${inner}</a>`
        : `<a class="node planned" href="#agentes" title="Aún no programado">${inner}</a>`;
    })
    .join("")}${plannedSummary(agents)}</div></div></section>`;
}

// En el celular los agentes aún no programados se resumen en una sola fila.
function plannedSummary(agents) {
  const planned = agents.filter((a) => !a.implemented);
  if (!planned.length) return "";
  return `<a class="node planned summary" href="#agentes"><div class="avatar">${icon("plus")}</div>
    <div class="grow"><div class="name">${planned.length} ${planned.length === 1 ? "agente más" : "agentes más"}</div>
    <div class="sub">${esc(planned.map((a) => a.name + (a.unavailableReason ? " (solo con servidor)" : "")).join(", "))}</div></div></a>`;
}

// La pestaña elegida siempre a la vista (en el iPhone la fila se desplaza).
function revealTab() {
  state.root?.querySelector('.tabs [aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function tabsHtml() {
  return `<div class="tabs" role="tablist">${TABS.map(
    (t) => `<button role="tab" data-tab="${t.id}" aria-selected="${state.tab === t.id}">${esc(t.label)}</button>`,
  ).join("")}</div>`;
}

// ---------- Estados de una tarea que no tiene resultado que mostrar ----------

function taskStatusBlock(task) {
  const name = agentName(task.agentId);
  const taskLogs = state.detail.logs.filter((l) => l.taskId === task.id).slice(-8);
  if (task.status === "pending") {
    const before = state.detail.tasks.filter((t) => t.position < task.position && t.status !== "done");
    return `<div class="card"><div class="core empty"><strong>En cola.</strong>${
      before.length ? `Empieza cuando termine ${esc(agentName(before.at(-1).agentId))}.` : "Empieza en un momento."
    }${task.error ? `<p class="muted" style="margin-top:8px">${esc(task.error)}</p>` : ""}</div></div>`;
  }
  if (task.status === "running")
    return `<div class="card"><div class="core"><h2>${esc(name)} está trabajando…</h2>
      <p class="muted">Intento ${task.attempt}. Esto puede tardar uno o dos minutos; puedes salir de esta página.</p>${logList(taskLogs, { showAgent: false })}</div></div>`;
  if (task.status === "failed" || task.status === "cancelled") {
    const issues = task.review?.issues?.length
      ? `<ul>${task.review.issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
      : "";
    return `<div class="banner ${task.status === "failed" ? "error" : "warn"}">${icon("alert")}<div>
        <strong>${task.status === "failed" ? `${esc(name)} no pudo terminar.` : "Tarea cancelada."}</strong>
        <p>${esc(task.error ?? "")}</p>${issues}
        <div class="actions" style="margin-top:10px"><button class="btn small primary" data-act="retry" data-task="${esc(task.id)}">${icon("retry")}${task.status === "failed" ? "Reintentar" : "Reanudar"}</button></div>
      </div></div>`;
  }
  return "";
}

function warningsBlock(task) {
  const warnings = task.review?.warnings ?? [];
  if (!warnings.length) return "";
  return `<div class="banner warn">${icon("alert")}<div><strong>Revisa antes de seguir</strong>
    <ul style="margin:6px 0 0;padding-left:18px;color:var(--suave)">${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div></div>`;
}

function changesForm(task, label = "Pedir cambios a la IA") {
  return `<details class="plain" style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">${esc(label)}</summary>
    <form class="changes" data-task="${esc(task.id)}" style="margin-top:12px">
      <div class="field"><label for="notes-${esc(task.id)}">¿Qué quieres cambiar?</label>
        <textarea id="notes-${esc(task.id)}" name="notes" maxlength="2000" placeholder="Ej.: enfócate en principiantes y quita la parte de precios"></textarea>
        <span class="hint">El agente rehace su trabajo con tus notas. Lo que dependía de él se vuelve a generar.</span></div>
      <button class="btn" type="submit">${icon("retry")}Rehacer con estos cambios</button>
    </form></details>`;
}

// ---------- Resultados ----------

function researchHtml(task) {
  const r = task.output;
  const chosen = taskOf("audience-analyst")?.output?.chosenIdeaIndex;
  const yt = r.youtubeVideos?.length
    ? `<section class="card"><div class="core"><h2>Lo más visto del nicho en YouTube (30 días)</h2><div class="table-wrap"><table>
        <thead><tr><th>Video</th><th class="num">Vistas</th><th class="num">Duración</th></tr></thead><tbody>${r.youtubeVideos
          .map((v) => {
            const url = safeUrl(v.url);
            return `<tr><td>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a>` : esc(v.title)}<div class="src">${esc(v.channel)}</div></td>
              <td class="num">${number(v.views)}</td><td class="num">${v.durationSeconds ? minutes(v.durationSeconds) : "—"}</td></tr>`;
          })
          .join("")}</tbody></table></div></div></section>`
    : r.dataSources.webSearch === false
      ? `<div class="banner info">${icon("info")}<div><strong>Investigación sin internet.</strong><p>Esta versión de ERA Factory no puede buscar en la web ni en YouTube. ${
          r.dataSources.user ? "Se usaron tu material y el conocimiento general de Claude." : "Las ideas salen del conocimiento general de Claude: confirma que sigan vigentes."
        } Para la próxima, pega en «Material de investigación» enlaces o títulos que veas en YouTube.</p></div></div>`
      : `<div class="banner info">${icon("info")}<div><strong>Sin datos de YouTube.</strong><p>Esta investigación usó solo búsqueda web. Añade <span class="mono">YOUTUBE_API_KEY</span> para ver vistas reales de la competencia.</p></div></div>`;
  return `
    ${warningsBlock(task)}
    <section class="card"><div class="core"><h2>Resumen del nicho</h2><p>${esc(r.summary)}</p>
      <p class="src">${[
        r.dataSources.webSearch === false ? "sin búsqueda web" : `${r.dataSources.web} fuentes web`,
        r.dataSources.user ? `${r.dataSources.user} aportadas por ti` : "",
        r.dataSources.youtube === null ? "sin YouTube" : `${r.dataSources.youtube} videos de YouTube`,
        timeAgo(r.generatedAt),
      ]
        .filter(Boolean)
        .map(esc)
        .join(" · ")}</p></div></section>
    <section class="card"><div class="core"><h2>Tendencias</h2><div class="list">${r.trends
      .map(
        (t) => `<div class="plain"><div style="display:flex;justify-content:space-between;gap:10px"><strong>${esc(t.topic)}</strong>
          <span class="chip">Competencia ${esc(t.competition)}</span></div><p style="margin:6px 0">${esc(t.whyNow)}</p>${sourceLinks(t.sourceIds, r.sources)}</div>`,
      )
      .join("")}</div></div></section>
    <section class="card"><div class="core"><h2>Ideas de video</h2><div class="list">${r.ideas
      .map(
        (idea, i) => `<div class="plain idea${i === chosen ? " chosen" : ""}">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong>${esc(idea.title)}</strong>
            <span class="score" title="Oportunidad">${idea.opportunityScore}/10</span></div>
          ${i === chosen ? `<div style="margin-top:6px">${pill("running", "Elegida por el analista")}</div>` : ""}
          <p style="margin:8px 0 4px">${esc(idea.angle)}</p>
          <p class="muted" style="margin:0 0 6px;font-style:italic">“${esc(idea.hook)}”</p>
          <p style="font-size:13.5px;margin:0 0 6px">${esc(idea.whyItWorks)}</p>${sourceLinks(idea.sourceIds, r.sources)}</div>`,
      )
      .join("")}</div></div></section>
    ${yt}
    <section class="card"><div class="core"><h2>Fuentes consultadas</h2>${r.sources.length ? "" : `<p class="muted">Ninguna: ver el aviso de arriba.</p>`}<ol class="sources">${r.sources
      .map((s) => {
        const url = safeUrl(s.url);
        return `<li><span class="n">[${s.id}]</span><span>${url ? `<a class="src" style="color:var(--info)" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)}
          <span class="src"> · ${{ youtube: "YouTube", usuario: "Aportada por ti", web: "Web" }[s.kind] ?? "Web"}</span></span></li>`;
      })
      .join("")}</ol>
      <details style="margin-top:14px"><summary class="muted" style="cursor:pointer">Notas completas de la investigación</summary><p class="prose" style="margin-top:10px">${esc(r.researchNotes)}</p></details>
    </div></section>
    ${changesForm(task)}`;
}

function audienceHtml(task) {
  const a = task.output;
  const research = taskOf("trend-researcher")?.output;
  const idea = research?.ideas?.[a.chosenIdeaIndex];
  return `
    ${warningsBlock(task)}
    ${a.metrics?.available ? "" : `<div class="banner info">${icon("info")}<div><strong>Sin métricas reales todavía.</strong><p>${esc(a.metrics?.note ?? "")}</p></div></div>`}
    <div class="grid two">
      <section class="card"><div class="core"><h2>Espectador tipo: ${esc(a.persona.name)}</h2>
        <p>${esc(a.persona.description)}</p>
        <dl class="kv"><div><dt>Edad</dt><dd>${esc(a.persona.ageRange)}</dd></div></dl>
        <h3 style="margin-top:12px">Le mueve</h3><ul>${a.persona.motivations.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        <h3>Le frustra</h3><ul>${a.persona.frustrations.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        <h3>Prefiere</h3><div class="chips">${a.contentPreferences.map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div>
      </div></section>
      <section class="card"><div class="core"><h2>Decisión</h2>
        <p style="font-weight:600;font-size:16px">${esc(a.decision.title)}</p>
        ${idea ? `<p class="src">Basada en la idea: ${esc(idea.title)}</p>` : ""}
        <dl class="kv">
          <div><dt>Formato</dt><dd>${esc(a.decision.format)}</dd></div>
          <div><dt>Duración objetivo</dt><dd class="mono">${(() => {
            const s = a.decision.targetLengthSeconds ?? a.decision.targetLengthMinutes * 60;
            return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`;
          })()}</dd></div>
          <div><dt>Tono</dt><dd>${esc(a.decision.tone)}</dd></div>
          <div><dt>Enfoque</dt><dd>${esc(a.decision.angle)}</dd></div>
        </dl>
        <h3 style="margin-top:12px">Por qué</h3><p>${esc(a.decision.why)}</p>
        <h3>Plan de retención</h3><ul>${a.retentionPlan.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      </div></section>
    </div>
    ${changesForm(task)}`;
}

function claimsHtml(claims, sources) {
  if (!claims?.length) return `<p class="muted">El guion no tiene datos verificables.</p>`;
  const label = { respaldado: "Respaldado", sin_respaldo: "Sin respaldo", contradicho: "Contradicho" };
  return `<div class="list">${claims
    .map(
      (c) => `<div class="claim ${esc(c.verdict)}"><strong>${esc(label[c.verdict] ?? c.verdict)}</strong><span>${esc(c.text)}</span>
        <span class="src">${esc(c.note)} ${c.sourceId ? sourceLinks([c.sourceId], sources) : ""}</span></div>`,
    )
    .join("")}</div>`;
}

function statsHtml(script) {
  const words =
    countWords(script.hook) +
    script.sections.reduce((n, s) => n + countWords(s.narration), 0) +
    countWords(script.outro) +
    countWords(script.callToAction);
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  return `<span>Palabras <b>${number(words)}</b></span><span>Duración estimada <b>${minutes(seconds)}</b></span>
    ${script.targetSeconds ? `<span>Objetivo <b>${minutes(script.targetSeconds)}</b></span>` : ""}<span>Secciones <b>${script.sections.length}</b></span>`;
}

function scriptReadOnly(task) {
  const s = task.output;
  const sources = taskOf("trend-researcher")?.output?.sources ?? [];
  return `
    ${warningsBlock(task)}
    <div class="banner info">${icon("check")}<div><strong>Guion aprobado${task.editedByUser ? " con tus cambios" : ""}.</strong>
      <p>${
        taskOf("narrator")
          ? "Siguiente parada: el narrador lo convierte en voz (pestaña Voz)."
          : "La voz solo funciona en la versión con servidor."
      }</p></div></div>
    <section class="card"><div class="core"><div class="stats">${statsHtml(s)}</div>
      <h2 style="margin-top:14px">Gancho</h2><p class="prose">${esc(s.hook)}</p>
      ${s.sections.map((sec, i) => `<h3 style="margin-top:16px">${i + 1}. ${esc(sec.heading)}</h3><p class="prose">${esc(sec.narration)}</p><p class="src">En pantalla: ${esc(sec.visualNotes)}</p>`).join("")}
      <h3 style="margin-top:16px">Cierre</h3><p class="prose">${esc(s.outro)}</p><p class="prose">${esc(s.callToAction)}</p>
    </div></section>
    <section class="card"><div class="core"><h2>Verificación de datos</h2>${claimsHtml(s.claims, sources)}</div></section>
    <section class="card"><div class="core"><h2>Para YouTube</h2><p class="prose">${esc(s.description)}</p><div class="chips">${s.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div></div></section>
    ${changesForm(task, "Rehacer el guion con cambios")}`;
}

function scriptEditor(task) {
  const d = state.draft;
  const sources = taskOf("trend-researcher")?.output?.sources ?? [];
  const area = (path, value, rows, label) =>
    `<div class="field"><label for="ed-${path}">${esc(label)}</label><textarea id="ed-${path}" data-path="${path}" rows="${rows}">${esc(value)}</textarea></div>`;
  return `
    ${warningsBlock(task)}
    <section class="card"><div class="core">
      <h2>El guion espera tu aprobación</h2>
      <p class="muted">Léelo, edita lo que quieras aquí mismo y apruébalo. También puedes pedir a la IA que lo rehaga.</p>
      <div class="stats" id="stats">${statsHtml(d)}</div>
    </div></section>
    <section class="card"><div class="core">
      <div class="field"><label for="ed-title">Título</label><input type="text" id="ed-title" data-path="title" maxlength="140" value="${esc(d.title)}" /></div>
      ${area("hook", d.hook, 3, "Gancho (primeros segundos)")}
      ${d.sections
        .map(
          (s, i) => `<div class="section-edit"><div class="head"><strong class="mono">Sección ${i + 1}</strong></div>
          <div class="field"><label for="ed-h${i}">Encabezado</label><input type="text" id="ed-h${i}" data-path="sections.${i}.heading" value="${esc(s.heading)}" /></div>
          ${area(`sections.${i}.narration`, s.narration, 6, "Narración")}
          ${area(`sections.${i}.visualNotes`, s.visualNotes, 2, "Qué se ve en pantalla")}</div>`,
        )
        .join("")}
      ${area("outro", d.outro, 3, "Cierre")}
      ${area("callToAction", d.callToAction, 2, "Llamada a la acción")}
      ${area("description", d.description, 4, "Descripción para YouTube")}
      <div class="field"><label for="ed-tags">Etiquetas (separadas por comas)</label><input type="text" id="ed-tags" data-path="tags" value="${esc(d.tags.join(", "))}" /></div>
    </div></section>
    <section class="card"><div class="core"><h2>Verificación de datos</h2>
      <p class="muted" style="font-size:13.5px">Contrastado con las notas de investigación. Lo "sin respaldo" confírmalo tú antes de publicar.</p>
      ${claimsHtml(d.claims, sources)}</div></section>
    ${changesForm(task)}
    <div class="decision-bar" role="region" aria-label="Decisión">
      <div class="actions">
        <button class="btn ok" data-act="approve" data-task="${esc(task.id)}">${icon("check")}<span id="approve-label">${state.dirty ? "Guardar y aprobar" : "Aprobar guion"}</span></button>
        <button class="btn ghost" data-act="discard" ${state.dirty ? "" : "hidden"}>Descartar mis cambios</button>
      </div>
    </div>`;
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let target = obj;
  for (const k of keys.slice(0, -1)) target = target[k];
  target[keys.at(-1)] = value;
}

function autosize(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
}

function bindEditor() {
  state.root.querySelectorAll("textarea[data-path]").forEach(autosize);
  state.root.querySelectorAll("[data-path]").forEach((el) =>
    el.addEventListener("input", () => {
      if (el.tagName === "TEXTAREA") autosize(el);
      const value = el.dataset.path === "tags" ? el.value.split(",").map((t) => t.trim()).filter(Boolean) : el.value;
      setPath(state.draft, el.dataset.path, value);
      if (!state.dirty) {
        state.dirty = true;
        state.root.querySelector("#approve-label").textContent = "Guardar y aprobar";
        state.root.querySelector('[data-act="discard"]').hidden = false;
      }
      state.root.querySelector("#stats").innerHTML = statsHtml(state.draft);
    }),
  );
}

// ---------- Panel y dibujo ----------

function panelHtml() {
  if (state.tab === "log")
    return `<section class="card"><div class="core"><h2>Registro de la producción</h2>${logList(state.detail.logs.slice().reverse(), { tall: true })}</div></section>`;
  // Agentes que esta versión no puede ejecutar (voz y video en la versión online).
  const agent = store.status?.agents.find((a) => a.id === state.tab);
  if (agent && !agent.implemented)
    return `<div class="banner info">${icon("info")}<div><strong>${esc(agent.name)}: no disponible en esta versión.</strong>
      <p>${esc(agent.name)} ${esc(agent.unavailableReason ?? `llega en la fase ${agent.phase}`)}.</p></div></div>`;
  const task = taskOf(state.tab);
  if (!task)
    return `<div class="card"><div class="core empty"><strong>Este agente no forma parte de esta producción.</strong>Se creó antes de que existiera. Lanza un video nuevo para usarlo.</div></div>`;
  const block = taskStatusBlock(task);
  if (task.agentId === "producer") {
    if (!task.output?.video || ["pending", "running"].includes(task.status)) return block;
    return block + videoHtml(task, { productionId: state.id, description: taskOf("scriptwriter")?.output?.description ?? "" });
  }
  if (task.agentId === "thumbnail-designer") {
    if (!task.output || ["pending", "running"].includes(task.status)) return block;
    return block + thumbnailsHtml(task, thumbContext());
  }
  if (task.agentId === "narrator") {
    if (["pending", "running"].includes(task.status)) return block;
    return block + narrationHtml(task, { productionId: state.id, current: state.detail.narration ?? {} });
  }
  if (!task.output || ["pending", "running"].includes(task.status)) return block;
  // Fallidas con resultado: se muestra el error y debajo lo que produjo.
  const content =
    task.agentId === "trend-researcher"
      ? researchHtml(task)
      : task.agentId === "audience-analyst"
        ? audienceHtml(task)
        : task.status === "awaiting_approval"
          ? scriptEditor(task)
          : scriptReadOnly(task);
  return block + content;
}

// Datos para la vista «así se verá en YouTube».
function thumbContext() {
  const narration = taskOf("narrator")?.output;
  const script = taskOf("scriptwriter")?.output;
  return {
    title: state.detail.production.title,
    channel: state.detail.channel?.name ?? "",
    seconds: narration?.full?.duration ?? script?.estimatedSeconds ?? null,
  };
}

function drawPanel() {
  const task = taskOf(state.tab);
  if (task?.agentId === "scriptwriter" && task.status === "awaiting_approval" && !state.draft) {
    state.draft = structuredClone(task.output);
    state.dirty = false;
  }
  state.signature = sig(task);
  const panel = state.root.querySelector("#panel");
  panel.innerHTML = panelHtml();
  if (state.draft && task?.status === "awaiting_approval" && task.agentId === "scriptwriter") bindEditor();
  if (state.tab === "narrator") bindNarration(panel);
  if (state.tab === "producer") bindVideo(panel);
  if (state.tab === "thumbnail-designer" && task?.output && !["pending", "running"].includes(task.status))
    bindThumbnails(panel, task, {
      productionId: state.id,
      onDirty: (dirty) => (state.dirty = dirty),
      onDone: async (what) => {
        if (what === "reload") {
          await load();
          drawAll();
        } else drawPanel();
      },
    });
}

function drawAll() {
  state.root.innerHTML = `${headerHtml()}<div id="line">${lineHtml()}</div><div id="tabs">${tabsHtml()}</div><div id="panel"></div>`;
  drawPanel();
  revealTab();
}

async function selectTab(tab) {
  if (state.dirty && tab !== state.tab && !(await askConfirm(UNSAVED))) return;
  if (tab !== state.tab) {
    state.draft = null;
    state.dirty = false;
    resetThumbnailEditor();
  }
  state.tab = tab;
  state.root.querySelector("#line").innerHTML = lineHtml();
  state.root.querySelector("#tabs").innerHTML = tabsHtml();
  revealTab();
  drawPanel();
}

async function load() {
  state.detail = await api("GET", `/api/productions/${state.id}`);
}

// Llega un evento: se actualiza todo menos el editor con cambios sin guardar.
const refresh = debounce(async () => {
  if (!state.root) return;
  try {
    await load();
  } catch {
    return;
  }
  const header = state.root.querySelector(".page-head");
  if (!header) return;
  const tmp = document.createElement("div");
  tmp.innerHTML = headerHtml();
  state.root.querySelector(".back").replaceWith(tmp.querySelector(".back"));
  header.replaceWith(tmp.querySelector(".page-head"));
  if (state.follow && !state.dirty && defaultTab() !== state.tab) {
    state.tab = defaultTab();
    state.root.querySelector("#tabs").innerHTML = tabsHtml();
    revealTab();
  }
  state.root.querySelector("#line").innerHTML = lineHtml();
  const task = taskOf(state.tab);
  if (state.tab === "log" || (sig(task) !== state.signature && !state.dirty)) {
    if (task?.status !== "awaiting_approval") state.draft = null;
    drawPanel();
  }
}, 250);

async function act(button) {
  const { act: action, task: taskId } = button.dataset;
  button.disabled = true;
  try {
    if (action === "export") {
      const pkg = buildPackage(state.detail);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
      try {
        await saveFile(blob, packageFilename(pkg));
        toast("Paquete exportado. Mándamelo en el chat y te devuelvo el video.");
      } catch (err) {
        if (err?.code !== "declined") throw err;
      }
      return;
    } else if (action === "cancel") {
      await api("POST", `/api/productions/${state.id}/cancel`);
      toast("Producción cancelada.");
    } else if (action === "delete") {
      const ok = await askConfirm({ title: "¿Eliminar esta producción?", body: "Se borra todo su contenido. No se puede deshacer.", confirmLabel: "Eliminar", danger: true });
      if (!ok) return;
      await api("DELETE", `/api/productions/${state.id}`);
      toast("Producción eliminada.");
      location.hash = "#producciones";
      return;
    } else if (action === "retry") {
      await api("POST", `/api/tasks/${taskId}/retry`);
      toast("Tarea de nuevo en la cola.");
    } else if (action === "discard") {
      state.draft = null;
      state.dirty = false;
      drawPanel();
      return;
    } else if (action === "remount") {
      await remount(state.root, state.id, taskId);
      toast("Montando el video de nuevo…");
    } else if (action === "revoice") {
      await revoice(state.root, state.id, taskId);
      toast("Generando la narración con la nueva voz…");
    } else if (action === "approve") {
      const body = state.dirty ? { output: state.draft } : {};
      await api("POST", `/api/tasks/${taskId}/approve`, body);
      state.draft = null;
      state.dirty = false;
      const agentId = state.detail.tasks.find((t) => t.id === taskId)?.agentId;
      toast({ narrator: "Narración aprobada.", producer: "Video final aprobado." }[agentId] ?? "Guion aprobado.");
    }
    await load();
    drawAll();
  } catch (err) {
    const details = Array.isArray(err.details) ? ` ${err.details.join(" · ")}` : "";
    toast(err.message + details, "error");
  } finally {
    button.disabled = false;
  }
}

export const productionView = {
  async render(root, [id]) {
    Object.assign(state, { root, id, detail: null, draft: null, dirty: false, tab: null, follow: true });
    await Promise.all([load(), store.status?.tts?.ok ? loadVoices() : null]);
    state.tab = defaultTab();
    drawAll();
    root.onclick = (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) {
        e.preventDefault();
        state.follow = false;
        return selectTab(tab.dataset.tab);
      }
      const button = e.target.closest("button[data-act]");
      if (button) act(button);
    };
    root.onsubmit = async (e) => {
      const form = e.target.closest("form.changes");
      if (!form) return;
      e.preventDefault();
      const notes = form.notes.value.trim();
      if (!notes) return toast("Escribe qué quieres cambiar.", "error");
      try {
        await api("POST", `/api/tasks/${form.dataset.task}/changes`, { notes });
        state.draft = null;
        state.dirty = false;
        toast("Enviado. El agente rehace su trabajo con tus notas.");
        await load();
        drawAll();
      } catch (err) {
        toast(err.message, "error");
      }
    };
    window.onbeforeunload = () => (state.dirty ? true : undefined);
  },
  onEvent(event) {
    const p = event.payload;
    if ((p?.productionId ?? p?.id) === state.id) refresh();
  },
  // La confirmación es asíncrona: se cancela la navegación y, si confirma, se repite.
  canLeave(target) {
    if (!state.dirty) return true;
    askConfirm(UNSAVED).then((ok) => {
      if (!ok) return;
      state.dirty = false;
      location.hash = target;
    });
    return false;
  },
  leave() {
    state.root.onclick = null;
    state.root.onsubmit = null;
    window.onbeforeunload = null;
    state.root = null;
  },
};
