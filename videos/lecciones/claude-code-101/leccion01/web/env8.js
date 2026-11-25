// ---------- Claude Code 101: el monito pixelado de Claude Code + utilería de programación ----------
const CLAWD = '#d97757';
// Rejilla 11x6 del monito (X cuerpo, E ojo, . vacío). Brazos en la fila 2, cuatro patas abajo.
const CLAWD_GRID = ['..XXXXXXX..', '..XEXXXEX..', 'XXXEXXXEXXX', '..XXXXXXX..', '..X.X.X.X..', '..X.X.X.X..'];
// x, y = centro de los pies; s = tamaño de un píxel. o: {wave (0..1 brazo derecho arriba), look (-1..1),
// walk (bool), happy, sweat, glow, alpha, col, flip}
function clawd(ctx, x, y, s, t, o = {}) {
  const col = o.col || CLAWD, gw = 11, gh = 6;
  const hop = o.walk ? Math.abs(Math.sin(t * 9)) * s * .5 : Math.sin(t * 2.2) * s * .12;
  const blink = (t * .9 + (o.seed || 0)) % 3.3 < .12;
  ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha = o.alpha; if (o.flip) ctx.scale(-1, 1);
  // sombra en el suelo
  ellipse(ctx, 0, s * .2, s * 5.2, s * .7); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
  if (o.glow !== 0) glow(ctx, 0, -s * 3.5, s * 9, 'rgba(217,119,87,A)', o.glow == null ? .9 : o.glow);
  ctx.translate(-gw * s / 2, -gh * s - hop);
  const cells = [];
  CLAWD_GRID.forEach((row, r) => [...row].forEach((c, k) => {
    if (c === '.') return;
    let rr = r;
    if (r >= 4 && o.walk && ((k / 2 | 0) % 2 === (Math.sin(t * 9) > 0 ? 0 : 1)) && r === 5) return;   // pata levantada
    if (k === 10 && r === 2 && o.wave > 0) rr = 2 - Math.round(clamp(o.wave) * 2 * (.6 + .4 * Math.abs(Math.sin(t * 8))));
    cells.push([k, rr, c]);
  }));
  // contorno: cada píxel inflado en tinta, luego el relleno
  const b = Math.max(2, s * .22);
  ctx.fillStyle = INK; for (const [k, r] of cells) ctx.fillRect(k * s - b, r * s - b, s + 2 * b, s + 2 * b);
  for (const [k, r, c] of cells) { ctx.fillStyle = col; ctx.fillRect(k * s - .5, r * s - .5, s + 1, s + 1); }
  // brillo arriba a la izquierda
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(2 * s, 0, 7 * s, s * .35);
  // ojos
  const lx = clamp(o.look || 0, -1, 1) * s * .3;
  for (const ex of [3, 7]) {
    ctx.fillStyle = INK;
    if (o.happy) { ctx.fillRect(ex * s + lx, 1.5 * s, s, s * .55); }
    else if (blink) ctx.fillRect(ex * s + lx, 2.2 * s, s, s * .35);
    else ctx.fillRect(ex * s + lx + s * .12, s * 1.05, s * .76, s * 1.9);
  }
  if (o.sweat) sweat(ctx, 10.6 * s, -.6 * s, s * 1.4, o.sweat);
  ctx.restore();
}
// Lista de líneas de terminal. lines: [[tiempo, texto, color]]
function termLines(ctx, x, y, w, h, t, lines, title = 'Terminal', size = 38) {
  windowFrame(ctx, x, y, w, h, title, '#141225', '#2a2160');
  lines.forEach(([t0, s, c], i) => { const k = clamp((t - t0) / Math.max(.25, s.length * .025)); if (k <= 0) return; text(ctx, s.slice(0, Math.ceil(s.length * k)), x + 40, y + 108 + i * size * 1.6, size, c || '#fff', INK, 0, 'Poppins', 600, 'left'); });
}
// Tarjeta de archivo con nombre y unas líneas de código (hl: 0..1 resalta, tag: texto en el centro)
function fileCard(ctx, x, y, w, h, name, p, o = {}) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 3) * (o.alpha == null ? 1 : o.alpha);
  rrect(ctx, -w / 2, -h / 2, w, h, 16); fillStroke(ctx, '#1d1a33', 6);
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 16); ctx.clip(); ctx.fillStyle = o.bar || '#2a2160'; ctx.fillRect(-w / 2, -h / 2, w, 50); ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, 16); fillStroke(ctx, null, 6);
  text(ctx, name, 0, -h / 2 + 26, 26, '#fff', INK, 0, 'Poppins', 600);
  const n = o.lines == null ? 3 : o.lines;
  for (let k = 0; k < n; k++) line(ctx, -w / 2 + 30, -h / 2 + 90 + k * 34, w / 2 - 40 - (k % 3) * 40, -h / 2 + 90 + k * 34, 9, ['#ff8ac0', '#8fe3d6', '#ffd76a'][k % 3] + '88');
  if (o.tag) text(ctx, o.tag, 0, o.tagY || h / 2 - 50, o.tagSize || 30, o.tagCol || '#ffd76a', INK, 0, 'Poppins', 600);
  if (o.hl > 0) { ctx.globalAlpha = clamp(o.hl); rrect(ctx, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 22); ctx.lineWidth = 8; ctx.strokeStyle = o.hlCol || '#ffd23a'; ctx.stroke(); }
  ctx.restore();
}
// Bucle agéntico: nodos alrededor de un círculo; k = posición (0..n) del punto que da vueltas
function loopCycle(ctx, cx, cy, r, labels, cols, p, k, t) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(p * 2);
  circle(ctx, cx, cy, r); ctx.lineWidth = 22; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([26, 22]); ctx.lineDashOffset = -t * 60; ctx.stroke(); ctx.setLineDash([]);
  const n = labels.length, ang = i => -Math.PI / 2 + i / n * TAU;
  if (k != null) { const a = ang(k); circle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 22); fillStroke(ctx, '#ffd23a', 6); }
  labels.forEach((s, i) => { const a = ang(i), act = k != null && Math.floor(k + .5) % n === i; pill(ctx, s, cx + Math.cos(a) * r * 1.02, cy + Math.sin(a) * r * 1.02, act ? cols[i] : '#3a2f7a', clamp(p * 1.5 - i * .25), act ? 38 : 34); });
  ctx.restore();
}
// Diálogo de permiso estilo terminal
function permDialog(ctx, x, y, w, cmd, p, choice) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 3);
  rrect(ctx, -w / 2, -130, w, 260, 22); fillStroke(ctx, '#1d1a33', 7, '#ffd23a');
  text(ctx, 'Claude quiere ejecutar:', -w / 2 + 40, -80, 34, '#fff', INK, 0, 'Poppins', 600, 'left');
  text(ctx, cmd, -w / 2 + 40, -24, 38, '#8fe3d6', INK, 0, 'Poppins', 700, 'left');
  [['Sí, permitir', '#2fbf5b'], ['No', '#e0392f']].forEach(([s, c], i) => { const bx = -w / 2 + 40 + i * 330, sel = choice === i;
    rrect(ctx, bx, 30, i ? 160 : 290, 70, 35); fillStroke(ctx, sel ? c : '#3a2f7a', 5, sel ? '#fff' : INK); text(ctx, s, bx + (i ? 80 : 145), 66, 32, '#fff', INK, 0); });
  ctx.restore();
}
// Escudo (revisión de seguridad)
function shield(ctx, x, y, s, col = '#2fbf5b', p = 1) {
  if (p <= 0) return; const k = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(85, -68); ctx.quadraticCurveTo(85, 55, 0, 105); ctx.quadraticCurveTo(-85, 55, -85, -68); ctx.closePath(); fillStroke(ctx, col, 9);
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-8, 28); ctx.lineTo(40, -30); ctx.lineWidth = 16; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
}
// Bicho (un error en el código)
function bug(ctx, x, y, s, t, p = 1) {
  if (p <= 0) return; const k = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k); ctx.rotate(Math.sin(t * 6) * .12);
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) line(ctx, 0, -10 + i * 22, sd * 62, -26 + i * 30 + Math.sin(t * 14 + i) * 5, 7, INK);
  line(ctx, -10, -44, -28, -72, 6, INK); line(ctx, 10, -44, 28, -72, 6, INK);
  ellipse(ctx, 0, 10, 42, 52); fillStroke(ctx, '#e0392f', 7); circle(ctx, 0, -40, 24); fillStroke(ctx, '#2a1a1a', 6);
  line(ctx, 0, -30, 0, 60, 5, INK); for (const [a, b] of [[-18, 0], [18, 14], [-16, 32]]) { circle(ctx, a, b, 8); ctx.fillStyle = INK; ctx.fill(); }
  ctx.restore();
}
// Lupa
function magnifier(ctx, x, y, s, rot = -.6) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(rot);
  rrect(ctx, -12, 50, 24, 90, 10); fillStroke(ctx, '#7a5230', 6);
  circle(ctx, 0, 0, 56); ctx.fillStyle = 'rgba(180,230,255,.35)'; ctx.fill(); ctx.lineWidth = 16; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = '#cfd6e8'; ctx.stroke();
  ctx.restore();
}
// Ventana de juego con botón JUGAR (ok: 0..1 funciona)
function gameWindow(ctx, x, y, w, h, t, ok, press) {
  windowFrame(ctx, x, y, w, h, 'mi-juego', '#2b8fd6', '#2a2160');
  ctx.save(); rrect(ctx, x, y + 56, w, h - 56, 0); ctx.clip();
  ctx.fillStyle = '#5fb84f'; ctx.fillRect(x, y + h - 120, w, 120); hill(ctx, x + w * .3, y + h - 110, 420, 120, '#4aa63e');
  text(ctx, 'AVENTURA PIXEL', x + w / 2, y + 150, 58, '#fff', INK, 10);
  ctx.restore();
  const bx = x + w / 2, by = y + h / 2 + 50, sc = 1 - (press || 0) * .08;
  ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
  if (ok > 0) glow(ctx, 0, 0, 220, 'rgba(255,230,90,A)', ok);
  rrect(ctx, -150, -50, 300, 100, 50); fillStroke(ctx, ok > .5 ? '#2fbf5b' : '#9a98a8', 8); text(ctx, 'JUGAR', 0, 3, 48, '#fff', INK, 0);
  ctx.restore();
}
// Fila de paso con casilla (estado: 0 pendiente, 1 hecho, 2 falló)
function stepRow(ctx, x, y, str, p, state = 1) {
  if (p <= 0) return; const k = backOut(clamp(p));
  ctx.save(); ctx.globalAlpha = clamp(p * 3); ctx.translate(x + (1 - k) * -50, y);
  const col = state === 2 ? '#e0392f' : state === 1 ? '#2fbf5b' : '#5b5490';
  circle(ctx, 0, 0, 30); fillStroke(ctx, col, 6);
  if (state === 1) { ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-3, 11); ctx.lineTo(15, -11); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke(); }
  if (state === 2) { line(ctx, -10, -10, 10, 10, 7, '#fff'); line(ctx, 10, -10, -10, 10, 7, '#fff'); }
  text(ctx, str, 54, 2, 40, '#fff', INK, 0, 'Poppins', 600, 'left'); ctx.restore();
}
// Glifos sencillos para las tarjetas de "dónde usarlo"
function placeGlyph(ctx, kind, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'term') { rrect(ctx, -70, -50, 140, 100, 14); fillStroke(ctx, '#141225', 6); text(ctx, '>_', -20, 0, 44, '#9be37a', INK, 0); }
  else if (kind === 'vscode') { rrect(ctx, -70, -50, 140, 100, 14); fillStroke(ctx, '#1d1a33', 6); ctx.fillStyle = '#2f9ad6'; ctx.fillRect(-64, -44, 26, 88); for (let i = 0; i < 4; i++) line(ctx, -26, -26 + i * 18, 50 - (i % 2) * 26, -26 + i * 18, 7, ['#ff8ac0', '#8fe3d6', '#ffd76a', '#b07bff'][i]); }
  else if (kind === 'jet') { rrect(ctx, -60, -60, 120, 120, 10); fillStroke(ctx, '#111', 6); text(ctx, 'IDE', 0, -8, 40, '#fff', INK, 0); line(ctx, -34, 34, 0, 34, 8, '#fff'); }
  else if (kind === 'desk') { rrect(ctx, -76, -56, 152, 96, 10); fillStroke(ctx, '#fffaf2', 6); rrect(ctx, -30, 40, 60, 12, 4); fillStroke(ctx, '#9aa0b8', 4); ctx.save(); ctx.scale(.08, .08); ctx.restore(); clawd(ctx, 0, 20, 7, t, { glow: 0 }); }
  else if (kind === 'web') { circle(ctx, 0, 0, 60); fillStroke(ctx, '#34d1ff', 6); ctx.lineWidth = 5; ctx.strokeStyle = INK; ellipse(ctx, 0, 0, 26, 60); ctx.stroke(); line(ctx, -60, 0, 60, 0, 5, INK); line(ctx, -52, -30, 52, -30, 4, INK); line(ctx, -52, 30, 52, 30, 4, INK); }
  ctx.restore();
}

// En este curso, Claude es el monito: reemplaza al orbe de la plantilla en la utilería que lo usa (laptop, paneles)
function orb(ctx, x, y, r, t, o = {}) { clawd(ctx, x, y + r * .55, r / 5.5, t, { glow: o.glow == null ? .6 : o.glow }); }
