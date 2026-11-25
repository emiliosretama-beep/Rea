// ---------- Claude Code 101 · Lección 1: ¿Qué es Claude Code? (1920x1080) ----------
const C = (base, extra) => Object.assign({}, base, extra);
const ME = { cols: ['#2f9ad6', '#2f9ad6'], hat: 'hair', hairCol: '#3a2618', belt: false };
const CH = [[2, '1 · ¿Qué es Claude Code?', '#d97757'], [8, '2 · Claude.ai vs Claude Code', '#2f9ad6'], [14, '3 · ¿Qué es un agente?', '#5b3df5'], [21, '4 · Lo que puede hacer', '#2fbf5b'], [30, '5 · Usarlo bien', '#ff5a8a'], [41, '6 · Repaso', '#e0392f'], [48, '★ Lo que viene en el curso', '#2f9ad6']];
window.OVERLAY = (ctx, t) => {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = CH.filter(c => t >= L(c[0]) - .2).pop();
  if (c) { ctx.font = '700 30px Poppins'; const w = ctx.measureText(c[1]).width + 50; rrect(ctx, 40, 34, w, 58, 29); ctx.fillStyle = c[2]; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, c[1], 40 + w / 2, 64, 30, '#fff', INK, 0); }
  const p = clamp(t / (window.DUR || 230)); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, H - 8, W, 8); ctx.fillStyle = ORANGE; ctx.fillRect(0, H - 8, W * p, 8);
  ctx.restore();
};
const SC = [];   // [línea de inicio, transición, draw]
// 0-1 — portada
SC.push([0, 'cut', (ctx, t) => {
  kzBGH(ctx, t, 1);
  clawd(ctx, 960, 440, 26, t, { wave: t > .6 && t < 2.6 ? 1 : 0, happy: t > .6 && t < 2.6 });
  pill(ctx, 'CLAUDE CODE 101 · LECCIÓN 1 DE 12', 960, 140, PURPLE, at(t, .1), 34);
  const p = at(t, .3, .4); ctx.save(); ctx.translate(960, 600); const s = lerp(1.5, 1, backOut(p)); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 3); text(ctx, '¿Qué es Claude Code?', 0, 0, 116, '#fff', INK, 0); ctx.restore();
  [['QUÉ ES', T(1, 'qué')], ['VS CLAUDE.AI', T(1, 'diferencia')], ['AGENTES', T(1, 'agente')], ['USARLO BIEN', T(1, 'usarlo')]].forEach(([s, tt], i) => pill(ctx, s, 390 + i * 380, 790, ['#d97757', '#2f9ad6', '#5b3df5', '#ff5a8a'][i], at(t, tt), 34));
}]);
// 2-5 — definición
SC.push([2, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  clawd(ctx, 480, 700, 30, t, { look: .8, happy: t > T(5, 'rápido') });
  pill(ctx, 'HERRAMIENTA DE PROGRAMACIÓN AGÉNTICA', 960, 170, '#d97757', at(t, T(3, 'herramienta')), 44);
  [['code', 'ENTIENDE TU CÓDIGO', 'entiende', '#2f9ad6'], ['pen', 'EDITA TUS ARCHIVOS', 'edita', '#5b3df5'], ['code', 'EJECUTA COMANDOS', 'ejecuta', '#2fbf5b']].forEach(([k, s, w, c], i) => {
    const p = at(t, T(4, w)); const y = 330 + i * 140;
    if (i === 2) { if (p > 0) { ctx.save(); ctx.translate(1000, y); ctx.scale(.45 * backOut(p), .45 * backOut(p)); circle(ctx, 0, 0, 100); fillStroke(ctx, c, 8 / .45); text(ctx, '>_', 0, 0, 90, '#fff', INK, 0); ctx.restore(); } }
    else icon(ctx, k, 1000, y, .45, c, p);
    if (p > 0) { ctx.save(); ctx.globalAlpha = clamp(p * 3); text(ctx, s, 1080, y + 2, 46, '#fff', INK, 0, 'Poppins', 700, 'left'); ctx.restore(); }
  });
  pill(ctx, 'SE CONECTA CON TUS HERRAMIENTAS', 1280, 760, '#3a2f7a', at(t, T(5, 'conecta')), 34);
  pill(ctx, '→ TERMINAS MÁS RÁPIDO', 1280, 850, '#2fbf5b', at(t, T(5, 'rápido')), 34);
}]);
// 6-7 — dónde está
const PLACES8 = [['term', 'TERMINAL', 'terminal'], ['vscode', 'VS CODE', 'vs'], ['jet', 'JETBRAINS', 'jetbrains'], ['desk', 'CLAUDE DESKTOP', 'desktop'], ['web', 'WEB', 'web']];
SC.push([6, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, '¿DÓNDE LO ENCUENTRAS?', 960, 160, '#2f9ad6', at(t, L(6)), 46);
  const focus = at(t, T(7, 'terminal'), .6);
  PLACES8.forEach(([k, s, w], i) => {
    const p = at(t, T(6, w)); if (p <= 0) return;
    const isT = i === 0, x0 = 260 + i * 350, x = isT ? lerp(x0, 960, easeOut(focus)) : x0, sc = backOut(clamp(p)) * (isT ? 1 + focus * .6 : 1);
    ctx.save(); ctx.globalAlpha = clamp(p * 3) * (isT ? 1 : 1 - focus * .8); ctx.translate(x, 500); ctx.scale(sc, sc);
    rrect(ctx, -150, -170, 300, 340, 30); fillStroke(ctx, '#2a2160', 7, isT && focus > .5 ? '#ffd23a' : '#fff');
    placeGlyph(ctx, k, 0, -40, 1, t); text(ctx, s, 0, 110, s.length > 10 ? 28 : 34, '#fff', INK, 0); ctx.restore();
  });
  if (focus > 0) { clawd(ctx, 960, 270, 12, t, { alpha: focus, wave: 1 }); pill(ctx, 'EN ESTE CURSO', 960, 820, '#d97757', focus, 38); }
}]);
// 8-10 — Claude.ai: copiar y pegar de ida y vuelta
SC.push([8, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  windowFrame(ctx, 110, 220, 560, 520, 'Claude.ai');
  chatBubble(ctx, 330, 300, 300, 70, true, 1, 1); chatBubble(ctx, 150, 400, 380, 120, false, 1, 3);
  windowFrame(ctx, 1250, 220, 560, 520, 'mi-proyecto/', '#1d1a33');
  for (let k = 0; k < 7; k++) line(ctx, 1300, 320 + k * 52, 1700 - (k % 3) * 90, 320 + k * 52, 10, ['#ff8ac0', '#8fe3d6', '#ffd76a'][k % 3] + '99');
  const busy = t > T(10, 'copias');
  const cyc = busy ? ((t - T(10, 'copias')) * .7) % 1 : 0, dir = busy ? Math.floor((t - T(10, 'copias')) * .7) % 2 : 0;
  const mx = busy ? lerp(dir ? 1170 : 750, dir ? 750 : 1170, ease(cyc)) : 960;
  drawStick(ctx, C(ME, { x: mx, y: 880, s: 470, flip: busy && dir ? -1 : 1, arms: { L: [.3, -.1], R: { ik: [.36, -.95] } }, face: { look: [busy && dir ? -.8 : .8, -.2], mouth: busy ? 'flat' : 'smile', browOne: busy ? 1 : 0 } }));
  if (busy) { const hx = mx + (dir ? -1 : 1) * 170, hy = 880 - 470 * .95; rrect(ctx, hx - 70, hy - 40, 140, 80, 14); fillStroke(ctx, '#ffd76a', 6); text(ctx, '</>', hx, hy + 2, 40, INK, INK, 0); sweat(ctx, mx + 70, 880 - 470 * 1.08, 30, at(t, T(10, 'respuesta'))); }
  if (!busy) qmark(ctx, 960, 300, 140 * at(t, T(8, 'diferencia')), .15, at(t, T(8, 'diferencia')));
  pill(ctx, 'IDA Y VUELTA', 960, 160, '#2f9ad6', at(t, T(9, 'ida')), 44);
}]);
// 11-13 — Claude Code: acceso directo
SC.push([11, 'whip', (ctx, t) => {
  kzBGH(ctx, t, 1);
  const tgt = [['TUS ARCHIVOS', 'archivos', 380, 330, '#5b3df5'], ['TU TERMINAL', 'terminal', 1540, 330, '#2fbf5b'], ['TODO TU PROYECTO', 'proyecto', 960, 180, '#2f9ad6']];
  tgt.forEach(([s, w, x, y, c]) => { const p = at(t, T(11, w), .5); if (p <= 0) return; ctx.save(); ctx.globalAlpha = clamp(p * 2); arrow(ctx, 960, 470, x, y + 40, p, c, -30, 12); ctx.restore(); pill(ctx, s, x, y, c, p, 38); });
  const working = t > T(12, 'entra');
  clawd(ctx, 960, 640, 24, t, { walk: working, wave: working ? 0 : at(t, T(11, 'directo')), alpha: 1 - at(t, T(13, 'agente'), .4) });
  crossRow(ctx, 520, 780, 'COPIAR Y PEGAR', at(t, T(12, 'copiar')));
  if (working) pill(ctx, 'ENTRA Y HACE EL TRABAJO', 1400, 780, '#2fbf5b', at(t, T(12, 'entra')), 36);
  const ag = at(t, T(13, 'agente'), .4); if (ag > 0) { ctx.save(); ctx.globalAlpha = ag; ctx.fillStyle = 'rgba(12,8,48,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore(); clawd(ctx, 960, 560, 24, t, { happy: 1, alpha: ag }); pill(ctx, 'AGENTE', 960, 700, '#d97757', ag, 80); }
}]);
// 14-15 — definición de agente
SC.push([14, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, '¿QUÉ ES UN AGENTE DE IA?', 960, 170, PURPLE, at(t, L(14)), 50);
  const steps = [['INTERACTÚA CON SU ENTORNO', 'interactuar', '#2f9ad6'], ['TOMA ACCIONES', 'acciones', '#d97757'], ['CUMPLE UN OBJETIVO', 'objetivo', '#2fbf5b']];
  const AR = [null, [628, 748], [1170, 1318]];
  steps.forEach(([s, w, c], i) => { const p = at(t, T(15, w)); const x = 330 + i * 630; pill(ctx, s, x, 600, c, p, i ? 40 : 34); if (i && p > 0) arrow(ctx, AR[i][0], 600, AR[i][1], 600, p, '#fff', -50, 10); });
  const pg = at(t, T(15, 'objetivo'));
  if (pg > 0) { ctx.save(); ctx.translate(1590, 400); ctx.scale(backOut(pg), backOut(pg)); for (const [r, c] of [[90, '#e0392f'], [62, '#fff'], [34, '#e0392f']]) { circle(ctx, 0, 0, r); fillStroke(ctx, c, 6); } ctx.restore(); }
  clawd(ctx, 330, 470, 14, t, { walk: t > T(15, 'interactuar') && t < T(15, 'objetivo'), alpha: at(t, T(15, 'programa')) });
}]);
// 16-18 — un modelo en un bucle
SC.push([16, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'MODELO DE LENGUAJE EN UN BUCLE', 760, 150, PURPLE, at(t, T(16, 'modelo')), 40);
  const k0 = T(17, 'piensa'), k = t > k0 ? kf(t, [[k0, 0], [T(17, 'actúa'), 1], [T(17, 'mira'), 2], [T(17, 'vuelve'), 3]], x => x) + Math.max(0, t - T(17, 'vuelve') - .6) * .7 : null;
  loopCycle(ctx, 760, 560, 270, ['PIENSA', 'ACTÚA', 'MIRA EL RESULTADO'], ['#ff5a8a', '#d97757', '#2fbf5b'], at(t, T(16, 'bucle'), .6), k, t);
  clawd(ctx, 760, 640, 15, t, { look: k != null ? Math.sin(k * TAU / 3) : 0 });
  pill(ctx, 'TIEMPO REAL', 1330, 150, '#3a2f7a', at(t, T(16, 'real')), 30);
  const sat = [['HERRAMIENTAS', 'herramientas', '#ffcf3a'], ['SERVICIOS EXTERNOS', 'servicios', '#34d1ff'], ['OTROS AGENTES', 'otros', '#b07bff']];
  sat.forEach(([s, w, c], i) => { const p = at(t, T(18, w)); pill(ctx, s, 1530, 360 + i * 170, c, p, 36, INK); if (p > 0) { ctx.save(); ctx.globalAlpha = p * .7; line(ctx, 1080, 560, 1300, 360 + i * 170, 6, 'rgba(255,255,255,.5)'); ctx.restore(); } });
  if (at(t, T(18, 'otros')) > 0) { clawd(ctx, 1770, 560 + 120, 6, t, { glow: 0, seed: 1 }); clawd(ctx, 1290, 560 + 120, 6, t, { glow: 0, seed: 2, flip: 1 }); }
}]);
// 19-20 — ejemplo: el botón de jugar
SC.push([19, 'whip', (ctx, t) => {
  kzBGH(ctx, t, 1);
  const ok = at(t, T(20, 'otra') + .4, .5);
  gameWindow(ctx, 120, 220, 820, 560, t, ok, t > T(20, 'prueba') && t < T(20, 'prueba') + .3 ? 1 : 0);
  const rq = at(t, T(19, 'pides'));
  if (rq > 0) { ctx.save(); ctx.globalAlpha = clamp(rq * 3); rrect(ctx, 1020, 190, 780, 110, 26); fillStroke(ctx, '#dfe7ff', 6); text(ctx, '"Haz que JUGAR funcione"', 1410, 247, 40, '#2a2160', INK, 0, 'Poppins', 700); ctx.restore(); }
  const failed = t > T(20, 'falla') && t < T(20, 'otra') + .4;
  stepRow(ctx, 1080, 400, 'Busca el archivo', at(t, T(20, 'busca')));
  stepRow(ctx, 1080, 500, 'Lo corrige', at(t, T(20, 'corrige')));
  stepRow(ctx, 1080, 600, failed ? 'Prueba… falla' : 'Prueba el juego', at(t, T(20, 'prueba')), failed ? 2 : 1);
  stepRow(ctx, 1080, 700, 'Lo intenta otra vez', at(t, T(20, 'intenta')), ok > .5 ? 1 : 0);
  clawd(ctx, 1640, 880, 12, t, { happy: ok > .5, sweat: failed ? 1 : 0, look: -1 });
  if (ok > 0) pill(ctx, '✓ FUNCIONA', 530, 160, '#2fbf5b', ok, 40);
}]);
// 21 — las cuatro cosas
const CAN = [['search', 'LEER', '#2f9ad6'], ['pen', 'EDITAR', '#5b3df5'], ['term', 'EJECUTAR', '#2fbf5b'], ['web', 'BUSCAR EN LA WEB', '#ff5a8a']];
function canIcon(ctx, i, x, y, s, p) { if (CAN[i][0] === 'term' || CAN[i][0] === 'web') { if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s * backOut(clamp(p)), s * backOut(clamp(p))); circle(ctx, 0, 0, 100); fillStroke(ctx, CAN[i][2], 8); if (CAN[i][0] === 'term') text(ctx, '>_', 0, 0, 90, '#fff', INK, 0); else placeGlyph(ctx, 'web', 0, 0, .9, 0); ctx.restore(); } else icon(ctx, CAN[i][0], x, y, s, CAN[i][2], p); }
SC.push([21, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, '4 COSAS QUE PUEDE HACER', 960, 170, '#2fbf5b', at(t, L(21) + .2), 50);
  CAN.forEach(([k, s, c], i) => { const p = at(t, L(21) + .7 + i * .35); canIcon(ctx, i, 330 + i * 420, 480, 1.05, p); pill(ctx, s, 330 + i * 420, 660, c, p, 32); });
  clawd(ctx, 960, 860, 8, t, { alpha: at(t, L(21)), happy: 1 });
}]);
function canHeader(ctx, t, i, start) { canIcon(ctx, i, 150, 210, .55, at(t, start)); text(ctx, `${i + 1}. ${CAN[i][1]}`, 240, 214, 52, '#fff', INK, 0, 'Poppins', 700, 'left'); }
// 22-23 — leer y entender
SC.push([22, 'whip', (ctx, t) => {
  kzBGH(ctx, t); canHeader(ctx, t, 0, L(22));
  const late = t > T(23, 'rastree') - .1;
  if (!late) {
    codeEditor(ctx, 160, 300, 960, 420, t, L(22) + .3);
    clawd(ctx, 1460, 700, 16, t, { look: -1 }); magnifier(ctx, 1260, 480, 1.1 + .05 * Math.sin(t * 3));
    const ex = at(t, T(23, 'explique'));
    if (ex > 0) { ctx.save(); ctx.globalAlpha = clamp(ex * 3); rrect(ctx, 1180, 230, 640, 150, 26); fillStroke(ctx, '#ffe7d6', 6); text(ctx, '"saludar() arma un', 1500, 280, 36, '#6a3a1a', INK, 0, 'Poppins', 600); text(ctx, 'saludo con tu nombre"', 1500, 330, 36, '#6a3a1a', INK, 0, 'Poppins', 600); ctx.restore(); }
  } else {
    const files = [['menu.js', 260, 400], ['jugador.js', 700, 600], ['nivel.js', 1140, 400], ['puntos.js', 1580, 600]];
    const k = kf(t, [[T(23, 'rastree'), 0], [T(23, 'proyecto') + .3, 3]], x => x);
    files.forEach(([n, x, y], i) => fileCard(ctx, x, y, 320, 230, n, at(t, T(23, 'rastree') - .1 + i * .08), { hl: clamp(k - i + 1), hlCol: i === 3 ? '#e0392f' : '#ffd23a' }));
    ctx.save(); ctx.setLineDash([18, 14]); ctx.lineWidth = 8; ctx.strokeStyle = '#ffd23a'; ctx.beginPath(); files.forEach(([, x, y], i) => { if (i <= k + .01) { i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }); ctx.stroke(); ctx.restore();
    const bp = clamp(k - 2.6, 0, 1) * 2.5; bug(ctx, 1580, 600, .8, t, bp);
    pill(ctx, 'RASTREA UN ERROR', 960, 840, '#e0392f', at(t, T(23, 'error')), 38);
  }
}]);
// 24-25 — editar en todo el proyecto
SC.push([24, 'whip', (ctx, t) => {
  kzBGH(ctx, t); canHeader(ctx, t, 1, L(24));
  const r0 = T(25, 'refactoriza'), u0 = T(25, 'actualiza');
  const files = [['puntos.js', 380, 440], ['menu.js', 800, 440], ['nivel.js', 1220, 440], ['tienda.js', 1640, 440]];
  files.forEach(([n, x, y], i) => {
    const done = i === 0 ? t > r0 + .4 : t > u0 + .3 + (i - 1) * .35;
    fileCard(ctx, x, y, 360, 300, n, at(t, L(24) + .3 + i * .12), { tag: done ? 'sumarPuntos()' : 'calcPuntos()', tagCol: done ? '#9be37a' : '#ffd76a', tagY: 90, hl: done ? 1 : 0, hlCol: '#2fbf5b', bar: i === 0 ? '#5b3df5' : '#2a2160' });
    if (done && i > 0) stepRow(ctx, x - 20, 680, '', 1);
  });
  pill(ctx, 'REFACTORIZA', 380, 730, '#5b3df5', at(t, r0), 34);
  pill(ctx, 'ACTUALIZA CADA ARCHIVO', 1220, 820, '#2fbf5b', at(t, u0), 36);
  clawd(ctx, 1760, 250, 9, t, { walk: t > r0 && t < u0 + 1.4, glow: .5 });
}]);
// 26-27 — ejecutar comandos
SC.push([26, 'whip', (ctx, t) => {
  kzBGH(ctx, t); canHeader(ctx, t, 2, L(26));
  const fix = T(27, 'decidir');
  termLines(ctx, 140, 290, 1120, 560, t, [
    [T(27, 'compila'), '$ npm run build', '#f08a4b'], [T(27, 'compila') + .6, '  ✓ compilado', '#9be37a'],
    [T(27, 'pruebas'), '$ npm test', '#f08a4b'], [T(27, 'pruebas') + .6, '  2 pruebas fallan', '#ff6b6b'],
    [T(27, 'instala'), '$ npm install tween', '#f08a4b'], [fix + .4, '→ corrige y repite: ✓ 12 OK', '#ffd76a']]);
  clawd(ctx, 1560, 760, 16, t, { look: -1, sweat: t > T(27, 'pruebas') + .6 && t < fix ? 1 : 0, happy: t > fix + 1.2 });
  pill(ctx, 'USA EL RESULTADO', 1560, 360, '#2fbf5b', at(t, T(27, 'usa')), 36);
  pill(ctx, '→ SIGUIENTE PASO', 1560, 460, '#3a2f7a', at(t, T(27, 'siguiente')), 34);
}]);
// 28-29 — buscar en la web
SC.push([28, 'whip', (ctx, t) => {
  kzBGH(ctx, t); canHeader(ctx, t, 3, L(28));
  windowFrame(ctx, 200, 290, 1100, 560, 'Navegador');
  rrect(ctx, 260, 370, 980, 70, 35); fillStroke(ctx, '#fff', 5);
  const q = 'documentación de la API', k = clamp((t - T(29, 'documentación')) / 1.2);
  text(ctx, q.slice(0, Math.ceil(q.length * k)) + (k < 1 && (t * 2 % 1) < .5 ? '|' : ''), 300, 406, 34, '#2a2160', INK, 0, 'Poppins', 600, 'left');
  [['Referencia de la API · v4', '#2f9ad6', 'referencia'], ['Guía rápida', '#5b3df5', 'reciente'], ['Ejemplos de código', '#2fbf5b', 'busca']].forEach(([s, c, w], i) => { const p = at(t, T(29, w)); if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; rrect(ctx, 260, 480 + i * 115, 980, 95, 16); fillStroke(ctx, '#f4f1ff', 4); text(ctx, s, 300, 515 + i * 115, 34, c, INK, 0, 'Poppins', 700, 'left'); line(ctx, 300, 552 + i * 115, 900 - i * 120, 552 + i * 115, 7, '#d0cbe6'); ctx.restore(); });
  clawd(ctx, 1580, 760, 16, t, { look: -1, happy: t > T(29, 'busca') + .3 });
  pill(ctx, 'LA BUSCA POR TI', 1580, 420, '#ff5a8a', at(t, T(29, 'busca')), 36);
}]);
// 30 — tres ideas
const IDEAS = [['1', 'CONTEXTO', '#34d1ff'], ['2', 'PERMISOS', '#2fbf5b'], ['3', 'ERRORES', '#e0392f']];
SC.push([30, 'whip', (ctx, t) => {
  kzBGH(ctx, t, 1);
  pill(ctx, 'PARA USARLO BIEN: 3 IDEAS', 960, 180, '#ff5a8a', at(t, L(30)), 50);
  IDEAS.forEach(([n, s, c], i) => { const p = at(t, L(30) + .6 + i * .3); if (p <= 0) return; const x = 480 + i * 480; ctx.save(); ctx.translate(x, 500); ctx.scale(backOut(p), backOut(p)); circle(ctx, 0, 0, 110); fillStroke(ctx, c, 8); text(ctx, n, 0, 6, 120, '#fff', INK, 0); ctx.restore(); pill(ctx, s, x, 700, c, p, 38); });
}]);
// 31-33 — ventana de contexto
SC.push([31, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  text(ctx, '1. VENTANA DE CONTEXTO', 120, 214, 52, '#fff', INK, 0, 'Poppins', 700, 'left');
  const bx = 1180, by = 300, bw = 620, bh = 520;
  rrect(ctx, bx, by, bw, bh, 30); fillStroke(ctx, 'rgba(52,209,255,.12)', 8, '#34d1ff');
  text(ctx, 'MEMORIA DE TRABAJO', bx + bw / 2, by + 50, 34, '#34d1ff', INK, 0);
  clawd(ctx, bx + bw / 2, by + bh - 30, 10, t, { sweat: t > T(32, 'todo') && t < L(33) ? 1 : 0, happy: t > T(33, 'necesita') });
  const strat = t > L(33) - .1;
  // proyecto: 6x6 archivos
  const grid = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) grid.push([200 + c * 140, 330 + r * 90]);
  const picks = [8, 21, 27];
  if (!strat) {
    const flood = at(t, T(32, 'mucho'), 1.6);
    grid.forEach(([x, y], i) => { if (i >= 21) { const full = flood > .95, sx = full ? Math.sin(t * 30 + i) * 4 : 0; rrect(ctx, x + sx, y, 100, 60, 10); fillStroke(ctx, full ? '#e0392f' : '#5b3df5', 4); return; }
      const k = clamp(flood * 1.6 - i / 21 * .6); const px = lerp(x, bx + 40 + (i % 7) * 80, ease(k)), py = lerp(y, by + 100 + Math.floor(i / 7) * 80, ease(k)); rrect(ctx, px, py, 70, 60, 10); fillStroke(ctx, '#5b3df5', 4); });
    pill(ctx, 'MUCHO, PERO NO TODO', 700, 880 - 60, '#e0392f', at(t, T(32, 'todo')), 36);
  } else {
    const sk = at(t, T(33, 'estratégica'), 1.2), go = at(t, T(33, 'abre'), .8);
    grid.forEach(([x, y], i) => { const pi = picks.indexOf(i), hit = pi >= 0 && sk > (pi + 1) / 4;
      const k = pi >= 0 ? ease(go) : 0, px = lerp(x, bx + 80 + pi * 160, k), py = lerp(y, by + 190, k);
      rrect(ctx, px, py, 100, 60, 10); fillStroke(ctx, hit ? '#ffd23a' : 'rgba(91,61,245,.45)', 4); });
    if (sk > 0 && sk < 1) { const i = Math.floor(sk * 36) % 36, [x, y] = grid[i]; magnifier(ctx, x + 50, y + 30, .7); }
    pill(ctx, 'ABRE SOLO LO QUE NECESITA', 700, 820, '#2fbf5b', at(t, T(33, 'necesita')), 34);
  }
  text(ctx, 'TU PROYECTO', 620, 290, 32, '#b9a3ff', INK, 0);
}]);
// 34-37 — permisos
SC.push([34, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  text(ctx, '2. TÚ CONTROLAS LOS PERMISOS', 120, 214, 52, '#fff', INK, 0, 'Poppins', 700, 'left');
  const auto = t > L(36) - .1, choose = t > L(37) - .1;
  if (!auto) {
    permDialog(ctx, 760, 520, 900, '$ npm install tween', at(t, T(35, 'permiso')), t > T(35, 'archivo') + .3 ? 0 : -1);
    drawStick(ctx, C(ME, { x: 1500, y: 880, s: 520, flip: -1, arms: { L: [.3, -.1], R: t > T(35, 'archivo') + .1 ? { ik: [.4, -.7] } : [.3, -.1] }, face: { look: [-.8, -.2], mouth: 'smile' } }));
  } else if (!choose) {
    pill(ctx, 'MODO AUTOMÁTICO', 960, 320, '#d97757', at(t, T(36, 'automático')), 44);
    shield(ctx, 960, 600, 1.1, '#2fbf5b', at(t, T(36, 'seguridad')));
    const flow = t - T(36, 'filtra');
    for (let i = 0; i < 7; i++) { const k = ((flow * .6 + i / 7) % 1); if (flow < 0) break; const bad = i === 3; let x = lerp(200, 1720, k); if (bad && x > 860) x = 860; const y = 600 + Math.sin(i * 2.1) * 90; rrect(ctx, x - 60, y - 30, 120, 60, 14); fillStroke(ctx, bad ? '#e0392f' : '#9be37a', 5); text(ctx, bad ? '✕' : '✓', x, y + 2, 34, '#fff', INK, 0); }
    clawd(ctx, 300, 860, 9, t, { walk: true });
  } else {
    const v = kf(t, [[T(37, 'eliges'), .2], [T(37, 'eliges') + 1, .75], [T(37, 'involucrado'), .45]]);
    slider(ctx, 360, 560, 1200, 'Tú eliges', v, '#d97757');
    text(ctx, 'MÁS CONTROL', 360, 650, 34, '#ffd23a', INK, 0, 'Poppins', 700, 'left'); text(ctx, 'MÁS AUTÓNOMO', 1560, 650, 34, '#9be37a', INK, 0, 'Poppins', 700, 'right');
    clawd(ctx, 360 + 1200 * v, 470, 9, t, { happy: 1 });
  }
}]);
// 38-40 — puede equivocarse
SC.push([38, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  text(ctx, '3. PUEDE EQUIVOCARSE', 120, 214, 52, '#fff', INK, 0, 'Poppins', 700, 'left');
  const late = t > L(40) - .1;
  clawd(ctx, 420, 720, 20, t, { sweat: late ? 0 : 1, look: .8 });
  crossRow(ctx, 1230, 360, 'ENTIENDE MAL LO QUE QUERÍAS', at(t, T(39, 'entender')));
  crossRow(ctx, 1230, 490, 'METE UN ERROR NUEVO', at(t, T(39, 'meter')));
  crossRow(ctx, 1230, 620, 'COMPLICA DE MÁS LA SOLUCIÓN', at(t, T(39, 'complicar')));
  bug(ctx, 740, 560, .6, t, at(t, T(39, 'meter')));
  if (late) { pill(ctx, 'MANTENTE ATENTO', 1230, 800, '#2fbf5b', at(t, T(40, 'atento')), 44); magnifier(ctx, 760, 520, 1.2 * at(t, T(40, 'atento')), -.4); }
}]);
// 41-45 — repaso
SC.push([41, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'REPASO', 960, 140, '#e0392f', at(t, L(41)), 56);
  clawd(ctx, 1720, 210, 9, t, { happy: 1 });
  checkRow(ctx, 160, 300, 'Herramienta agéntica que trabaja en tu proyecto', at(t, L(42)));
  checkRow(ctx, 160, 430, 'Agente = modelo en un bucle: piensa, actúa, revisa', at(t, L(43)));
  checkRow(ctx, 160, 560, 'Lee, edita, ejecuta comandos y busca en la web', at(t, L(44)));
  checkRow(ctx, 160, 690, 'Cuida el contexto, elige permisos, revisa su trabajo', at(t, L(45)));
}]);
// 46-47 — reflexión
SC.push([46, 'whip', (ctx, t) => {
  roomBG(ctx, t);
  rrect(ctx, 820, 600, 880, 40, 10); fillStroke(ctx, '#9a6a3a', 6); for (const x of [860, 1640]) { rrect(ctx, x, 640, 30, 190, 6); fillStroke(ctx, '#7a5230', 6); }
  deviceLaptop(ctx, 1260, 600, .9, t);
  const late = t > L(47) - .1;
  drawStick(ctx, C(ME, { x: 520, y: 880, s: 540, arms: { L: { ik: [-.13, -.92], bend: -1 }, R: late ? { ik: [.42, -.6] } : [.3, -.1] }, face: { look: [.8, -.2], mouth: late ? 'grin' : 'flat', browOne: late ? 0 : 1, eyes: late ? 'happy' : 'normal' } }));
  pill(ctx, 'REFLEXIÓN', 520, 150, '#e0392f', at(t, L(46)), 40);
  const tb = at(t, T(46, 'tarea'), .4);
  if (tb > 0) { ctx.save(); ctx.globalAlpha = tb; for (const [x, y, r] of [[690, 330, 14], [730, 290, 22]]) { circle(ctx, x, y, r); fillStroke(ctx, '#fff', 5); } rrect(ctx, 760, 120, 520, 190, 60); fillStroke(ctx, '#fff', 6); clawd(ctx, 880, 270, 7, t, { glow: 0, walk: true }); text(ctx, '¿qué tarea?', 1110, 210, 40, INK, INK, 0); ctx.restore(); }
  if (late) { magnifier(ctx, 1500, 260, at(t, T(47, 'revisarías')) * .9, -.5); pill(ctx, '¿CÓMO LO REVISO?', 1260, 740, '#2f9ad6', at(t, T(47, 'revisarías')), 34); }
}]);
// 48-52 — mapa del curso
const PARTS = [['¿Qué es Claude Code?', 'Cómo funciona por dentro', '#d97757', 49], ['Tu primer prompt', 'Instalarlo · modos', '#2f9ad6', 50], ['Flujos de trabajo diarios', 'Explorar → planificar → programar → confirmar', '#5b3df5', 51], ['Personalización', 'CLAUDE.md · subagentes · skills · MCP · hooks', '#2fbf5b', 52]];
SC.push([48, 'whip', (ctx, t) => {
  kzBGH(ctx, t, 1);
  pill(ctx, 'EL CURSO: 4 PARTES', 960, 150, '#2f9ad6', at(t, T(48, 'cuatro')), 48);
  const k = kf(t, [[L(49), 0], [L(50), 1], [L(51), 2], [L(52), 3], [LE(52), 3.6]], x => x);
  line(ctx, 200, 300, 200, 300 + 145 * 3, 10, 'rgba(255,255,255,.3)');
  PARTS.forEach(([a, b, c, li], i) => { const p = at(t, L(li)); const y = 300 + i * 145; if (p <= 0) { circle(ctx, 200, y, 22); fillStroke(ctx, '#3a2f7a', 5); return; }
    ctx.save(); ctx.globalAlpha = clamp(p * 3); circle(ctx, 200, y, 34); fillStroke(ctx, c, 6); text(ctx, String(i + 1), 200, y + 2, 38, '#fff', INK, 0);
    text(ctx, a, 270, y - 22, 46, '#fff', INK, 0, 'Poppins', 700, 'left'); text(ctx, b, 270, y + 30, 32, '#cfc3ff', INK, 0, 'Poppins', 600, 'left'); ctx.restore(); });
  clawd(ctx, 140, 300 + 145 * Math.min(3, k) + 22, 5, t, { glow: 0, alpha: at(t, L(49)) });
  clawd(ctx, 1600, 760, 16, t, { look: -1, happy: t > L(52) });
}]);
// 53 — siguiente lección
SC.push([53, 'cut', (ctx, t) => {
  kzBGH(ctx, t, 1);
  clawd(ctx, 960, 430, 20, t, { wave: 1, happy: 1 });
  pill(ctx, 'SIGUIENTE LECCIÓN', 960, 560, PURPLE, at(t, L(53)), 44);
  const p = at(t, T(53, 'cómo'), .4); ctx.save(); ctx.translate(960, 700); ctx.scale(backOut(p), backOut(p)); ctx.globalAlpha = clamp(p * 3); text(ctx, 'Cómo funciona Claude Code', 0, 0, 80, '#fff', INK, 0); ctx.restore();
}]);

const SHOTS = [];
SC.forEach(([li, tr, draw], i) => {
  const start = i === 0 ? 0 : L(li) - .15;
  const end = i < SC.length - 1 ? L(SC[i + 1][0]) - .15 : LE(53) + 1.2;
  SHOTS.push({ start, end, tr, draw(ctx, lt, t) { draw(ctx, t); } });
});
