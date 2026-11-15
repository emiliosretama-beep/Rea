// El núcleo: el sol de ERA (el disco con la "E" del logo) rodeado de un anillo
// de marcas y dos arcos. Es el único efecto animado de la página y cambia con
// lo que hace Jarvis: reposo, escuchando, pensando o hablando.
// Cada capa es un <svg> aparte para animar solo transform y opacity.

const TAU = 2 * Math.PI;

// Trazo punteado que reparte `count` marcas exactas en un círculo de radio `r`.
function ticks(r, count, length) {
  const period = (TAU * r) / count;
  return `${length} ${(period - length).toFixed(4)}`;
}

// Recortes que dibujan la "E" sobre el disco, con las proporciones del logo.
const SUN_CUTS = [
  { x: 100, y: 83.4, width: 40, height: 9.7 },
  { x: 100, y: 106.9, width: 40, height: 9.7 },
  { x: 126.8, y: 92.2, width: 14, height: 15.6 },
];

const layer = (name, body) =>
  `<svg class="core-layer ${name}" viewBox="0 0 200 200" focusable="false">${body}</svg>`;

// `variant`: "hero" (grande, pantalla vacía) o "mini" (encabezado).
export function coreMarkup(variant) {
  const id = `core-${variant}`;
  const cuts = SUN_CUTS.map(
    (cut) =>
      `<rect x="${cut.x}" y="${cut.y}" width="${cut.width}" height="${cut.height}" fill="#000"/>`,
  ).join("");
  return (
    `<div class="core core--${variant}" aria-hidden="true">` +
    `<span class="core-glow"></span>` +
    layer("core-ring", `<circle cx="100" cy="100" r="78"/>`) +
    layer(
      "core-ticks",
      `<circle class="tick-minor" cx="100" cy="100" r="66" stroke-dasharray="${ticks(66, 72, 1.3)}"/>` +
        `<circle class="tick-major" cx="100" cy="100" r="64" stroke-dasharray="${ticks(64, 12, 1.8)}"/>`,
    ) +
    layer(
      "core-arc core-arc--a",
      `<circle cx="100" cy="100" r="88" stroke-dasharray="120 ${(TAU * 88 - 120).toFixed(3)}"/>`,
    ) +
    layer(
      "core-arc core-arc--b",
      `<circle cx="100" cy="100" r="95" stroke-dasharray="46 ${((TAU * 95) / 2 - 46).toFixed(3)}"/>`,
    ) +
    layer(
      "core-sun",
      `<defs><linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" class="sun-top"/><stop offset="1" class="sun-bottom"/></linearGradient>` +
        `<mask id="${id}-cut"><rect width="200" height="200" fill="#fff"/>${cuts}</mask></defs>` +
        `<circle cx="100" cy="100" r="38" fill="url(#${id}-fill)" mask="url(#${id}-cut)"/>`,
    ) +
    `</div>`
  );
}

// Cuántas veces más rápido giran los arcos en cada estado.
const ARC_RATE = { idle: 1, listening: 3, thinking: 14, speaking: 2 };
const KICK_GAP_MS = 140;

function reducedMotion() {
  return (
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

// `root` lleva data-core="<estado>" y la variable --energy (0 a 1); el CSS
// hace el resto. Los dos núcleos de la página reaccionan a la vez.
export function createCore(root) {
  let state = "idle";
  let calm = null;
  let talker = null;
  let lastKick = 0;

  // updatePlaybackRate cambia la velocidad sin que el arco salte de ángulo.
  function applyRate() {
    const rate = ARC_RATE[state] ?? 1;
    for (const arc of root.querySelectorAll(".core-arc")) {
      for (const animation of arc.getAnimations?.() ?? []) {
        if (animation.updatePlaybackRate) animation.updatePlaybackRate(rate);
        else animation.playbackRate = rate;
      }
    }
  }

  // Un empujón de energía: las marcas se abren y vuelven. `amount` es cuánto
  // texto acaba de llegar.
  function kick(amount = 12) {
    if (state !== "speaking" || reducedMotion()) return;
    const now = Date.now();
    if (now - lastKick < KICK_GAP_MS) return;
    lastKick = now;
    root.style.setProperty(
      "--energy",
      Math.min(1, 0.4 + amount / 60).toFixed(2),
    );
    clearTimeout(calm);
    calm = setTimeout(() => root.style.setProperty("--energy", "0"), 170);
  }

  return {
    get state() {
      return state;
    },
    set(next) {
      if (next === state) return;
      state = next;
      root.dataset.core = next;
      if (next !== "speaking") root.style.setProperty("--energy", "0");
      applyRate();
    },
    kick,
    // Mientras Jarvis habla en voz alta (sin trozos de texto): pulsos sueltos.
    talk(on) {
      clearInterval(talker);
      talker = on ? setInterval(() => kick(6 + Math.random() * 40), 230) : null;
    },
    // Tras mostrar u ocultar un núcleo sus animaciones se crean de nuevo.
    refresh() {
      requestAnimationFrame(applyRate);
    },
  };
}

// Vuela el núcleo grande hasta el sitio del chico (el momento en que arranca
// la conversación). `hero` sigue visible mientras dura; resuelve al terminar.
export function dockCore(hero, mini) {
  const from = hero.getBoundingClientRect();
  const to = mini.getBoundingClientRect();
  if (reducedMotion() || !hero.animate || !from.width || !to.width)
    return Promise.resolve();
  const scale = to.width / from.width;
  const move = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`;
  const flight = hero.animate([{ transform: "none" }, { transform: move }], {
    duration: 620,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fill: "forwards",
  });
  return flight.finished.catch(() => {}).then(() => flight.cancel());
}
