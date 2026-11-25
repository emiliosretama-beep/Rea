// ---------- Claude 101 (horizontal 1920x1080): utilería ----------
const ORANGE = '#f08a4b', PURPLE = '#5b3df5';
// tiempos a partir de las palabras alineadas
const _n = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%.]/g, '');
const L = i => { const w = WORDS.find(w => w.line === i); return w ? w.s : 0; };
const LE = i => { const ws = WORDS.filter(w => w.line === i); return ws.length ? ws[ws.length - 1].e : 0; };
const T = (i, word, n = 0) => { const ws = WORDS.filter(w => w.line === i && _n(w.w).startsWith(_n(word))); return ws.length ? ws[Math.min(n, ws.length - 1)].s : L(i); };
const at = (t, t0, d = .3) => clamp((t - t0) / d);

function kzBGH(ctx, t, tint = 0) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#160d45'); g.addColorStop(1, '#0c0830'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const h = ctx.createRadialGradient(960, 480, 60, 960, 480, 1000); h.addColorStop(0, `rgba(${tint ? '255,140,80' : '140,80,255'},.26)`); h.addColorStop(1, 'rgba(140,80,255,0)'); ctx.fillStyle = h; ctx.fillRect(0, 0, W, H);
  const R = rng(91);
  for (let i = 0; i < 120; i++) { const x = R() * W, y = R() * H, r = 1.5 + R() * 2.8, tw = .5 + .5 * Math.sin(t * 2 + i); ctx.globalAlpha = .3 + .5 * tw; circle(ctx, x, y, r); ctx.fillStyle = i % 3 ? '#fff' : '#b9a3ff'; ctx.fill(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H * .8, a = .5 + .5 * Math.sin(t * 3 + i * 2); sparkle(ctx, x, y, 12 + 8 * a, .3 + .5 * a); }
}
function roomBG(ctx, t, wall = '#f3e6cf', floor = '#d9b98a') {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.04)'; for (let x = 0; x < W; x += 120) ctx.fillRect(x, 0, 60, 820);
  ctx.fillStyle = floor; ctx.fillRect(0, 820, W, 300); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 820, W, 14);
}
// el orbe que representa a Claude en este video (personaje genérico, no es un logo)
function orb(ctx, x, y, r, t, o = {}) {
  const pulse = 1 + Math.sin(t * 3) * .03;
  glow(ctx, x, y, r * 2.6, 'rgba(240,138,75,A)', o.glow == null ? 1 : o.glow);
  ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * r * .06); ctx.scale(pulse, pulse);
  const g = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r); g.addColorStop(0, '#ffd2a8'); g.addColorStop(1, o.col || ORANGE);
  circle(ctx, 0, 0, r); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = r * .07; ctx.strokeStyle = INK; ctx.stroke();
  // destello de 4 puntas arriba
  ctx.save(); ctx.translate(r * .55, -r * .6); ctx.rotate(t * .8); sparkle(ctx, 0, 0, r * .32, 1); ctx.restore();
  const bl = (Math.sin(t * 1.7) > .97) ? .1 : 1;
  for (const s of [-1, 1]) { ellipse(ctx, s * r * .3, -r * .05, r * .11, r * .16 * bl); ctx.fillStyle = INK; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, r * .2, r * .22, .3, Math.PI - .3); ctx.lineWidth = r * .06; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
function windowFrame(ctx, x, y, w, h, title, col = '#fffaf2', bar = '#2a2160') {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; rrect(ctx, x, y, w, h, 22); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  ctx.save(); rrect(ctx, x, y, w, h, 22); ctx.clip(); ctx.fillStyle = bar; ctx.fillRect(x, y, w, 56); ctx.restore();
  rrect(ctx, x, y, w, h, 22); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  for (let i = 0; i < 3; i++) { circle(ctx, x + 32 + i * 30, y + 28, 9); ctx.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][i]; ctx.fill(); }
  if (title) text(ctx, title, x + w / 2, y + 30, 28, '#fff', INK, 0, 'Poppins', 600);
}
function chatBubble(ctx, x, y, w, h, mine, p = 1, lines = 2) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x + (mine ? w : 0), y); ctx.scale(sc, sc); ctx.translate(-(mine ? w : 0), 0);
  rrect(ctx, 0, 0, w, h, 22); fillStroke(ctx, mine ? '#dfe7ff' : '#ffe7d6', 5);
  for (let i = 0; i < lines; i++) line(ctx, 24, 26 + i * 26, w - 30 - (i % 2) * w * .25, 26 + i * 26, 9, mine ? '#9aa9e8' : '#f2b088');
  ctx.restore();
}
function icon(ctx, kind, x, y, s, col, p = 1) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(s * sc, s * sc);
  circle(ctx, 0, 0, 100); fillStroke(ctx, col, 8);
  ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'pen') { ctx.save(); ctx.rotate(-.7); rrect(ctx, -14, -55, 28, 90, 6); ctx.fill(); path(ctx, [[-14, 35], [14, 35], [0, 62]]); ctx.fill(); ctx.restore(); }
  else if (kind === 'search') { circle(ctx, -12, -12, 34); ctx.stroke(); line(ctx, 14, 14, 46, 46, 16, '#fff'); }
  else if (kind === 'code') { ctx.beginPath(); ctx.moveTo(-30, -36); ctx.lineTo(-60, 0); ctx.lineTo(-30, 36); ctx.moveTo(30, -36); ctx.lineTo(60, 0); ctx.lineTo(30, 36); ctx.moveTo(12, -46); ctx.lineTo(-12, 46); ctx.stroke(); }
  else if (kind === 'brain') { ctx.save(); ctx.scale(.13, .13); drawBrain(ctx, 0, 0, 380, [1, 1, 1, 1, 1, 1], 0); ctx.restore(); }
  else if (kind === 'learn') { path(ctx, [[-62, -10], [0, -40], [62, -10], [0, 20]]); ctx.fill(); ctx.beginPath(); ctx.moveTo(-34, 4); ctx.lineTo(-34, 34); ctx.quadraticCurveTo(0, 56, 34, 34); ctx.lineTo(34, 4); ctx.stroke(); line(ctx, 62, -10, 62, 34, 8, '#fff'); }
  ctx.restore();
}
function slider(ctx, x, y, w, label, v, col) {
  text(ctx, label, x, y - 46, 34, '#fff', INK, 0, 'Poppins', 700, 'left');
  rrect(ctx, x, y - 10, w, 20, 10); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
  rrect(ctx, x, y - 10, w * v, 20, 10); ctx.fillStyle = col; ctx.fill();
  circle(ctx, x + w * v, y, 26); fillStroke(ctx, '#fff', 6);
}
function pageStack(ctx, x, y, n, t) {
  for (let i = 0; i < n; i++) { const R = rng(i + 3); rrect(ctx, x - 90 + (R() - .5) * 14, y - i * 9, 180, 230, 6); fillStroke(ctx, i % 2 ? '#fffdf6' : '#f3efe2', 3); }
  for (let k = 0; k < 6; k++) line(ctx, x - 60, y - n * 9 + 30 + k * 26, x + 50 - (k % 2) * 40, y - n * 9 + 30 + k * 26, 6, '#cfc6ad');
}
function devicePhone(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -110, -220, 220, 440, 34); fillStroke(ctx, '#1b1820', 6); rrect(ctx, -94, -196, 188, 392, 22); ctx.fillStyle = '#fffaf2'; ctx.fill();
  chatBubble(ctx, -80, -160, 130, 60, true, 1, 1); chatBubble(ctx, -80, -80, 150, 90, false, 1, 2); chatBubble(ctx, -40, 30, 110, 60, true, 1, 1);
  ctx.restore();
}
function deviceLaptop(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -260, -330, 520, 330, 18); fillStroke(ctx, '#1b1820', 6); rrect(ctx, -238, -308, 476, 286, 10); ctx.fillStyle = '#fffaf2'; ctx.fill();
  chatBubble(ctx, -200, -280, 220, 60, true, 1, 1); chatBubble(ctx, -200, -200, 340, 100, false, 1, 3); orb(ctx, 180, -80, 34, t, { glow: 0 });
  path(ctx, [[-320, 0], [320, 0], [290, 34], [-290, 34]]); fillStroke(ctx, '#9aa0b8', 6);
  ctx.restore();
}
function deviceBrowser(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  windowFrame(ctx, -300, -220, 600, 440, '');
  rrect(ctx, -170, -206, 340, 30, 15); ctx.fillStyle = '#fff'; ctx.fill(); text(ctx, 'claude.ai', 0, -190, 22, '#2a2160', INK, 0, 'Poppins', 600);
  chatBubble(ctx, -40, -140, 300, 60, true, 1, 1); chatBubble(ctx, -260, -60, 380, 110, false, 1, 3); chatBubble(ctx, 0, 80, 260, 60, true, 1, 1);
  ctx.restore();
}
function checkRow(ctx, x, y, str, p, col = '#2fbf5b') {
  if (p <= 0) return; const k = backOut(clamp(p));
  ctx.save(); ctx.globalAlpha = clamp(p * 3); ctx.translate(x + (1 - k) * -60, y);
  circle(ctx, 0, 0, 34); fillStroke(ctx, col, 6);
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-4, 13); ctx.lineTo(17, -13); ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke();
  text(ctx, str, 60, 2, 44, '#fff', INK, 0, 'Poppins', 600, 'left'); ctx.restore();
}
function crossRow(ctx, x, y, str, p) {
  if (p <= 0) return; const k = backOut(clamp(p));
  ctx.save(); ctx.globalAlpha = clamp(p * 3); ctx.translate(x, y); ctx.scale(k, k);
  ctx.font = '600 38px Poppins'; const tw = ctx.measureText(str).width, w = tw + 150;
  rrect(ctx, -w / 2, -46, w, 92, 46); fillStroke(ctx, '#3a2f7a', 6);
  const cx = -w / 2 + 50; circle(ctx, cx, 0, 30); fillStroke(ctx, RED, 5); line(ctx, cx - 12, -12, cx + 12, 12, 8, '#fff'); line(ctx, cx + 12, -12, cx - 12, 12, 8, '#fff');
  text(ctx, str, cx + 50 + tw / 2, 2, 38, '#fff', INK, 0, 'Poppins', 600); ctx.restore();
}
function lightbulb(ctx, x, y, s, on) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (on > 0) glow(ctx, 0, -20, 220, 'rgba(255,220,90,A)', on);
  ctx.beginPath(); ctx.arc(0, -30, 70, Math.PI * .8, Math.PI * 2.2); ctx.lineTo(28, 60); ctx.lineTo(-28, 60); ctx.closePath(); fillStroke(ctx, on > .5 ? '#ffe37a' : '#eeeeee', 7);
  rrect(ctx, -30, 60, 60, 40, 8); fillStroke(ctx, '#9aa0b8', 6);
  ctx.restore();
}
function sketchToUI(ctx, x, y, s, p, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // boceto
  ctx.save(); ctx.globalAlpha = 1 - clamp(p);
  rrect(ctx, -260, -200, 520, 400, 12); fillStroke(ctx, '#fffdf2', 5);
  ctx.setLineDash([14, 10]); ctx.lineWidth = 6; ctx.strokeStyle = '#6a6a7a';
  ctx.strokeRect(-220, -160, 440, 70); ctx.strokeRect(-220, -60, 200, 200); ctx.strokeRect(20, -60, 200, 90); ctx.strokeRect(20, 60, 200, 80); ctx.restore();
  // interfaz
  if (p > 0) { ctx.save(); ctx.globalAlpha = clamp(p); windowFrame(ctx, -260, -200, 520, 400, 'Prototipo');
    rrect(ctx, -220, -120, 440, 60, 12); fillStroke(ctx, PURPLE, 4); rrect(ctx, -220, -40, 200, 180, 16); fillStroke(ctx, '#ffd2a8', 4);
    rrect(ctx, 20, -40, 200, 80, 16); fillStroke(ctx, '#bfe8d0', 4); rrect(ctx, 20, 60, 200, 80, 40); fillStroke(ctx, '#2fbf5b', 4); text(ctx, 'OK', 120, 101, 34, '#fff', INK, 0);
    ctx.restore(); }
  ctx.restore();
}
function terminal(ctx, x, y, w, h, t, t0) {
  windowFrame(ctx, x, y, w, h, 'Terminal', '#141225', '#2a2160');
  const lines = [['$ ', 'claude', '#f08a4b'], ['  > ', 'editando app.js', '#8fe3d6'], ['  > ', 'npm test: 12 pruebas OK', '#9be37a'], ['  > ', 'git commit -m "arreglo"', '#ffd76a']];
  lines.forEach(([a, b, c], i) => { const k = clamp((t - t0 - i * .7) / .5); if (k <= 0) return; const s = b.slice(0, Math.floor(b.length * k)); text(ctx, a + s, x + 40, y + 110 + i * 70, 40, c, INK, 0, 'Poppins', 600, 'left'); });
}
function codeEditor(ctx, x, y, w, h, t, t0) {
  windowFrame(ctx, x, y, w, h, 'codigo.py', '#1d1a33', '#2a2160');
  const L2 = [['def ', '#ff8ac0'], ['saludar', '#8fe3d6'], ['(nombre):', '#fff']];
  const rows = [[['def ', '#ff8ac0'], ['saludar', '#8fe3d6'], ['(nombre):', '#ffffff']], [['    return ', '#ff8ac0'], ['f"Hola, {nombre}"', '#ffd76a']], [['', '#fff']], [['print', '#8fe3d6'], ['(saludar(', '#ffffff'], ['"Emilio"', '#ffd76a'], ['))', '#ffffff']]];
  rows.forEach((r, i) => { const k = clamp((t - t0 - i * .5) / .5); if (k <= 0) return; let cx = x + 50; ctx.save(); ctx.beginPath(); ctx.rect(x, y + 70 + i * 64, 50 + (w - 60) * k, 64); ctx.clip();
    r.forEach(([s, c]) => { ctx.font = '600 38px Poppins'; text(ctx, s, cx, y + 110 + i * 64, 38, c, INK, 0, 'Poppins', 600, 'left'); cx += ctx.measureText(s).width; }); ctx.restore(); });
}
function calendarWeek(ctx, x, y, s, hl, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -380, -250, 760, 500, 26); fillStroke(ctx, '#fffaf2', 7);
  ctx.save(); rrect(ctx, -380, -250, 760, 500, 26); ctx.clip(); ctx.fillStyle = '#e0392f'; ctx.fillRect(-380, -250, 760, 80); ctx.restore();
  rrect(ctx, -380, -250, 760, 500, 26); fillStroke(ctx, null, 7);
  text(ctx, 'MI SEMANA', 0, -208, 44, '#fff', INK, 0);
  const days = ['L', 'M', 'X', 'J', 'V'], ev = [[0, 0, '#bfe8d0'], [1, 1, '#ffd2a8'], [2, 0, '#dfe7ff'], [3, 2, '#ffe7a0'], [4, 1, '#f6c9e0'], [1, 2, '#dfe7ff'], [3, 0, '#bfe8d0']];
  days.forEach((d, i) => text(ctx, d, -300 + i * 150, -130, 36, '#2a2160', INK, 0));
  ev.forEach(([d, r, c], i) => { rrect(ctx, -360 + d * 150, -90 + r * 110, 120, 90, 12); fillStroke(ctx, c, 4); line(ctx, -340 + d * 150, -60 + r * 110, -260 + d * 150, -60 + r * 110, 6, 'rgba(0,0,0,.25)'); });
  if (hl > 0) { const [d, r] = ev[3]; ctx.save(); ctx.globalAlpha = hl; rrect(ctx, -372 + d * 150, -102 + r * 110, 144, 114, 18); ctx.lineWidth = 10; ctx.strokeStyle = ORANGE; ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
