// Arranque y bucle principal.
import { CFG, BAL } from './config.js';
import { loadQuality, saveQuality, ORDER } from './core/quality.js';
import { loadGame, saveGame, clearGame, applyState } from './core/save.js';
import { createAudio } from './core/audio.js';
import { initI18n, setLang, getLang, onLangChange, applyDom, t } from './core/i18n.js';
import { createInput } from './core/input.js';
import { createPlayer } from './core/player.js';
import { createScene } from './world/scene.js';
import { createRoad } from './world/road.js';
import { createStation, LAYOUT, insideStore } from './world/station.js';
const LAYOUT_DOOR = { x: LAYOUT.door.x, z: -27 };
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
import { STAR_PERKS } from './data/upgrades.js';
import { initCarFx, updateCarFx } from './world/carModels.js';
import { createTumbleweeds } from './world/tumbleweeds.js';
import { createJanitor } from './world/janitor.js';
import { createPumpDisplays } from './world/pumpDisplays.js';
import { createViewModel } from './core/viewmodel.js';
import { createFireworks } from './world/fireworks.js';
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
const saved = loadGame();
if (saved) applyState(state, saved.state);
// ---------- Sonido ----------
const audio = createAudio();
// Cada aviso del juego tiene su sonido (aunque el texto esté silenciado)
const TOAST_SFX = {
  toastArrive: 'beep', toastArriveService: 'beep', toastFuelPaid: 'coin', toastFuelPerfect: 'coin', toastFuelOver: 'coin',
  toastHelperPaid: 'coin', toastSale: 'kaching', toastCafe: 'kaching', toastCafePie: 'kaching', toastWashed: 'coin',
  toastRepaired: 'coin', toastPaid: 'coin', toastAngry: 'horn', toastAngryShop: 'angry', toastAngryCafe: 'angry',
  toastShort: 'click', toastPower: 'clunk', toastOpened: 'bell', toastUpgrade: 'build', toastLevel: 'jingle',
  toastFuelBought: 'clunkSoft', toastSodaBought: 'clunkSoft', toastSnackBought: 'clunkSoft', toastNothing: 'angry',
};
const QUIET = new Set([
  'toastArrive', 'toastArriveService', 'toastShopper', 'toastAtCounter', 'toastFuelPaid', 'toastSale',
  'toastCafe', 'toastCafePie', 'toastPaid', 'toastHelperPaid', 'toastWashed', 'toastRepaired',
]);
const toast = (key, params) => {
  if (TOAST_SFX[key]) audio.play(TOAST_SFX[key]);
  if (!QUIET.has(key)) hud.toast(t(key, params));
};

const missions = createMissions(state, (m) => { hud.toast(missions.doneText(m)); hud.missionPop(); audio.play('jingle'); });
const litter = createLitter(view.scene, state);
const upgrades3d = createUpgradeVisuals(view.scene, { colliders, station });
const customers = createCustomers(view.scene, { traffic, state, colliders, onEvent: toast });
const stock3d = createStockVisuals(view.scene);
initCarFx(view.scene); // después de crear todos los autos (tráfico y clientes)
const tumbleweeds = createTumbleweeds(view.scene);
// Conserje: rodea la tienda, el taller, el autolavado, la cafetería y el tanque
const janitor = createJanitor(view.scene, litter, [
  { minX: -8, maxX: 8, minZ: -35, maxZ: -27 },
  { minX: 20.7, maxX: 27.3, minZ: -31.2, maxZ: -20.8 },
  { minX: -31.5, maxX: -22.5, minZ: -32.3, maxZ: -27.7 },
  { minX: 8.9, maxX: 15.5, minZ: -34, maxZ: -28 },
  { minX: 34.2, maxX: 37, minZ: -31.8, maxZ: -26.2 },
  { minX: -2.7, maxX: 2.7, minZ: -15.8, maxZ: -14.2 },
], () => state.staffMult());
customers.addWalker(janitor.walker);
if (state.has('janitor')) janitor.enable();
const pumpDisplays = createPumpDisplays(view.scene);
const viewModel = createViewModel(view.scene, view.camera);
const fireworks = createFireworks(view.scene, () => audio.play('firework'));
if (state.legendary) station.setLegend(true);
state.onEvent((name, data) => { if (name === 'earn') hud.popMoney(`+${fmtMoney(data.amount)}`); });

// ---------- Sombras y calidad ----------
// Todo lo que tiene iluminación proyecta y recibe sombra; lo que brilla (MeshBasic) no.
// Los objetos chicos (botellas, frascos, personas, llantas sueltas) no proyectan: casi no se nota y ahorra mucho.
function applyShadowFlags() {
  view.scene.traverse((o) => {
    if (!o.isMesh || o.userData.noShadow) return;
    const lit = !o.material.isMeshBasicMaterial;
    let big = true;
    if (!o.isInstancedMesh && o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      big = o.geometry.boundingSphere.radius > 0.9;
    }
    o.castShadow = lit && big && !o.userData.noCast;
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

state.onEvent((name) => {
  if (name === 'board') audio.play('wood');
  if (name === 'litter') audio.play('pop');
  if (name === 'washStart') audio.play('click');
});
station.onDoor(() => audio.play('door', LAYOUT_DOOR));

// Estrellas: avisar al ganar o perder una, y cuando la meta final esté lista
let lastStars = state.stars();
let legendNotified = false;
state.onChange((s) => {
  const st = s.stars();
  if (st !== lastStars) {
    if (st > lastStars) { toast('toastStarUp', { n: st, p: STAR_PERKS[st] ? t(STAR_PERKS[st]) : '' }); audio.play('jingle'); }
    else toast('toastStarDown', { n: st });
    lastStars = st;
  }
  if (s.legendReady() && !legendNotified) { legendNotified = true; toast('toastLegendReady'); audio.play('bell'); }
});

// Aviso (una vez) cuando la gasolina está por acabarse
let warnedLow = false;
state.onChange((s) => {
  if (s.fuel < BAL.fuelLow && !warnedLow) { warnedLow = true; toast('toastFuelLow'); }
  if (s.fuel >= BAL.fuelLow) warnedLow = false;
});

// Mejoras: construir lo visual y avisar al subir de nivel
state.onEvent((name, data) => {
  if (name === 'upgrade') { upgrades3d.build(data.id); if (data.id === 'janitor') janitor.enable(); applyShadowFlags(); traffic.setLevel(state.level()); }
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
  onLegend: () => celebrate(),
});

// ---------- Partida guardada: reconstruir el mundo ----------
if (saved && saved.world) {
  for (const i of saved.world.boardsOff || []) station.boards.remove(i, true);
  if (Array.isArray(saved.world.litter)) litter.restore(saved.world.litter);
}
let saveWarned = false;
function saveNow() {
  if (!started) return;
  const ok = saveGame(state, { boardsOff: station.boards.removedList(), litter: litter.activeList() });
  if (!ok && !saveWarned) { saveWarned = true; toast('saveFail'); }
}
setInterval(saveNow, 8000);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
// Guardar también justo después de lo importante
state.onEvent((name) => { if (['upgrade', 'level', 'order', 'open', 'power'].includes(name)) setTimeout(saveNow, 0); });

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
  newArmed = false;
  playing = true;
  body.classList.add('playing');
  if (!started && !saved) setTimeout(() => { if (state.boards === 0) toast('toastIntro'); }, 900);
  started = true;
  $('btn-play').dataset.i18n = 'resume';
  applyDom();
  input.setEnabled(true);
}

function pause() {
  if (!playing) return;
  saveNow();
  // En pausa siempre se puede empezar de nuevo
  $('btn-new').hidden = false;
  $('btn-new').textContent = t('newGame');
  $('btn-new').classList.remove('armed');
  newArmed = false;
  notebook.close();
  playing = false;
  body.classList.remove('playing');
  input.setEnabled(false);
  stopHolding();
  viewModel.hide();
  for (const l of ['pump', 'brew', 'wash']) audio.loop(l, false);
  audio.engine(999, 0);
  interactions.clear();
  hud.setPrompt(null);
}

$('btn-play').addEventListener('click', play);
// El audio solo puede arrancar después de un toque (Safari)
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
function renderAudioButtons() {
  $('btn-sfx').textContent = `${t('sfxLabel')}: ${t(audio.prefs.sfx ? 'on' : 'off')}`;
  $('btn-music').textContent = `${t('musicLabel')}: ${t(audio.prefs.music ? 'on' : 'off')}`;
}
$('btn-sfx').addEventListener('click', () => { audio.unlock(); audio.setPref('sfx', !audio.prefs.sfx); renderAudioButtons(); audio.play('click'); });
$('btn-music').addEventListener('click', () => { audio.unlock(); audio.setPref('music', !audio.prefs.music); renderAudioButtons(); });
renderAudioButtons();
// Con partida guardada: "Continuar" y "Nueva partida" (pide confirmar con un segundo toque)
let newArmed = false;
if (saved) {
  $('btn-play').dataset.i18n = 'resume';
  $('btn-new').hidden = false;
  applyDom();
}
$('btn-new').addEventListener('click', () => {
  if (!newArmed) {
    newArmed = true;
    $('btn-new').textContent = t('newGameConfirm');
    $('btn-new').classList.add('armed');
    return;
  }
  clearGame();
  started = false; // que no se vuelva a guardar antes de recargar
  location.reload();
});
$('btn-pause').addEventListener('click', pause);
$('btn-book').addEventListener('click', () => { if (playing) notebook.open(); });
$('btn-lang').addEventListener('click', () => setLang(getLang() === 'es' ? 'en' : 'es'));
$('btn-quality').addEventListener('click', () => setQuality(ORDER[(ORDER.indexOf(quality) + 1) % ORDER.length]));
$('btn-rotate-skip').addEventListener('click', () => body.classList.add('portrait-ok'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); audio.suspend(document.hidden); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && notebook.isOpen) { notebook.close(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') pause();
  if (e.code === 'KeyM' || e.code === 'Tab') {
    e.preventDefault();
    if (notebook.isOpen) notebook.close(); else if (playing) notebook.open();
  }
});

onLangChange(() => { $('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES'; refreshHud(); notebook.render(); setQuality(quality); renderAudioButtons(); });
$('btn-lang').textContent = getLang() === 'es' ? 'EN' : 'ES';
refreshHud();

// Pulsar: acción inmediata (cobrar, recoger). Mantener: cargar gasolina, lavar, reparar.
input.onInteract(() => {
  const it = interactions.current;
  if (it && it.use) it.use();
});
// Sonidos del mundo que dependen de lo que pasa en cada cuadro
let stepT = 0, ratchetT = 0;
function updateSounds(dt) {
  audio.setListener(player.x, player.z);
  // Motor del auto más cercano que se mueve
  let best = Infinity, speed = 0;
  for (const car of traffic.cars) if (car.active) { const d = Math.hypot(car.group.position.x - player.x, car.group.position.z - player.z); if (d < best) { best = d; speed = car.speed; } }
  for (const m of customers.movers) if (m.mode !== 'free' && m.v > 0.3) { const d = Math.hypot(m.pos.x - player.x, m.pos.z - player.z); if (d < best) { best = d; speed = m.v; } }
  audio.engine(best, speed);
  // Bomba, cafetera, autolavado y taller
  const it = holding;
  audio.loop('pump', !!(it && it.id === 'pump' && it.bay.phase === 'fueling'));
  audio.loop('brew', !!(it && it.id === 'coffee'));
  const wash = customers.bays.find((b) => b.kind === 'wash');
  const dWash = Math.hypot(LAYOUT.carwash.x - player.x, LAYOUT.carwash.z - player.z);
  audio.loop('wash', !!wash && wash.phase === 'working', Math.max(0, 1 - dWash / 35));
  if (it && it.id === 'service') { ratchetT -= dt; if (ratchetT <= 0) { ratchetT = 0.55; audio.play('ratchet'); } }
  // Pasos
  const sp = Math.hypot(player.vx, player.vz);
  if (sp > 1) { stepT -= dt * sp; if (stepT <= 0) { stepT = 2.1; audio.play('step'); } }
}
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
  const prog = it && it.progress ? it.progress() : null;
  const active = !!(bay && bay.c && (customers.canFuel(bay) || customers.canWork(bay)) && !bay.byHelper);
  if (prog) hud.setBar(prog, true);
  else hud.setBar(active ? bay.c : null, active);
  // Herramienta en la mano: aparece al mantener pulsado en una bomba o servicio
  const tool = holding && holding.bay && active ? (holding.bay.kind === 'fuel' ? 'fuel' : holding.bay.kind) : null;
  viewModel.update(dt, tool, !!tool);
}

// ---------- Celebración final: parada legendaria ----------
let cinematic = false, cineT = 0;
function celebrate() {
  if (!state.legendReady()) return;
  state.legendary = true;
  state.emit('legend');
  state.changed();
  saveNow();
  station.setLegend(true);
  playing = false;
  stopHolding();
  viewModel.hide();
  input.setEnabled(false);
  body.classList.remove('playing');
  body.classList.add('legend');
  $('legend-stats').textContent = t('legendStats', { s: state.served, m: fmtMoney(state.earned), u: state.upgradeCount() });
  cinematic = true; cineT = 0;
  fireworks.start();
  audio.play('fanfare');
}
$('btn-legend-continue').addEventListener('click', () => {
  cinematic = false;
  fireworks.stop();
  body.classList.remove('legend');
  play();
});
// La cámara rodea la estación mientras dura la celebración
function cinematicCamera(dt) {
  cineT += dt;
  const a = -0.6 + cineT * 0.12, r = 46;
  view.camera.position.set(Math.sin(a) * r, 14 + Math.sin(cineT * 0.3) * 2, -22 + Math.cos(a) * r);
  view.camera.lookAt(0, 4, -22);
}

// ---------- Cámara del menú: vista fija de la estación al atardecer ----------
function menuCamera(time) {
  const cam = view.camera;
  cam.position.set(17 + Math.sin(time * 0.1) * 1.2, 2.4, -9.2);
  cam.lookAt(-12, 4.6, -18);
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
  if (cinematic) {
    cinematicCamera(dt);
    fireworks.update(dt);
  } else if (playing && !notebook.isOpen) {
    input.update();
    player.update(dt, input);
    // debugSpeed > 1 solo se usa en pruebas automáticas para adelantar el tiempo
    for (let i = 0; i < debugSpeed; i++) {
      if (i) traffic.update(dt);
      customers.update(dt, player);
      litter.update(dt);
      janitor.update(dt);
      state.tick(dt);
      missions.tick(dt);
    }
    upgrades3d.update(dt, now / 1000, customers.helperBay());
    upgrades3d.services(dt, customers.bays.find((b) => b.kind === 'wash'), customers.bays.find((b) => b.kind === 'garage'));
    upgrades3d.staff(dt, now / 1000, customers.staff);
    interactions.update(dt, player);
    updateService(dt);
    updateSounds(dt);
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

// Para pruebas automáticas y depuración (no afecta al juego). La versión para itch.io no las incluye.
if (!globalThis.R66_RELEASE) window.__r66 = {
  player, input, view, traffic, interactions, colliders, customers, state, missions, notebook, station, litter, upgrades3d, audio, play, pause, celebrate,
  litterItems: () => interactions.items.filter((x) => x.id === 'litter'),
  setSpeed: (n) => { debugSpeed = n; },
};
