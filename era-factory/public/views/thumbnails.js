// Pestaña «Miniaturas»: comparar las 10 propuestas, ver cómo quedan en el
// feed de YouTube, editar la elegida en vivo, descargarla y aprobarla.
import { BACKGROUNDS, ICONS, LAYOUT_NAMES, LIMITS, PALETTES, checkSpec, clean } from "../thumbs/catalog.js";
import { drawThumbnail, ensureFonts, thumbnailBlob } from "../thumbs/render.js";
import { api, esc, icon, minutes, saveFile, toast } from "../lib.js";

// Edición en curso (sobrevive a los redibujos por eventos en vivo).
const edit = { taskId: null, selected: null, draft: null };
export const isEditingThumbnail = () => edit.draft !== null;
export function resetThumbnailEditor() {
  Object.assign(edit, { taskId: null, selected: null, draft: null });
}

const options = (entries, value) =>
  entries.map(([k, label]) => `<option value="${esc(k)}"${k === value ? " selected" : ""}>${esc(label)}</option>`).join("");

function feedPreview(spec, { title, channel, seconds }) {
  return `<div class="feed">
    <div class="feed-main"><div class="thumb-frame"><canvas width="640" height="360" data-spec="final"></canvas>
      ${seconds ? `<span class="feed-time mono">${minutes(seconds)}</span>` : ""}</div>
      <div class="feed-meta"><strong>${esc(title)}</strong><span>${esc(channel)}</span></div></div>
    <div class="feed-small"><div class="thumb-frame small"><canvas width="336" height="189" data-spec="final"></canvas></div>
      <span class="muted">Tamaño de «videos sugeridos»: si aquí se lee, funciona.</span></div>
  </div>`;
}

function gridHtml(task) {
  const o = task.output;
  const rank = new Map(o.recommended.map((r, i) => [r.index, { place: i + 1, reason: r.reason }]));
  return `<div class="thumb-grid">${o.proposals
    .map((p, i) => {
      const r = rank.get(i);
      const chosen = o.selected === i;
      return `<article class="thumb-card${r ? " recommended" : ""}${chosen ? " chosen" : ""}">
        <div class="thumb-frame"><canvas width="640" height="360" data-proposal="${i}" aria-label="Miniatura ${i + 1}: ${esc(p.spec.headline)}"></canvas></div>
        <div class="thumb-info">
          <div class="thumb-title"><strong>${i + 1}. ${esc(p.concept)}</strong>${
            r ? `<span class="pill st-running">Recomendada ${r.place}</span>` : chosen ? `<span class="pill st-done">Elegida</span>` : ""
          }</div>
          <p class="muted">${esc(r ? r.reason : p.rationale)}</p>
          ${task.status === "awaiting_approval" ? `<button class="btn small" data-th="choose" data-index="${i}">${icon("edit")}Elegir y editar</button>` : ""}
        </div></article>`;
    })
    .join("")}</div>`;
}

function editorHtml(task, context) {
  const d = edit.draft;
  const words = d.headline.split(/\s+/).filter(Boolean);
  return `
    <section class="card"><div class="core">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0">Editar la miniatura ${edit.selected + 1}</h2>
        <button class="btn small ghost" data-th="back">${icon("back")}Ver las 10</button>
      </div>
      <div class="th-sticky"><div class="thumb-frame"><canvas width="640" height="360" data-spec="final" aria-label="Vista previa"></canvas></div></div>
      <p class="form-error" id="th-error" hidden></p>
      <div class="form-grid">
        <div class="field full"><label for="th-headline">Titular <span class="mono muted" id="th-count"></span></label>
          <input type="text" id="th-headline" data-field="headline" maxlength="${LIMITS.headlineChars}" value="${esc(d.headline)}" />
          <span class="hint">Máximo ${LIMITS.headlineWords} palabras. Que se entienda en medio segundo.</span></div>
        <div class="field"><label for="th-accent">Palabra resaltada</label>
          <select id="th-accent" data-field="accentWord"><option value="">Ninguna</option>${words
            .map((w) => `<option value="${esc(w)}"${clean(w) === clean(d.accentWord) ? " selected" : ""}>${esc(w)}</option>`)
            .join("")}</select></div>
        <div class="field"><label for="th-badge">Etiqueta</label>
          <input type="text" id="th-badge" data-field="badge" maxlength="${LIMITS.badgeChars}" value="${esc(d.badge)}" placeholder="Opcional" /></div>
        <div class="field full"><label for="th-subline">Línea secundaria</label>
          <input type="text" id="th-subline" data-field="subline" maxlength="${LIMITS.sublineChars}" value="${esc(d.subline)}" placeholder="Opcional" /></div>
        <div class="field"><label for="th-layout">Diseño</label><select id="th-layout" data-field="layout">${options(Object.entries(LAYOUT_NAMES), d.layout)}</select></div>
        <div class="field"><label for="th-background">Fondo</label><select id="th-background" data-field="background">${options(Object.entries(BACKGROUNDS), d.background)}</select></div>
        <div class="field"><label for="th-icon">Icono</label><select id="th-icon" data-field="icon">${options(
          Object.entries(ICONS).map(([k, v]) => [k, v.label]),
          d.icon,
        )}</select></div>
        <div class="field full"><span class="label-like">Paleta</span><div class="swatches" role="radiogroup" aria-label="Paleta">${Object.entries(PALETTES)
          .map(
            ([k, p]) => `<button type="button" class="swatch" role="radio" aria-checked="${k === d.palette}" data-palette="${k}" title="${esc(p.label)}"
              style="background:linear-gradient(135deg, ${p.bg1} 0 55%, ${p.accent} 55% 100%)"><span class="sr-only">${esc(p.label)}</span></button>`,
          )
          .join("")}</div></div>
      </div>
      <h3 style="margin-top:6px">Así se verá en YouTube</h3>
      ${feedPreview(d, context)}
      <div class="actions"><button class="btn" data-th="download">${icon("play")}Descargar PNG 1280×720</button></div>
    </div></section>
    <div class="decision-bar" role="region" aria-label="Decisión"><div class="actions">
      <button class="btn ok" data-th="approve">${icon("check")}Aprobar esta miniatura</button></div></div>`;
}

export function thumbnailsHtml(task, context) {
  const o = task.output;
  if (edit.taskId !== task.id) resetThumbnailEditor();
  if (task.status === "awaiting_approval" && edit.draft) return editorHtml(task, context);
  const intro =
    task.status === "awaiting_approval"
      ? `<section class="card"><div class="core"><h2>Elige tu miniatura</h2>
          <p class="muted">${o.proposals.length} propuestas. Las recomendadas van marcadas. Toca «Elegir y editar» en la que más te guste: podrás cambiar textos, colores y diseño antes de aprobarla.</p>
          <p class="muted" style="font-size:12.5px">Son composiciones gráficas (tipografía, icono y color). No incluyen fotos.</p></div></section>`
      : o.final
        ? `<section class="card"><div class="core"><h2>Miniatura aprobada</h2>${feedPreview(o.final, context)}
            <div class="actions"><button class="btn" data-th="download">${icon("play")}Descargar PNG 1280×720</button></div></div></section>`
        : "";
  return `${intro}<section class="card"><div class="core"><h2>${task.status === "awaiting_approval" ? "Las propuestas" : "Todas las propuestas"}</h2>${gridHtml(task)}</div></section>`;
}

// Dibuja los canvas de la pestaña y conecta el editor.
export async function bindThumbnails(root, task, { productionId, onDirty, onDone }) {
  await ensureFonts();
  const o = task.output;
  const finalSpec = () => edit.draft ?? o.final;
  const paint = () => {
    root.querySelectorAll("canvas[data-proposal]").forEach((c) => drawThumbnail(c, o.proposals[Number(c.dataset.proposal)].spec));
    const f = finalSpec();
    if (f) root.querySelectorAll('canvas[data-spec="final"]').forEach((c) => drawThumbnail(c, f));
  };
  paint();

  const showProblems = () => {
    const problems = checkSpec(edit.draft);
    const box = root.querySelector("#th-error");
    if (box) {
      box.hidden = !problems.length;
      box.textContent = problems.length ? `Revisa: ${problems.join("; ")}.` : "";
    }
    const count = root.querySelector("#th-count");
    if (count) {
      const n = edit.draft.headline.split(/\s+/).filter(Boolean).length;
      count.textContent = `${n}/${LIMITS.headlineWords} palabras`;
    }
    return problems;
  };
  if (edit.draft) showProblems();

  root.querySelectorAll("[data-field]").forEach((el) =>
    el.addEventListener("input", () => {
      edit.draft[el.dataset.field] = el.value;
      if (el.dataset.field === "headline") {
        // La palabra resaltada debe seguir existiendo en el titular.
        const words = el.value.split(/\s+/).filter(Boolean);
        if (!words.some((w) => clean(w) === clean(edit.draft.accentWord))) edit.draft.accentWord = "";
        root.querySelector("#th-accent").innerHTML =
          `<option value="">Ninguna</option>` +
          words.map((w) => `<option value="${esc(w)}"${clean(w) === clean(edit.draft.accentWord) ? " selected" : ""}>${esc(w)}</option>`).join("");
      }
      onDirty(true);
      showProblems();
      paint();
    }),
  );
  root.querySelectorAll("[data-palette]").forEach((b) =>
    b.addEventListener("click", () => {
      edit.draft.palette = b.dataset.palette;
      root.querySelectorAll("[data-palette]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      onDirty(true);
      paint();
    }),
  );

  root.querySelectorAll("[data-th]").forEach((b) =>
    b.addEventListener("click", async () => {
      const action = b.dataset.th;
      if (action === "choose") {
        const i = Number(b.dataset.index);
        Object.assign(edit, { taskId: task.id, selected: i, draft: structuredClone(o.proposals[i].spec) });
        onDirty(true);
        onDone("redraw");
        root.scrollIntoView({ block: "start" });
      } else if (action === "back") {
        resetThumbnailEditor();
        onDirty(false);
        onDone("redraw");
      } else if (action === "download") {
        b.disabled = true;
        try {
          const blob = await thumbnailBlob(finalSpec());
          await saveFile(blob, `miniatura-${productionId.slice(0, 8)}.png`);
        } catch (err) {
          if (err?.code !== "declined") toast(err.message || "No se pudo descargar.", "error");
        } finally {
          b.disabled = false;
        }
      } else if (action === "approve") {
        if (showProblems().length) return toast("Corrige la miniatura antes de aprobarla.", "error");
        b.disabled = true;
        try {
          await api("POST", `/api/tasks/${task.id}/approve`, { output: { ...o, selected: edit.selected, final: edit.draft } });
          resetThumbnailEditor();
          onDirty(false);
          toast("Miniatura aprobada.");
          onDone("reload");
        } catch (err) {
          const details = Array.isArray(err.details) ? ` ${err.details.join(" · ")}` : "";
          toast(err.message + details, "error");
          b.disabled = false;
        }
      }
    }),
  );
}
