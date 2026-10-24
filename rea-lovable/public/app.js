// ERA Studio — lógica del cliente.
// Proyectos y versiones se guardan en localStorage del navegador; las imágenes
// subidas, en IndexedDB (ver assets.js).
import {
  assetsArePersistent,
  deleteProjectAssets,
  isImageFile,
  loadProjectAssets,
  prepareImage,
  putAsset,
  resolveAssets,
  tokenizeDataUris,
} from "./assets.js";
import { createBackend } from "./backend.js";

const STORAGE_KEY = "rea-studio:projects";
const MAX_VERSIONS = 25;
const MAX_IMAGES_PER_MESSAGE = 6;
const $ = (sel) => document.querySelector(sel);

const els = {
  home: $("#home"),
  editor: $("#editor"),
  modeBadge: $("#modeBadge"),
  homeForm: $("#homeForm"),
  homePrompt: $("#homePrompt"),
  chips: $("#chips"),
  projectGrid: $("#projectGrid"),
  projectCount: $("#projectCount"),
  projectName: $("#projectName"),
  messages: $("#messages"),
  chatForm: $("#chatForm"),
  chatInput: $("#chatInput"),
  chatSend: $("#chatSend"),
  chatStop: $("#chatStop"),
  statusText: $("#statusText"),
  selectionChip: $("#selectionChip"),
  selectionLabel: $("#selectionLabel"),
  preview: $("#preview"),
  frameWrap: $("#frameWrap"),
  building: $("#building"),
  buildingText: $("#buildingText"),
  codeArea: $("#codeArea"),
  codeSize: $("#codeSize"),
  versionsBtn: $("#versionsBtn"),
  versionsMenu: $("#versionsMenu"),
  versionLabel: $("#versionLabel"),
  inspectBtn: $("#inspectBtn"),
  auditList: $("#auditList"),
  auditScore: $("#auditScore"),
  fixBtn: $("#fixBtn"),
  attachments: { home: $("#homeAttachments"), chat: $("#chatAttachments") },
  toast: $("#toast"),
};

const state = {
  projects: loadProjects(),
  project: null,
  tab: "preview",
  busy: false,
  controller: null,
  inspecting: false,
  selection: null,
  auditIssues: [],
  backend: null,
  // Imágenes listas para enviar con el próximo mensaje, por caja de texto.
  pending: { home: [], chat: [] },
  // id -> data URI de las imágenes del proyecto abierto.
  assetMap: new Map(),
  warnedVolatile: false,
};

// ---------------- Almacenamiento ----------------

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveProjects() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
  } catch {
    // Sin espacio: recorta versiones antiguas y reintenta una vez.
    for (const p of state.projects) {
      if (p.versions.length > 5) {
        const drop = p.versions.length - 5;
        p.versions = p.versions.slice(drop);
        p.current = Math.max(0, p.current - drop);
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
      toast("Espacio lleno: se borraron versiones antiguas.");
    } catch {
      toast("No se pudo guardar. Descarga tu web para no perderla.");
    }
  }
}

function currentHtml(project = state.project) {
  return project?.versions[project.current]?.html || "";
}

function createProject(prompt) {
  const project = {
    id: crypto.randomUUID(),
    name: prompt.length > 42 ? `${prompt.slice(0, 40).trim()}…` : prompt,
    autoName: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    versions: [],
    assets: [],
    current: -1,
  };
  state.projects.unshift(project);
  saveProjects();
  return project;
}

// ---------------- Utilidades ----------------

function toast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (els.toast.hidden = true), 2600);
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(ts).toLocaleDateString("es");
}

function slug(text) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "mi-web"
  );
}

function kb(text) {
  return `${(new Blob([text]).size / 1024).toFixed(1)} KB`;
}

// Separa la respuesta del modelo en explicación y código HTML (aunque esté a medias).
function splitResponse(full) {
  let idx = full.indexOf("```html");
  let start = idx >= 0 ? idx + 7 : -1;
  if (idx < 0) {
    const raw = full.search(/<!doctype html|<html[\s>]/i);
    if (raw >= 0) {
      idx = raw;
      start = raw;
    }
  }
  if (idx < 0) return { explanation: full.trim(), code: "" };
  let code = full.slice(start).replace(/^[^\n]*\n/, (m) => (m.trim() ? m : ""));
  const end = code.indexOf("```");
  if (end >= 0) code = code.slice(0, end);
  return { explanation: full.slice(0, idx).trim(), code: code.trim() };
}

// ---------------- Router ----------------

function route() {
  const match = location.hash.match(/^#p-([\w-]+)/);
  const project = match && state.projects.find((p) => p.id === match[1]);
  if (project && state.project?.id === project.id && !els.editor.hidden) return;
  if (project) openEditor(project);
  else showHome();
}

function showHome() {
  stopGeneration();
  state.project = null;
  els.editor.hidden = true;
  els.home.hidden = false;
  document.title = "ERA Studio";
  renderProjects();
}

// ---------------- Inicio ----------------

function renderProjects() {
  const grid = els.projectGrid;
  grid.replaceChildren();
  els.projectCount.textContent = state.projects.length
    ? `${state.projects.length}`
    : "";
  if (!state.projects.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent =
      "Aún no tienes proyectos. Describe tu primera web arriba.";
    grid.append(empty);
    return;
  }
  for (const p of state.projects) {
    const card = document.createElement("div");
    card.className = "project-card";
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", `Abrir ${p.name}`);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const html = currentHtml(p);
    if (html) {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "");
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("tabindex", "-1");
      frame.setAttribute("aria-hidden", "true");
      frame.srcdoc = html;
      if (html.includes("rea-asset:"))
        loadProjectAssets(p.id).then(
          (map) => (frame.srcdoc = resolveAssets(html, map)),
        );
      thumb.append(frame);
    }

    const meta = document.createElement("div");
    meta.className = "project-meta";
    const name = document.createElement("strong");
    name.textContent = p.name;
    const info = document.createElement("span");
    info.textContent = `${p.versions.length} versión${p.versions.length === 1 ? "" : "es"} · ${timeAgo(p.updatedAt)}`;
    meta.append(name, info);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.type = "button";
    del.textContent = "×";
    del.setAttribute("aria-label", `Borrar ${p.name}`);
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!del.classList.contains("armed")) {
        del.classList.add("armed");
        del.textContent = "¿Borrar?";
        setTimeout(() => {
          del.classList.remove("armed");
          del.textContent = "×";
        }, 3000);
        return;
      }
      state.projects = state.projects.filter((x) => x.id !== p.id);
      saveProjects();
      deleteProjectAssets(p.id);
      renderProjects();
    });

    const open = () => (location.hash = `#p-${p.id}`);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => e.key === "Enter" && open());
    card.append(thumb, meta, del);
    grid.append(card);
  }
}

function startFromHome(prompt) {
  prompt = prompt.trim();
  const images = takePending("home");
  if (!prompt && !images.length) return;
  if (!prompt) prompt = "Crea una página web usando estas imágenes.";
  const project = createProject(prompt);
  els.homePrompt.value = "";
  location.hash = `#p-${project.id}`;
  openEditor(project);
  generate(prompt, images);
}

// ---------------- Imágenes adjuntas ----------------

async function addAttachments(target, files) {
  const list = state.pending[target];
  const images = [...files].filter(isImageFile);
  if (!images.length) return toast("Solo se pueden añadir imágenes.");
  const room = MAX_IMAGES_PER_MESSAGE - list.length;
  if (room <= 0)
    return toast(`Máximo ${MAX_IMAGES_PER_MESSAGE} imágenes por mensaje.`);
  if (images.length > room)
    toast(
      `Solo se añadieron ${room}: máximo ${MAX_IMAGES_PER_MESSAGE} por mensaje.`,
    );
  for (const file of images.slice(0, room)) {
    const slot = { loading: true, name: file.name };
    list.push(slot);
    renderAttachments(target);
    try {
      Object.assign(slot, await prepareImage(file, null), { loading: false });
    } catch (err) {
      list.splice(list.indexOf(slot), 1);
      toast(err.message);
    }
    renderAttachments(target);
  }
}

function renderAttachments(target) {
  const box = els.attachments[target];
  const list = state.pending[target];
  box.replaceChildren();
  box.hidden = !list.length;
  for (const item of list) {
    const chip = document.createElement("div");
    chip.className = `attachment${item.loading ? " loading" : ""}`;
    if (!item.loading) {
      const img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = item.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Quitar ${item.name}`);
      remove.addEventListener("click", () => {
        list.splice(list.indexOf(item), 1);
        renderAttachments(target);
      });
      chip.append(img, remove);
    }
    box.append(chip);
  }
}

// Saca las imágenes listas de una caja (las que siguen procesándose se quedan).
function takePending(target) {
  const ready = state.pending[target].filter((i) => !i.loading);
  state.pending[target] = state.pending[target].filter((i) => i.loading);
  renderAttachments(target);
  return ready;
}

// Guarda las imágenes nuevas en el proyecto antes de enviarlas a la IA.
async function attachToProject(p, images) {
  for (const img of images) {
    img.projectId = p.id;
    await putAsset({
      id: img.id,
      projectId: p.id,
      name: img.name,
      type: img.type,
      width: img.width,
      height: img.height,
      dataUrl: img.dataUrl,
    });
    p.assets ??= [];
    p.assets.push({
      id: img.id,
      name: img.name,
      width: img.width,
      height: img.height,
    });
    if (state.project?.id === p.id) state.assetMap.set(img.id, img.dataUrl);
  }
  if (images.length && !assetsArePersistent() && !state.warnedVolatile) {
    state.warnedVolatile = true;
    toast(
      "Este navegador no deja guardar imágenes: se perderán al recargar. Descarga tu web.",
    );
  }
}

// ---------------- Editor ----------------

function openEditor(project) {
  if (state.project?.id !== project.id) stopGeneration();
  if (state.project?.id !== project.id) {
    state.assetMap = new Map();
    state.pending.chat = [];
    renderAttachments("chat");
    loadProjectAssets(project.id).then((map) => {
      if (state.project?.id !== project.id) return;
      for (const [id, uri] of map) state.assetMap.set(id, uri);
      if (map.size) {
        renderMessages();
        if (!state.busy) renderVersion();
      }
    });
  }
  state.project = project;
  state.selection = null;
  els.home.hidden = true;
  els.editor.hidden = false;
  els.projectName.value = project.name;
  document.title = `${project.name} · ERA Studio`;
  renderMessages();
  renderSelection();
  renderVersion();
  setTab(state.tab);
  els.chatInput.focus();
}

function renderMessages() {
  els.messages.replaceChildren();
  const msgs = state.project.messages;
  if (!msgs.length) {
    addBubble(
      "assistant",
      "¡Hola! Describe la web que quieres o pide cambios sobre la actual. Activa el Inspector para elegir un elemento concreto.",
    );
  }
  for (const m of msgs) addBubble(m.role, m.text, m.version, m.images);
}

function addBubble(role, text, version, imageIds = []) {
  const div = document.createElement("div");
  div.className = `msg ${role === "error" ? "assistant error" : role}`;
  const body = document.createElement("div");
  if (role !== "user") {
    const avatar = document.createElement("img");
    avatar.src = "/favicon.svg";
    avatar.alt = "";
    div.append(avatar);
  }
  body.textContent = text;
  const thumbs = imageIds.map((id) => state.assetMap.get(id)).filter(Boolean);
  if (thumbs.length) {
    const row = document.createElement("div");
    row.className = "msg-images";
    for (const src of thumbs) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Imagen adjunta";
      row.append(img);
    }
    body.append(row);
  }
  if (version) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `Versión ${version}`;
    body.append(document.createElement("br"), tag);
  }
  div.append(body);
  els.messages.append(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return body;
}

function renderVersion() {
  const p = state.project;
  const html = currentHtml();
  els.versionLabel.textContent = p.versions.length ? `v${p.current + 1}` : "v0";
  els.codeArea.value = html;
  els.codeSize.textContent = kb(html);
  renderPreview(html);
  if (state.tab === "audit") runAudit();
}

// Script inyectado SOLO en la vista previa (no en la descarga) para el Inspector.
const INSPECTOR_SCRIPT = `<script data-rea-inspector>(() => {
  let on = false;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #f04e23;background:rgba(240,78,35,.08);border-radius:4px;display:none;transition:all .06s";
  const tag = document.createElement("div");
  tag.style.cssText = "position:absolute;top:-22px;left:-2px;background:#f04e23;color:#fff;font:600 11px/1 system-ui;padding:4px 6px;border-radius:4px;white-space:nowrap";
  box.appendChild(tag);
  const label = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  addEventListener("message", (e) => {
    if (e.data && e.data.type === "rea-inspect") {
      on = !!e.data.on;
      if (!box.isConnected) document.body.appendChild(box);
      box.style.display = "none";
      document.documentElement.style.cursor = on ? "crosshair" : "";
    }
  });
  document.addEventListener("mouseover", (e) => {
    if (!on || e.target === box) return;
    const r = e.target.getBoundingClientRect();
    Object.assign(box.style, { display: "block", top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
    tag.textContent = label(e.target);
  }, true);
  document.addEventListener("click", (e) => {
    if (!on) return;
    e.preventDefault();
    e.stopPropagation();
    box.remove();
    parent.postMessage({ type: "rea-selected", html: e.target.outerHTML, label: label(e.target) }, "*");
  }, true);
})();</script>`;

function withInspector(html) {
  if (!html) return "";
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${INSPECTOR_SCRIPT}</body>`)
    : html + INSPECTOR_SCRIPT;
}

function renderPreview(html) {
  els.preview.srcdoc = html
    ? withInspector(resolveAssets(html, state.assetMap))
    : `<!doctype html><body style="margin:0;display:grid;place-items:center;height:100vh;font-family:system-ui;color:#999;background:#fafafa"><p>Tu web aparecerá aquí</p></body>`;
}

els.preview.addEventListener("load", () => {
  els.preview.contentWindow?.postMessage(
    { type: "rea-inspect", on: state.inspecting },
    "*",
  );
});

window.addEventListener("message", (e) => {
  if (e.source !== els.preview.contentWindow || e.data?.type !== "rea-selected")
    return;
  // La vista previa tiene las imágenes ya resueltas: se vuelven a referencias
  // cortas antes de recortar, para no mandar base64 a la IA.
  const html = tokenizeDataUris(String(e.data.html), state.assetMap);
  state.selection = { html: html.slice(0, 4000), label: String(e.data.label) };
  setInspecting(false);
  renderSelection();
  els.chatInput.focus();
});

function setInspecting(on) {
  state.inspecting = on;
  els.inspectBtn.setAttribute("aria-pressed", String(on));
  if (on) setTab("preview");
  els.preview.contentWindow?.postMessage({ type: "rea-inspect", on }, "*");
}

function renderSelection() {
  els.selectionChip.hidden = !state.selection;
  if (state.selection) els.selectionLabel.textContent = state.selection.label;
}

function setTab(tab) {
  state.tab = tab;
  document
    .querySelectorAll(".tabs [role=tab]")
    .forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.tab === tab)),
    );
  document
    .querySelectorAll(".panel")
    .forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab === "audit") runAudit();
}

// ---------------- Generación ----------------

async function generate(prompt, images = []) {
  const p = state.project;
  if (!p || state.busy || !prompt.trim()) return;
  if (!state.backend) return toast("Conectando… inténtalo en un segundo.");
  prompt = prompt.trim();
  state.busy = true;
  await attachToProject(p, images);

  const history = p.messages
    .filter((m) => m.role === "user")
    .map((m) => m.text);
  const baseHtml = currentHtml(p);
  const selection = state.selection?.html || null;

  const imageIds = images.map((img) => img.id);
  p.messages.push({
    role: "user",
    text: prompt,
    ...(imageIds.length && { images: imageIds }),
  });
  addBubble("user", prompt, undefined, imageIds);
  state.selection = null;
  renderSelection();

  const bubble = addBubble("assistant", "");
  bubble.innerHTML =
    '<span class="typing"><span></span><span></span><span></span></span>';
  setBusy(true);
  els.building.hidden = false;
  els.buildingText.textContent = baseHtml
    ? "Aplicando tus cambios…"
    : "Pensando el diseño…";

  const controller = new AbortController();
  state.controller = controller;
  let full = "";
  let failed = null;
  let lastPaint = 0;

  const onText = (text) => {
    full = text;
    const { explanation, code } = splitResponse(full);
    if (explanation) bubble.textContent = explanation;
    if (code) {
      els.building.hidden = true;
      els.statusText.textContent = `Escribiendo código · ${kb(code)}`;
      if (state.tab === "code") {
        els.codeArea.value = code;
        els.codeArea.scrollTop = els.codeArea.scrollHeight;
      }
      // Vista previa en vivo mientras se escribe, limitada para no parpadear.
      const now = performance.now();
      if (
        state.tab === "preview" &&
        now - lastPaint > 1500 &&
        code.includes("<body")
      ) {
        lastPaint = now;
        renderPreview(code);
      }
    }
    els.messages.scrollTop = els.messages.scrollHeight;
  };

  try {
    const { truncated } = await state.backend.generate(
      {
        prompt,
        currentHtml: baseHtml,
        history,
        selection,
        images,
        assets: p.assets ?? [],
      },
      { signal: controller.signal, onText },
    );
    if (truncated)
      failed = "La respuesta se cortó por longitud. Pide una página más corta.";
  } catch (err) {
    if (controller.signal.aborted) failed = "Generación detenida.";
    else failed = err.message || "No se pudo conectar con el servidor.";
  }

  const { explanation, code } = splitResponse(full);
  const valid = code.length > 200 && /<\/html>/i.test(code);

  if (valid && !(failed && controller.signal.aborted)) {
    p.versions.push({ html: code, prompt, at: Date.now() });
    if (p.versions.length > MAX_VERSIONS) p.versions.shift();
    p.current = p.versions.length - 1;
    const text = explanation || "Listo, aquí tienes la nueva versión.";
    p.messages.push({ role: "assistant", text, version: p.versions.length });
    bubble.textContent = text;
    bubble.append(
      document.createElement("br"),
      Object.assign(document.createElement("span"), {
        className: "tag",
        textContent: `Versión ${p.versions.length}`,
      }),
    );
    if (p.autoName) {
      const title = code
        .match(/<title>([^<]{2,80})<\/title>/i)?.[1]
        ?.split(/[—|·-]/)[0]
        ?.trim();
      if (title) {
        p.name = title;
        els.projectName.value = title;
        document.title = `${title} · ERA Studio`;
      }
    }
    if (failed) toast(failed);
  } else {
    const msg =
      failed ||
      (explanation
        ? explanation
        : "No llegó una página válida. Inténtalo otra vez.");
    p.messages.push({ role: failed ? "error" : "assistant", text: msg });
    bubble.textContent = msg;
    if (failed) bubble.parentElement.classList.add("error");
  }

  p.updatedAt = Date.now();
  saveProjects();
  state.controller = null;
  setBusy(false);
  els.building.hidden = true;
  els.statusText.textContent = "";
  renderVersion();
}

function setBusy(busy) {
  state.busy = busy;
  els.chatSend.hidden = busy;
  els.chatStop.hidden = !busy;
  els.fixBtn.disabled = busy;
}

function stopGeneration() {
  state.controller?.abort();
}

// ---------------- Versiones ----------------

function renderVersionsMenu() {
  const p = state.project;
  els.versionsMenu.replaceChildren();
  if (!p.versions.length) {
    const b = document.createElement("button");
    b.disabled = true;
    b.textContent = "Aún no hay versiones";
    els.versionsMenu.append(b);
    return;
  }
  p.versions
    .map((v, i) => ({ v, i }))
    .reverse()
    .forEach(({ v, i }) => {
      const b = document.createElement("button");
      b.type = "button";
      if (i === p.current) b.className = "current";
      b.textContent = `Versión ${i + 1}${i === p.current ? " · actual" : ""} — ${timeAgo(v.at)}`;
      const small = document.createElement("small");
      small.textContent = v.prompt;
      b.append(small);
      b.addEventListener("click", () => {
        p.current = i;
        p.updatedAt = Date.now();
        saveProjects();
        renderVersion();
        closeVersions();
        toast(`Restaurada la versión ${i + 1}`);
      });
      els.versionsMenu.append(b);
    });
}

function closeVersions() {
  els.versionsMenu.hidden = true;
  els.versionsBtn.setAttribute("aria-expanded", "false");
}

// ---------------- Análisis ERA ----------------

function snippet(el) {
  const html = el.outerHTML.replace(/\s+/g, " ");
  return html.length > 110 ? `${html.slice(0, 110)}…` : html;
}

// `size`: bytes reales de la página con sus imágenes incluidas.
function audit(html, size) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const checks = [];
  const add = (status, title, detail, evidence, fix) =>
    checks.push({ status, title, detail, evidence, fix });

  const title = doc.querySelector("title")?.textContent.trim() || "";
  if (!title)
    add(
      "bad",
      "Título de la página",
      "No hay <title>. Es lo que se ve en la pestaña y en Google.",
      "",
      "añadir un <title> descriptivo",
    );
  else if (title.length > 65)
    add(
      "warn",
      "Título de la página",
      `Mide ${title.length} caracteres; Google corta a partir de ~60.`,
      `<title>${title}</title>`,
      "acortar el <title> a menos de 60 caracteres",
    );
  else add("ok", "Título de la página", `"${title}"`, "");

  const desc = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();
  if (desc)
    add(
      "ok",
      "Meta descripción",
      desc.length > 160
        ? `Algo larga (${desc.length} caracteres).`
        : "Presente.",
      `content="${desc.slice(0, 90)}${desc.length > 90 ? "…" : ""}"`,
    );
  else
    add(
      "bad",
      "Meta descripción",
      "Falta. Google la usa como resumen en los resultados.",
      "",
      'añadir <meta name="description">',
    );

  if (doc.querySelector('meta[name="viewport"]'))
    add("ok", "Preparada para móvil", "Tiene la meta viewport.", "");
  else
    add(
      "bad",
      "Preparada para móvil",
      "Sin meta viewport el móvil la mostrará diminuta.",
      "",
      "añadir la meta viewport",
    );

  const lang = doc.documentElement.getAttribute("lang");
  if (lang) add("ok", "Idioma declarado", `lang="${lang}"`, "");
  else
    add(
      "warn",
      "Idioma declarado",
      "Falta lang en <html>; ayuda a lectores de pantalla y traductores.",
      "",
      'añadir lang="es" a <html>',
    );

  const h1s = [...doc.querySelectorAll("h1")];
  if (h1s.length === 1)
    add("ok", "Encabezado principal", "Exactamente un <h1>.", snippet(h1s[0]));
  else if (!h1s.length)
    add(
      "bad",
      "Encabezado principal",
      "No hay ningún <h1>.",
      "",
      "añadir un único <h1> con el mensaje principal",
    );
  else
    add(
      "warn",
      "Encabezado principal",
      `Hay ${h1s.length} <h1>; lo ideal es uno.`,
      h1s.slice(0, 2).map(snippet).join("\n"),
      "dejar un único <h1>",
    );

  const levels = [...doc.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
    h,
    n: Number(h.tagName[1]),
  }));
  const jump = levels.find((x, i) => i > 0 && x.n - levels[i - 1].n > 1);
  if (jump)
    add(
      "warn",
      "Jerarquía de encabezados",
      `Salta de h${levels[levels.indexOf(jump) - 1].n} a h${jump.n}.`,
      snippet(jump.h),
      "corregir los saltos de nivel en los encabezados",
    );
  else
    add(
      "ok",
      "Jerarquía de encabezados",
      `${levels.length} encabezados en orden.`,
      "",
    );

  const imgs = [...doc.querySelectorAll("img")];
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt"));
  if (noAlt.length)
    add(
      "bad",
      "Texto alternativo en imágenes",
      `${noAlt.length} de ${imgs.length} imágenes sin alt.`,
      noAlt.slice(0, 3).map(snippet).join("\n"),
      "añadir alt descriptivo a todas las imágenes",
    );
  else
    add(
      "ok",
      "Texto alternativo en imágenes",
      imgs.length
        ? `Las ${imgs.length} imágenes tienen alt.`
        : "No hay imágenes.",
      "",
    );

  const fields = [
    ...doc.querySelectorAll(
      "input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea",
    ),
  ];
  const unlabeled = fields.filter(
    (f) =>
      !(f.id && doc.querySelector(`label[for="${CSS.escape(f.id)}"]`)) &&
      !f.closest("label") &&
      !f.getAttribute("aria-label") &&
      !f.getAttribute("aria-labelledby"),
  );
  if (unlabeled.length)
    add(
      "warn",
      "Etiquetas en formularios",
      `${unlabeled.length} campo(s) sin etiqueta accesible (el placeholder no cuenta).`,
      unlabeled.slice(0, 3).map(snippet).join("\n"),
      "añadir <label> o aria-label a los campos de formulario",
    );
  else
    add(
      "ok",
      "Etiquetas en formularios",
      fields.length
        ? `Los ${fields.length} campos tienen etiqueta.`
        : "No hay formularios.",
      "",
    );

  const deadLinks = [...doc.querySelectorAll("a")].filter(
    (a) => !a.getAttribute("href") || a.getAttribute("href") === "#",
  );
  if (deadLinks.length)
    add(
      "warn",
      "Enlaces sin destino",
      `${deadLinks.length} enlace(s) con href vacío o "#".`,
      deadLinks.slice(0, 3).map(snippet).join("\n"),
      "dar destino real a los enlaces vacíos (anclas a secciones o páginas)",
    );
  else
    add(
      "ok",
      "Enlaces sin destino",
      "Todos los enlaces llevan a algún sitio.",
      "",
    );

  const scripts = [...doc.querySelectorAll("script[src]")];
  if (scripts.length)
    add(
      "warn",
      "Scripts externos",
      `Carga ${scripts.length} script(s) de terceros; afectan velocidad y privacidad.`,
      scripts.slice(0, 3).map(snippet).join("\n"),
      "eliminar scripts externos innecesarios",
    );
  else
    add(
      "ok",
      "Scripts externos",
      "Ninguno: todo el código va dentro de la página.",
      "",
    );

  // Puntos del checklist de la guía de diseño web (SEO social, favicon,
  // privacidad y datos por completar).
  const og = ["og:title", "og:description"].filter(
    (prop) => !doc.querySelector(`meta[property="${prop}"]`),
  );
  if (og.length)
    add(
      "warn",
      "Vista al compartir (Open Graph)",
      `Falta ${og.join(" y ")}: al compartir el enlace en WhatsApp o redes no se verá bien.`,
      "",
      "añadir etiquetas Open Graph (og:title, og:description, og:type)",
    );
  else
    add(
      "ok",
      "Vista al compartir (Open Graph)",
      "Tiene og:title y og:description.",
      "",
    );

  if (doc.querySelector('link[rel~="icon"]'))
    add("ok", "Favicon", "La pestaña del navegador muestra un ícono.", "");
  else
    add(
      "warn",
      "Favicon",
      "No hay ícono para la pestaña del navegador.",
      "",
      "añadir un favicon en SVG en línea",
    );

  // Texto que ve el visitante (sin el código de <script> ni <style>).
  const body = doc.body?.cloneNode(true);
  body
    ?.querySelectorAll("script, style, noscript, template")
    .forEach((n) => n.remove());
  const visibleText = body?.textContent || "";

  const personal = fields.filter((f) =>
    /^(email|tel|text|)$/i.test(f.getAttribute("type") || ""),
  );
  if (personal.length) {
    if (/privacidad/i.test(visibleText))
      add(
        "ok",
        "Aviso de privacidad",
        "El formulario menciona el aviso de privacidad.",
        "",
      );
    else
      add(
        "bad",
        "Aviso de privacidad",
        "El formulario pide datos personales y no hay aviso de privacidad (lo exige la ley mexicana).",
        personal.slice(0, 2).map(snippet).join("\n"),
        "añadir junto al formulario un texto o enlace de aviso de privacidad",
      );
  }

  // Marcadores como "[Tu número de WhatsApp]": datos que el cliente debe dar.
  const pending = [...new Set(visibleText.match(/\[[^\]\n]{3,60}\]/g) || [])];
  if (pending.length)
    add(
      "warn",
      "Datos por completar",
      `${pending.length} dato(s) pendientes del cliente antes de publicar.`,
      pending.slice(0, 5).join("\n"),
    );

  const weightLimit = 200 * 1024 + 400 * 1024 * imgs.length;
  if (size > weightLimit)
    add(
      "warn",
      "Peso del archivo",
      `${(size / 1024).toFixed(0)} KB con imágenes; tardará en cargar en datos móviles.`,
      "",
      "reducir el tamaño del HTML y CSS",
    );
  else add("ok", "Peso del archivo", `${(size / 1024).toFixed(1)} KB`, "");

  const css = [...doc.querySelectorAll("style")]
    .map((s) => s.textContent)
    .join("\n");
  const vars = css.match(/--[\w-]+\s*:/g) || [];
  if (vars.length >= 3)
    add(
      "ok",
      "Sistema de diseño",
      `${vars.length} variables CSS: colores y medidas fáciles de cambiar.`,
      "",
    );
  else
    add(
      "warn",
      "Sistema de diseño",
      "Casi no usa variables CSS; cambiar la paleta será más difícil.",
      "",
      "definir la paleta y medidas en variables CSS en :root",
    );

  return checks;
}

function runAudit() {
  const html = currentHtml();
  els.auditList.replaceChildren();
  if (!html) {
    els.auditScore.textContent = "–";
    els.auditScore.style.borderColor = "";
    els.fixBtn.hidden = true;
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Genera una web para analizarla.";
    els.auditList.append(li);
    return;
  }
  const checks = audit(
    html,
    new Blob([resolveAssets(html, state.assetMap)]).size,
  );
  const points = checks.reduce(
    (s, c) => s + (c.status === "ok" ? 1 : c.status === "warn" ? 0.5 : 0),
    0,
  );
  const score = Math.round((points / checks.length) * 100);
  els.auditScore.textContent = score;
  els.auditScore.style.borderColor =
    score >= 85 ? "var(--ok)" : score >= 60 ? "var(--warn)" : "var(--bad)";

  const order = { bad: 0, warn: 1, ok: 2 };
  for (const c of checks.sort((a, b) => order[a.status] - order[b.status])) {
    const li = document.createElement("li");
    li.className = `check ${c.status}`;
    const dot = document.createElement("span");
    dot.className = "dot";
    const body = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = c.title;
    const d = document.createElement("span");
    d.textContent = c.detail;
    body.append(t, d);
    if (c.evidence) {
      const code = document.createElement("code");
      code.textContent = c.evidence;
      body.append(code);
    }
    li.append(dot, body);
    els.auditList.append(li);
  }
  state.auditIssues = checks.filter((c) => c.fix).map((c) => c.fix);
  els.fixBtn.hidden = !state.auditIssues.length;
}

// ---------------- Eventos ----------------

function submitOnEnter(textarea, form) {
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

els.homeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  startFromHome(els.homePrompt.value);
});
submitOnEnter(els.homePrompt, els.homeForm);

els.chips.addEventListener("click", (e) => {
  const prompt = e.target.closest("button")?.dataset.prompt;
  if (prompt) startFromHome(prompt);
});

els.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.busy) return;
  const images = takePending("chat");
  const text =
    els.chatInput.value.trim() ||
    (images.length
      ? "Agrega estas imágenes a la página donde tengan más sentido."
      : "");
  if (!text) return;
  els.chatInput.value = "";
  generate(text, images);
});
submitOnEnter(els.chatInput, els.chatForm);
els.chatStop.addEventListener("click", stopGeneration);

$("#backBtn").addEventListener("click", () => (location.hash = ""));
$("#clearSelection").addEventListener("click", () => {
  state.selection = null;
  renderSelection();
});

els.projectName.addEventListener("change", () => {
  const name = els.projectName.value.trim();
  if (!name) return (els.projectName.value = state.project.name);
  state.project.name = name;
  state.project.autoName = false;
  saveProjects();
  document.title = `${name} · ERA Studio`;
});

document
  .querySelectorAll(".tabs [role=tab]")
  .forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

document.querySelectorAll(".devices button").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll(".devices button")
      .forEach((x) => x.classList.toggle("active", x === b));
    els.frameWrap.dataset.device = b.dataset.device;
    setTab("preview");
  }),
);

els.inspectBtn.addEventListener("click", () => {
  if (!currentHtml()) return toast("Primero genera una web.");
  setInspecting(!state.inspecting);
  if (state.inspecting) toast("Haz clic en un elemento de la vista previa");
});

els.versionsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = els.versionsMenu.hidden;
  if (open) renderVersionsMenu();
  els.versionsMenu.hidden = !open;
  els.versionsBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (!els.versionsMenu.hidden && !e.target.closest(".menu-wrap"))
    closeVersions();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeVersions();
    if (state.inspecting) setInspecting(false);
  }
});

$("#downloadBtn").addEventListener("click", () => {
  const html = currentHtml();
  if (!html) return toast("Aún no hay nada que descargar.");
  const file = resolveAssets(html, state.assetMap);
  state.backend.save(`${slug(state.project.name)}.html`, file).then((r) => {
    if (r === "failed")
      toast("No se pudo descargar. Copia el código desde la pestaña Código.");
  });
});

$("#openBtn").addEventListener("click", () => {
  const html = currentHtml();
  if (!html) return toast("Aún no hay nada que abrir.");
  const file = resolveAssets(html, state.assetMap);
  const url = URL.createObjectURL(new Blob([file], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
});

$("#copyCode").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(els.codeArea.value);
    toast("Código copiado");
  } catch {
    els.codeArea.select();
    toast("Selecciona y copia con Ctrl+C");
  }
});

$("#saveCode").addEventListener("click", () => {
  const p = state.project;
  const html = els.codeArea.value.trim();
  if (!html || html === currentHtml())
    return toast("No hay cambios que guardar.");
  p.versions.push({
    html,
    prompt: "Edición manual del código",
    at: Date.now(),
  });
  if (p.versions.length > MAX_VERSIONS) p.versions.shift();
  p.current = p.versions.length - 1;
  p.updatedAt = Date.now();
  saveProjects();
  renderVersion();
  toast(`Guardada como versión ${p.versions.length}`);
});

els.codeArea.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    els.codeArea.setRangeText(
      "  ",
      els.codeArea.selectionStart,
      els.codeArea.selectionEnd,
      "end",
    );
  }
});

els.fixBtn.addEventListener("click", () => {
  if (!state.auditIssues.length) return;
  setTab("preview");
  generate(
    `Corrige estos problemas que detectó el Análisis ERA, sin cambiar el diseño: ${state.auditIssues.join("; ")}.`,
  );
});

// Cada botón de imágenes es un <input type="file"> transparente encima del
// ícono: el toque lo abre de forma nativa, también en iPhone y iPad.
document.querySelectorAll(".file-picker").forEach((input) =>
  input.addEventListener("change", () => {
    if (input.files.length) addAttachments(input.dataset.attach, input.files);
    input.value = ""; // permite volver a elegir la misma foto
  }),
);

// Pegar (Ctrl+V) y arrastrar imágenes a cada caja de texto.
for (const [target, form, input] of [
  ["home", els.homeForm, els.homePrompt],
  ["chat", els.chatForm, els.chatInput],
]) {
  form.classList.add("drop-target");
  input.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files ?? [])].filter(isImageFile);
    if (!files.length) return;
    e.preventDefault();
    addAttachments(target, files);
  });
  form.addEventListener("dragover", (e) => {
    if (![...(e.dataTransfer?.types ?? [])].includes("Files")) return;
    e.preventDefault();
    form.classList.add("dragging");
  });
  form.addEventListener("dragleave", (e) => {
    if (!form.contains(e.relatedTarget)) form.classList.remove("dragging");
  });
  form.addEventListener("drop", (e) => {
    form.classList.remove("dragging");
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    addAttachments(target, e.dataTransfer.files);
  });
}

window.addEventListener("hashchange", route);

function applyBackend(backend) {
  state.backend = { ...state.backend, ...backend };
  els.modeBadge.textContent = state.backend.label;
  els.modeBadge.classList.toggle("ai", state.backend.mode !== "demo");
  els.modeBadge.title = state.backend.title;
  // Dentro de claude.ai no se pueden abrir pestañas con contenido generado.
  $("#openBtn").hidden = state.backend.online;
  $("#downloadBtn").hidden = !state.backend.canSave;
}

route();
applyBackend(await createBackend(applyBackend));
