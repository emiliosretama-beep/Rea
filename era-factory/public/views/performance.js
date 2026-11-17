// Pestaña «Resultados» de una producción (fase 5): el usuario copia las cifras
// del video publicado y el analista de rendimiento las convierte en aprendizajes.
// view = { state, taskOf, load, drawAll, drawPanel } de la vista de producción.
import { FIELDS, LEARNING_FOR, PLATFORMS, engagement, formatMetric, parseNumber, resultsSignature, todayLocal } from "../metrics.js";
import { api, esc, icon, timeAgo, toast } from "../lib.js";
import { store } from "../store.js";

export const PERFORMANCE_TAB = "performance-analyst";

const VERDICT = {
  arriba: ["st-done", "Por encima de tu canal"],
  en_linea: ["st-pending", "En la media de tu canal"],
  abajo: ["st-failed", "Por debajo de tu canal"],
  sin_referencia: ["st-planned", "Aún sin videos para comparar"],
};

const ui = { analyzing: null, editing: false };

const ready = (view) => view.state.detail.production.status === "completed" || view.taskOf("scriptwriter")?.status === "done";
const running = (view) =>
  ui.analyzing === view.state.id ||
  (store.status?.activity ?? []).some((a) => a.agentId === PERFORMANCE_TAB && a.productionId === view.state.id);

function nodeState(view) {
  const s = view.state.detail.production.settings ?? {};
  if (running(view)) return ["running", "Analizando…"];
  if (s.analysis) return ["done", "Analizado"];
  if (s.results) return ["pending", "Listo para analizar"];
  return ready(view) ? ["pending", "Esperando métricas"] : ["planned", "Tras publicar"];
}

// Nodo de la línea de producción (no es una tarea de la cadena).
export function performanceNode(view, agent) {
  const [status, sub] = nodeState(view);
  const current = view.state.tab === agent.id ? ' aria-current="step"' : "";
  return `<a class="node ${status}" href="#" data-tab="${agent.id}"${current}><div class="avatar">${icon(agent.id)}</div>
    <div class="grow"><div class="name">${esc(agent.name)}</div><div class="sub">${esc(sub)}</div></div></a>`;
}

const whereToFind = () => `<details class="plain" style="margin:0 0 14px"><summary style="cursor:pointer;font-weight:600;font-size:13.5px">¿Dónde encuentro estas cifras?</summary>
  <ul class="muted" style="margin:10px 0 0;padding-left:18px;font-size:13.5px;display:grid;gap:6px">
    <li><strong>YouTube:</strong> app YouTube Studio → Contenido → el video → Estadísticas. En Shorts mira «Vieron frente a deslizaron».</li>
    <li><strong>TikTok:</strong> abre el video → ··· → Estadísticas. Ahí están el tiempo medio y el % que lo vio completo.</li>
    <li><strong>Instagram:</strong> abre el reel → Ver estadísticas.</li>
    <li>Espera al menos 48 horas: antes las cifras cambian mucho. Solo las vistas son obligatorias.</li></ul></details>`;

function formHtml(results, channel) {
  const m = results?.metrics ?? {};
  const platform = results?.platform ?? (channel?.format === "long" ? "YouTube (video largo)" : "YouTube Shorts");
  const optional = ' <span class="muted" style="font-weight:400">(opcional)</span>';
  const field = (f) => `<div class="field"><label for="pf-${f.k}">${esc(f.label)}${f.req ? "" : optional}</label>
    <input type="text" id="pf-${f.k}" name="${f.k}" inputmode="${f.kind === "int" ? "numeric" : "decimal"}" autocomplete="off" value="${esc(m[f.k] ?? "")}"${f.req ? " required" : ""} />
    ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>`;
  const group = (title, grp) =>
    `<fieldset class="pf-grupo"><legend>${title}</legend><div class="form-grid">${FIELDS.filter((f) => f.grp === grp).map(field).join("")}</div></fieldset>`;
  return `<form id="pf-form" novalidate>
    <div class="form-grid">
      <div class="field"><label for="pf-platform">Plataforma</label><select id="pf-platform" name="platform">${PLATFORMS.map((p) => `<option${p === platform ? " selected" : ""}>${esc(p)}</option>`).join("")}</select></div>
      <div class="field"><label for="pf-date">Fecha de publicación</label><input type="date" id="pf-date" name="publishedAt" value="${esc(results?.publishedAt ?? "")}" max="${todayLocal()}" /></div>
    </div>
    ${group("Alcance", "alcance")}${group("Retención", "retencion")}${group("Interacción", "interaccion")}
    <div class="field"><label for="pf-notes">Notas${optional}</label>
      <textarea id="pf-notes" name="notes" maxlength="1500" rows="3" placeholder="Ej.: lo publiqué a las 9 pm; en los comentarios pidieron una parte 2.">${esc(results?.notes ?? "")}</textarea></div>
    <p class="form-error" id="pf-error" hidden></p>
    <div class="actions"><button class="btn primary" type="submit" data-pf="analyze">${icon("performance-analyst")}Guardar y analizar</button>
      <button class="btn ghost" type="submit" data-pf="save">Solo guardar</button>
      ${results ? '<button class="btn ghost" type="button" data-pf="cancel-edit">Cancelar</button>' : ""}</div>
  </form>`;
}

function metricsSummary(r) {
  const e = engagement(r.metrics);
  const date = r.publishedAt
    ? ` · publicado el ${esc(new Date(`${r.publishedAt}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" }))}`
    : "";
  return `<div class="pf-cifras">${FIELDS.filter((f) => r.metrics[f.k] != null)
    .map((f) => `<div><b>${esc(formatMetric(f.k, r.metrics[f.k]))}</b><span>${esc(f.label)}</span></div>`)
    .join("")}${e != null ? `<div><b>${esc(formatMetric("engage", e))}</b><span>Interacción</span></div>` : ""}</div>
  <p class="src" style="margin:10px 0 0">${esc(r.platform)}${date}${r.notes ? ` · ${esc(r.notes)}` : ""}</p>`;
}

function analysisHtml(a, results) {
  const [cls, label] = VERDICT[a.verdict] ?? VERDICT.sin_referencia;
  const b = a.baseline;
  const stale = a.basedOn !== resultsSignature(results);
  const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : '<p class="muted" style="margin:0">—</p>');
  const table = b?.rows?.length
    ? `<div class="table-wrap" style="margin:12px 0"><table><thead><tr><th>Métrica</th><th class="num">Este video</th><th class="num">Mediana del canal</th></tr></thead><tbody>${b.rows
        .map((r) => {
          const dir = r.actual > r.mediana ? " pf-sube" : r.actual < r.mediana ? " pf-baja" : "";
          return `<tr><td>${esc(r.label)}</td><td class="num${dir}">${esc(formatMetric(r.k, r.actual))}</td><td class="num">${esc(formatMetric(r.k, r.mediana))}</td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : "";
  return `<section class="card"><div class="core">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">Lo que dice el analista</h2><span class="pill ${cls}">${esc(label)}</span></div>
    <p class="src" style="margin:6px 0 12px">${esc(timeAgo(a.analyzedAt))}${b?.n ? ` · comparado con ${b.n} video${b.n > 1 ? "s" : ""} del canal${b.samePlatform ? " en la misma plataforma" : ""}` : ""}</p>
    ${stale ? `<div class="banner warn">${icon("alert")}<div><strong>Cambiaste las métricas después de este análisis.</strong><p>Vuelve a analizar para actualizar los aprendizajes del equipo.</p></div></div>` : ""}
    <p>${esc(a.summary)}</p>${table}
    <div class="grid two" style="margin-top:12px"><div class="plain pf-bien"><h3>Funcionó</h3>${list(a.worked)}</div><div class="plain pf-mal"><h3>No funcionó o falta medir</h3>${list(a.didnt)}</div></div>
  </div></section>
  <section class="card"><div class="core"><h2>Aprendizajes enviados al equipo</h2>
    <p class="muted" style="font-size:13.5px">Los agentes los leen en los próximos videos de este canal.</p>
    <div class="list">${a.learnings
      .map((l) => `<div class="claim respaldado"><span class="chip" style="justify-self:start">→ ${esc(LEARNING_FOR[l.for] ?? l.for)}</span><span>${esc(l.text)}</span><span class="src">${esc(l.evidence)}</span></div>`)
      .join("")}</div>
    <h3 style="margin-top:16px">Prueba en el próximo video</h3><p style="margin:0">${esc(a.nextTest)}</p>
  </div></section>`;
}

export function performancePanel(view) {
  const { production, channel } = view.state.detail;
  const { results, analysis } = production.settings ?? {};
  if (!ready(view))
    return `<div class="banner info">${icon("info")}<div><strong>Primero termina la producción.</strong><p>Cuando publiques el video, vuelve aquí con sus métricas y el analista te dirá qué funcionó.</p></div></div>`;
  if (running(view))
    return `<section class="card"><div class="core"><h2>El analista está revisando las cifras…</h2><p class="muted">Tarda unos segundos. Puedes salir de esta página: el resultado se guarda solo.</p><div class="skeleton" style="height:80px;margin-top:12px"></div></div></section>`;
  const numbers =
    results && !ui.editing
      ? `<section class="card"><div class="core"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">Métricas del video</h2>
      <div class="actions"><button class="btn small ghost" type="button" data-pf="edit">${icon("edit")}Editar</button><button class="btn small${analysis ? " ghost" : " primary"}" type="button" data-pf="reanalyze">${icon("retry")}${analysis ? "Volver a analizar" : "Analizar"}</button></div></div>
      <div style="margin-top:12px">${metricsSummary(results)}</div></div></section>`
      : `<section class="card"><div class="core"><h2>${results ? "Editar métricas" : "¿Cómo le fue al video?"}</h2>
      <p class="muted">${results ? "Corrige las cifras y vuelve a analizar." : "Copia las cifras del video publicado. El analista las compara con tus otros videos y le pasa al equipo lo que aprendió."}</p>
      ${whereToFind()}${formHtml(results, channel)}</div></section>`;
  return (analysis ? analysisHtml(analysis, results) : "") + numbers;
}

async function launch(view) {
  const id = view.state.id;
  ui.analyzing = id;
  view.drawAll();
  try {
    await api("POST", `/api/productions/${id}/analyze`);
    toast("Análisis listo. El equipo ya tiene los aprendizajes.");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    ui.analyzing = null;
    if (view.state.root && view.state.id === id) {
      await view.load().catch(() => {});
      view.drawAll();
    }
  }
}

export function bindPerformance(panel, view) {
  panel.querySelector('[data-pf="edit"]')?.addEventListener("click", () => {
    ui.editing = true;
    view.drawPanel();
  });
  panel.querySelector('[data-pf="cancel-edit"]')?.addEventListener("click", () => {
    ui.editing = false;
    view.state.dirty = false;
    view.drawPanel();
  });
  panel.querySelector('[data-pf="reanalyze"]')?.addEventListener("click", () => launch(view));
  const form = panel.querySelector("#pf-form");
  if (!form) return;
  form.addEventListener("input", () => (view.state.dirty = true));
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const mode = ev.submitter?.dataset.pf ?? "analyze";
    const error = panel.querySelector("#pf-error");
    const data = Object.fromEntries(new FormData(form));
    const bad = FIELDS.filter((f) => {
      const n = parseNumber(data[f.k]);
      return Number.isNaN(n) || (f.req && n === null);
    });
    if (bad.length) {
      error.textContent = `Revisa: ${bad.map((f) => f.label.toLowerCase()).join(", ")}. Escribe solo números (puedes usar 1.2k o 3 mil).`;
      error.hidden = false;
      form.querySelector(`[name="${bad[0].k}"]`).focus();
      return;
    }
    error.hidden = true;
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      await api("PUT", `/api/productions/${view.state.id}/results`, data);
      view.state.dirty = false;
      ui.editing = false;
      await view.load();
      if (mode === "save") {
        toast("Métricas guardadas.");
        view.drawAll();
        return;
      }
      await launch(view);
    } catch (err) {
      error.textContent = err.message + (Array.isArray(err.details) ? ` ${err.details.join(" · ")}.` : "");
      error.hidden = false;
      form.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  });
}
