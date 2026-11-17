// Pestaña «Voz» de una producción: escuchar la narración sección por sección
// (sincronizada con el guion), cambiar voz, idioma y velocidad, y aprobar.
import { api, esc, icon, minutes, toast } from "../lib.js";

let catalog = null; // { languages, voices } de /api/voices
export async function loadVoices() {
  catalog ??= await api("GET", "/api/voices").catch(() => null);
  return catalog;
}

const mediaUrl = (productionId, file) => `/media/${encodeURIComponent(productionId)}/${file}`;

function voiceOptions(language, selected) {
  return (catalog?.voices ?? [])
    .filter((v) => v.language === language)
    .map((v) => `<option value="${esc(v.id)}"${v.id === selected ? " selected" : ""}>${esc(v.label)} · voz ${esc(v.gender)}</option>`)
    .join("");
}

// Elegir voz: idioma, voz y velocidad. Sirve también cuando la narración falló.
function settingsCard(task, current) {
  if (!catalog) return "";
  const language = current.language ?? "es";
  const voice = current.voice ?? catalog.languages[language]?.defaultVoice;
  const speed = current.speed ?? 1;
  return `<section class="card"><div class="core">
    <h2>${task.output ? "Cambiar la voz" : "Elige la voz"}</h2>
    <div class="form-grid">
      <div class="field"><label for="nv-lang">Idioma</label>
        <select id="nv-lang">${Object.entries(catalog.languages)
          .map(([code, l]) => `<option value="${esc(code)}"${code === language ? " selected" : ""}>${esc(l.label)}</option>`)
          .join("")}</select></div>
      <div class="field"><label for="nv-voice">Voz</label><select id="nv-voice">${voiceOptions(language, voice)}</select></div>
      <div class="field full"><label for="nv-speed">Velocidad <span class="mono" id="nv-speed-out">${speed.toFixed(2)}×</span></label>
        <input type="range" id="nv-speed" min="0.7" max="1.3" step="0.05" value="${speed}" />
        <span class="hint">Más lento se entiende mejor; más rápido mantiene el ritmo. 1,00× es el natural.</span></div>
    </div>
    <button class="btn" data-act="revoice" data-task="${esc(task.id)}">${icon("retry")}Generar con esta voz</button>
    <p class="hint muted" style="margin:10px 0 0;font-size:12.5px">Narrar tarda más o menos lo mismo que dura el audio.</p>
  </div></section>`;
}

export function narrationHtml(task, { productionId, current }) {
  const o = task.output;
  if (!o) return settingsCard(task, current);
  const language = catalog?.languages[o.language]?.label ?? o.language;
  const offTarget = o.targetSeconds ? ` · objetivo ${minutes(o.targetSeconds)}` : "";
  return `
    <section class="card"><div class="core">
      <h2>Narración</h2>
      <p class="muted" style="margin-bottom:12px">Voz ${esc(o.voiceLabel)} · ${esc(language)} · ${o.speed.toFixed(2)}× · ${minutes(o.full.duration)}${offTarget} · ${esc(o.engine)}</p>
      <div class="narr-player"><audio id="narr-player" controls preload="metadata" src="${esc(mediaUrl(productionId, o.full.file))}"></audio></div>
      <ol class="narr-list">${o.segments
        .map(
          (s) => `<li class="narr-seg" data-start="${s.start}" data-end="${s.end}">
            <div class="narr-head"><button class="btn small ghost" data-seek="${s.start}" aria-label="Escuchar ${esc(s.label)} desde ${minutes(s.start)}">${icon("play")}<span class="mono">${minutes(s.start)}</span></button>
              <strong>${esc(s.label)}</strong></div>
            <p class="prose">${esc(s.text)}</p>
          </li>`,
        )
        .join("")}</ol>
    </div></section>
    ${settingsCard(task, { language: o.language, voice: o.voice, speed: o.speed })}
    ${
      task.status === "awaiting_approval"
        ? `<div class="decision-bar" role="region" aria-label="Decisión"><div class="actions">
            <button class="btn ok" data-act="approve" data-task="${esc(task.id)}">${icon("check")}Aprobar narración</button></div></div>`
        : ""
    }`;
}

export function narrationUnavailableHtml(reason) {
  return `<div class="banner info">${icon("info")}<div><strong>La voz no está disponible en esta versión.</strong>
    <p>El narrador ${esc(reason ?? "necesita la versión con servidor")}. Tu guion aprobado queda listo para narrarlo allí.</p></div></div>`;
}

// Eventos de la pestaña: saltar a una sección, resaltar la que suena y cambiar de voz.
export function bindNarration(root) {
  const player = root.querySelector("#narr-player");
  if (player) {
    const segs = [...root.querySelectorAll(".narr-seg")];
    player.addEventListener("timeupdate", () => {
      const t = player.currentTime;
      for (const li of segs) li.classList.toggle("playing", t >= Number(li.dataset.start) && t < Number(li.dataset.end) + 0.6);
    });
    root.querySelectorAll("[data-seek]").forEach((b) =>
      b.addEventListener("click", () => {
        player.currentTime = Number(b.dataset.seek);
        player.play().catch(() => toast("Toca ▶ en el reproductor para empezar.", "error"));
      }),
    );
  }
  const lang = root.querySelector("#nv-lang");
  if (lang) {
    lang.addEventListener("change", () => {
      root.querySelector("#nv-voice").innerHTML = voiceOptions(lang.value, catalog.languages[lang.value]?.defaultVoice);
    });
    const speed = root.querySelector("#nv-speed");
    speed.addEventListener("input", () => (root.querySelector("#nv-speed-out").textContent = `${Number(speed.value).toFixed(2)}×`));
  }
}

// Guarda la voz elegida en la producción y pide al narrador que la rehaga.
export async function revoice(root, productionId, taskId) {
  const voice = root.querySelector("#nv-voice").value;
  const speed = Number(root.querySelector("#nv-speed").value);
  const label = catalog.voices.find((v) => v.id === voice)?.label ?? voice;
  await api("PUT", `/api/productions/${productionId}/settings`, { narration: { voice, speed } });
  await api("POST", `/api/tasks/${taskId}/changes`, { notes: `Nueva voz: ${label}, velocidad ${speed.toFixed(2)}×` });
}
