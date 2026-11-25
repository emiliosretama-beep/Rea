// ---------- mitos: cerebro, batería, Tierra, murciélago, pez, calendario ----------
// cerebro de perfil (centro x,y, tamaño s); lit: array de 0..1 por zona (6 zonas)
const BRAIN_COLS = ['#ff5a8a', '#ffcf3a', '#34d1ff', '#3fd08a', '#ff8a3a', '#b07bff'];
function brainPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s * .95, y + s * .1);
  ctx.bezierCurveTo(x - s * 1.05, y - s * .5, x - s * .6, y - s * .85, x - s * .15, y - s * .8);
  ctx.bezierCurveTo(x + s * .25, y - s * .95, x + s * .85, y - s * .75, x + s * .95, y - s * .25);
  ctx.bezierCurveTo(x + s * 1.1, y + s * .2, x + s * .85, y + s * .5, x + s * .55, y + s * .5);
  ctx.bezierCurveTo(x + s * .45, y + s * .75, x + s * .2, y + s * .8, x + s * .1, y + s * .62);
  ctx.bezierCurveTo(x - s * .2, y + s * .7, x - s * .75, y + s * .6, x - s * .95, y + s * .1);
  ctx.closePath();
}
function drawBrain(ctx, x, y, s, lit, t, base = '#f3a6c0') {
  brainPath(ctx, x, y, s); ctx.fillStyle = '#6a5a8a'; ctx.fill();
  ctx.save(); brainPath(ctx, x, y, s); ctx.clip();
  // 6 zonas en abanico
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + i * Math.PI * 2 / 6 - .3, a1 = a0 + Math.PI * 2 / 6, l = clamp(lit[i] || 0);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, s * 1.6, a0, a1); ctx.closePath();
    ctx.fillStyle = l > 0 ? mix('#6a5a8a', BRAIN_COLS[i], l) : '#6a5a8a'; ctx.fill();
  }
  // pliegues
  ctx.lineWidth = s * .035; ctx.strokeStyle = 'rgba(30,10,50,.35)'; ctx.lineCap = 'round';
  const R = rng(3);
  for (let i = 0; i < 9; i++) { const cx = x + (R() - .5) * s * 1.5, cy = y + (R() - .6) * s * 1.1; ctx.beginPath(); ctx.moveTo(cx - s * .2, cy); ctx.bezierCurveTo(cx - s * .1, cy - s * .15, cx + s * .05, cy + s * .12, cx + s * .2, cy - s * .04); ctx.stroke(); }
  ctx.fillStyle = 'rgba(10,10,60,.22)'; ctx.fillRect(x - s * 1.2, y - s, s * .6, s * 2);
  ctx.restore();
  brainPath(ctx, x, y, s); ctx.lineWidth = s * .04; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
  // tronco
  rrect(ctx, x + s * .05, y + s * .55, s * .18, s * .4, s * .08); ctx.fillStyle = '#6a5a8a'; ctx.fill();
}
function brainGlow(ctx, x, y, s, a) { glow(ctx, x, y, s * 2, 'rgba(255,150,220,A)', a); }
function battery(ctx, x, y, s, level, col = KZ.land) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -110, -200, 220, 400, 36); fillStroke(ctx, '#2a2160', 10, '#fff');
  rrect(ctx, -40, -230, 80, 34, 10); ctx.fillStyle = '#fff'; ctx.fill();
  const h = 360 * clamp(level); rrect(ctx, -90, 180 - h, 180, h, 22); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}
function silhouette(ctx, x, y, s, col = '#3a2f7a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
  circle(ctx, 0, -300, 110); ctx.fill();
  rrect(ctx, -150, -170, 300, 420, 90); ctx.fill();
  rrect(ctx, -235, -150, 70, 360, 35); ctx.fill(); rrect(ctx, 165, -150, 70, 360, 35); ctx.fill();
  rrect(ctx, -120, 220, 100, 420, 45); ctx.fill(); rrect(ctx, 20, 220, 100, 420, 45); ctx.fill();
  ctx.restore();
}
function stopwatch(ctx, x, y, s, frac, label) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -30, -210, 60, 50, 12); fillStroke(ctx, '#ffcf3a', 8, '#fff');
  circle(ctx, 0, 0, 180); fillStroke(ctx, '#2a2160', 12, '#fff');
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 150, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac)); ctx.closePath(); ctx.fillStyle = 'rgba(255,90,138,.85)'; ctx.fill();
  text(ctx, label, 0, 8, 110, '#fff', INK, 0);
  ctx.restore();
}
function earth(ctx, x, y, r, t) {
  glow(ctx, x, y, r * 1.45, 'rgba(80,170,255,A)', 1);
  circle(ctx, x, y, r); ctx.fillStyle = '#2a6fd6'; ctx.fill();
  ctx.save(); circle(ctx, x, y, r); ctx.clip();
  const R = rng(12), off = t * 12;
  for (let i = 0; i < 9; i++) { const cx = x - r + ((R() * 2 * r + off) % (2.4 * r)), cy = y + (R() - .5) * 1.6 * r, rr = r * (.18 + R() * .3); ellipse(ctx, cx, cy, rr, rr * .7, R() * 3); ctx.fillStyle = i % 3 ? '#3fd08a' : '#d9c26a'; ctx.fill(); }
  for (let i = 0; i < 5; i++) { ellipse(ctx, x - r + ((R() * 2 * r + off * 1.6) % (2.4 * r)), y + (R() - .5) * 1.5 * r, r * .3, r * .06, .2); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }
  ctx.fillStyle = 'rgba(10,10,60,.4)'; ctx.beginPath(); ctx.arc(x - r * .35, y, r * 1.05, 0, TAU); ctx.arc(x + r * .25, y, r * 1.1, 0, TAU, true); ctx.fill();
  ctx.restore();
}
function magnifier(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, 80, -16, 160, 32, 14); fillStroke(ctx, '#8a5a32', 7);
  circle(ctx, 0, 0, 95); ctx.fillStyle = 'rgba(200,240,255,.35)'; ctx.fill(); ctx.lineWidth = 20; ctx.strokeStyle = '#c9cdd6'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ellipse(ctx, -30, -35, 26, 12, -.6); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
  ctx.restore();
}
function helmet(ctx, x, y, r) { circle(ctx, x, y, r); ctx.fillStyle = 'rgba(190,230,255,.28)'; ctx.fill(); ctx.lineWidth = r * .07; ctx.strokeStyle = '#e8eef8'; ctx.stroke(); ctx.lineWidth = r * .025; ctx.strokeStyle = INK; ctx.stroke(); ellipse(ctx, x - r * .45, y - r * .45, r * .2, r * .1, -.7); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill(); }
function bat(ctx, x, y, s, open, flap, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1); ctx.rotate(-flap * .5);
    ctx.beginPath(); ctx.moveTo(40, -20); ctx.quadraticCurveTo(160, -150, 300, -60); ctx.quadraticCurveTo(260, -30, 250, 20); ctx.quadraticCurveTo(210, -10, 180, 30); ctx.quadraticCurveTo(140, 0, 110, 40); ctx.quadraticCurveTo(80, 20, 40, 40); ctx.closePath(); fillStroke(ctx, '#4a3a6a', 8);
    ctx.restore();
  }
  ellipse(ctx, 0, 30, 90, 120); fillStroke(ctx, '#5a4880', 8);
  for (const sd of [-1, 1]) { path(ctx, [[sd * 30, -70], [sd * 70, -170], [sd * 80, -50]]); fillStroke(ctx, '#5a4880', 8); }
  for (const sd of [-1, 1]) {
    const ex = sd * 36, ey = -10;
    if (open > .05) { ellipse(ctx, ex, ey, 30, 30 * open); fillStroke(ctx, '#fff', 6); circle(ctx, ex + sd * 4, ey + 2, 14 * open); ctx.fillStyle = INK; ctx.fill(); circle(ctx, ex, ey - 6, 5 * open); ctx.fillStyle = '#fff'; ctx.fill(); }
    else line(ctx, ex - 24, ey, ex + 24, ey, 7);
  }
  ctx.beginPath(); ctx.arc(0, 50, 26, .3, Math.PI - .3); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
  path(ctx, [[-14, 66], [-6, 84], [2, 66]]); ctx.fillStyle = '#fff'; ctx.fill(); path(ctx, [[2, 66], [10, 84], [18, 66]]); ctx.fill();
  ctx.restore();
}
function fishbowl(ctx, x, y, r, t) {
  ellipse(ctx, x, y + r * .95, r * .62, r * .12); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * .78, Math.PI * 1.78 - Math.PI * 2 + TAU); ctx.fillStyle = 'rgba(170,225,255,.35)'; ctx.fill();
  ctx.save(); circle(ctx, x, y, r); ctx.clip(); ctx.fillStyle = 'rgba(60,160,230,.55)'; ctx.fillRect(x - r, y - r * .55 + Math.sin(t * 2) * 6, 2 * r, 2 * r);
  ctx.fillStyle = '#e8d6a0'; ellipse(ctx, x, y + r * .95, r * .8, r * .25); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * .5 + i * r * .25, y + r * .85); ctx.quadraticCurveTo(x - r * .6 + i * r * .25 + Math.sin(t * 2 + i) * 20, y + r * .4, x - r * .45 + i * r * .25, y + r * .1); ctx.lineWidth = 10; ctx.strokeStyle = '#3fa35b'; ctx.stroke(); }
  ctx.restore();
  circle(ctx, x, y, r); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ellipse(ctx, x - r * .5, y - r * .45, r * .14, r * .06, -.8); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
}
function goldfish(ctx, x, y, s, t, face = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (face.flip || 1), s); ctx.rotate(Math.sin(t * 3) * .06);
  const tail = Math.sin(t * 9) * .3;
  ctx.save(); ctx.translate(-80, 0); ctx.rotate(tail); path(ctx, [[0, 0], [-90, -60], [-70, 0], [-90, 60]]); fillStroke(ctx, '#ff8a2a', 7); ctx.restore();
  ellipse(ctx, 0, 0, 110, 72); fillStroke(ctx, '#ffa62a', 7);
  path(ctx, [[-10, -60], [30, -100], [50, -55]]); fillStroke(ctx, '#ff8a2a', 6);
  ctx.save(); ellipse(ctx, 0, 0, 110, 72); ctx.clip(); ctx.fillStyle = 'rgba(200,60,0,.18)'; ctx.fillRect(-120, 20, 240, 80); ctx.restore();
  const ex = 52, ey = -14;
  circle(ctx, ex, ey, 24); fillStroke(ctx, '#fff', 5); circle(ctx, ex + 6, ey + (face.lookUp ? -6 : 2), 11); ctx.fillStyle = INK; ctx.fill();
  if (face.happy) { ctx.beginPath(); ctx.arc(80, 18, 16, .2, Math.PI - .4); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); } else { ellipse(ctx, 92, 18, 9, 11); fillStroke(ctx, '#c0392b', 5); }
  ctx.restore();
}
function calendarPage(ctx, x, y, s, label, rot = 0, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -150, -160, 300, 320, 24); fillStroke(ctx, '#fbf7ec', 8);
  ctx.save(); rrect(ctx, -150, -160, 300, 320, 24); ctx.clip(); ctx.fillStyle = '#e0392f'; ctx.fillRect(-150, -160, 300, 90); ctx.restore();
  rrect(ctx, -150, -160, 300, 320, 24); fillStroke(ctx, null, 8);
  text(ctx, label, 0, -112, 54, '#fff', INK, 0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { rrect(ctx, -120 + c * 50, -50 + r * 50, 36, 36, 6); ctx.fillStyle = '#e8e0cc'; ctx.fill(); }
  ctx.restore();
}
function followBtn(ctx, x, y, p, pressed) {
  if (p <= 0) return; const sc = backOut(clamp(p)) * (pressed ? .92 : 1);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  rrect(ctx, -230, -70, 460, 140, 70); fillStroke(ctx, pressed ? '#3fa35b' : '#e0392f', 9);
  text(ctx, pressed ? 'SIGUIENDO ✓' : 'SEGUIR', 0, 4, 64, '#fff', INK, 0);
  ctx.restore();
}
function cave(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c1640'); g.addColorStop(1, '#3a2a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#120e2a'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 90) ctx.lineTo(x, 120 + (x / 90 % 2) * 110); ctx.lineTo(W, 0); ctx.fill();
  drawMoon(ctx, 860, 330, 70);
}
