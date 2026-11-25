// ---------- Claude 101 · Lección 1: ¿Qué es Claude? (1920x1080) ----------
const C = (base, extra) => Object.assign({}, base, extra);
const handheld = (t, a = 4) => shake(t * .35, a, 1, 2);
const ME = { cols: ['#2f9ad6', '#2f9ad6'], hat: 'hair', hairCol: '#3a2618', belt: false };
const CH = [[2, '1 · ¿Qué es Claude?', '#e26a2c'], [9, '2 · Más que un chatbot', '#2fbf5b'], [15, '3 · Sus 5 capacidades', '#5b3df5'], [31, '4 · Dónde usarlo', '#2f9ad6'], [41, '5 · Repaso', '#e0392f']];
window.OVERLAY = (ctx, t) => {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const c = CH.filter(c => t >= L(c[0]) - .2).pop();
  if (c) { ctx.font = '700 30px Poppins'; const w = ctx.measureText(c[1]).width + 50; rrect(ctx, 40, 34, w, 58, 29); ctx.fillStyle = c[2]; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); text(ctx, c[1], 40 + w / 2, 64, 30, '#fff', INK, 0); }
  const p = clamp(t / (window.DUR || 230)); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, H - 8, W, 8); ctx.fillStyle = ORANGE; ctx.fillRect(0, H - 8, W * p, 8);
  ctx.restore();
};
const SC = [];   // [línea de inicio, transición, draw]
// 0 — portada
SC.push([0, 'cut', (ctx, t) => {
  kzBGH(ctx, t, 1);
  orb(ctx, 960, 330, 120, t);
  pill(ctx, 'CLAUDE 101 · LECCIÓN 1 DE 13', 960, 140, PURPLE, at(t, .1), 34);
  const p = at(t, .3, .4); ctx.save(); ctx.translate(960, 560); const s = lerp(1.5, 1, backOut(p)); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 3); text(ctx, '¿Qué es Claude?', 0, 0, 120, '#fff', INK, 0); ctx.restore();
  [['QUÉ ES', T(1, 'qué')], ['QUÉ PUEDE HACER', T(1, 'hacer')], ['DÓNDE USARLO', T(1, 'dónde')]].forEach(([s, tt], i) => pill(ctx, s, 560 + i * 400, 760, ['#e26a2c', '#5b3df5', '#2f9ad6'][i], at(t, tt), 36));
}]);
// 2-3 — asistente para tu vida y tu trabajo
SC.push([2, 'whip', (ctx, t) => {
  roomBG(ctx, t);
  rrect(ctx, 520, 600, 880, 40, 10); fillStroke(ctx, '#9a6a3a', 6); for (const x of [560, 1340]) { rrect(ctx, x, 640, 30, 190, 6); fillStroke(ctx, '#7a5230', 6); }
  deviceLaptop(ctx, 960, 600, .9, t);
  drawStick(ctx, C(ME, { x: 420, y: 880, s: 520, arms: { L: [.3, -.1], R: { ik: [.42, -.55] } }, face: { look: [.8, -.2], mouth: 'smile' } }));
  pill(ctx, 'ASISTENTE DE IA', 960, 140, ORANGE, at(t, T(3, 'asistente')), 44);
  pill(ctx, 'VIDA', 1560, 330, '#2fbf5b', at(t, T(3, 'vida')), 40); pill(ctx, 'TRABAJO', 1560, 450, '#2f9ad6', at(t, T(3, 'trabajo')), 40);
}]);
// 4-5 — compañero de pensamiento
SC.push([4, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  drawStick(ctx, C(ME, { x: 560, y: 880, s: 560, arms: { L: { ik: [-.13, -.92], bend: -1 }, R: [.3, -.1] }, face: { look: [.8, -.4], mouth: t > T(5, 'mejores') ? 'grin' : 'flat', browOne: 1, eyes: t > T(5, 'mejores') ? 'happy' : 'normal' } }));
  orb(ctx, 1400, 600, 120, t);
  const q = at(t, T(4, 'responda')); chatBubble(ctx, 700, 250, 260, 80, true, q * (t < T(4, 'compañero') ? 1 : 0), 1);
  pill(ctx, 'COMPAÑERO DE PENSAMIENTO', 960, 150, ORANGE, at(t, T(4, 'compañero')), 46);
  ['ANALIZAR', 'ORDENAR IDEAS', 'MEJORES SOLUCIONES'].forEach((s, i) => { const tt = T(5, ['analizar', 'ordenar', 'mejores'][i]); const k = at(t, tt, .5); if (k <= 0) return; const x = lerp(1360, 960, k), y = lerp(560, 300 + i * 0, k); pill(ctx, s, 960, 330 + i * 110, ['#5b3df5', '#2f9ad6', '#2fbf5b'][i], k, 34); });
  lightbulb(ctx, 1360, 260, .6, at(t, T(5, 'mejores'), .4));
}]);
// 6-8 — principios e IA constitucional
SC.push([6, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  ctx.save(); ctx.translate(480, 470); const sp = backOut(at(t, L(6), .4)); ctx.scale(sp, sp);
  ctx.beginPath(); ctx.moveTo(0, -260); ctx.lineTo(220, -180); ctx.quadraticCurveTo(220, 140, 0, 270); ctx.quadraticCurveTo(-220, 140, -220, -180); ctx.closePath(); fillStroke(ctx, '#2fbf5b', 10);
  ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-20, 70); ctx.lineTo(100, -80); ctx.lineWidth = 34; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  pill(ctx, 'PRINCIPIOS CLAROS', 480, 130, '#2fbf5b', at(t, T(6, 'principios')), 40);
  const late = t > L(8) - .1;
  if (!late) {
    crossRow(ctx, 1280, 300, 'RESPUESTAS TÓXICAS', at(t, T(7, 'tóxicas')));
    crossRow(ctx, 1280, 430, 'DISCRIMINACIÓN', at(t, T(7, 'discriminatorias')));
    crossRow(ctx, 1280, 560, 'AYUDA ILEGAL O POCO ÉTICA', at(t, T(7, 'ilegales')));
  } else {
    pill(ctx, 'IA CONSTITUCIONAL', 1280, 260, ORANGE, at(t, T(8, 'constitucional')), 56);
    checkRow(ctx, 1000, 440, 'Alineada con valores humanos', at(t, T(8, 'valores')));
    checkRow(ctx, 1000, 560, 'Actúa de forma transparente', at(t, T(8, 'transparente')));
  }
}]);
// 9-10 — más que un chatbot
SC.push([9, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  const a = at(t, L(9), .4);
  ctx.save(); ctx.globalAlpha = .55 + .45 * a; windowFrame(ctx, 140, 230, 520, 440, 'chatbot simple');
  chatBubble(ctx, 360, 320, 250, 70, true, 1, 1); rrect(ctx, 190, 430, 200, 70, 22); fillStroke(ctx, '#e8e8ef', 5); text(ctx, '…', 290, 458, 60, '#888', INK, 0); ctx.restore();
  text(ctx, 'VS', 820, 450, 80, '#fff', INK, 0);
  orb(ctx, 1080, 450, 110, t);
  const tasks = [['RESUMIR', 'resumir'], ['BUSCAR', 'buscar'], ['ESCRIBIR', 'escribir'], ['RESPONDER', 'responder'], ['PROGRAMAR', 'programar']];
  tasks.forEach(([s, w], i) => pill(ctx, s, 1500, 200 + i * 110, BRAIN_COLS[i], at(t, T(10, w)), 38));
  pill(ctx, 'CONFIABLE Y PREDECIBLE', 1080, 680, PURPLE, at(t, T(10, 'confiable')), 34);
}]);
// 11-14 — se puede guiar
SC.push([11, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  rrect(ctx, 140, 180, 760, 560, 30); fillStroke(ctx, '#2a2160', 8, '#fff');
  const v1 = kf(t, [[T(12, 'personalidad'), .2], [T(12, 'personalidad') + .8, .75]]), v2 = kf(t, [[T(12, 'tono'), .7], [T(12, 'tono') + .8, .35]]), v3 = kf(t, [[T(12, 'comportamiento'), .3], [T(12, 'comportamiento') + .8, .85]]);
  slider(ctx, 220, 330, 600, 'Personalidad', v1, ORANGE); slider(ctx, 220, 490, 600, 'Tono', v2, '#2fbf5b'); slider(ctx, 220, 650, 600, 'Comportamiento', v3, '#2f9ad6');
  const late = t > L(13) - .1;
  orb(ctx, 1380, late ? 280 : 440, late ? 90 : 140, t, { col: mix(ORANGE, '#ff6fa8', v2) });
  if (late) {
    checkRow(ctx, 1080, 470, 'Menos respuestas dañinas', at(t, T(13, 'dañinas')));
    checkRow(ctx, 1080, 580, 'Conversación más fácil', at(t, T(13, 'fáciles')));
    checkRow(ctx, 1080, 690, 'Mejor control', at(t, T(13, 'control')));
  }
  pill(ctx, '= MENOS ESFUERZO', 1380, 140, '#2fbf5b', at(t, T(14, 'esfuerzo')), 44);
}]);
// 15 — las 5 capacidades
const CAPS = [['pen', 'ESCRIBIR', '#e26a2c'], ['search', 'INVESTIGAR', '#2f9ad6'], ['code', 'PROGRAMAR', '#5b3df5'], ['brain', 'RAZONAR', '#ff5a8a'], ['learn', 'APRENDER', '#2fbf5b']];
SC.push([15, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, '5 GRANDES CAPACIDADES', 960, 160, PURPLE, at(t, L(15)), 52);
  CAPS.forEach(([k, s, c], i) => { const p = at(t, L(15) + .5 + i * .25); icon(ctx, k, 320 + i * 320, 480, 1.1, c, p); pill(ctx, s, 320 + i * 320, 660, c, p, 32); });
}]);
function capHeader(ctx, t, i, start) { icon(ctx, CAPS[i][0], 150, 210, .6, CAPS[i][2], at(t, start)); text(ctx, `${i + 1}. ${CAPS[i][1]}`, 240, 214, 52, '#fff', INK, 0, 'Poppins', 700, 'left'); }
// 16-18 — escritura
SC.push([16, 'whip', (ctx, t) => {
  kzBGH(ctx, t); capHeader(ctx, t, 0, L(16));
  const docs = [['PUBLICACIÓN', 'publicación', '#ff5a8a'], ['CORREO', 'correo', '#2f9ad6'], ['INFORME', 'informe', '#2fbf5b']];
  docs.forEach(([s, w, c], i) => { const p = at(t, T(17, w), .4); if (p <= 0) return; ctx.save(); ctx.translate(380 + i * 330, 560); ctx.rotate((i - 1) * .06); ctx.scale(backOut(p), backOut(p)); rrect(ctx, -130, -170, 260, 340, 18); fillStroke(ctx, '#fffaf2', 6); ctx.save(); rrect(ctx, -130, -170, 260, 340, 18); ctx.clip(); ctx.fillStyle = c; ctx.fillRect(-130, -170, 260, 60); ctx.restore(); rrect(ctx, -130, -170, 260, 340, 18); fillStroke(ctx, null, 6); text(ctx, s, 0, -138, 28, '#fff', INK, 0); for (let k = 0; k < (i + 2) * 2; k++) line(ctx, -100, -80 + k * 30, 90 - (k % 3) * 30, -80 + k * 30, 8, '#d8d0bc'); ctx.restore(); });
  const v = t < T(18, 'claridad') ? 1 : t < T(18, 'suene') ? 2 : 3;
  if (t > L(18) - .1) { orb(ctx, 1480, 420, 90, t); [1, 2, 3].forEach(k => { if (k <= v) pill(ctx, k < 3 ? `BORRADOR ${k}` : '✓ SUENA A TI', 1480, 600 + (k - 1) * 90, k < 3 ? '#7a7a9a' : '#2fbf5b', 1, 32); }); }
}]);
// 19-22 — investigación y análisis
SC.push([19, 'whip', (ctx, t) => {
  kzBGH(ctx, t); capHeader(ctx, t, 1, L(19));
  if (t < L(21) - .1) {
    orb(ctx, 960, 520, 110, t);
    [['ÁNGULOS', 'ángulos'], ['HALLAZGOS', 'hallazgos'], ['DATOS', 'datos'], ['TUS DOCUMENTOS', 'documentos']].forEach(([s, w], i) => { const a = i / 4 * TAU - Math.PI / 2 + .4; pill(ctx, s, 960 + Math.cos(a) * 520, 520 + Math.sin(a) * 260, BRAIN_COLS[i], at(t, T(20, w)), 36); });
  } else if (t < L(22) - .1) {
    const n = Math.floor(kf(t, [[L(21), 4], [T(21, 'páginas'), 40]], x => x));
    pageStack(ctx, 600, 720, n, t);
    counter(ctx, 1260, 380, '', '200 000+ tokens', at(t, T(21, 'doscientos')), PURPLE);
    counter(ctx, 1260, 540, '≈ ', '500 páginas', at(t, T(21, 'páginas')), '#2fbf5b');
  } else {
    counter(ctx, 960, 300, 'hasta ', '1 000 000 tokens', at(t, T(22, 'millón')), ORANGE);
    ['Pro', 'Max', 'Ultra', 'Team', 'Enterprise'].forEach((s, i) => pill(ctx, s, 440 + i * 260, 520, BRAIN_COLS[i], at(t, T(22, s.toLowerCase())), 40));
    pill(ctx, 'con modelos compatibles', 960, 670, '#3a2f7a', at(t, T(22, 'compatibles')), 32);
  }
}]);
// 23-24 — programación
SC.push([23, 'whip', (ctx, t) => {
  kzBGH(ctx, t); capHeader(ctx, t, 2, L(23));
  codeEditor(ctx, 160, 300, 980, 420, t, L(23) + .3);
  [['ESCRIBE', 'escribe'], ['DEPURA', 'depura'], ['EXPLICA', 'explica']].forEach(([s, w], i) => pill(ctx, s, 1500, 340 + i * 120, BRAIN_COLS[i + 1], at(t, T(24, w)), 40));
  pill(ctx, 'MUCHOS LENGUAJES', 1500, 720, PURPLE, at(t, T(24, 'lenguajes')), 36);
}]);
// 25-27 — razonamiento: al instante o Thinking
SC.push([25, 'whip', (ctx, t) => {
  kzBGH(ctx, t); capHeader(ctx, t, 3, L(25));
  if (t < L(27) - .1) { ['MATEMÁTICAS', 'ESTRATEGIA', 'INVESTIGACIÓN'].forEach((s, i) => pill(ctx, s, 520 + i * 440, 520, BRAIN_COLS[i + 2], at(t, T(26, ['matemáticas', 'estratégico', 'investigación'][i])), 42)); }
  else {
    rrect(ctx, 160, 320, 760, 380, 30); fillStroke(ctx, '#3a2f7a', 6, '#fff'); rrect(ctx, 1000, 320, 760, 380, 30); fillStroke(ctx, '#3a2f7a', 6, '#fff');
    text(ctx, 'AL INSTANTE', 540, 390, 46, '#ffd76a', INK, 0); text(ctx, 'PENSAR PRIMERO', 1380, 390, 46, '#ff8ac0', INK, 0);
    const a1 = at(t, T(27, 'instante'), .2); chatBubble(ctx, 300, 470, 480, 120, false, a1, 3);
    const k = kf(t, [[T(27, 'pensar'), 0], [T(27, 'paso', 1), 3]], x => x);
    for (let i = 0; i < 3; i++) { const p = clamp(k - i); if (p <= 0) continue; circle(ctx, 1160 + i * 220, 540, 50 * backOut(p)); fillStroke(ctx, BRAIN_COLS[i], 6); text(ctx, String(i + 1), 1160 + i * 220, 544, 50 * p, '#fff', INK, 0); if (i) line(ctx, 1160 + (i - 1) * 220 + 60, 540, 1160 + i * 220 - 60, 540, 8, '#fff'); }
    pill(ctx, 'THINKING', 1380, 640, '#ff5a8a', at(t, T(27, 'thinking')), 40);
  }
}]);
// 28-30 — aprender cosas nuevas
SC.push([28, 'whip', (ctx, t) => {
  roomBG(ctx, t, '#e7f2ff', '#b9c9e0');
  ctx.setTransform(1, 0, 0, 1, 0, 0); rrect(ctx, 660, 130, 720, 420, 20); fillStroke(ctx, '#2f4a3a', 10);
  text(ctx, `${4 + 0} = 2 + ?`, 1020, 260, 70, '#fff', INK, 0, 'Lora');
  icon(ctx, 'learn', 150, 210, .6, CAPS[4][2], at(t, L(28))); text(ctx, '5. APRENDER', 240, 214, 52, INK, '#fff', 0, 'Poppins', 700, 'left');
  const guide = t > T(30, 'guiar');
  if (t > T(29, 'ritmo')) { pill(ctx, 'A TU RITMO', 1020, 470, '#2f9ad6', at(t, T(29, 'ritmo')) * (guide ? 0 : 1), 36); }
  if (guide) { chatBubble(ctx, 1450, 200, 380, 110, false, at(t, T(30, 'guiar')), 2); qmark(ctx, 1800, 190, 90, .2, at(t, T(30, 'guiar'))); }
  orb(ctx, 1560, 470, 90, t);
  const ok = t > T(30, 'pensamiento');
  drawStick(ctx, C(ME, { x: 460, y: 880, s: 540, arms: { L: [.3, -.1], R: { ik: [.3, -.95] } }, face: { look: [.8, -.3], mouth: ok ? 'grin' : 'flat', browOne: ok ? 0 : 1, eyes: ok ? 'happy' : 'normal' } }));
  lightbulb(ctx, 640, 330, .6, at(t, T(30, 'pensamiento'), .4));
  pill(ctx, 'PENSAMIENTO CRÍTICO', 1020, 470, '#2fbf5b', at(t, T(30, 'crítico')), 40);
}]);
// 31-32 — ¿dónde usar a Claude?
const PLACES = [['Claude.ai', ORANGE], ['Claude Code', PURPLE], ['Claude Tag', '#2fbf5b'], ['Claude Design', '#ff5a8a'], ['Microsoft 365', '#2f9ad6']];
SC.push([31, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  orb(ctx, 960, 470, 130, t);
  pill(ctx, '¿DÓNDE USARLO?', 960, 150, '#2f9ad6', at(t, L(31)), 50);
  PLACES.forEach(([s, c], i) => { const a = Math.PI + i / 4 * Math.PI, p = at(t, T(32, 'inteligencia') + i * .25); const x = 960 + Math.cos(a) * 640, y = 520 + Math.sin(a) * 300 * -1 + 60; if (p > 0) { ctx.save(); ctx.globalAlpha = p; line(ctx, 960, 470, x, y, 6, 'rgba(255,255,255,.5)'); ctx.restore(); } pill(ctx, s, x, y, c, p, 36); });
}]);
// 33-34 — Claude.ai
SC.push([33, 'whip', (ctx, t) => {
  kzBGH(ctx, t, 1);
  pill(ctx, 'Claude.ai', 960, 140, ORANGE, at(t, L(33)), 56);
  ctx.save(); ctx.globalAlpha = at(t, T(33, 'navegador')); deviceBrowser(ctx, 470, 520, .75, t); ctx.restore();
  ctx.save(); ctx.globalAlpha = at(t, T(33, 'escritorio')); deviceLaptop(ctx, 1150, 700, .6, t); ctx.restore();
  ctx.save(); ctx.globalAlpha = at(t, T(33, 'celular')); devicePhone(ctx, 1650, 520, .8, t); ctx.restore();
  ['CONVERSAR', 'ESCRIBIR', 'INVESTIGAR', 'ANALIZAR', 'CREAR ARCHIVOS'].forEach((s, i) => pill(ctx, s, 300 + i * 330, 860, BRAIN_COLS[i], at(t, T(34, ['conversas', 'escribes', 'investigas', 'analizas', 'creas'][i])) * (t < T(34, 'usa') ? 1 : 0), 30));
  pill(ctx, 'EL QUE USA ESTE CURSO', 960, 860, '#2fbf5b', at(t, T(34, 'usa')), 36);
}]);
// 35 — Claude Code
SC.push([35, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'Claude Code', 960, 140, PURPLE, at(t, L(35)), 56); pill(ctx, 'PARA PROGRAMADORES', 960, 230, '#3a2f7a', at(t, T(35, 'programadores')), 32);
  terminal(ctx, 300, 300, 1320, 460, t, T(35, 'edita'));
}]);
// 36 — Claude Tag (en Slack)
SC.push([36, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'Claude Tag', 960, 140, '#2fbf5b', at(t, L(36)), 56); pill(ctx, 'DENTRO DE SLACK', 960, 230, '#3a2f7a', at(t, T(36, 'slack')), 32);
  windowFrame(ctx, 380, 290, 1160, 480, '# equipo', '#fffaf2', '#3f1d4a');
  [['Ana', 'hilo', '¿Alguien tiene el resumen de la reunión?'], ['Tú', 'etiquetas', '@Claude, ¿nos haces el resumen?']].forEach(([who, w, s], i) => { const p = at(t, T(36, w)); if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; circle(ctx, 460, 400 + i * 130, 36); ctx.fillStyle = i ? '#2f9ad6' : '#e26a2c'; ctx.fill(); text(ctx, who, 520, 380 + i * 130, 30, INK, INK, 0, 'Poppins', 700, 'left'); text(ctx, s, 520, 420 + i * 130, 32, '#333', INK, 0, 'Poppins', 600, 'left'); ctx.restore(); });
  const r = at(t, T(36, 'canal')); if (r > 0) { ctx.save(); ctx.globalAlpha = r; orb(ctx, 460, 660, 36, t, { glow: 0 }); text(ctx, 'Claude', 520, 640, 30, INK, INK, 0, 'Poppins', 700, 'left'); text(ctx, 'Claro: aquí van los 3 acuerdos principales…', 520, 680, 32, '#333', INK, 0, 'Poppins', 600, 'left'); ctx.restore(); }
}]);
// 37 — Claude Design
SC.push([37, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'Claude Design', 960, 140, '#ff5a8a', at(t, L(37)), 56);
  [['IDEA', 'idea'], ['BOCETO', 'boceto'], ['CAPTURA', 'captura']].forEach(([s, w], i) => pill(ctx, s, 300, 360 + i * 120, BRAIN_COLS[i], at(t, T(37, w)), 36));
  sketchToUI(ctx, 1150, 520, .95, kf(t, [[T(37, 'interfaz'), 0], [T(37, 'interfaz') + .9, 1]]), t);
  pill(ctx, 'PROTOTIPO INTERACTIVO', 1150, 860, '#2fbf5b', at(t, T(37, 'prototipo')), 34);
}]);
// 38 — Claude for Microsoft 365
SC.push([38, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'Claude for Microsoft 365', 960, 140, '#2f9ad6', at(t, L(38)), 52);
  const apps = [['Excel', '#2a8a4a', 'excel'], ['PowerPoint', '#d2552a', 'powerpoint'], ['Word', '#2f63c9', 'word'], ['Outlook', '#1f78c8', 'outlook']];
  apps.forEach(([s, c, w], i) => pill(ctx, s, 300, 300 + i * 120, c, at(t, T(38, w)), 36));
  windowFrame(ctx, 560, 260, 1200, 560, 'Documento abierto');
  for (let k = 0; k < 8; k++) line(ctx, 620, 360 + k * 50, 1240 - (k % 3) * 80, 360 + k * 50, 10, '#d8d0bc');
  const sp = at(t, T(38, 'panel'), .5); if (sp > 0) { const x = 1760 - 400 * easeOut(sp); rrect(ctx, x, 318, 400, 500, 0); fillStroke(ctx, '#fff2e8', 5); orb(ctx, x + 60, 380, 30, t, { glow: 0 }); text(ctx, 'Claude', x + 110, 382, 30, INK, INK, 0, 'Poppins', 700, 'left'); chatBubble(ctx, x + 30, 440, 340, 90, false, 1, 2); chatBubble(ctx, x + 30, 560, 340, 90, false, 1, 2); }
}]);
// 39-40 — planes y sincronización
SC.push([39, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  if (t < L(40) - .1) {
    pill(ctx, 'PLANES', 960, 180, PURPLE, at(t, L(39)), 50);
    ['Free', 'Pro', 'Max', 'Ultra', 'Team', 'Enterprise'].forEach((s, i) => pill(ctx, s, 330 + i * 252, 500, BRAIN_COLS[i % 6], at(t, T(39, s.toLowerCase())), 40));
  } else {
    pill(ctx, 'INICIAS SESIÓN → TODO SE SINCRONIZA', 960, 150, '#2fbf5b', at(t, T(40, 'sesión')), 40);
    deviceBrowser(ctx, 430, 520, .55, t); deviceLaptop(ctx, 960, 640, .5, t); devicePhone(ctx, 1470, 520, .65, t);
    const r = (t * .8) % 1; for (const [a, b] of [[[600, 450], [820, 420]], [[1100, 420], [1360, 450]]]) { const p = [lerp(a[0], b[0], r), lerp(a[1], b[1], r) - Math.sin(r * Math.PI) * 60]; circle(ctx, p[0], p[1], 16); ctx.fillStyle = ORANGE; ctx.fill(); }
    ['CONVERSACIONES', 'PROYECTOS', 'MEMORIA', 'PREFERENCIAS'].forEach((s, i) => pill(ctx, s, 390 + i * 380, 840, BRAIN_COLS[i], at(t, T(40, s.toLowerCase())), 32));
  }
}]);
// 41-45 — repaso
SC.push([41, 'whip', (ctx, t) => {
  kzBGH(ctx, t);
  pill(ctx, 'REPASO', 960, 140, '#e0392f', at(t, L(41)), 56);
  orb(ctx, 1720, 150, 70, t);
  checkRow(ctx, 220, 300, 'Asistente de IA y compañero de pensamiento, con principios', at(t, L(42)));
  checkRow(ctx, 220, 430, 'Más que un chatbot · puedes guiar su tono', at(t, L(43)));
  checkRow(ctx, 220, 560, '5 fortalezas: escribir, investigar, programar, razonar, enseñar', at(t, L(44)));
  checkRow(ctx, 220, 690, 'Web, escritorio, celular y otras herramientas', at(t, L(45)));
}]);
// 46-47 — reflexión
SC.push([46, 'whip', (ctx, t) => {
  roomBG(ctx, t);
  calendarWeek(ctx, 1200, 470, .95, at(t, T(47, 'elige'), .4), t);
  const pick = t > T(47, 'elige');
  drawStick(ctx, C(ME, { x: 420, y: 880, s: 540, arms: { L: { ik: [-.13, -.92], bend: -1 }, R: pick ? { ik: [.4, -.7] } : [.3, -.1] }, face: { look: [.8, -.2], mouth: pick ? 'grin' : 'flat', browOne: pick ? 0 : 1, eyes: pick ? 'happy' : 'normal' } }));
  pill(ctx, 'REFLEXIÓN', 420, 140, '#e0392f', at(t, L(46)), 40);
  if (!pick) qmark(ctx, 600, 260, 120 * at(t, T(46, 'tareas')), .2, at(t, T(46, 'tareas')));
}]);
// 48 — siguiente lección
SC.push([48, 'cut', (ctx, t) => {
  kzBGH(ctx, t, 1);
  orb(ctx, 960, 330, 100, t);
  pill(ctx, 'SIGUIENTE LECCIÓN', 960, 540, PURPLE, at(t, L(48)), 44);
  const p = at(t, T(48, 'tu'), .4); ctx.save(); ctx.translate(960, 680); ctx.scale(backOut(p), backOut(p)); ctx.globalAlpha = clamp(p * 3); text(ctx, 'Tu primera conversación con Claude', 0, 0, 74, '#fff', INK, 0); ctx.restore();
}]);

const SHOTS = [];
SC.forEach(([li, tr, draw], i) => {
  const start = i === 0 ? 0 : L(li) - .15;
  const end = i < SC.length - 1 ? L(SC[i + 1][0]) - .15 : LE(48) + 1.2;
  SHOTS.push({ start, end, tr, draw(ctx, lt, t) { draw(ctx, t); } });
});
