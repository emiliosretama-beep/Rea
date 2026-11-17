// Utilidades de la interfaz. Todo texto que viene de la IA, de la web o del
// usuario pasa por esc() antes de llegar al HTML; los enlaces, por safeUrl().

export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// En la versión online no hay servidor: un "backend" local (src/cloud/boot.js)
// responde las mismas rutas dentro de la página.
export const backend = () => globalThis.__ERA_BACKEND__ ?? null;

export async function api(method, path, body) {
  const local = backend();
  if (local) {
    try {
      return await local.request(method, path, body);
    } catch (err) {
      throw new ApiError(err.message || "Error inesperado.", err.status ?? 500, err.details);
    }
  }
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No hay conexión con el servidor de ERA Factory. ¿Está encendido?", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Error ${res.status}`, res.status, data.details);
  return data;
}

// Confirmación dentro de la página (claude.ai no muestra confirm()).
// Resuelve true si la persona confirma.
export function askConfirm({ title, body = "", confirmLabel = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-t" aria-describedby="modal-b">
      <h2 id="modal-t">${esc(title)}</h2>${body ? `<p id="modal-b" class="muted">${esc(body)}</p>` : ""}
      <div class="actions"><button class="btn ${danger ? "danger" : "primary"}" data-ok>${esc(confirmLabel)}</button>
      <button class="btn ghost" data-cancel>Cancelar</button></div></div>`;
    const close = (value) => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
      resolve(value);
    };
    const onKey = (e) => e.key === "Escape" && close(false);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-cancel]")) close(false);
      else if (e.target.closest("[data-ok]")) close(true);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(wrap);
    wrap.querySelector("[data-cancel]").focus();
  });
}

// Entrega un archivo generado en la página. En claude.ai pasa por su diálogo
// de descarga (capability downloads); con el servidor, descarga directa.
export async function saveFile(blob, filename) {
  if (backend()) {
    const downloads = await globalThis.claude?.use?.("downloads").catch(() => null);
    if (!downloads) throw new Error("Esta vista no permite descargar archivos.");
    await downloads.save({ filename, data: blob });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function toast(message, kind = "info") {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => el.remove(), kind === "error" ? 7000 : 3800);
}

// Iconos de trazo fino (24×24, stroke 1.5).
const P = {
  centro: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>',
  canales: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>',
  producciones: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>',
  agentes: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.6A4.5 4.5 0 0 1 21 19"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  retry: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4h4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  play: '<path d="M7 4.8v14.4L19 12z"/>',
  // Un icono por agente
  "trend-researcher": '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/><path d="M7.5 12 10 9.5l1.8 1.8L14 9"/>',
  "audience-analyst": '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  scriptwriter: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
  narrator: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  "thumbnail-designer": '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m21 15.5-5-4.5-8.5 8"/>',
  producer: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  "performance-analyst": '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
};

export const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;

export const STATUS_LABEL = {
  pending: "En cola",
  queued: "En cola",
  running: "Trabajando",
  awaiting_approval: "Espera tu aprobación",
  done: "Terminado",
  completed: "Completada",
  failed: "Falló",
  cancelled: "Cancelada",
  planned: "Planificado",
};

export const pill = (status, label) => `<span class="pill st-${esc(status)}">${esc(label ?? STATUS_LABEL[status] ?? status)}</span>`;

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "ahora";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export const clock = (iso) => new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

export const minutes = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const number = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-MX"));
