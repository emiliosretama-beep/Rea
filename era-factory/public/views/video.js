// Pestaña «Video»: ver el video final, saltar por escenas, descargar MP4 y
// subtítulos, copiar capítulos y descripción para YouTube, volver a montar
// con otros ajustes y aprobar.
import { api, esc, icon, minutes, toast } from "../lib.js";

const mediaUrl = (productionId, file) => `/media/${encodeURIComponent(productionId)}/${file}`;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function copyBlock(id, title, text) {
  return `<div class="copy-block"><div class="copy-head"><h3>${esc(title)}</h3>
    <button class="btn small ghost" data-copy="${id}">Copiar</button></div>
    <pre class="prose mono-block" id="${id}">${esc(text)}</pre></div>`;
}

export function videoHtml(task, { productionId, description }) {
  const o = task.output;
  const v = o.video;
  const chapters = o.chapters?.text ?? "";
  const youtubeDescription = [description, chapters].filter(Boolean).join("\n\n");
  return `
    <section class="card"><div class="core">
      <h2>Video final</h2>
      <p class="muted" style="margin-bottom:12px">${minutes(v.duration)} · ${v.width}×${v.height} · ${mb(v.sizeBytes)} · subtítulos ${o.burnSubtitles ? "incrustados" : "en archivo aparte"}</p>
      <video id="final-video" controls playsinline preload="metadata" poster="${esc(mediaUrl(productionId, o.scenes[0].file))}"
        src="${esc(mediaUrl(productionId, v.file))}"></video>
      <div class="actions" style="margin-top:12px">
        <a class="btn" href="${esc(mediaUrl(productionId, v.file))}" download="video-${esc(productionId.slice(0, 8))}.mp4">${icon("play")}Descargar MP4</a>
        <a class="btn ghost" href="${esc(mediaUrl(productionId, o.subtitles.file))}" download="subtitulos-${esc(productionId.slice(0, 8))}.srt">Descargar subtítulos (.srt)</a>
      </div>
      <p class="hint muted" style="font-size:12.5px;margin:10px 0 0">Sube el .srt en YouTube Studio → Subtítulos. Los tiempos de cada frase son aproximados (±1 s).</p>
    </div></section>
    <section class="card"><div class="core">
      <h2>Escenas <span class="muted mono" style="font-size:13px">${o.scenes.length}</span></h2>
      <p class="muted" style="font-size:13px;margin-top:-6px">Toca una para ir a ese momento.</p>
      <ol class="scene-list">${o.scenes
        .map(
          (s) => `<li><button class="scene" data-seek="${s.start}" aria-label="Ir a ${minutes(s.start)}: ${esc(s.text)}">
            <img src="${esc(mediaUrl(productionId, s.file))}" alt="" loading="lazy" width="192" height="108" />
            <span class="mono">${minutes(s.start)}</span><span class="scene-text">${esc(s.text)}</span></button></li>`,
        )
        .join("")}</ol>
    </div></section>
    <section class="card"><div class="core">
      <h2>Para YouTube</h2>
      ${chapters ? copyBlock("yt-chapters", "Capítulos", chapters) : `<p class="muted">Sin capítulos: ${esc(o.chapters?.reason ?? "")}</p>`}
      ${copyBlock("yt-description", "Descripción completa (con capítulos)", youtubeDescription)}
    </div></section>
    <section class="card"><div class="core">
      <h2>Volver a montar</h2>
      <label class="check"><input type="checkbox" id="vd-burn" ${o.burnSubtitles ? "checked" : ""} />
        <span>Subtítulos incrustados en la imagen <span class="muted">(útil para redes; en YouTube es mejor subir el .srt)</span></span></label>
      <button class="btn" data-act="remount" data-task="${esc(task.id)}" style="margin-top:12px">${icon("retry")}Montar de nuevo</button>
    </div></section>
    ${
      task.status === "awaiting_approval"
        ? `<div class="decision-bar" role="region" aria-label="Decisión"><div class="actions">
            <button class="btn ok" data-act="approve" data-task="${esc(task.id)}">${icon("check")}Aprobar video final</button></div></div>`
        : ""
    }`;
}

export function bindVideo(root) {
  const player = root.querySelector("#final-video");
  root.querySelectorAll("[data-seek]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!player) return;
      player.currentTime = Number(b.dataset.seek);
      player.scrollIntoView({ block: "center", behavior: "smooth" });
      player.play().catch(() => {});
    }),
  );
  root.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      const el = root.querySelector(`#${b.dataset.copy}`);
      try {
        await navigator.clipboard.writeText(el.textContent);
        toast("Copiado.");
      } catch {
        // Sin portapapeles: se selecciona el texto para copiarlo a mano.
        getSelection().selectAllChildren(el);
        toast("Selecciona y copia el texto marcado.", "error");
      }
    }),
  );
}

// Guarda los ajustes de montaje y pide al productor que vuelva a montar.
export async function remount(root, productionId, taskId) {
  const burnSubtitles = root.querySelector("#vd-burn").checked;
  await api("PUT", `/api/productions/${productionId}/settings`, { video: { burnSubtitles } });
  await api("POST", `/api/tasks/${taskId}/changes`, {
    notes: `Montar de nuevo con subtítulos ${burnSubtitles ? "incrustados" : "en archivo aparte"}.`,
  });
}
