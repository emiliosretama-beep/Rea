// ---------- acciones: disco, puesto, dinero, tarjeta ACCIÓN, empresa, flechas ----------
const GREEN = '#2fbf5b', RED = '#e0392f';
function vinyl(ctx, x, y, r, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  circle(ctx, 0, 0, r); fillStroke(ctx, '#1b1820', r * .04);
  for (let i = 1; i < 5; i++) { circle(ctx, 0, 0, r * (.45 + i * .11)); ctx.lineWidth = r * .012; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 0, r * .92, -1.1, -.5); ctx.lineWidth = r * .05; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke();
  circle(ctx, 0, 0, r * .34); fillStroke(ctx, '#ff5a8a', r * .02);
  circle(ctx, 0, 0, r * .05); ctx.fillStyle = '#1b1820'; ctx.fill();
  ctx.restore();
}
function bills(ctx, x, y, s, rot = 0, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (let i = 2; i >= 0; i--) { rrect(ctx, -70 + i * 8, -38 - i * 8, 140, 76, 8); fillStroke(ctx, '#7fd18a', 5); circle(ctx, i * 8, -i * 8, 22); fillStroke(ctx, '#b9ecbf', 4); text(ctx, '$', i * 8, -i * 8 + 2, 30, '#2a7a3a', INK, 0); }
  ctx.restore();
}
function shareCard(ctx, x, y, s, rot = 0, label = 'ACCIÓN', col = '#5b3df5', a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -120, -80, 240, 160, 18); fillStroke(ctx, '#fffaf0', 7);
  ctx.save(); rrect(ctx, -120, -80, 240, 160, 18); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(-120, -80, 240, 46); ctx.restore();
  rrect(ctx, -120, -80, 240, 160, 18); fillStroke(ctx, null, 7);
  text(ctx, label, 0, -56, 32, '#fff', INK, 0);
  for (let i = 0; i < 3; i++) line(ctx, -90, -6 + i * 26, 60 - i * 30, -6 + i * 26, 6, '#c9c2b0');
  circle(ctx, 80, 40, 22); fillStroke(ctx, '#ffcf3a', 5);
  ctx.restore();
}
function building(ctx, x, y, s, label = 'EMPRESA', tint = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -170, -420, 340, 420, 14); fillStroke(ctx, mix('#e8ecf6', '#9aa0b8', tint), 8);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { rrect(ctx, -135 + c * 75, -380 + r * 70, 50, 44, 6); fillStroke(ctx, mix('#8fd0ff', '#5a6a8a', tint), 4); }
  rrect(ctx, -40, -80, 80, 80, 6); fillStroke(ctx, '#6b4a2a', 5);
  rrect(ctx, -150, -500, 300, 70, 14); fillStroke(ctx, '#2a2160', 7); text(ctx, label, 0, -464, 44, '#fff', INK, 0);
  ctx.restore();
}
// flecha curva con avance p; crossed = tachada en rojo
function arrow(ctx, x0, y0, x1, y1, p, col = GREEN, bend = -120, w = 16, crossed = 0) {
  if (p <= 0) return;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + bend;
  const q = k => [(1 - k) ** 2 * x0 + 2 * (1 - k) * k * mx + k * k * x1, (1 - k) ** 2 * y0 + 2 * (1 - k) * k * my + k * k * y1];
  const pe = clamp(p);
  ctx.beginPath(); for (let k = 0; k <= pe + 1e-6; k += .02) { const pt = q(Math.min(k, pe)); k ? ctx.lineTo(...pt) : ctx.moveTo(...pt); }
  ctx.lineWidth = w + 8; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  const a = q(pe), b = q(Math.max(0, pe - .04)), ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  ctx.save(); ctx.translate(...a); ctx.rotate(ang); path(ctx, [[w * 2.2, 0], [-w * 1.2, -w * 1.8], [-w * 1.2, w * 1.8]]); fillStroke(ctx, col, 6); ctx.restore();
  if (crossed > 0) { const m = q(.5), c = backOut(clamp(crossed)) * 60; line(ctx, m[0] - c, m[1] - c, m[0] + c, m[1] + c, 20, RED); line(ctx, m[0] + c, m[1] - c, m[0] - c, m[1] + c, 20, RED); }
}
function counter(ctx, x, y, label, val, p, col = RED) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.font = '700 54px Poppins'; const str = `${label}${val}`; const w = ctx.measureText(str).width + 70;
  rrect(ctx, -w / 2, -48, w, 96, 48); fillStroke(ctx, '#fff', 8); text(ctx, str, 0, 3, 54, col, INK, 0);
  ctx.restore();
}
function stall(ctx, x, y, t) {
  // puesto de mercadillo con toldo a rayas y cajas de discos
  rrect(ctx, x - 380, y - 520, 30, 520, 6); fillStroke(ctx, '#8a5a32', 6); rrect(ctx, x + 350, y - 520, 30, 520, 6); fillStroke(ctx, '#8a5a32', 6);
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x - 410 + i * 105, y - 560); ctx.lineTo(x - 305 + i * 105, y - 560); ctx.lineTo(x - 305 + i * 105, y - 480); ctx.quadraticCurveTo(x - 357 + i * 105, y - 440, x - 410 + i * 105, y - 480); ctx.closePath(); fillStroke(ctx, i % 2 ? '#fff4e0' : '#e0392f', 6); }
  rrect(ctx, x - 400, y - 200, 800, 200, 10); fillStroke(ctx, '#c9894a', 7);
  for (let i = 0; i < 7; i++) { rrect(ctx, x - 360 + i * 105, y - 300, 90, 110, 6); fillStroke(ctx, ['#2f63c9', '#f2b52a', '#3fa35b', '#7a4bc4', '#e26a2c', '#2fbfb0', '#c0392b'][i], 5); circle(ctx, x - 315 + i * 105, y - 245, 28); ctx.fillStyle = '#1b1820'; ctx.fill(); }
  rrect(ctx, x - 150, y - 150, 300, 70, 10); fillStroke(ctx, '#fff4e0', 5); text(ctx, 'USADOS', x, y - 113, 44, '#c0392b', INK, 0);
}
function poster(ctx, x, y, s, rot, p) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * sc, s * sc);
  rrect(ctx, -110, -150, 220, 300, 8); fillStroke(ctx, '#ffe7a0', 7);
  drawStick(ctx, { x: 0, y: 110, s: 210, cols: ['#7a4bc4', '#7a4bc4'], hat: 'hair', hairCol: '#1b1820', belt: false, shadow: false, arms: { L: [2.4, .3], R: [.4, -.4] }, face: { mouth: 'grin', eyes: 'happy' } });
  text(ctx, 'ARTISTA', 0, -118, 34, '#7a4bc4', INK, 0);
  ctx.restore();
}
function phone(ctx, x, y, s, rot, pressed) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -90, -170, 180, 340, 28); fillStroke(ctx, '#1b1820', 6);
  rrect(ctx, -76, -150, 152, 300, 18); ctx.fillStyle = '#f6f6fb'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-60, 40); for (let i = 0; i <= 8; i++) ctx.lineTo(-60 + i * 15, 40 - Math.sin(i * .9) * 20 - i * 8); ctx.lineWidth = 6; ctx.strokeStyle = GREEN; ctx.stroke();
  rrect(ctx, -60, 80, 120, 50, 25); ctx.fillStyle = pressed ? GREEN : '#5b3df5'; ctx.fill(); text(ctx, pressed ? '✓' : 'COMPRAR', 0, 106, pressed ? 34 : 22, '#fff', INK, 0);
  ctx.restore();
}
