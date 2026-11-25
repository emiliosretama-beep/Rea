// ---------- Roma: utilería 2D ----------
const ROMAN = { cols: ['#f4f1e8', '#f4f1e8'], vest: '#7a2a8a', belt: false, hat: 'laurel' };
const HIST = [
  { cols: ['#f4f1e8', '#f4f1e8'], vest: '#2f63c9', belt: false, hat: 'hair', hairCol: '#9a9a9a' },
  { cols: ['#f4f1e8', '#f4f1e8'], vest: '#3fa35b', belt: false, hat: 'hair', hairCol: '#3a2618' },
  { cols: ['#f4f1e8', '#f4f1e8'], vest: '#7a4bc4', belt: false, hat: 'hair', hairCol: '#8a5a2a' },
];
function parchmentBG(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(540, 900, 100, 540, 960, 1200); g.addColorStop(0, '#f7e7c2'); g.addColorStop(1, '#d9b67a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const R = rng(31); ctx.fillStyle = 'rgba(140,90,40,.08)';
  for (let i = 0; i < 60; i++) { ellipse(ctx, R() * W, R() * H, 30 + R() * 90, 10 + R() * 40, R() * 3); ctx.fill(); }
}
// texto con sello: aparece con rebote
function stamp(ctx, str, x, y, size, p, col = '#c0392b', rot = -.06, font = 'Lora') {
  if (p <= 0) return; const sc = lerp(1.8, 1, backOut(clamp(p)));
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 3);
  text(ctx, str, 0, 0, size, col, '#fff6e0', size * .12, font, 700); ctx.restore();
}
function scroll(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -60, -40, 120, 80, 6); fillStroke(ctx, '#f6ead0', 5);
  for (const sx of [-1, 1]) { rrect(ctx, sx * 60 - 10, -48, 20, 96, 10); fillStroke(ctx, '#c9a46a', 5); }
  for (let i = 0; i < 4; i++) line(ctx, -40, -22 + i * 14, 40 - (i % 2) * 18, -22 + i * 14, 4, '#9a7a4a');
  ctx.restore();
}
function scrollProp(ctx, k, hand, ang, side) {
  if (k !== 'R') return; ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-.3);
  rrect(ctx, -.06, -.035, .12, .07, .01); fillStroke(ctx, '#f6ead0', .008);
  for (const sx of [-1, 1]) { rrect(ctx, sx * .06 - .01, -.045, .02, .09, .01); fillStroke(ctx, '#c9a46a', .008); }
  ctx.restore();
}
function colosseumIcon(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -160, -110, 320, 150, 30); fillStroke(ctx, '#e6d5b0', 8);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const ax = -130 + i * 40, ay = -95 + r * 45; ctx.beginPath(); ctx.moveTo(ax, ay + 34); ctx.lineTo(ax, ay + 14); ctx.arc(ax + 12, ay + 14, 12, Math.PI, 0); ctx.lineTo(ax + 24, ay + 34); ctx.closePath(); fillStroke(ctx, '#6b5640', 4); }
  ellipse(ctx, 0, -110, 160, 26); fillStroke(ctx, '#d4c098', 8);
  ctx.restore();
}
function romeSky(ctx, t) {
  drawSky(ctx, '#3ea6ee', '#d9f0fb', -200, 1300);
  drawCloud(ctx, 200 + t * 8, 300, 110, 1); drawCloud(ctx, 860 + t * 5, 200, 80, 2);
  ctx.fillStyle = '#b9d98a'; ctx.fillRect(-400, 1300, 1900, 900);
}
function cinema(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1b1020'; ctx.fillRect(0, 0, W, H);
  // pantalla
  rrect(ctx, 70, 330, 940, 700, 14); fillStroke(ctx, '#7ec8f0', 10);
  ctx.save(); rrect(ctx, 70, 330, 940, 700, 14); ctx.clip();
  const g = ctx.createLinearGradient(0, 330, 0, 1030); g.addColorStop(0, '#ffb26b'); g.addColorStop(.55, '#ffd9a0'); g.addColorStop(.56, '#2d7fc0'); g.addColorStop(1, '#14507f'); ctx.fillStyle = g; ctx.fillRect(70, 330, 940, 700);
  drawSun(ctx, 800, 560, 60, t, .8);
  for (const [x, y, s, c] of [[300, 760, 1.2, '#c8392c'], [700, 800, 1.0, '#2f63c9'], [500, 880, 1.5, '#e3a92a']]) bigShip(ctx, x + Math.sin(t * 2 + x) * 10, y + Math.sin(t * 3 + x) * 6, s, c);
  ctx.restore();
  // telones
  for (const sd of [-1, 1]) { ctx.beginPath(); const x0 = sd < 0 ? 0 : W; ctx.moveTo(x0, 0); ctx.lineTo(540 + sd * 360, 0); ctx.quadraticCurveTo(540 + sd * 450, 600, 540 + sd * 520, 1250); ctx.lineTo(x0, 1250); ctx.closePath(); fillStroke(ctx, '#b3202f', 8); for (let i = 1; i < 4; i++) line(ctx, 540 + sd * (380 + i * 40), 30, 540 + sd * (440 + i * 30), 1220, 6, 'rgba(60,0,10,.35)'); }
  rrect(ctx, -20, -40, 1120, 120, 20); fillStroke(ctx, '#8a1424', 8);
  ctx.fillStyle = '#0d0810'; ctx.fillRect(0, 1250, W, 700);
  for (let i = 0; i < 9; i++) { circle(ctx, 70 + i * 125, 1560 + (i % 2) * 20, 70); ctx.fillStyle = '#2a1d33'; ctx.fill(); }
}
function bigShip(ctx, x, y, s, sail) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (let i = 0; i < 9; i++) line(ctx, -110 + i * 26, 10, -130 + i * 26, 60, 4, '#5a3a22');
  ctx.beginPath(); ctx.moveTo(-160, -10); ctx.lineTo(160, -10); ctx.quadraticCurveTo(140, 40, 90, 44); ctx.lineTo(-110, 44); ctx.quadraticCurveTo(-160, 30, -170, -30); ctx.closePath(); fillStroke(ctx, '#7a4a2a', 6);
  line(ctx, 0, -10, 0, -190, 7, '#5a3a22');
  rrect(ctx, -80, -180, 160, 120, 8); fillStroke(ctx, sail, 6);
  ctx.restore();
}
function bigX(ctx, p, x = 540, y = 680, r = 380) {
  if (p <= 0) return; const sc = lerp(1.6, 1, backOut(clamp(p)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 4);
  for (const a of [1, -1]) { ctx.save(); ctx.rotate(a * Math.PI / 4); rrect(ctx, -r, -48, 2 * r, 96, 40); fillStroke(ctx, '#e0392f', 12); ctx.restore(); }
  ctx.restore();
}
// mapa de Roma: Tíber, Coliseo y naumaquia de Augusto
function romeMap(ctx, t, o) {
  parchmentBG(ctx, t);
  ctx.save();
  const riv = () => { ctx.beginPath(); ctx.moveTo(470, 120); ctx.bezierCurveTo(300, 380, 600, 560, 470, 820); ctx.bezierCurveTo(380, 1000, 520, 1150, 420, 1500); ctx.bezierCurveTo(380, 1640, 460, 1800, 430, 1980); };
  riv(); ctx.lineWidth = 110; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); riv(); ctx.lineWidth = 94; ctx.strokeStyle = '#5fb2e0'; ctx.stroke();
  for (let i = 0; i < 6; i++) { const y = 200 + i * 250; line(ctx, 470 - 30, y + Math.sin(t * 2 + i) * 6, 470 + 10, y + 10, 5, 'rgba(255,255,255,.6)'); }
  // calles
  for (let i = 0; i < 7; i++) line(ctx, 620, 150 + i * 200, 1060, 220 + i * 190, 5, 'rgba(120,80,40,.25)');
  for (let i = 0; i < 6; i++) line(ctx, 0, 180 + i * 220, 330, 240 + i * 210, 5, 'rgba(120,80,40,.25)');
  ctx.restore();
  text(ctx, 'TÍBER', 560, 640, 46, '#1f5f8a', '#f7e7c2', 8, 'Lora', 700);
  colosseumIcon(ctx, 840, 1000, .75 * o.col);
  if (o.col > .5) text(ctx, 'COLISEO', 840, 1110, 44, INK, '#f7e7c2', 8, 'Lora', 700);
  // flecha punteada
  if (o.arrow > 0) {
    const pts = []; for (let k = 0; k <= 1; k += .02) pts.push([lerp(800, 220, k), 920 - Math.sin(k * Math.PI) * 360 + k * -60]);
    const n = Math.floor(pts.length * clamp(o.arrow));
    ctx.save(); ctx.setLineDash([26, 22]); ctx.beginPath(); pts.slice(0, n).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.lineWidth = 14; ctx.strokeStyle = '#c0392b'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    if (n > 2) { const [x1, y1] = pts[n - 1], [x0, y0] = pts[n - 3]; const a = Math.atan2(y1 - y0, x1 - x0); ctx.save(); ctx.translate(x1, y1); ctx.rotate(a); path(ctx, [[30, 0], [-20, -26], [-20, 26]]); fillStroke(ctx, '#c0392b', 6); ctx.restore(); }
  }
  if (o.pond > 0) {
    const p = backOut(clamp(o.pond));
    ctx.save(); ctx.translate(210, 880); ctx.scale(p, p);
    rrect(ctx, -150, -110, 300, 220, 30); fillStroke(ctx, '#5fb2e0', 9);
    bigShip(ctx, -40, 10, .35, '#c8392c'); bigShip(ctx, 60, -30, .3, '#2f63c9');
    ctx.restore();
    if (o.pond > .6) { text(ctx, 'NAUMAQUIA', 210, 1040, 40, INK, '#f7e7c2', 8, 'Lora', 700); text(ctx, 'DE AUGUSTO', 210, 1090, 40, INK, '#f7e7c2', 8, 'Lora', 700); }
  }
}
function banner(ctx, str, y, p, bg = '#c0392b', size = 54, lines) {
  if (p <= 0) return; const sc = lerp(.6, 1, backOut(clamp(p)));
  const ls = lines || [str];
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(540, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 3);
  ctx.font = `700 ${size}px Poppins`; const w = Math.max(...ls.map(l => ctx.measureText(l).width)) + 70, h = ls.length * size * 1.2 + 40;
  rrect(ctx, -w / 2, -h / 2, w, h, 26); fillStroke(ctx, bg, 9);
  ls.forEach((l, i) => text(ctx, l, 0, -h / 2 + 20 + size * .6 + i * size * 1.2, size, '#fff', INK, 0));
  ctx.restore();
}
function qCard(ctx, x, y, p, kind, t) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 2 + x) * .04);
  rrect(ctx, -150, -150, 300, 300, 36); fillStroke(ctx, '#fffaf0', 9);
  if (kind === 'depth') { rrect(ctx, -100, -20, 200, 120, 10); fillStroke(ctx, '#5fb2e0', 6); rrect(ctx, 40, -120, 30, 200, 6); fillStroke(ctx, '#f2c440', 6); for (let i = 0; i < 6; i++) line(ctx, 40, -100 + i * 30, 56, -100 + i * 30, 5); }
  else if (kind === 'boats') { bigShip(ctx, -50, 30, .38, '#c8392c'); bigShip(ctx, 40, -40, .3, '#2f63c9'); bigShip(ctx, 70, 60, .25, '#e3a92a'); }
  else { // cubeta con agua
    ctx.beginPath(); ctx.moveTo(-90, -60); ctx.lineTo(90, -60); ctx.lineTo(65, 90); ctx.lineTo(-65, 90); ctx.closePath(); fillStroke(ctx, '#9aa6bb', 7);
    ellipse(ctx, 0, -60, 90, 22); fillStroke(ctx, '#5fb2e0', 7); ctx.beginPath(); ctx.arc(0, -60, 100, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
  }
  qmark(ctx, 115, -120, 110, .2);
  ctx.restore();
}
function halfTruth(ctx, x, y, p) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.save(); ctx.beginPath(); ctx.rect(-200, -200, 200, 400); ctx.clip(); circle(ctx, 0, 0, 150); fillStroke(ctx, '#3fa35b', 10); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, -200, 200, 400); ctx.clip(); circle(ctx, 0, 0, 150); fillStroke(ctx, '#e0392f', 10); ctx.restore();
  line(ctx, 0, -150, 0, 150, 10);
  ctx.beginPath(); ctx.moveTo(-115, 0); ctx.lineTo(-75, 45); ctx.lineTo(-25, -50); ctx.lineWidth = 22; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  line(ctx, 35, -45, 105, 45, 22, '#fff'); line(ctx, 105, -45, 35, 45, 22, '#fff');
  ctx.restore();
}
