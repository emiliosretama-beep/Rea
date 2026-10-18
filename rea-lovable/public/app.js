// Rea Studio — lógica del cliente.
// Proyectos y versiones se guardan en localStorage del navegador.

const STORAGE_KEY = "rea-studio:projects";
const MAX_VERSIONS = 25;
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
  const match = location.hash.match(/^#\/p\/([\w-]+)/);
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
  document.title = "Rea Studio";
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
      if (!confirm(`¿Borrar "${p.name}"? No se puede deshacer.`)) return;
      state.projects = state.projects.filter((x) => x.id !== p.id);
      saveProjects();
      renderProjects();
    });

    const open = () => (location.hash = `#/p/${p.id}`);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => e.key === "Enter" && open());
    card.append(thumb, meta, del);
    grid.append(card);
  }
}

function startFromHome(prompt) {
  prompt = prompt.trim();
  if (!prompt) return;
  const project = createProject(prompt);
  els.homePrompt.value = "";
  location.hash = `#/p/${project.id}`;
  openEditor(project);
  generate(prompt);
}

// ---------------- Editor ----------------

function openEditor(project) {
  if (state.project?.id !== project.id) stopGeneration();
  state.project = project;
  state.selection = null;
  els.home.hidden = true;
  els.editor.hidden = false;
  els.projectName.value = project.name;
  document.title = `${project.name} · Rea Studio`;
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
  for (const m of msgs) addBubble(m.role, m.text, m.version);
}

function addBubble(role, text, version) {
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
  box.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #ff5a36;background:rgba(255,90,54,.08);border-radius:4px;display:none;transition:all .06s";
  const tag = document.createElement("div");
  tag.style.cssText = "position:absolute;top:-22px;left:-2px;background:#ff5a36;color:#fff;font:600 11px/1 system-ui;padding:4px 6px;border-radius:4px;white-space:nowrap";
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
    parent.postMessage({ type: "rea-selected", html: e.target.outerHTML.slice(0, 4000), label: label(e.target) }, "*");
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
    ? withInspector(html)
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
  state.selection = { html: String(e.data.html), label: String(e.data.label) };
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

async function generate(prompt) {
  const p = state.project;
  if (!p || state.busy || !prompt.trim()) return;
  prompt = prompt.trim();

  const history = p.messages
    .filter((m) => m.role === "user")
    .map((m) => m.text);
  const baseHtml = currentHtml(p);
  const selection = state.selection?.html || null;

  p.messages.push({ role: "user", text: prompt });
  addBubble("user", prompt);
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

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        currentHtml: baseHtml,
        history,
        selection,
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `El servidor respondió ${res.status}`);
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let sep;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const event = raw.match(/^event: (.*)$/m)?.[1];
        const dataLine = raw.match(/^data: (.*)$/m)?.[1];
        const data = dataLine ? JSON.parse(dataLine) : {};
        if (event === "delta") full += data.text;
        else if (event === "error") failed = data.message;
      }

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
    }
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
        document.title = `${title} · Rea Studio`;
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

// ---------------- Análisis Rea ----------------

function snippet(el) {
  const html = el.outerHTML.replace(/\s+/g, " ");
  return html.length > 110 ? `${html.slice(0, 110)}…` : html;
}

function audit(html) {
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

  const size = new Blob([html]).size;
  if (size > 200 * 1024)
    add(
      "warn",
      "Peso del archivo",
      `${(size / 1024).toFixed(0)} KB; por encima de 200 KB tarda más en cargar.`,
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
  const checks = audit(html);
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
  const text = els.chatInput.value;
  if (!text.trim() || state.busy) return;
  els.chatInput.value = "";
  generate(text);
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
  document.title = `${name} · Rea Studio`;
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  a.download = `${slug(state.project.name)}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("#openBtn").addEventListener("click", () => {
  const html = currentHtml();
  if (!html) return toast("Aún no hay nada que abrir.");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
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
    `Corrige estos problemas que detectó el Análisis Rea, sin cambiar el diseño: ${state.auditIssues.join("; ")}.`,
  );
});

window.addEventListener("hashchange", route);

fetch("/api/status")
  .then((r) => r.json())
  .then((s) => {
    els.modeBadge.textContent =
      s.mode === "ai" ? "● IA conectada" : "Modo demo";
    els.modeBadge.classList.toggle("ai", s.mode === "ai");
    els.modeBadge.title =
      s.mode === "ai"
        ? `Modelo: ${s.model}`
        : "Añade ANTHROPIC_API_KEY en .env para usar IA real";
  })
  .catch(() => (els.modeBadge.textContent = "Sin servidor"));

route();
