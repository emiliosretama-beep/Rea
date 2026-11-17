// Catálogo de miniaturas: lo que el diseñador (Claude) puede elegir y lo que el
// dibujador sabe pintar. Una sola fuente: lo importan el agente (src/), el
// servidor y la interfaz. Sin nada de Node ni del navegador.

export const SIZE = { width: 1280, height: 720 }; // recomendado por YouTube

export const LAYOUTS = {
  "split-left": "Texto a la izquierda, icono grande a la derecha",
  "split-right": "Icono a la izquierda, texto a la derecha",
  center: "Titular enorme centrado",
  "big-number": "Un número o palabra gigante como protagonista",
  versus: "Comparación: dos lados con «VS» al centro",
  question: "Pregunta con un «?» gigante de fondo",
  stack: "Líneas con franjas de color detrás (estilo subtítulo)",
  arrow: "Flecha que lleva la mirada del texto al icono",
};

// Nombres cortos para los selectores del editor (las descripciones van a Claude).
export const LAYOUT_NAMES = {
  "split-left": "Texto + icono",
  "split-right": "Icono + texto",
  center: "Centrado",
  "big-number": "Número gigante",
  versus: "Comparación (VS)",
  question: "Pregunta",
  stack: "Franjas",
  arrow: "Flecha",
};

export const BACKGROUNDS = {
  gradient: "Degradado diagonal",
  solid: "Color plano",
  burst: "Rayos desde un punto",
  grid: "Cuadrícula técnica",
  spotlight: "Foco de luz central",
  stripes: "Franjas diagonales",
};

// text sobre bg1/bg2 y accentText sobre accent: contraste comprobado en tests.
export const PALETTES = {
  noche: { label: "Noche y oro", bg1: "#0b1026", bg2: "#1d2a6b", text: "#ffffff", accent: "#ffd23f", accentText: "#0b1026" },
  fuego: { label: "Fuego", bg1: "#1a0602", bg2: "#6b1405", text: "#ffffff", accent: "#ffb703", accentText: "#1a0602" },
  menta: { label: "Menta", bg1: "#04261f", bg2: "#0b5d4b", text: "#ffffff", accent: "#7cffcb", accentText: "#04261f" },
  papel: { label: "Papel y rojo", bg1: "#f6f1e7", bg2: "#e3d6bb", text: "#15120d", accent: "#c81d25", accentText: "#ffffff" },
  era: { label: "ERA naranja", bg1: "#0a0f1e", bg2: "#2a1408", text: "#ffffff", accent: "#f04e23", accentText: "#ffffff" },
  hielo: { label: "Hielo", bg1: "#e8f4ff", bg2: "#bcdcff", text: "#0b1f3a", accent: "#0047d6", accentText: "#ffffff" },
  violeta: { label: "Violeta neón", bg1: "#160a2e", bg2: "#4b1d8f", text: "#ffffff", accent: "#ff4fd8", accentText: "#160a2e" },
  carbon: { label: "Carbón y lima", bg1: "#121212", bg2: "#2e2e2e", text: "#ffffff", accent: "#d4ff3a", accentText: "#121212" },
};

// Iconos en una caja de 24×24 (trazo). `fill`: se rellenan además de trazarse.
export const ICONS = {
  ninguno: { label: "Sin icono", d: "" },
  rayo: { label: "Rayo", d: "M13 2 4 14h7l-1 8 9-12h-7z", fill: true },
  chip: { label: "Chip", d: "M7 7h10v10H7z M10 10h4v4h-4z M9 2v3 M15 2v3 M9 19v3 M15 19v3 M2 9h3 M2 15h3 M19 9h3 M19 15h3" },
  dinero: { label: "Dinero", d: "M12 2v20 M17 6.5C16 5 14.3 4 12 4c-3 0-5 1.6-5 4s2 3.2 5 4 5 1.8 5 4-2 4-5 4c-2.5 0-4.4-1-5.3-2.6" },
  reloj: { label: "Reloj", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2" },
  alerta: { label: "Alerta", d: "M12 3 2 20h20z M12 9v5 M12 17v.5" },
  check: { label: "Correcto", d: "M4 12.5 9.5 18 20 6.5" },
  cruz: { label: "Incorrecto", d: "M5 5l14 14 M19 5 5 19" },
  flecha: { label: "Flecha", d: "M4 12h15 M13 6l6 6-6 6" },
  lupa: { label: "Lupa", d: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M15.5 15.5 21 21" },
  corazon: { label: "Corazón", d: "M12 20s-7-4.4-9-8.5C1.6 8.6 3.3 5 6.8 5c2 0 3.5 1.2 5.2 3 1.7-1.8 3.2-3 5.2-3 3.5 0 5.2 3.6 3.8 6.5C19 15.6 12 20 12 20z", fill: true },
  estrella: { label: "Estrella", d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", fill: true },
  grafica: { label: "Gráfica", d: "M4 20V12 M10 20V7 M16 20V13 M3 20h18 M4 9l6-5 6 6 5-5" },
  mundo: { label: "Mundo", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18" },
  play: { label: "Play", d: "M8 5v14l11-7z", fill: true },
  pregunta: { label: "Pregunta", d: "M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4v.5 M12 18v.5" },
};

export const LIMITS = { headlineWords: 6, headlineChars: 34, sublineChars: 40, badgeChars: 12 };

// Normaliza y comprueba una miniatura (lo usan el agente, el servidor y el editor).
// Devuelve la lista de problemas; vacía si se puede dibujar.
export function checkSpec(spec) {
  const issues = [];
  if (!LAYOUTS[spec?.layout]) issues.push(`diseño desconocido «${spec?.layout}»`);
  if (!BACKGROUNDS[spec?.background]) issues.push(`fondo desconocido «${spec?.background}»`);
  if (!PALETTES[spec?.palette]) issues.push(`paleta desconocida «${spec?.palette}»`);
  if (!ICONS[spec?.icon]) issues.push(`icono desconocido «${spec?.icon}»`);
  const headline = String(spec?.headline ?? "").trim();
  if (!headline) issues.push("falta el titular");
  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length > LIMITS.headlineWords) issues.push(`el titular tiene ${words.length} palabras (máximo ${LIMITS.headlineWords})`);
  if (headline.length > LIMITS.headlineChars) issues.push(`el titular tiene ${headline.length} caracteres (máximo ${LIMITS.headlineChars})`);
  if (String(spec?.subline ?? "").length > LIMITS.sublineChars) issues.push(`la línea secundaria supera ${LIMITS.sublineChars} caracteres`);
  if (String(spec?.badge ?? "").length > LIMITS.badgeChars) issues.push(`la etiqueta supera ${LIMITS.badgeChars} caracteres`);
  const accent = String(spec?.accentWord ?? "").trim().toLowerCase();
  if (accent && !words.some((w) => clean(w) === clean(accent))) issues.push(`la palabra resaltada «${spec.accentWord}» no está en el titular`);
  return issues;
}

export const clean = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
