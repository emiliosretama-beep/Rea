// Arranque y bucle principal.
import { CFG, BAL } from './config.js';
import { loadQuality, saveQuality, ORDER } from './core/quality.js';
import { initI18n, setLang, getLang, onLangChange, applyDom, t } from './core/i18n.js';
import { createInput } from './core/input.js';
import { createPlayer } from './core/player.js';
import { createScene } from './world/scene.js';
import { createRoad } from './world/road.js';
import { createStation, LAYOUT, insideStore } from './world/station.js';
import { createProps } from './world/props.js';
import { createTraffic } from './world/traffic.js';
import { createLitter } from './world/litter.js';
import { createUpgradeVisuals } from './world/upgrades3d.js';
import { createStockVisuals } from './world/stock3d.js';
import { createInteractions } from './game/interactions.js';
import { createState } from './game/state.js';
import { createCustomers } from './game/customers.js';
import { createMissions } from './game/missions.js';
import { createHud } from './ui/hud.js';
import { createMarkers } from './ui/markers.js';
import { createNotebook } from './ui/notebook.js';
import { CAR_TYPES } from './data/carTypes.js';
import { initCarFx, updateCarFx } from './world/carModels.js';
import { createTumbleweeds } from './world/tumbleweeds.js';
import { createPumpDisplays } from './world/pumpDisplays.js';
import { createViewModel } from './core/viewmodel.js';
import { fmtMoney } from './game/state.js';

const $ = (id) => document.getElementById(id);
const body = document.body;

initI18n();
$('version').textContent = CFG.version;

// ---------- Mundo ----------
const canvas = $('game');
const view = createScene(canvas);
const road = createRoad(view.scene);
const station = createStation(view.scene);
const props = createProps(view.scene);
const traffic = createTraffic(view.scene);
const colliders = [...station.colliders, ...props.colliders];
const player = createPlayer(view.camera, colliders);

// ---------- Negocio ----------
const hud = createHud();
hud.showFps(CFG.debugFps);
const markers = createMarkers(view.camera);
const state = createState();
const toast = (key, params) => hud.toast(t(key, params));

const missions = createMissions(state, (m) => { hud.toast(missions.doneText(m)); hud.missionPop(); });
const litter = createLitter(view.scene, state);
const upgrades3d = createUpgradeVisuals(view.scene, { colliders, station });
const customers = createCustomers(view.scene, { traffic, state, colliders, onEvent: toast });
const stock3d = createStockVisuals(view.scene);
initCarFx(view.scene); // después de crear todos los autos (tráfico y clientes)
const tumbleweeds = createTumbleweeds(view.scene);
const pumpDisplays = createPumpDisplays(view.scene);
const viewModel = createViewModel(view.scene, view.camera);
state.onEvent((name, data) => { if (name === 'earn') hud.popMoney(`+${fmtMoney(data.amount)}`); });

// ---------- Sombras y calidad ----------
// Todo lo que tiene iluminación proyecta y recibe sombra; lo que brilla (MeshBasic) no.
function applyShadowFlags() {
  view.scene.traverse((o) => {
    if (!o.isMesh || o.userData.noShadow) return;
    const lit = !o.material.isMeshBasicMaterial;
    o.castShadow = lit && !o.userData.noCast;
    o.receiveShadow = lit;
  });
}
let quality = loadQuality();
function setQuality(q) {
  quality = q;
  saveQuality(q);
  const real = view.setQuality(q);
  station.fakeShadows.visible = !real;
  $('btn-quality').textContent = `${t('gfx')}: ${t(`gfx_${q}`)}`;
}

function refreshHud() { hud.setStats(state); hud.setMission(missions); stock3d.update(state); }
state.onChange(refreshHud);

// Aviso (una vez) cuando la gasolina está por acabarse
let warnedLow = false;
state.onChange((s) => {
  if (s.fuel < BAL.fuelLow && !warnedLow) { warnedLow = true; toast('toastFuelLow'); }
  if (s.fuel >= BAL.fuelLow) warnedLow = false;
});

// Mejoras: construir lo visual y avisar al subir de nivel
state.onEvent((name, data) => {
  if (name === 'upgrade') { upgrades3d.build(data.id); applyShadowFlags(); traffic.setLevel(state.level()); }
  if (name === 'level') {
    hud.levelPop();
    const news = Object.values(CAR_TYPES).filter((T) => T.level === data.level && T.chance).map((T) => t(T.name)).join(', ');
    setTimeout(() => toast('toastLevel', { l: data.level, c: news }), 1800);
  }
});
for (const id in state.upgrades) upgrades3d.build(id);
applyShadowFlags();
setQuality(quality);
traffic.setLevel(state.level());

const notebook = createNotebook(state, {
  onOpen: () => { stopHolding(); viewModel.hide(); input.setEnabled(false); hud.setPrompt(null); },
  onClose: () => { if (playing) input.setEnabled(true); },
  onBought: toast,
  onUpgrade: (u) => toast('toastUpgrade', { u: t(`u_${u.id}`) }),
});

// ---------- Restauración inicial: tablas, luz, basura y abrir ----------
station.setPower(state.power);
station.setOpen(state.open);
function restoreItems() {
  const canEnter = () => !station.boards.isOn(0) && !station.boards.isOn(1);
  const boards = [];
  for (let i = 0; i < station.boards.count; i++) {
    const p = station.boards.spot(i);
    boards.push({
      id: 'board', x: p.x, y: p.y, z: p.z,
      label: () => (station.boards.isOn(i) ? t('promptBoard') : null),
      use: () => {
        const wasBlocked = !canEnter();
        station.boards.remove(i);
        state.boards++;
        state.emit('board');
        state.changed();
        if (wasBlocked && canEnter()) toast('toastDoorFree');
      },
    });
  }
  return [
    ...boards,
    {
      id: 'fuse', x: LAYOUT.fuse.x, y: 1.5, z: LAYOUT.fuse.z, near: insideStore,
      label: () => (state.power ? null : t('promptFuse')),
      use: () => {
        state.power = true;
        station.setPower(true);
        state.emit('power');
        state.changed();
        toast('toastPower');
      },
    },
    {
      id: 'sign', x: LAYOUT.sign.x, y: 1.6, z: LAYOUT.sign.z,
      label: () => (state.open ? null : t('promptOpen')),
      use: () => {
        if (!state.power) return toast('toastNeedPower');
        if (litter.count > 0) return toast('toastNeedClean', { n: litter.count });
        state.open = true;
        station.setOpen(true);
        state.emit('open');
        state.changed();
        toast('toastOpened');
      },
    },
  ];
}

// Puntos de interacción: los fijos de la estación (solo muestran un mensaje) y los del servicio
const interactions = createInteractions([
  ...station.interactables.map((it) => ({ ...it, label: () => t(it.prompt), use: () => hud.toast(t(it.toast)) })),
  ...customers.interactables(),
  ...litter.interactables(),
  { id: 'phone', x: LAYOUT.phone.x, y: 1.45, z: LAYOUT.phone.z, near: insideStore, label: () => t('promptPhone'), use: () => notebook.open('supplier') },
  ...restoreItems(),
]);

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
  body.classList.add('playing');
  if (!started) setTimeout(() => { if (state.boards === 0) toast('toastIntro'); }, 900);
  started = true;
  $('btn-play').dataset.i18n = 'resume';
  applyDom();
  input.setEnabled(true);
}

function pause() {
  if (!playing) return;
  notebook.close();
  playing = false;
  body.classList.remove('playing');
  input.setEnabled(false);
  stopHolding();
  viewModel.hide();
  interactions.clear();
  hud.setPrompt(null);
}

$('btn-play').addEventListener('click', play);
$('btn-pause').addEventListener('click', pause);
$('btn-book').addEventListener('click', () => { if (playing) notebook.open(); });
$('btn-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
$('btn-quality').addEventListener('click', () => setQuality(ORDER[(ORDER.indexOf(quality) + 1) % ORDER.length]));
$('btn-rotate-skip').addEventListener('click', () => body.classList.add('portrait-ok'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && notebook.isOpen) { notebook.close(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') pause();
  if (e.code === 'KeyM' || e.code === 'Tab') {
    e.preventDefault();
    if (notebook.isOpen) notebook.close(); else if (playing) notebook.open();
  }
});

onLangChange(() => { $('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES'; refreshHud(); notebook.render(); setQuality(quality); });
$('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES';
refreshHud();

// Pulsar: acción inmediata (cobrar, recoger). Mantener: cargar gasolina, lavar, reparar.
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
  hud.setCustomer(customers.focusInfo(player, it));
  // Barra central: el lugar que tienes enfrente, si se puede trabajar en él
  const bay = it && it.bay;
  const active = !!(bay && bay.c && (customers.canFuel(bay) || customers.canWork(bay)) && !bay.byHelper);
  hud.setBar(active ? bay.c : null, active);
  // Herramienta en la mano: aparece al mantener pulsado en una bomba o servicio
  const tool = holding && holding.bay && active ? (holding.bay.kind === 'fuel' ? 'fuel' : holding.bay.kind) : null;
  viewModel.update(dt, tool, !!tool);
}

// ---------- Cámara del menú: vista fija de la estación al atardecer ----------
function menuCamera(time) {
  const cam = view.camera;
  cam.position.set(15 + Math.sin(time * 0.1) * 1.2, 2.3, -8.2);
  cam.lookAt(-18, 3.6, -21);
}

// Quién puede abrir la puerta de la tienda: el jugador y los clientes que caminan
const _near = [];
function doorNear() {
  _near.length = 0;
  if (started) _near.push(player);
  for (const sh of customers.shoppers) if (sh.state !== 'driving' && sh.state !== 'gone') _near.push(sh);
  return _near;
}

// ---------- Bucle ----------
let last = performance.now();
let debugSpeed = 1;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05); // tope: un tirón no provoca saltos
  last = now;
  if (document.hidden) return;

  traffic.update(dt);
  if (playing && !notebook.isOpen) {
    input.update();
    player.update(dt, input);
    // debugSpeed > 1 solo se usa en pruebas automáticas para adelantar el tiempo
    for (let i = 0; i < debugSpeed; i++) {
      if (i) traffic.update(dt);
      customers.update(dt, player);
      litter.update(dt);
      missions.tick(dt);
    }
    upgrades3d.update(dt, now / 1000, customers.helperBay());
    interactions.update(dt, player);
    updateService(dt);
    markers.update(customers.markers());
  } else if (started) {
    player.applyCamera(); // en pausa o con la libreta abierta, el juego espera
    if (!playing) markers.hide();
  } else {
    menuCamera(now / 1000);
  }
  // Mundo vivo (también en pausa y en el menú)
  tumbleweeds.update(dt);
  pumpDisplays.update(customers.bays, state.has('pump2'));
  station.update(dt, doorNear());
  updateCarFx(dt, now / 1000);
  view.update(dt);
  view.renderer.render(view.scene, view.camera);
  if (CFG.debugFps) hud.tickFps(dt);
}
requestAnimationFrame(frame);

// Para pruebas automáticas y depuración (no afecta al juego)
window.__r66 = {
  player, input, view, traffic, interactions, colliders, customers, state, missions, notebook, station, litter, upgrades3d, play, pause,
  litterItems: () => interactions.items.filter((x) => x.id === 'litter'),
  setSpeed: (n) => { debugSpeed = n; },
};
