// Dibujador de miniaturas en Canvas (1280×720). Mismo código en el servidor y
// en la versión online: la miniatura se guarda como especificación (JSON) y
// se pinta aquí cuando se ve, se edita o se descarga.
import { BACKGROUNDS, ICONS, LAYOUTS, PALETTES, SIZE, clean } from "./catalog.js";

// Medidas del dibujo en curso. Horizontal 1280×720 (videos) o vertical
// 1080×1920 (Shorts): drawThumbnail las fija según el lienzo.
let W = SIZE.width;
let H = SIZE.height;
let PAD = 64;
let VERTICAL = false;
// Zona segura vertical: arriba la barra del teléfono, abajo el título y el
// canal que pone YouTube, a la derecha sus botones.
const SAFE_V = { top: 0.13, bottom: 0.72, right: 170 };
const DISPLAY = '"Anton", Impact, "Arial Narrow Bold", "Arial Black", sans-serif';
const BODY = '"Plus Jakarta Sans", system-ui, sans-serif';

let fontsReady = null;
// Anton (Google Fonts) se carga con la página; se espera para no dibujar con la fuente de respaldo.
export function ensureFonts() {
  fontsReady ??= Promise.all([
    document.fonts?.load(`100px ${DISPLAY}`, "ABC"),
    document.fonts?.load(`700 40px ${BODY}`, "ABC"),
  ]).catch(() => null);
  return fontsReady;
}

// ---------- Fondos ----------

function background(ctx, spec, p) {
  const kind = BACKGROUNDS[spec.background] ? spec.background : "gradient";
  if (kind === "solid") {
    ctx.fillStyle = p.bg1;
    ctx.fillRect(0, 0, W, H);
  } else if (kind === "spotlight") {
    const g = ctx.createRadialGradient(W * 0.62, H * 0.45, 40, W * 0.62, H * 0.45, W * 0.75);
    g.addColorStop(0, p.bg2);
    g.addColorStop(1, p.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.bg1);
    g.addColorStop(1, p.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  if (kind === "burst") {
    const cx = W * 0.72;
    const cy = H * 0.5;
    ctx.fillStyle = p.bg2;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 24; i += 2) {
      const a1 = (i / 24) * Math.PI * 2;
      const a2 = ((i + 1) / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a1) * W * 1.5, cy + Math.sin(a1) * W * 1.5);
      ctx.lineTo(cx + Math.cos(a2) * W * 1.5, cy + Math.sin(a2) * W * 1.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === "grid") {
    ctx.strokeStyle = p.text;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 64) line(ctx, x, 0, x, H);
    for (let y = 0; y <= H; y += 64) line(ctx, 0, y, W, y);
  } else if (kind === "stripes") {
    ctx.fillStyle = p.bg2;
    ctx.globalAlpha = 0.5;
    for (let x = -H; x < W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + 50, H);
      ctx.lineTo(x + 50 + H, 0);
      ctx.lineTo(x + H, 0);
      ctx.fill();
    }
  }
  ctx.restore();
  // Viñeta: da profundidad y separa el texto de los bordes.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, isLight(p.bg1) ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---------- Texto ----------

// Reparte palabras en líneas y busca el tamaño más grande que cabe en la caja.
function fit(ctx, words, maxW, maxH, { max = 170, min = 44, maxLines = 4, lineHeight = 0.98 } = {}) {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = `${size}px ${DISPLAY}`;
    const lines = [];
    let current = [];
    for (const w of words) {
      const test = [...current, w].join(" ");
      if (current.length && ctx.measureText(test).width > maxW) {
        lines.push(current);
        current = [w];
      } else current.push(w);
    }
    if (current.length) lines.push(current);
    const tooWide = lines.some((l) => ctx.measureText(l.join(" ")).width > maxW);
    if (!tooWide && lines.length <= maxLines && lines.length * size * lineHeight <= maxH)
      return { size, lines, lineHeight };
  }
  ctx.font = `${min}px ${DISPLAY}`;
  return { size: min, lines: words.map((w) => [w]), lineHeight };
}

// Paleta clara: el contorno va en claro (uno negro ensucia la letra oscura).
const isLight = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};
const outline = (p) => (isLight(p.bg1) ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)");

// Pinta líneas con contorno; la palabra resaltada va en el color de acento.
function drawLines(ctx, layout, x, y, p, { align = "left", accent, highlightBars = false } = {}) {
  const { size, lines, lineHeight } = layout;
  ctx.font = `${size}px ${DISPLAY}`;
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  lines.forEach((words, i) => {
    const text = words.join(" ");
    const width = ctx.measureText(text).width;
    let cx = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    const cy = y + i * size * lineHeight;
    if (highlightBars) {
      ctx.fillStyle = p.accent;
      ctx.fillRect(cx - 18, cy - size * 0.06, width + 36, size * 0.98);
    }
    for (const word of words) {
      const w = ctx.measureText(word + " ").width;
      const isAccent = accent && clean(word) === accent;
      const fill = highlightBars ? p.accentText : isAccent ? p.accent : p.text;
      if (!highlightBars) {
        ctx.strokeStyle = outline(p);
        ctx.lineWidth = size * 0.1;
        ctx.strokeText(word, cx, cy);
      }
      ctx.fillStyle = fill;
      ctx.fillText(word, cx, cy);
      cx += w;
    }
  });
  return y + lines.length * size * lineHeight;
}

function subline(ctx, text, x, y, maxW, p, align = "left") {
  if (!text) return;
  let size = VERTICAL ? 60 : 44;
  ctx.font = `700 ${size}px ${BODY}`;
  while (ctx.measureText(text).width > maxW && size > 24) ctx.font = `700 ${(size -= 2)}px ${BODY}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = p.text;
  ctx.globalAlpha = 0.92;
  ctx.fillText(text, x, y + 18);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function badge(ctx, text, p) {
  if (!text) return;
  const k = VERTICAL ? 1.5 : 1;
  const y = VERTICAL ? H * SAFE_V.top : PAD - 12;
  ctx.font = `700 ${34 * k}px ${BODY}`;
  const w = ctx.measureText(text.toUpperCase()).width + 44 * k;
  ctx.fillStyle = p.accent;
  roundRect(ctx, PAD - 8, y, w, 58 * k, 29 * k);
  ctx.fill();
  ctx.fillStyle = p.accentText;
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), PAD + 14 * k, y + 29 * k);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- Iconos ----------

function icon(ctx, name, cx, cy, size, color) {
  const def = ICONS[name];
  if (!def?.d) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  const path = new Path2D(def.d);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (def.fill) ctx.fill(path);
  ctx.stroke(path);
  ctx.restore();
}

function iconDisc(ctx, spec, p, cx, cy, r) {
  if (spec.icon === "ninguno") return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  icon(ctx, spec.icon, cx, cy, r * 1.15, p.accentText);
}

// ---------- Diseños ----------

// Con etiqueta arriba a la izquierda, el texto no puede empezar encima de ella.
const BADGE_CLEAR = PAD + 74;
const topOf = (spec, t, extra = 0) =>
  Math.max(spec.badge ? BADGE_CLEAR : PAD - 10, (H - t.lines.length * t.size * t.lineHeight) / 2 - extra);
const roomFor = (spec, h) => (spec.badge ? h - 70 : h);

const words = (spec) => String(spec.headline || "").toUpperCase().split(/\s+/).filter(Boolean);

const LAYOUT_DRAW = {
  "split-left"(ctx, spec, p, accent) {
    const hasIcon = spec.icon !== "ninguno";
    const maxW = hasIcon ? 680 : W - PAD * 2;
    const t = fit(ctx, words(spec), maxW, roomFor(spec, 470));
    const top = topOf(spec, t, spec.subline ? 30 : 0);
    const end = drawLines(ctx, t, PAD, top, p, { accent });
    subline(ctx, spec.subline, PAD, end, maxW, p);
    if (hasIcon) iconDisc(ctx, spec, p, 1010, 360, 200);
  },
  "split-right"(ctx, spec, p, accent) {
    const hasIcon = spec.icon !== "ninguno";
    const x = hasIcon ? 520 : PAD;
    const maxW = W - PAD - x;
    const t = fit(ctx, words(spec), maxW, roomFor(spec, 470));
    const top = topOf(spec, t, spec.subline ? 30 : 0);
    const end = drawLines(ctx, t, x, top, p, { accent });
    subline(ctx, spec.subline, x, end, maxW, p);
    if (hasIcon) iconDisc(ctx, spec, p, 265, 360, 190);
  },
  center(ctx, spec, p, accent) {
    const t = fit(ctx, words(spec), W - PAD * 2, roomFor(spec, 470), { max: 200 });
    const top = topOf(spec, t, spec.subline ? 34 : 0);
    const end = drawLines(ctx, t, W / 2, top, p, { accent, align: "center" });
    subline(ctx, spec.subline, W / 2, end, W - PAD * 2, p, "center");
  },
  "big-number"(ctx, spec, p, accent) {
    const all = words(spec);
    const hero = all.find((w) => /\d/.test(w)) ?? all.find((w) => clean(w) === accent) ?? all[0];
    const rest = all.filter((w) => w !== hero);
    const big = fit(ctx, [hero], 560, 600, { max: 420, maxLines: 1 });
    ctx.font = `${big.size}px ${DISPLAY}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.accent;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = big.size * 0.06;
    ctx.strokeText(hero, PAD, H / 2 + 10);
    ctx.fillText(hero, PAD, H / 2 + 10);
    const heroW = ctx.measureText(hero).width;
    const x = Math.min(PAD + heroW + 40, 760);
    const t = fit(ctx, rest.length ? rest : [""], W - PAD - x, roomFor(spec, 440), { max: 130 });
    const top = topOf(spec, t, spec.subline ? 30 : 0);
    const end = drawLines(ctx, t, x, top, p, { accent });
    subline(ctx, spec.subline, x, end, W - PAD - x, p);
  },
  versus(ctx, spec, p, accent) {
    const all = words(spec);
    let cut = all.findIndex((w) => ["VS", "VS.", "CONTRA", "O", "OR"].includes(w));
    const left = cut > 0 ? all.slice(0, cut) : all.slice(0, Math.ceil(all.length / 2));
    const right = cut > 0 ? all.slice(cut + 1) : all.slice(Math.ceil(all.length / 2));
    ctx.save();
    ctx.fillStyle = p.bg2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(W / 2 + 60, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W / 2 - 60, H);
    ctx.fill();
    ctx.restore();
    const tl = fit(ctx, left, 470, 420, { max: 150 });
    drawLines(ctx, tl, 300, (H - tl.lines.length * tl.size * tl.lineHeight) / 2, p, { accent, align: "center" });
    const tr = fit(ctx, right.length ? right : [""], 470, 420, { max: 150 });
    drawLines(ctx, tr, W - 300, (H - tr.lines.length * tr.size * tr.lineHeight) / 2, p, { accent, align: "center" });
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `110px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.accentText;
    ctx.fillText("VS", W / 2, H / 2 + 6);
    ctx.textAlign = "left";
  },
  question(ctx, spec, p, accent) {
    ctx.save();
    ctx.font = `620px ${DISPLAY}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillText("?", 1010, H / 2 + 20);
    ctx.restore();
    const t = fit(ctx, words(spec), 700, roomFor(spec, 480));
    const top = topOf(spec, t, spec.subline ? 30 : 0);
    const end = drawLines(ctx, t, PAD, top, p, { accent });
    subline(ctx, spec.subline, PAD, end, 700, p);
  },
  stack(ctx, spec, p) {
    ctx.save();
    ctx.translate(PAD + 20, 0);
    ctx.rotate(-0.03);
    const t = fit(ctx, words(spec), spec.icon === "ninguno" ? W - PAD * 3 : 720, 500, { max: 140, lineHeight: 1.18 });
    drawLines(ctx, t, 0, topOf(spec, t), p, { highlightBars: true });
    ctx.restore();
    if (spec.icon !== "ninguno") iconDisc(ctx, spec, p, 1060, 380, 160);
    subline(ctx, spec.subline, PAD + 20, H - PAD - 60, W - PAD * 2, p);
  },
  arrow(ctx, spec, p, accent) {
    const t = fit(ctx, words(spec), 720, roomFor(spec, 330), { max: 140 });
    const end = drawLines(ctx, t, PAD, spec.badge ? BADGE_CLEAR : PAD + 20, p, { accent });
    subline(ctx, spec.subline, PAD, end, 720, p);
    // Flecha curva del texto al icono.
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PAD + 120, H - 150);
    ctx.quadraticCurveTo(620, H - 30, 860, H - 230);
    ctx.stroke();
    ctx.translate(860, H - 230);
    ctx.rotate(-0.75);
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(-30, -44);
    ctx.lineTo(-30, 44);
    ctx.fill();
    ctx.restore();
    iconDisc(ctx, spec.icon === "ninguno" ? { ...spec, icon: "flecha" } : spec, p, 1050, 400, 170);
  },
};

// ---------- Diseños verticales (Shorts) ----------
// Mismas ideas que en horizontal, apiladas de arriba abajo dentro de la zona
// segura: texto arriba, protagonista (icono, número, «?», VS) debajo.

const vBox = (spec) => {
  const top = H * SAFE_V.top + (spec.badge ? 120 : 0);
  return { left: PAD, top, width: W - PAD - SAFE_V.right, bottom: H * SAFE_V.bottom };
};

function vText(ctx, spec, p, accent, box, maxH, opts = {}) {
  const t = fit(ctx, words(spec), box.width, maxH, { max: 230, min: 60, maxLines: 5, ...opts });
  const end = drawLines(ctx, t, opts.align === "center" ? box.left + box.width / 2 : box.left, box.top, p, { accent, ...opts });
  // Con letra enorme, el trazo de Anton baja más que su línea: el margen crece con el tamaño.
  const gap = t.size * 0.12;
  subline(ctx, spec.subline, opts.align === "center" ? box.left + box.width / 2 : box.left, end + gap, box.width, p, opts.align ?? "left");
  return end + gap + (spec.subline ? 90 : 0);
}

// Icono debajo de todo el texto; si no cabe, se encoge (nunca tapa texto).
function iconBelow(ctx, spec, p, box, end, r = 210) {
  if (spec.icon === "ninguno") return;
  const room = box.bottom - end - 40;
  const radius = Math.max(90, Math.min(r, room / 2));
  iconDisc(ctx, spec, p, box.left + box.width / 2, end + 40 + radius, radius);
}

const LAYOUT_DRAW_V = {
  "split-left"(ctx, spec, p, accent) {
    const box = vBox(spec);
    const end = vText(ctx, spec, p, accent, box, (box.bottom - box.top) * (spec.icon === "ninguno" ? 0.9 : 0.5));
    iconBelow(ctx, spec, p, box, end);
  },
  "split-right"(ctx, spec, p, accent) {
    const box = vBox(spec);
    if (spec.icon !== "ninguno") {
      iconDisc(ctx, spec, p, box.left + box.width / 2, box.top + 210, 200);
      box.top += 460;
    }
    vText(ctx, spec, p, accent, box, box.bottom - box.top);
  },
  center(ctx, spec, p, accent) {
    const box = vBox(spec);
    const t = fit(ctx, words(spec), box.width, box.bottom - box.top - (spec.subline ? 120 : 0), { max: 260, min: 60, maxLines: 6 });
    const block = t.lines.length * t.size * t.lineHeight;
    box.top += Math.max(0, (box.bottom - box.top - block - (spec.subline ? 120 : 0)) / 2);
    vText(ctx, spec, p, accent, box, block + 10, { align: "center" });
  },
  "big-number"(ctx, spec, p, accent) {
    const box = vBox(spec);
    const all = words(spec);
    const hero = all.find((w) => /\d/.test(w)) ?? all.find((w) => clean(w) === accent) ?? all[0];
    const big = fit(ctx, [hero], box.width, 620, { max: 640, maxLines: 1 });
    ctx.font = `${big.size}px ${DISPLAY}`;
    ctx.textBaseline = "top";
    ctx.fillStyle = p.accent;
    ctx.strokeStyle = outline(p);
    ctx.lineWidth = big.size * 0.05;
    const heroTop = box.top + big.size * 0.06; // el glifo de Anton sobresale por arriba
    ctx.strokeText(hero, box.left, heroTop);
    ctx.fillText(hero, box.left, heroTop);
    const rest = all.filter((w) => w !== hero);
    const t = fit(ctx, rest.length ? rest : [""], box.width, box.bottom - box.top - big.size, { max: 180, min: 56, maxLines: 4 });
    const end = drawLines(ctx, t, box.left, box.top + big.size * 1.02, p, { accent });
    subline(ctx, spec.subline, box.left, end, box.width, p);
  },
  versus(ctx, spec, p, accent) {
    const box = vBox(spec);
    const all = words(spec);
    const cut = all.findIndex((w) => ["VS", "VS.", "CONTRA", "O", "OR"].includes(w));
    const first = cut > 0 ? all.slice(0, cut) : all.slice(0, Math.ceil(all.length / 2));
    const second = cut > 0 ? all.slice(cut + 1) : all.slice(Math.ceil(all.length / 2));
    const mid = (box.top + box.bottom) / 2;
    ctx.save();
    ctx.fillStyle = p.bg2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, mid + 60);
    ctx.lineTo(W, mid - 60);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.restore();
    const half = (box.bottom - box.top) / 2 - 120;
    const t1 = fit(ctx, first, box.width, half, { max: 220, maxLines: 3 });
    drawLines(ctx, t1, box.left + box.width / 2, mid - 120 - t1.lines.length * t1.size * t1.lineHeight, p, { accent, align: "center" });
    const t2 = fit(ctx, second.length ? second : [""], box.width, half, { max: 220, maxLines: 3 });
    drawLines(ctx, t2, box.left + box.width / 2, mid + 130, p, { accent, align: "center" });
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, mid, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `130px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.accentText;
    ctx.fillText("VS", box.left + box.width / 2, mid + 6);
    ctx.textAlign = "left";
  },
  question(ctx, spec, p, accent) {
    const box = vBox(spec);
    ctx.save();
    ctx.font = `900px ${DISPLAY}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillText("?", box.left + box.width * 0.62, box.bottom);
    ctx.restore();
    vText(ctx, spec, p, accent, box, (box.bottom - box.top) * 0.5);
  },
  stack(ctx, spec, p) {
    const box = vBox(spec);
    ctx.save();
    ctx.translate(box.left + 20, 0);
    ctx.rotate(-0.03);
    const t = fit(ctx, words(spec), box.width - 40, (box.bottom - box.top) * 0.55, { max: 190, min: 60, maxLines: 6, lineHeight: 1.18 });
    const end = drawLines(ctx, t, 0, box.top + 20, p, { highlightBars: true });
    ctx.restore();
    subline(ctx, spec.subline, box.left + 20, end + 10, box.width, p);
    iconBelow(ctx, spec, p, box, end + (spec.subline ? 110 : 20), 180);
  },
  arrow(ctx, spec, p, accent) {
    const box = vBox(spec);
    const end = vText(ctx, spec, p, accent, box, (box.bottom - box.top) * 0.45);
    const cx = box.left + box.width / 2;
    const iconY = Math.min(box.bottom - 190, end + 420);
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 30;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(box.left + 60, end + 40);
    ctx.quadraticCurveTo(box.left + 20, iconY, cx - 220, iconY);
    ctx.stroke();
    ctx.translate(cx - 200, iconY);
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(-30, -48);
    ctx.lineTo(-30, 48);
    ctx.fill();
    ctx.restore();
    iconDisc(ctx, spec.icon === "ninguno" ? { ...spec, icon: "flecha" } : spec, p, cx + 40, iconY, 170);
  },
};

// Dibuja `spec` en el canvas, escalado a su tamaño (el canvas puede ser una miniatura).
export function drawThumbnail(canvas, spec) {
  VERTICAL = canvas.height > canvas.width;
  [W, H, PAD] = VERTICAL ? [1080, 1920, 80] : [SIZE.width, SIZE.height, 64];
  const ctx = canvas.getContext("2d");
  const p = PALETTES[spec.palette] ?? PALETTES.noche;
  ctx.save();
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  background(ctx, spec, p);
  const layouts = VERTICAL ? LAYOUT_DRAW_V : LAYOUT_DRAW;
  const draw = layouts[LAYOUTS[spec.layout] ? spec.layout : "split-left"];
  draw(ctx, spec, p, spec.accentWord ? clean(spec.accentWord) : null);
  badge(ctx, spec.badge, p);
  ctx.restore();
}

// PNG listo para YouTube: 1280×720, o 1080×1920 para Shorts (vertical).
export async function thumbnailBlob(spec, { vertical = false } = {}) {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = vertical ? 1080 : SIZE.width;
  canvas.height = vertical ? 1920 : SIZE.height;
  drawThumbnail(canvas, spec);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen."))), "image/png"),
  );
}
