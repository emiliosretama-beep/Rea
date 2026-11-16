// Utilidades de interfaz compartidas: crear nodos, iconos, avisos y copiar.

export const $ = (selector, root = document) => root.querySelector(selector);

// el("li", { class: "x", text: "hola", "data-id": 3 }, hijo1, hijo2)
// `text` se asigna con textContent; `html` solo recibe marcado propio.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === "text") node.textContent = value;
    else if (name === "html") node.innerHTML = value;
    else node.setAttribute(name, value === true ? "" : value);
  }
  node.append(
    ...children.filter((child) => child !== null && child !== undefined),
  );
  return node;
}

// Iconos de trazo fino, 24×24, del color del texto.
const ICONS = {
  tasks:
    '<path d="M4 6.6l1.7 1.7L8.8 5"/><path d="M12 7h8"/><path d="M4 13.6l1.7 1.7 3.1-3.3"/><path d="M12 14h8"/><circle cx="6.3" cy="20" r="1.3"/><path d="M12 20h8"/>',
  memory:
    '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M12 19V6"/><path d="M6 11.5l6-6 6 6"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

// Aviso breve abajo de la pantalla, con una acción opcional (p. ej. Deshacer).
export function createToast(node) {
  let timer = null;
  const hide = () => {
    clearTimeout(timer);
    node.hidden = true;
  };
  return {
    show(message, { action, onAction, duration = action ? 7000 : 4000 } = {}) {
      node.replaceChildren(el("span", { text: message }));
      if (action) {
        const button = el("button", { type: "button", text: action });
        button.addEventListener("click", () => {
          hide();
          onAction?.();
        });
        node.append(button);
      }
      node.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(hide, duration);
    },
    hide,
  };
}

// El portapapeles solo responde dentro de un clic y puede negarse.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Plan B de "Copiar": deja el texto seleccionado para copiarlo a mano.
export function selectContents(node) {
  const selection = globalThis.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}
