// Canales: crear y editar canales, y lanzar la producción de un video.
import { ApiError, api, askConfirm, esc, icon, toast } from "../lib.js";
import { store } from "../store.js";
import { FORMATS, formatOf } from "../formats.js";

const FIELDS = [
  {
    key: "format",
    label: "Formato de los videos",
    type: "select",
    options: Object.entries(FORMATS).map(([value, f]) => [value, f.label]),
    full: true,
  },
  { key: "name", label: "Nombre del canal", placeholder: "Ej.: Tecnología en 8 minutos", max: 80 },
  { key: "niche", label: "Temática o nicho", placeholder: "Ej.: inteligencia artificial para estudiantes", max: 200 },
  { key: "language", label: "Idioma", placeholder: "Español", max: 40, list: "langs" },
  {
    key: "frequency",
    label: "Frecuencia de publicación",
    type: "select",
    options: ["1 por semana", "2 por semana", "3 por semana", "Diario", "Cada 15 días", "1 al mes"],
  },
  { key: "audience", label: "Público objetivo", placeholder: "Ej.: estudiantes de prepa y universidad en México que quieren usar IA sin complicarse", type: "textarea", max: 400, full: true },
  { key: "videoType", label: "Tipo de videos", placeholder: "Ej.: datos curiosos de 30 s con texto grande", max: 200, full: true },
];

function fieldHtml(f, value = "") {
  const id = `f-${f.key}`;
  let control;
  if (f.type === "textarea")
    control = `<textarea id="${id}" name="${f.key}" maxlength="${f.max}" placeholder="${esc(f.placeholder)}" required>${esc(value)}</textarea>`;
  else if (f.type === "select") {
    // Opciones: texto simple, o [valor, etiqueta] cuando difieren.
    const opts = f.options.map((o) => (Array.isArray(o) ? o : [o, o]));
    control = `<select id="${id}" name="${f.key}">${opts
      .map(([v, l]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`)
      .join("")}${value && !opts.some(([v]) => v === value) ? `<option selected>${esc(value)}</option>` : ""}</select>`;
  } else
    control = `<input type="text" id="${id}" name="${f.key}" maxlength="${f.max}" placeholder="${esc(f.placeholder)}" value="${esc(value)}" required${f.list ? ` list="${f.list}"` : ""} />`;
  return `<div class="field${f.full ? " full" : ""}"><label for="${id}">${esc(f.label)}</label>${control}</div>`;
}

function formHtml(channel) {
  return `
    <a class="back" href="#canales">${icon("back")}Canales</a>
    <header class="page-head"><div><h1>${channel ? "Editar canal" : "Nuevo canal"}</h1>
      <p>Con esto el equipo sabe para quién trabaja. Cuanto más concreto sea el público, mejores ideas.</p></div></header>
    <section class="card"><div class="core">
      <form id="channel-form" novalidate>
        <div class="form-grid">${FIELDS.map((f) => fieldHtml(f, channel?.[f.key] ?? { language: "Español", format: "short" }[f.key] ?? "")).join("")}</div>
        <datalist id="langs"><option>Español</option><option>Inglés</option><option>Portugués</option><option>Francés</option></datalist>
        <p class="form-error" id="form-error" hidden></p>
        <div class="actions">
          <button class="btn primary" type="submit">${icon("check")}${channel ? "Guardar cambios" : "Crear canal"}</button>
          <a class="btn ghost" href="#canales">Cancelar</a>
        </div>
      </form>
    </div></section>`;
}

function channelCard(c) {
  return `<section class="card"><div class="core">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div style="min-width:0"><h2 style="margin:0">${esc(c.name)}</h2>
        <p class="muted" style="margin:4px 0 0">${esc(c.niche)} · ${esc(c.language)} · ${esc(c.frequency)}</p>
        <span class="pill ${c.format === "short" ? "st-running" : "st-pending"}" style="margin-top:8px">${esc(formatOf(c).label)}</span></div>
      <a class="btn small ghost" href="#canal-${esc(c.id)}" aria-label="Editar ${esc(c.name)}">${icon("edit")}</a>
    </div>
    <p style="margin:10px 0 14px;font-size:14px">${esc(c.audience)}</p>
    <form class="produce" data-channel="${esc(c.id)}">
      <div class="field" style="margin-bottom:10px">
        <label for="topic-${esc(c.id)}">Tema concreto (opcional)</label>
        <input type="text" id="topic-${esc(c.id)}" name="topicHint" maxlength="300" placeholder="Déjalo vacío y el investigador propone el tema" />
      </div>
      <details class="field" style="margin-bottom:12px"${store.status?.llm.webSearch ? "" : " open"}>
        <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--suave)">Material de investigación (opcional)</summary>
        <textarea id="material-${esc(c.id)}" name="material" rows="4" maxlength="6000" style="margin-top:8px"
          placeholder="Pega enlaces o títulos que hayas visto: videos de YouTube que funcionan, noticias, preguntas de tu público. Uno por línea."></textarea>
        <span class="hint">${
          store.status?.llm.webSearch
            ? "Se suma a la búsqueda web del investigador."
            : "Esta versión no busca en internet: lo que pegues aquí son las fuentes reales del investigador. Sin material, las ideas salen del conocimiento general de Claude."
        }</span>
      </details>
      <button class="btn primary" type="submit">${icon("play")}Producir un video</button>
    </form>
  </div></section>`;
}

async function drawList(root) {
  const channels = await api("GET", "/api/channels");
  root.innerHTML = `
    <header class="page-head"><div><h1>Canales</h1><p>Cada canal tiene su nicho y su público. Lanza un video y el equipo se pone a trabajar.</p></div>
      <a class="btn primary" href="#canales-nuevo">${icon("plus")}Nuevo canal</a></header>
    ${
      channels.length
        ? `<div class="grid two">${channels.map(channelCard).join("")}</div>`
        : `<section class="card"><div class="core empty"><strong>Aún no tienes canales.</strong><p>Crea uno para empezar a producir.</p>
            <a class="btn primary" href="#canales-nuevo">${icon("plus")}Crear canal</a></div></section>`
    }`;
  root.querySelectorAll("form.produce").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        const production = await api("POST", "/api/productions", {
          channelId: form.dataset.channel,
          topicHint: form.topicHint.value,
          material: form.material.value,
        });
        toast("Producción creada. El investigador empieza ya.");
        location.hash = `#produccion-${production.id}`;
      } catch (err) {
        toast(err.message, "error");
        button.disabled = false;
      }
    }),
  );
}

async function drawForm(root, id) {
  const channel = id ? (await api("GET", "/api/channels")).find((c) => c.id === id) : null;
  if (id && !channel) throw new ApiError("Este canal ya no existe.", 404);
  root.innerHTML = formHtml(channel);
  if (channel) {
    root.querySelector(".actions").insertAdjacentHTML(
      "beforeend",
      `<button class="btn danger ghost" type="button" id="delete">${icon("trash")}Eliminar canal</button>`,
    );
    root.querySelector("#delete").addEventListener("click", async () => {
      const ok = await askConfirm({
        title: `¿Eliminar «${channel.name}»?`,
        body: "También se borran todas sus producciones. No se puede deshacer.",
        confirmLabel: "Eliminar canal",
        danger: true,
      });
      if (!ok) return;
      try {
        await api("DELETE", `/api/channels/${channel.id}`);
        toast("Canal eliminado.");
        location.hash = "#canales";
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
  const form = root.querySelector("#channel-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const error = root.querySelector("#form-error");
    const missing = FIELDS.filter((f) => !String(data[f.key] || "").trim());
    if (missing.length) {
      error.textContent = `Completa: ${missing.map((f) => f.label.toLowerCase()).join(", ")}.`;
      error.hidden = false;
      form.querySelector(`[name="${missing[0].key}"]`).focus();
      return;
    }
    try {
      await api(channel ? "PUT" : "POST", channel ? `/api/channels/${channel.id}` : "/api/channels", data);
      toast(channel ? "Canal actualizado." : "Canal creado.");
      location.hash = "#canales";
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  });
}

export const channelsView = {
  render(root, [sub]) {
    return sub ? drawForm(root, sub === "nuevo" ? null : sub) : drawList(root);
  },
};
