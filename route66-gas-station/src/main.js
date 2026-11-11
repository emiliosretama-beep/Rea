// Arranque y bucle principal.
import { CFG } from './config.js';
import { initI18n, setLang, getLang, onLangChange, applyDom } from './core/i18n.js';
import { createInput } from './core/input.js';
import { createPlayer } from './core/player.js';
import { createScene } from './world/scene.js';
import { createRoad } from './world/road.js';
import { createStation } from './world/station.js';
import { createProps } from './world/props.js';
import { createTraffic } from './world/traffic.js';
import { createInteractions } from './game/interactions.js';
import { createHud } from './ui/hud.js';

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
const interactions = createInteractions(station.interactables);
const hud = createHud();
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
  interactions.clear();
}

$('btn-play').addEventListener('click', play);
$('btn-pause').addEventListener('click', pause);
$('btn-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
$('btn-rotate-skip').addEventListener('click', () => body.classList.add('portrait-ok'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('keydown', (e) => { if (e.code === 'KeyP' || e.code === 'Escape') pause(); });

onLangChange(() => {
  $('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES';
  hud.refreshLanguage();
});
$('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES';

interactions.onChange((it) => hud.setPrompt(it ? it.prompt : null));
input.onInteract(() => {
  const it = interactions.current;
  if (it) hud.toast(it.toast);
});

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
    interactions.update(dt, player);
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
window.__r66 = { player, input, view, traffic, interactions, colliders, play, pause };
