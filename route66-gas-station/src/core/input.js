// Entrada unificada: teclado + mouse (PC) y joystick + deslizar (táctil).
// El resto del juego solo lee: input.moveX, input.moveY, input.run y consumeLook().
import { CFG } from '../config.js';

export function createInput({ layer, joyEl, knobEl, interactBtn, canvas }) {
  const keys = new Set();
  const state = {
    moveX: 0, // −1 izquierda … 1 derecha
    moveY: 0, // −1 atrás … 1 adelante
    run: false,
    touchMode: window.matchMedia('(pointer: coarse)').matches,
    locked: false,
    enabled: false,
    interactHeld: false, // true mientras se mantiene E, clic o el botón naranja
  };
  const held = { key: false, mouse: false, btn: false };
  let lookX = 0, lookY = 0;
  let interactCb = () => {};
  let modeCb = () => {};

  const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
  const look = { id: null, lx: 0, ly: 0, moved: 0, type: '' };
  const JOY_R = 56;

  function setTouchMode(on) {
    if (state.touchMode === on) return;
    state.touchMode = on;
    modeCb(on);
  }

  function releaseAll() {
    keys.clear();
    joy.id = null; joy.x = joy.y = 0;
    look.id = null;
    joyEl.classList.remove('on');
    interactBtn.classList.remove('down');
    held.key = held.mouse = held.btn = false;
  }

  // ---------- Teclado ----------
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  window.addEventListener('keydown', (e) => {
    if (!state.enabled) return;
    if (MOVE_KEYS.includes(e.code)) { keys.add(e.code); e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!e.repeat) { held.key = true; interactCb(); }
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'KeyE' || e.code === 'Space') held.key = false;
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  // ---------- Mouse con puntero capturado ----------
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    modeCb(state.touchMode);
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked || !state.enabled) return;
    lookX += e.movementX * CFG.mouseSens;
    lookY += e.movementY * CFG.mouseSens;
  });
  document.addEventListener('mousedown', (e) => {
    if (state.locked && state.enabled && e.button === 0) { held.mouse = true; interactCb(); }
  });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) held.mouse = false; });

  // ---------- Capa táctil / arrastre ----------
  layer.addEventListener('pointerdown', (e) => {
    if (!state.enabled) return;
    const touch = e.pointerType !== 'mouse';
    setTouchMode(touch);
    if (touch && e.clientX < window.innerWidth * 0.45 && joy.id === null) {
      joy.id = e.pointerId; joy.cx = e.clientX; joy.cy = e.clientY; joy.x = joy.y = 0;
      joyEl.style.left = `${e.clientX}px`; joyEl.style.top = `${e.clientY}px`;
      knobEl.style.transform = 'translate(-50%, -50%)';
      joyEl.classList.add('on');
    } else if (look.id === null) {
      look.id = e.pointerId; look.lx = e.clientX; look.ly = e.clientY; look.moved = 0; look.type = e.pointerType;
    } else return;
    try { layer.setPointerCapture(e.pointerId); } catch { /* no crítico */ }
    e.preventDefault();
  });

  layer.addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) {
      let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
      const len = Math.hypot(dx, dy);
      if (len > JOY_R) { dx *= JOY_R / len; dy *= JOY_R / len; }
      joy.x = dx / JOY_R; joy.y = -dy / JOY_R;
      knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    } else if (e.pointerId === look.id) {
      const dx = e.clientX - look.lx, dy = e.clientY - look.ly;
      look.lx = e.clientX; look.ly = e.clientY;
      look.moved += Math.abs(dx) + Math.abs(dy);
      const sens = look.type === 'mouse' ? CFG.mouseSens * 1.6 : CFG.touchSens;
      lookX += dx * sens; lookY += dy * sens;
    }
  });

  function pointerEnd(e) {
    if (e.pointerId === joy.id) {
      joy.id = null; joy.x = joy.y = 0;
      joyEl.classList.remove('on');
    } else if (e.pointerId === look.id) {
      look.id = null;
      // Clic sin arrastrar en PC: capturar el puntero para mirar con el mouse
      if (e.type === 'pointerup' && look.type === 'mouse' && look.moved < 6 && canvas.requestPointerLock) {
        try {
          const p = canvas.requestPointerLock();
          if (p && p.catch) p.catch(() => {});
        } catch { /* sin pointer lock: queda el arrastre */ }
      }
    }
  }
  layer.addEventListener('pointerup', pointerEnd);
  layer.addEventListener('pointercancel', pointerEnd);
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  // Safari: bloquear zoom con gesto de pellizco
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ---------- Botón de interactuar ----------
  interactBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!state.enabled) return;
    interactBtn.classList.add('down');
    held.btn = true;
    try { interactBtn.setPointerCapture(e.pointerId); } catch { /* no crítico */ }
    interactCb();
  });
  const up = () => { interactBtn.classList.remove('down'); held.btn = false; };
  interactBtn.addEventListener('pointerup', up);
  interactBtn.addEventListener('pointercancel', up);
  interactBtn.addEventListener('lostpointercapture', up);

  return Object.assign(state, {
    // Llamar una vez por frame antes de mover al jugador
    update() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      state.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
      if (joy.id !== null) { x = joy.x; y = joy.y; }
      state.moveX = x; state.moveY = y;
      state.joystick = joy.id !== null;
      state.interactHeld = held.key || held.mouse || held.btn;
    },
    consumeLook(out) { out.x = lookX; out.y = lookY; lookX = 0; lookY = 0; },
    onInteract(fn) { interactCb = fn; },
    onModeChange(fn) { modeCb = fn; },
    setEnabled(on) {
      state.enabled = on;
      if (!on) {
        releaseAll();
        lookX = lookY = 0;
        if (document.pointerLockElement) document.exitPointerLock();
      }
    },
    releaseAll,
  });
}
