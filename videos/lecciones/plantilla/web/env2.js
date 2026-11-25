// ---------- Alcatraz: escenarios y utilería ----------
const SKIN = '#e9b98c', SKIN_SH = '#c99670', PAINT_HAIR = '#5a3a22';
const GUARD = { cols: ['#26386a', '#26386a'], hat: 'guard' };
const PRIS = { cols: ['#6a93cf', '#6a93cf'], hat: 'hair', belt: false };
const PRIS2 = { cols: ['#6a93cf', '#6a93cf'], hat: 'hair', hairCol: '#2a1c14', belt: false };
const PRIS3 = { cols: ['#6a93cf', '#6a93cf'], hat: 'hair', hairCol: '#8a5a2a', belt: false };

function nightSky(ctx, t, top = '#141c45', bot = '#3a4f94', y1 = 1300) {
  drawSky(ctx, top, bot, -400, y1);
  const R = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = R() * 1300 - 110, y = R() * 900 - 100, r = 2 + R() * 3.5, tw = .55 + .45 * Math.sin(t * 2.5 + i * 1.7);
    ctx.globalAlpha = tw; circle(ctx, x, y, r); ctx.fillStyle = '#fff6d0'; ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawMoon(ctx, x, y, r) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * .6, x, y, r * 3.2); g.addColorStop(0, 'rgba(255,240,190,.45)'); g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); ctx.restore();
  circle(ctx, x, y, r); fillStroke(ctx, '#fff1c2', 6);
  for (const [cx, cy, cr] of [[-.3, -.2, .18], [.25, .1, .13], [-.05, .4, .1]]) { circle(ctx, x + cx * r, y + cy * r, cr * r); ctx.fillStyle = 'rgba(200,170,110,.35)'; ctx.fill(); }
}
// pared de bloques de la galería
function cellWall(ctx, dark = 0, floorY = 1500) {
  ctx.fillStyle = mix('#8a9cc0', '#1a2038', dark); ctx.fillRect(-900, -900, 2900, floorY + 900);
  ctx.strokeStyle = mix('#6f80a6', '#10142a', dark); ctx.lineWidth = 4;
  for (let y = -880, r = 0; y < floorY; y += 90, r++) {
    line(ctx, -900, y, 2000, y, 4, mix('#6f80a6', '#10142a', dark));
    for (let x = -900 + (r % 2) * 90; x < 2000; x += 180) line(ctx, x, y, x, y + 90, 4, mix('#6f80a6', '#10142a', dark));
  }
  ctx.fillStyle = mix('#56648a', '#0c1020', dark); ctx.fillRect(-900, floorY, 2900, 1400);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-900, floorY, 2900, 22);
}
function cellBars(ctx, x0, x1, top, bot, gap = 95, col = '#9aa6bb') {
  for (let x = x0; x <= x1; x += gap) { rrect(ctx, x - 11, top, 22, bot - top, 8); fillStroke(ctx, col, 5); }
  for (const y of [top + 40, bot - 260]) { rrect(ctx, x0 - 30, y, x1 - x0 + 60, 26, 8); fillStroke(ctx, col, 5); }
}
// cama: (x,y) = centro de la superficie del colchón; devuelve dónde va la cabeza
function drawBed(ctx, x, y, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const w = 560, side = o.flip || 1;
  // patas y armazón
  for (const lx of [-w / 2 + 20, w / 2 - 20]) { rrect(ctx, lx - 10, 10, 20, 150, 4); fillStroke(ctx, '#5b6478', 5); }
  rrect(ctx, -w / 2, 40, w, 24, 6); fillStroke(ctx, '#6c7790', 5);
  // colchón
  rrect(ctx, -w / 2, -10, w, 56, 18); fillStroke(ctx, '#ece6d6', 6);
  // almohada
  const px = -side * (w / 2 - 85);
  ellipse(ctx, px, -18, 82, 34); fillStroke(ctx, '#fbf8f0', 6);
  // manta con bulto
  const lump = o.lump == null ? 1 : o.lump, bx0 = side > 0 ? -w / 2 + 150 : -w / 2 - 6, bx1 = side > 0 ? w / 2 + 6 : w / 2 - 150;
  const blanket = () => {
    ctx.beginPath(); ctx.moveTo(bx0, 40); ctx.lineTo(bx0, -14 - lump * 34);
    ctx.bezierCurveTo(bx0 + 80, -30 - lump * 70, bx1 - 160, -24 - lump * 64, bx1 - 40, -16 - lump * 40);
    ctx.quadraticCurveTo(bx1, -12 - lump * 20, bx1, 20); ctx.lineTo(bx1, 40); ctx.closePath();
  };
  if (o.blanket !== false) {
    blanket(); ctx.fillStyle = o.blanketCol || '#7d6aa8'; ctx.fill();
    ctx.save(); blanket(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(bx0 + 20, -200, 26, 300); ctx.fillRect(bx0 + 60, -200, 12, 300); ctx.fillStyle = 'rgba(20,10,40,.2)'; ctx.fillRect(-w, 10, 2 * w, 40); ctx.restore();
    blanket(); fillStroke(ctx, null, 6);
  }
  ctx.restore();
  return [x + px * s, y - 58 * s];
}
// cabeza falsa: yeso pintado con pelo de verdad
function drawFakeHead(ctx, x, y, r, o = {}) {
  const paint = o.paint == null ? 1 : o.paint, hair = o.hair == null ? 1 : o.hair, rot = o.rot || 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const lw = r * .07;
  // cuello cortado (se ve si rueda)
  if (o.neck) { ellipse(ctx, 0, r * .92, r * .42, r * .16); fillStroke(ctx, '#d9d2c2', lw); for (let i = 0; i < 5; i++) line(ctx, -r * .3 + i * r * .15, r * .88, -r * .25 + i * r * .15, r * .97, lw * .4, '#a89e88'); }
  circle(ctx, 0, 0, r); ctx.fillStyle = mix('#efe9dc', SKIN, paint); ctx.fill();
  ctx.save(); circle(ctx, 0, 0, r); ctx.clip(); ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, TAU); ctx.arc(-r * .22, -r * .2, r, 0, TAU, true); ctx.fillStyle = mix('#d8d0c0', SKIN_SH, paint); ctx.fill(); ctx.restore();
  // mejillas pintadas
  if (paint > .3) { ctx.globalAlpha = paint; ellipse(ctx, -r * .48, r * .3, r * .16, r * .09); ellipse(ctx, r * .48, r * .3, r * .16, r * .09); ctx.fillStyle = 'rgba(220,90,80,.35)'; ctx.fill(); ctx.globalAlpha = 1; }
  // pelo real
  if (hair > 0) {
    ctx.save(); ctx.globalAlpha = hair;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.04, Math.PI + .15, -.15); ctx.quadraticCurveTo(r * .5, -r * .5, -r * .05, -r * .55); ctx.quadraticCurveTo(-r * .55, -r * .45, -r * 1.02, -r * .1); ctx.closePath(); fillStroke(ctx, o.hairCol || PAINT_HAIR, lw);
    for (let i = 0; i < 7; i++) { const a = Math.PI + .4 + i * .33; line(ctx, Math.cos(a) * r * .95, Math.sin(a) * r * .95, Math.cos(a) * r * .55, Math.sin(a) * r * .7, lw * .45, 'rgba(30,15,5,.45)'); }
    ctx.restore();
  }
  circle(ctx, 0, 0, r); fillStroke(ctx, null, lw);
  // cara pintada: ojos cerrados (o uno abierto si guiña)
  if (paint > .05) {
    ctx.save(); ctx.globalAlpha = Math.min(1, paint * 1.4);
    for (const side of [-1, 1]) {
      const ex = side * r * .36, ey = r * .02;
      if (o.wink && side > 0) {
        const op = o.wink; ellipse(ctx, ex, ey, r * .17, r * .17 * op); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw * .7; ctx.strokeStyle = INK; ctx.stroke();
        circle(ctx, ex + r * .03, ey, r * .08 * op); ctx.fillStyle = INK; ctx.fill();
      } else { ctx.beginPath(); ctx.arc(ex, ey - r * .02, r * .15, .25, Math.PI - .25); ctx.lineWidth = lw * .75; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(ex - r * .15, ey - r * .26 - (o.wink && side > 0 ? r * .08 : 0)); ctx.quadraticCurveTo(ex, ey - r * .34, ex + r * .15, ey - r * .26); ctx.lineWidth = lw * .7; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, r * .1); ctx.quadraticCurveTo(r * .1, r * .3, -r * .04, r * .32); ctx.lineWidth = lw * .55; ctx.stroke();
    if (o.smirk) { ctx.beginPath(); ctx.moveTo(-r * .25, r * .56); ctx.quadraticCurveTo(r * .05, r * .66, r * .32, r * .46); ctx.lineWidth = lw * .7; ctx.stroke(); }
    else line(ctx, -r * .2, r * .56, r * .2, r * .56, lw * .7);
    ctx.restore();
  }
  ctx.restore();
}
// cono de linterna (en coordenadas de mundo)
function beam(ctx, x, y, ang, len, spread, a = 1, col = '255,240,180') {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(${col},${.55 * a})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(len, -len * spread); ctx.lineTo(len, len * spread); ctx.lineTo(0, 8); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
function spot(ctx, x, y, r, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * .2, x, y, r); g.addColorStop(0, `rgba(255,236,170,${.45 * a})`); g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
// linterna como utilería de la mano (coordenadas del muñeco)
function flashProp(ctx, k, hand, ang, side) {
  if (k !== 'R') return;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(-Math.PI / 2 + .2);
  rrect(ctx, -.018, -.02, .1, .04, .01); fillStroke(ctx, '#3a3f4c', .01);
  rrect(ctx, .075, -.03, .03, .06, .008); fillStroke(ctx, '#c9cdd6', .01);
  ctx.restore();
}
function zzz(ctx, x, y, t, a = 1) {
  for (let i = 0; i < 3; i++) {
    const p = ((t * .55 + i / 3) % 1); const al = Math.sin(p * Math.PI) * a;
    ctx.save(); ctx.globalAlpha = al; text(ctx, 'z', x + p * 120 + Math.sin(p * 6) * 14, y - p * 220, 54 + p * 40, '#ffffff', INK, 10); ctx.restore();
  }
}
// isla de noche con edificio y faro
function drawIsland(ctx, x, y, s, t, beamA = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const rock = [[-430, 40], [-380, -40], [-300, -70], [-200, -110], [-60, -130], [80, -150], [200, -120], [300, -90], [390, -40], [440, 40]];
  path(ctx, rock); fillStroke(ctx, '#2c3558', 6);
  rrect(ctx, -250, -260, 360, 130, 6); fillStroke(ctx, '#d7d2c4', 6);
  ctx.fillStyle = 'rgba(30,30,60,.25)'; ctx.fillRect(-250, -175, 360, 45);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) { rrect(ctx, -230 + i * 50, -240 + j * 50, 24, 30, 4); fillStroke(ctx, (i + j) % 3 ? '#ffd76a' : '#3a4062', 3); }
  // faro
  rrect(ctx, 170, -330, 46, 200, 4); fillStroke(ctx, '#ecebe3', 5);
  rrect(ctx, 162, -370, 62, 44, 8); fillStroke(ctx, '#ffe07a', 5);
  ctx.beginPath(); ctx.moveTo(160, -370); ctx.lineTo(193, -400); ctx.lineTo(226, -370); ctx.closePath(); fillStroke(ctx, '#2c3558', 5);
  ctx.restore();
  // haz giratorio
  const ang = Math.sin(t * .9) * 1.1 + Math.PI;
  beam(ctx, x + 193 * s, y - 348 * s, ang, 900 * s, .12, .8 * beamA); beam(ctx, x + 193 * s, y - 348 * s, ang + Math.PI, 900 * s, .12, .5 * beamA);
}
function nightSea(ctx, horizon, t) { drawSea(ctx, horizon, t, 2600, ['#3b62a3', '#1f3f7a', '#122a57']); }
function calendar(ctx, x, y, s, rot, month, year) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -170, -150, 340, 300, 26); fillStroke(ctx, '#fbf7ec', 8);
  ctx.save(); rrect(ctx, -170, -150, 340, 300, 26); ctx.clip(); ctx.fillStyle = '#e0392f'; ctx.fillRect(-170, -150, 340, 95); ctx.restore();
  rrect(ctx, -170, -150, 340, 300, 26); fillStroke(ctx, null, 8);
  for (const rx of [-90, 90]) { rrect(ctx, rx - 12, -175, 24, 55, 12); fillStroke(ctx, '#9aa6bb', 6); }
  text(ctx, month, 0, -100, 58, '#fff', INK, 0);
  text(ctx, year, 0, 45, 104, INK, INK, 0);
  ctx.restore();
}
function soap(ctx, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -160, -85, 320, 170, 60); fillStroke(ctx, '#bfe8d0', 9);
  rrect(ctx, -120, -55, 240, 110, 44); fillStroke(ctx, '#d6f3e2', 6);
  ellipse(ctx, -60, -40, 50, 14, -.2); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
  ctx.restore();
}
function bubble(ctx, x, y, r, a = 1) {
  if (a <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha = a; circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill(); ctx.lineWidth = Math.max(3, r * .08); ctx.strokeStyle = '#fff'; ctx.stroke();
  ellipse(ctx, x - r * .35, y - r * .35, r * .22, r * .12, -.6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
}
function bowl(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(ctx, 0, -70, 230, 55); fillStroke(ctx, '#e7e2d3', 8);
  for (let i = 0; i < 6; i++) { ellipse(ctx, -150 + i * 60, -78 + Math.sin(t * 4 + i) * 6, 40, 18); ctx.fillStyle = '#cfc8b4'; ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-235, -70); ctx.quadraticCurveTo(-220, 120, 0, 130); ctx.quadraticCurveTo(220, 120, 235, -70); ctx.quadraticCurveTo(0, -10, -235, -70); fillStroke(ctx, '#e07a3a', 8);
  ctx.save(); ctx.beginPath(); ctx.moveTo(-235, -70); ctx.quadraticCurveTo(-220, 120, 0, 130); ctx.quadraticCurveTo(220, 120, 235, -70); ctx.closePath(); ctx.clip(); ctx.fillStyle = 'rgba(60,10,0,.2)'; ctx.fillRect(60, -100, 300, 300); ctx.restore();
  ctx.restore();
}
function newsStrip(ctx, x, y, w, h, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  rrect(ctx, -w / 2, -h / 2, w, h, 6); fillStroke(ctx, '#f4f0e2', 5);
  for (let i = 0; i < 4; i++) line(ctx, -w / 2 + 14, -h / 2 + 16 + i * (h - 26) / 3, w / 2 - 14 - (i % 2) * 30, -h / 2 + 16 + i * (h - 26) / 3, 5, '#8a8678');
  ctx.restore();
}
function paintCan(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -120, -170, 240, 200, 16); fillStroke(ctx, '#9aa6bb', 8);
  rrect(ctx, -120, -110, 240, 80, 0); fillStroke(ctx, '#f6f2ea', 6);
  ellipse(ctx, 0, -170, 120, 32); fillStroke(ctx, SKIN, 8);
  ctx.beginPath(); ctx.moveTo(60, -150); ctx.quadraticCurveTo(110, -120, 116, -60); ctx.lineTo(120, -60); ctx.lineTo(120, -140); ctx.closePath(); ctx.fillStyle = SKIN; ctx.fill();
  ctx.restore();
}
function brush(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -22, -330, 44, 230, 20); fillStroke(ctx, '#c9572e', 7);
  rrect(ctx, -34, -110, 68, 60, 8); fillStroke(ctx, '#c9cdd6', 7);
  ctx.beginPath(); ctx.moveTo(-34, -50); ctx.lineTo(34, -50); ctx.quadraticCurveTo(30, 20, 0, 40); ctx.quadraticCurveTo(-30, 20, -34, -50); fillStroke(ctx, SKIN, 7);
  ctx.restore();
}
function scissors(ctx, x, y, s, rot, open) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.rotate(sd * open * .35);
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(150, sd * 4); ctx.lineTo(0, 10); ctx.closePath(); fillStroke(ctx, '#dfe3ea', 5);
    ctx.beginPath(); ctx.arc(-50, sd * 28, 24, 0, TAU); ctx.lineWidth = 14; ctx.strokeStyle = '#e0392f'; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    line(ctx, -28, sd * 18, 0, 0, 12, '#e0392f');
    ctx.restore();
  }
  circle(ctx, 0, 0, 8); fillStroke(ctx, '#9aa6bb', 4);
  ctx.restore();
}
function hairClump(ctx, x, y, s, rot, col = PAINT_HAIR) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = -1 + i * .25; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 30, -20, Math.cos(a) * 55, Math.sin(a) * 30 - 10); }
  ctx.lineWidth = 7; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
function barberPole(ctx, x, y, h, t) {
  rrect(ctx, x - 40, y, 80, h, 30); ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, y, 80, h);
  for (let i = -6; i < 14; i++) { const yy = y + i * 60 + (t * 90) % 120; ctx.beginPath(); ctx.moveTo(x - 50, yy); ctx.lineTo(x + 50, yy - 50); ctx.lineTo(x + 50, yy - 25); ctx.lineTo(x - 50, yy + 25); ctx.closePath(); ctx.fillStyle = i % 2 ? '#e0392f' : '#2f63c9'; ctx.fill(); }
  ctx.restore(); rrect(ctx, x - 40, y, 80, h, 30); fillStroke(ctx, null, 6);
  rrect(ctx, x - 52, y - 30, 104, 34, 12); fillStroke(ctx, '#c9cdd6', 6); rrect(ctx, x - 52, y + h - 4, 104, 34, 12); fillStroke(ctx, '#c9cdd6', 6);
}
function cape(ctx, x, y, w, h, col = '#f2f2f2') {
  ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.quadraticCurveTo(x - w * .6, y + h * .5, x - w / 2, y + h); ctx.lineTo(x + w / 2, y + h); ctx.quadraticCurveTo(x + w * .6, y + h * .5, x + 40, y); ctx.closePath(); fillStroke(ctx, col, 7);
  for (let i = 1; i < 4; i++) line(ctx, x - w / 2 + i * w / 4, y + h * .35, x - w / 2 + i * w / 4 + (i - 2) * 10, y + h - 10, 4, 'rgba(60,60,90,.25)');
}
function raft(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.7) * .06); ctx.scale(s, s);
  ellipse(ctx, 0, 0, 230, 70); fillStroke(ctx, '#6f6a3a', 9);
  ellipse(ctx, 0, -6, 165, 38); fillStroke(ctx, '#575330', 6);
  for (let i = -2; i <= 2; i++) line(ctx, i * 70, -60, i * 70 + 8, 60, 4, 'rgba(30,30,10,.35)');
  ctx.restore();
}
function paddle(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(ctx, -10, -150, 20, 200, 8); fillStroke(ctx, '#a5703c', 6);
  ellipse(ctx, 0, 90, 34, 60); fillStroke(ctx, '#a5703c', 6);
  ctx.restore();
}
function qmark(ctx, x, y, size, rot = 0, a = 1, col = '#ffd23a') {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); text(ctx, '?', 0, 0, size, col, INK, size * .12); ctx.restore();
}
function commentBubble(ctx, x, y, s, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -170, -110, 340, 200, 60); ctx.moveTo(-60, 88); ctx.lineTo(-110, 150); ctx.lineTo(-10, 88); fillStroke(ctx, '#ffffff', 9);
  for (let i = -1; i <= 1; i++) { circle(ctx, i * 80, -10, 22); ctx.fillStyle = INK; ctx.fill(); }
  ctx.restore();
}
function vent(ctx, x, y, w, h, open) {
  rrect(ctx, x - w / 2, y - h / 2, w, h, 10); fillStroke(ctx, '#0b0d18', 6);
  if (open < 1) {
    ctx.save(); ctx.translate(x - w / 2, y + h / 2); ctx.rotate(-open * 1.2); rrect(ctx, 0, -h, w, h, 10); fillStroke(ctx, '#b6bfcf', 6);
    for (let i = 1; i < 6; i++) line(ctx, 14, -h + i * h / 6, w - 14, -h + i * h / 6, 6, '#7c879c'); ctx.restore();
  }
}
