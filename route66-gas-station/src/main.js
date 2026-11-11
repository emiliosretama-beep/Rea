// Arranque y bucle principal.
import { CFG } from './config.js';
import { initI18n, setLang, getLang, onLangChange, applyDom, t } from './core/i18n.js';
import { createInput } from './core/input.js';
import { createPlayer } from './core/player.js';
import { createScene } from './world/scene.js';
import { createRoad } from './world/road.js';
import { createStation } from './world/station.js';
import { createProps } from './world/props.js';
import { createTraffic } from './world/traffic.js';
import { createInteractions } from './game/interactions.js';
import { createHud } from './ui/hud.js';
import { createState } from './game/state.js';
import { createCustomers } from './game/customers.js';

const $ = (id) => document.getElementById(id);
const body = document.body;

initI18n();
$('version').textContent = CFG.version;

const canvas = $('game');
const view = createScene(canvas);
const road = createRoad(view.scene);
const station = createStation(view.scene);
const props = createProps(view.scene);
const traffic = createTraffic(view.scene);

const colliders = [...station.colliders, ...props.colliders];
const player = createPlayer(view.camera, colliders);
const hud = createHud();
const state = createState();
state.onChange((s) => hud.setStats(s));
hud.setStats(state);

const customers = createCustomers(view.scene, {
  traffic, state, colliders,
  onEvent: (key, params) => hud.toast(t(key, params)),
});

// Puntos de interacción: los fijos de la estación (solo muestran un mensaje) y los del servicio
const interactions = createInteractions([
  ...station.interactables.map((it) => ({ ...it, label: () => t(it.prompt), use: () => hud.toast(t(it.toast)) })),
  ...customers.interactables(),
]);
hud.showFps(CFG.debugFps);

const input = createInput({
  layer: $('touch-layer'), joyEl: $('joy'), knobEl: $('joy-knob'), interactBtn: $('btn-interact'), canvas,
});

// Los letreros se dibujan en canvas: repintar cuando cargue la fuente
if (document.fonts && document.fonts.load) {
  document.fonts.load('64px "Alfa Slab One"').then(() => { road.redrawText(); station.redrawText(); }).catch(() => {});
}

// ---------- Estados: menú / jugando ----------
let playing = false;
let started = false;

function syncMode() {
  body.classList.toggle('touch', input.touchMode);
  body.classList.toggle('locked', input.locked);
}
input.onModeChange(syncMode);
syncMode();

function play() {
  playing = true;
  started = true;
  body.classList.add('playing');
  $('btn-play').dataset.i18n = 'resume';
  applyDom();
  input.setEnabled(true);
}

function pause() {
  if (!playing) return;
  playing = false;
  body.classList.remove('playing');
  input.setEnabled(false);
  stopHolding();
  interactions.clear();
  hud.setPrompt(null);
}

$('btn-play').addEventListener('click', play);
$('btn-pause').addEventListener('click', pause);
$('btn-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
$('btn-rotate-skip').addEventListener('click', () => body.classList.add('portrait-ok'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('keydown', (e) => { if (e.code === 'KeyP' || e.code === 'Escape') pause(); });

onLangChange(() => { $('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES'; });
$('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES';

// Pulsar: acción inmediata (cobrar, mirar). Mantener: cargar gasolina.
input.onInteract(() => {
  const it = interactions.current;
  if (it && it.use) it.use();
});
let holding = null;
function stopHolding() {
  if (holding) { holding.release(); holding = null; }
}
function updateService(dt) {
  const it = interactions.current;
  if (input.interactHeld && it && it.hold) {
    if (holding && holding !== it) stopHolding();
    holding = it;
    it.hold(dt);
  } else stopHolding();
  hud.setPrompt(interactions.label, !!(it && it.holdable));
  const bay = customers.bay;
  hud.setCustomer(bay);
  hud.setFuel(bay.c, !!bay.c && (bay.phase === 'fueling' || (bay.phase === 'waiting' && it && it.id === 'pump')));
}

// ---------- Cámara del menú: vista fija de la estación al atardecer ----------
function menuCamera(time) {
  const cam = view.camera;
  cam.position.set(15 + Math.sin(time * 0.1) * 1.2, 2.3, -8.2);
  cam.lookAt(-18, 3.6, -21);
}

// ---------- Bucle ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); // tope: un tirón no provoca saltos
  last = now;
  if (document.hidden) return;

  traffic.update(dt);
  if (playing) {
    input.update();
    player.update(dt, input);
    customers.update(dt, player);
    interactions.update(dt, player);
    updateService(dt);
  } else if (started) {
    player.applyCamera();
  } else {
    menuCamera(now / 1000);
  }
  view.update();
  view.renderer.render(view.scene, view.camera);
  if (CFG.debugFps) hud.tickFps(dt);
}
requestAnimationFrame(frame);

// Para pruebas automáticas y depuración (no afecta al juego)
window.__r66 = { player, input, view, traffic, interactions, colliders, customers, state, play, pause };
