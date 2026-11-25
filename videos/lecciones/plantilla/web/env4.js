// ---------- estilo vectorial plano tipo "kurzgesagt" + mapas + paisaje de Puebla ----------
const KZ = { bg0: '#140c3f', bg1: '#0c0830', land: '#3fd08a', land2: '#2aa86c', sea: '#1d2a8a', hi: '#ffcf3a', pink: '#ff5a8a', cyan: '#34d1ff', orange: '#ff8a3a' };
function kzBG(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, KZ.bg0); g.addColorStop(1, KZ.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const h = ctx.createRadialGradient(540, 760, 50, 540, 760, 900); h.addColorStop(0, 'rgba(140,80,255,.28)'); h.addColorStop(1, 'rgba(140,80,255,0)'); ctx.fillStyle = h; ctx.fillRect(0, 0, W, H);
  const R = rng(77);
  for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H, r = 1.5 + R() * 3, tw = .5 + .5 * Math.sin(t * 2 + i); ctx.globalAlpha = .35 + .5 * tw; circle(ctx, x, y, r); ctx.fillStyle = i % 3 ? '#ffffff' : '#b9a3ff'; ctx.fill(); }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const x = R() * W, y = R() * H * .9, a = .5 + .5 * Math.sin(t * 3 + i * 2); sparkle(ctx, x, y, 14 + 10 * a, .4 + .6 * a); }
}
function glow(ctx, x, y, r, col, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A', .55 * a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
// píldora de etiqueta
function pill(ctx, str, x, y, col, p, size = 46, txt = '#fff') {
  if (p <= 0) return; const sc = lerp(.5, 1, backOut(clamp(p)));
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(p * 3);
  ctx.font = `700 ${size}px Poppins`; const w = ctx.measureText(str).width + size * 1.3, h = size * 1.7;
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = col; ctx.fill(); ctx.shadowColor = 'transparent';
  text(ctx, str, 0, 2, size, txt, INK, 0); ctx.restore();
}
function pin(ctx, x, y, s, col, p) {
  if (p <= 0) return; const yy = y - (1 - backOut(clamp(p))) * 120;
  ctx.save(); ctx.translate(x, yy); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 3);
  ellipse(ctx, 0, 6, 18, 7); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-46, -50, -40, -110, 0, -110); ctx.bezierCurveTo(40, -110, 46, -50, 0, 0); fillStroke(ctx, col, 6);
  circle(ctx, 0, -72, 16); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
}
// proyección simple lon/lat -> pantalla
// centro (lon, lat) en (cx, cy); k = píxeles por grado de latitud
function proj(lon, lat, k, cx = 540, cy = 860) { const c = Math.cos(lat * Math.PI / 180); return ([lo, la]) => [cx + (lo - lon) * k * c, cy - (la - lat) * k]; }
const ITALY = [[6.7, 45.1], [7.0, 45.9], [8.4, 46.4], [9.3, 46.5], [10.4, 46.6], [12.2, 47.0], [13.7, 46.5], [13.6, 45.7], [12.3, 45.3], [12.4, 44.4], [13.6, 43.5], [14.4, 42.4], [15.9, 41.9], [16.1, 41.4], [17.5, 40.8], [18.5, 40.1], [18.0, 39.9], [17.1, 40.5], [16.5, 39.7], [17.1, 38.9], [16.1, 37.9], [15.6, 38.3], [16.0, 39.4], [15.6, 40.1], [14.9, 40.3], [14.3, 40.8], [13.0, 41.3], [11.8, 42.1], [10.5, 42.9], [10.2, 43.9], [8.8, 44.4], [7.6, 43.8]];
const SICILY = [[12.4, 37.9], [13.3, 38.2], [15.6, 38.3], [15.1, 37.5], [15.1, 36.7], [14.3, 37.0], [12.6, 37.6]];
const SARDINIA = [[8.4, 41.0], [9.6, 41.1], [9.8, 40.1], [9.6, 39.1], [8.6, 38.9], [8.4, 39.9]];
const VENETO = [[10.7, 45.5], [10.9, 46.1], [11.7, 46.0], [12.0, 46.6], [12.7, 46.6], [12.5, 46.0], [13.1, 45.7], [12.3, 45.3], [12.4, 44.8], [11.4, 45.0], [10.7, 45.1]];
const GRAPPA = [11.8, 45.87];
const MEX = [[-114.7, 32.7], [-111.0, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104.5, 29.6], [-103.0, 29.0], [-101.4, 29.8], [-99.5, 27.5], [-97.5, 25.9], [-97.7, 24.0], [-97.2, 21.5], [-96.0, 19.8], [-94.5, 18.2], [-92.0, 18.7], [-90.7, 19.4], [-90.4, 21.0], [-87.0, 21.5], [-87.5, 19.4], [-88.3, 18.5], [-89.1, 17.8], [-90.9, 16.1], [-92.2, 14.5], [-94.0, 16.1], [-96.5, 15.6], [-99.5, 16.6], [-101.8, 17.9], [-105.0, 19.3], [-105.7, 20.4], [-105.3, 21.6], [-106.4, 23.2], [-108.0, 25.0], [-109.4, 26.6], [-110.6, 27.9], [-112.2, 29.0], [-113.1, 31.2], [-114.7, 31.8]];
const BAJA = [[-117.1, 32.5], [-114.8, 32.5], [-114.6, 31.0], [-113.2, 29.3], [-112.4, 27.6], [-110.6, 24.6], [-109.4, 23.2], [-110.3, 23.6], [-112.2, 25.0], [-114.2, 27.1], [-115.7, 29.6], [-116.6, 31.3]];
const CHIPILO = [-98.33, 19.0];
function land(ctx, P, pts, col, night = true) {
  const sp = pts.map(P); path(ctx, sp); ctx.fillStyle = col; ctx.fill();
  if (night) { ctx.save(); path(ctx, sp); ctx.clip(); const xs = sp.map(p => p[0]); const x0 = Math.min(...xs), x1 = Math.max(...xs); ctx.fillStyle = 'rgba(10,10,60,.22)'; ctx.fillRect(x0 - 10, -2000, (x1 - x0) * .35, 6000); ctx.restore(); }
  path(ctx, sp); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineJoin = 'round'; ctx.stroke();
  return sp;
}
// montaña plana estilo vectorial
function kzMountain(ctx, x, y, w, h, col, snow, t) {
  path(ctx, [[x - w / 2, y], [x - w * .18, y - h * .7], [x - w * .05, y - h * .62], [x + w * .08, y - h], [x + w / 2, y]]); ctx.fillStyle = col; ctx.fill();
  ctx.save(); path(ctx, [[x - w / 2, y], [x - w * .18, y - h * .7], [x - w * .05, y - h * .62], [x + w * .08, y - h], [x + w / 2, y]]); ctx.clip();
  ctx.fillStyle = 'rgba(10,10,60,.28)'; path(ctx, [[x + w * .08, y - h], [x - w * .12, y], [x - w, y], [x - w, y - h * 2]]); ctx.fill();
  if (snow) { ctx.fillStyle = '#f2f4ff'; path(ctx, [[x + w * .08, y - h], [x - w * .1, y - h * .7], [x, y - h * .74], [x + w * .1, y - h * .66], [x + w * .22, y - h * .72]]); ctx.fill(); }
  ctx.restore();
}
// ---- paisaje de Puebla (monitos) ----
function pueblaSky(ctx, t, top = '#4ab0ee', bot = '#ffe9c4') { drawSky(ctx, top, bot, -200, 1250); drawCloud(ctx, 180 + t * 6, 300, 100, 3); drawCloud(ctx, 880 + t * 4, 220, 70, 4); }
function volcano(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  path(ctx, [[-420, 0], [-70, -330], [70, -330], [420, 0]]); fillStroke(ctx, '#8a8fb8', 6);
  path(ctx, [[-70, -330], [70, -330], [130, -270], [60, -250], [0, -275], [-60, -248], [-130, -270]]); fillStroke(ctx, '#ffffff', 6);
  puff(ctx, 10, -380, 50, 0, '#f1efe8', 5, .85);
  ctx.restore();
}
function hill(ctx, x, y, w, h, col = '#5fb84f') {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w * .3, y - h * 1.1, x + w * .1, y - h * 1.2, x + w / 2, y); ctx.closePath(); fillStroke(ctx, col, 7);
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w * .3, y - h * 1.1, x + w * .1, y - h * 1.2, x + w / 2, y); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(20,60,20,.18)'; ctx.fillRect(x + w * .05, y - h * 1.3, w, h * 1.4); ctx.restore();
  for (let i = 0; i < 5; i++) { const tx = x - w * .3 + i * w * .14, ty = y - h * (.45 + .35 * Math.sin(i * 1.3 + 1)); circle(ctx, tx, ty, 22); fillStroke(ctx, '#3f8f3a', 5); }
}
function house(ctx, x, y, w, h, wall = '#f4e3c3', roof = '#c4633a') {
  rrect(ctx, x - w / 2, y - h, w, h, 6); fillStroke(ctx, wall, 6);
  path(ctx, [[x - w / 2 - 16, y - h + 4], [x, y - h - h * .55], [x + w / 2 + 16, y - h + 4]]); fillStroke(ctx, roof, 6);
  rrect(ctx, x - w * .12, y - h * .5, w * .24, h * .5, 4); fillStroke(ctx, '#6b4a2a', 5);
  rrect(ctx, x - w * .38, y - h * .78, w * .18, h * .2, 3); fillStroke(ctx, '#8fd0ff', 4);
}
function signpost(ctx, x, y, str, p) {
  if (p <= 0) return; const sc = backOut(clamp(p));
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sc);
  rrect(ctx, -12, -260, 24, 260, 6); fillStroke(ctx, '#8a5a32', 6);
  ctx.font = '700 54px Poppins'; const w = ctx.measureText(str).width + 60;
  rrect(ctx, -w / 2, -330, w, 100, 14); fillStroke(ctx, '#2e7d4f', 7); text(ctx, str, 0, -278, 54, '#fff', INK, 0);
  ctx.restore();
}
function photoFrame(ctx, x, y, s, rot, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -120, -100, 240, 200, 10); fillStroke(ctx, '#c9a46a', 8);
  rrect(ctx, -96, -76, 192, 152, 4); fillStroke(ctx, '#e8d6b0', 4);
  ctx.save(); rrect(ctx, -96, -76, 192, 152, 4); ctx.clip(); ctx.fillStyle = '#b89a6a'; ctx.fillRect(-96, 20, 192, 60);
  bigShip(ctx, 0, 30, .38, '#e8d6b0'); ctx.restore();
  ctx.restore();
}
function rolledMap(ctx, x, y, w, h, open, t) {
  const ww = w * clamp(open);
  rrect(ctx, x - ww / 2, y - h / 2, ww, h, 10); fillStroke(ctx, '#f6ead0', 7);
  ctx.save(); rrect(ctx, x - ww / 2, y - h / 2, ww, h, 10); ctx.clip();
  for (let i = 0; i < 6; i++) line(ctx, x - w / 2 + i * w / 5, y - h / 2, x - w / 2 + i * w / 5 + 40, y + h / 2, 3, 'rgba(120,90,50,.25)');
  hill(ctx, x + 40, y + 120, 380, 190);
  ctx.restore();
  for (const s of [-1, 1]) { rrect(ctx, x + s * ww / 2 - 20, y - h / 2 - 20, 40, h + 40, 20); fillStroke(ctx, '#c9a46a', 6); }
}
