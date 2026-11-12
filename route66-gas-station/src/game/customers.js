// Clientes: autos que salen de la carretera, paran en un lugar de servicio ("bahía") y se les atiende.
// La gasolina se cobra sola en cuanto terminas de cargar. Algunos clientes después se estacionan,
// entran caminando a la tienda, toman refrescos y botanas, y te pagan en la caja.
import * as THREE from 'three';
import { BAL } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { createCar, pickType } from '../world/carModels.js';
import { createPeople } from '../world/people.js';
import { LAYOUT, insideStore } from '../world/station.js';
import { fmtMoney } from './state.js';
import { t } from '../core/i18n.js';

const ROAD_Z = -2.5; // carril hacia el oeste (el del lado de la estación)
const SPAWN_X = 220;
const ROAD_SPEED = 26;
const LOT_SPEED = 7.5;
const MOVERS = 8;

// Tramo común de entrada (este) y de salida (oeste)
const ENTRY = [[SPAWN_X, ROAD_Z], [120, ROAD_Z], [70, ROAD_Z], [48, ROAD_Z], [38, -3.3]];
const EXIT = [[-38, -3.3], [-48, ROAD_Z], [-70, ROAD_Z], [-120, ROAD_Z], [-300, ROAD_Z]];
// Curva desde el acceso hasta cada carril (la salida es el espejo)
const LANE_IN = {
  north: [[28, -7.2], [19, -11.6], [11, LAYOUT.lanes.north]],
  south: [[29, -7.6], [22, -12.6], [14.5, -16.6], [9, LAYOUT.lanes.south]],
  service: [[29, -7.8], [23.5, -13.5], [18, -19.5], [14, LAYOUT.lanes.service]],
};

// needs: mejora que la habilita (sin "needs" existe desde el inicio)
const BAY_DEFS = [
  { id: 'pump1', kind: 'fuel', lane: 'north', stopX: LAYOUT.pumps[0].x, pump: 0 },
  { id: 'pump2', kind: 'fuel', lane: 'south', stopX: LAYOUT.pumps[1].x, pump: 1, needs: 'pump2' },
  { id: 'garage', kind: 'garage', lane: 'service', stopX: LAYOUT.garage.x, needs: 'garage' },
  { id: 'wash', kind: 'wash', lane: 'service', stopX: LAYOUT.carwash.x, needs: 'carwash' },
];

// ---------- Caminos a pie hacia y dentro de la tienda ----------
const STZ = LAYOUT.stallZ;
const DOOR = LAYOUT.door.x;
const SIDEWALK_Z = -23.6; // por delante de los autos estacionados
const TO_STORE = [[-8.8, SIDEWALK_Z], [DOOR - 0.5, -24.4], [DOOR, -25.6], [DOOR, -27.1], [DOOR, -28.6], [DOOR, -31.3]];
const FROM_STORE = [[DOOR + 0.1, -30.7], [DOOR, -28.6], [DOOR, -27.1], [DOOR, -25.6], [DOOR - 0.5, -24.4], [-8.8, SIDEWALK_Z]];
const FRIDGE_SPOT = [LAYOUT.fridge.x, -33.35];
const SHELF_Z = -33.55;
// Fila de la caja: el primero frente al mostrador, los demás detrás
const QUEUE = [[-0.3, -30.45], [-0.3, -31.35], [-1.3, -32.15], [-2.4, -32.15]];

function makePath(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  curve.arcLengthDivisions = 800;
  return { curve, length: curve.getLength() };
}

function findS(path, test) {
  const p = new THREE.Vector3();
  for (let s = 0; s < path.length; s += 0.25) {
    path.curve.getPointAt(s / path.length, p);
    if (test(p)) return s;
  }
  return path.length;
}
// Punto donde el auto cede el paso antes de salir a la carretera
const yieldTest = (p) => p.x < -25 && p.z > -8.5;

export function createCustomers(scene, { traffic, state, colliders, onEvent }) {
  // Cada auto detenido es un obstáculo para el jugador (los que se mueven frenan por él)
  function updateBox(m) {
    const b = m.box;
    if (m.mode === 'free' || m.v > 0.4 || m.pos.z > -4) { b.off = true; return; }
    const T = CAR_TYPES[m.car.typeId];
    const c = Math.abs(m.tan.x), sn = Math.abs(m.tan.z);
    const hx = (c * T.len + sn * T.wid) / 2, hz = (sn * T.len + c * T.wid) / 2;
    b.minX = m.pos.x - hx; b.maxX = m.pos.x + hx;
    b.minZ = m.pos.z - hz; b.maxZ = m.pos.z + hz;
    b.off = false;
  }

  // ---------- Cajones de estacionamiento ----------
  const stalls = LAYOUT.stalls.map((sx, i) => {
    const outPts = [[sx, STZ], [sx, -31.2], [sx - 2.2, -34]];
    if (sx - 2.2 > -31) outPts.push([-32.6, -34.2]);
    outPts.push([-35, -31.4], [-35.3, -20], [-35.5, -12.5], [-37.4, -6.8], [-41, -3.7], [-48, ROAD_Z], [-70, ROAD_Z], [-120, ROAD_Z], [-300, ROAD_Z]);
    const outPath = makePath(outPts);
    return { i, x: sx, shopper: null, outPath, yieldS: findS(outPath, yieldTest), carSpot: [sx + 1.3, STZ + 0.6] };
  });
  // Camino de cada carril de bomba a cada cajón: sigue derecho al oeste y da vuelta hacia el sur
  const stallPath = (bay, st) => {
    const z = bay.z, x = st.x;
    const drop = bay.lane === 'north' ? [[x + 0.6, z - 3.2], [x, z - 6.6]] : [[x + 0.6, z - 2.8], [x, z - 5.6]];
    return makePath([[bay.stopX, z], [bay.stopX - 3, z], [x + 4.2, z], ...drop, [x, STZ]]);
  };

  // ---------- Bahías ----------
  const bays = BAY_DEFS.map((d) => {
    const z = LAYOUT.lanes[d.lane];
    const laneIn = LANE_IN[d.lane];
    const laneOut = laneIn.map(([x, pz]) => [-x, pz]).reverse();
    const outPath = makePath([[d.stopX, z], ...laneOut, ...EXIT]);
    return {
      ...d, z,
      inPath: makePath([...ENTRY, ...laneIn, [d.stopX, z]]),
      outPath,
      yieldS: findS(outPath, yieldTest),
      next: null, // auto formado detrás (solo bombas)
      // phase: idle | inbound | waiting | fueling | working
      phase: 'idle',
      m: null, // auto que ocupa la bahía
      c: null, // datos del cliente
      byHelper: false, helperWait: 0,
      unlocked: () => !d.needs || state.has(d.needs),
    };
  });
  for (const bay of bays) bay.toStall = stalls.map((st) => (bay.kind === 'fuel' ? stallPath(bay, st) : null));

  // ---------- Autos reutilizables ----------
  // mode: free | bay (lo mueve su bahía) | toStall | parked | leaving
  const movers = [];
  for (let i = 0; i < MOVERS; i++) {
    const car = createCar();
    car.group.visible = false;
    scene.add(car.group);
    const box = { type: 'box', off: true, minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    colliders.push(box);
    movers.push({ id: i, car, box, mode: 'free', stall: null, path: null, s: 0, v: 0, merged: false, yieldS: 0, released: true, pos: new THREE.Vector3(), tan: new THREE.Vector3(1, 0, 0) });
  }
  const busy = (m) => m.mode !== 'free';
  const ACCEL = 2.6, DECEL = 3.6; // m/s² cómodos para arrancar y frenar

  // El carril oeste se pausa mientras algún cliente entra o sale (contador, no bandera)
  let holds = 0;
  const hold = (m) => { if (m.released) { m.released = false; holds++; traffic.holdWest(true); } };
  const release = (m) => { if (!m.released) { m.released = true; holds--; if (holds === 0) traffic.holdWest(false); } };

  let spawnTimer = BAL.firstCustomer;
  let pending = false; // esperando hueco en la carretera para aparecer

  function place(m) {
    const u = Math.min(1, m.s / m.path.length);
    m.path.curve.getPointAt(u, m.pos);
    m.path.curve.getTangentAt(u, m.tan);
    m.car.group.position.copy(m.pos);
    m.car.group.rotation.y = Math.atan2(-m.tan.z, m.tan.x);
  }

  const lenOf = (m) => CAR_TYPES[m.car.typeId].len;

  // Ángulo de giro (con signo, + = izquierda) entre la dirección actual y la que tendrá d metros más adelante
  const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
  function turn(m, from, d) {
    const L = m.path.length;
    const a = Math.min(L, m.s + from), b = Math.min(L, m.s + from + d);
    if (b - a < 0.3) return 0;
    m.path.curve.getTangentAt(a / L, _t1);
    m.path.curve.getTangentAt(b / L, _t2);
    // En pantalla la izquierda del auto es -z: un giro hacia -z es positivo
    return -Math.atan2(_t1.x * _t2.z - _t1.z * _t2.x, _t1.x * _t2.x + _t1.z * _t2.z);
  }

  // Recorre la ruta del auto desde su defensa delantera hasta "ahead" metros y devuelve
  // la distancia al primer punto donde hit(x, z) es verdadero (-1 si no hay nada).
  const _sp = new THREE.Vector3();
  function sweep(m, ahead, hit) {
    const L = m.path.length;
    const front = CAR_TYPES[m.car.typeId].len / 2;
    for (let d = 0; d <= ahead; d += 0.7) {
      const s = m.s + front + d;
      if (s > L) {
        // Pasado el final de la ruta, sigue derecho
        m.path.curve.getPointAt(1, _sp);
        const extra = s - L;
        if (hit(_sp.x + m.tan.x * extra, _sp.z + m.tan.z * extra)) return d;
        continue;
      }
      m.path.curve.getPointAt(s / L, _sp);
      if (hit(_sp.x, _sp.z)) return d;
    }
    return -1;
  }
  // ¿El punto (x, z) cae dentro del rectángulo del auto o, agrandado por "pad" a los lados?
  function overlaps(o, x, z, pad) {
    const T = CAR_TYPES[o.car.typeId];
    const dx = x - o.pos.x, dz = z - o.pos.z;
    const lx = dx * o.tan.x + dz * o.tan.z;
    const lz = dx * o.tan.z - dz * o.tan.x;
    return Math.abs(lx) < T.len / 2 + 0.3 && Math.abs(lz) < T.wid / 2 + pad;
  }

  // Avanza por la ruta: frena antes de las curvas cerradas, se detiene suave al final
  // y frena por el jugador y por otros autos. También informa al modelo cómo animarse.
  function drive(m, dt, vMax, stopS, player) {
    let target = Math.min(vMax, Math.sqrt(Math.max(0, 2 * DECEL * (stopS - m.s))));
    // Curvas: velocidad máxima según qué tan cerrada es la vuelta que viene
    const look = Math.max(3, m.v * 1.2);
    const k = Math.max(Math.abs(turn(m, 0, look)), Math.abs(turn(m, look, look))) / look;
    if (k > 0.002) target = Math.min(target, Math.max(2.4, Math.sqrt(3.4 / k)));
    let obstacle = false;
    m.blockedBy = null;
    if (m.pos.z < -3.5) {
      const ahead = 2.6 + m.v * 0.45;
      // Jugador en el camino (siguiendo la curva de la ruta)
      const gp = sweep(m, ahead, (px, pz) => Math.hypot(px - player.x, pz - player.z) < CAR_TYPES[m.car.typeId].wid / 2 + 0.55);
      if (gp >= 0) { target = Math.min(target, gp < 0.9 ? 0 : Math.sqrt(2 * DECEL * (gp - 0.8))); obstacle = true; m.blockedBy = 'player'; }
      for (const o of movers) {
        if (o === m || !busy(o)) continue;
        const ox = o.pos.x - m.pos.x, oz = o.pos.z - m.pos.z;
        if (Math.abs(ox) + Math.abs(oz) > 22) continue;
        const gap = sweep(m, ahead, (px, pz) => overlaps(o, px, pz, CAR_TYPES[m.car.typeId].wid / 2 + 0.25));
        if (gap < 0) continue;
        // Si yo también estorbo al otro (dos carriles que se juntan), pasa el de menor número
        // (aunque los dos estén detenidos: así nunca se quedan esperándose para siempre)
        if (o.mode !== 'parked' && m.id < o.id && o.path &&
          sweep(o, 2.6 + o.v * 0.45, (px, pz) => overlaps(m, px, pz, CAR_TYPES[o.car.typeId].wid / 2 + 0.25)) >= 0) continue;
        // Seguir al de adelante a su velocidad; parar si está muy cerca
        target = Math.min(target, gap < 1.0 ? 0 : Math.min(Math.max(o.v, 0), Math.sqrt(2 * DECEL * (gap - 0.9))) + (gap > 4 ? 1 : 0));
        obstacle = true;
        m.blockedBy = o.id;
      }
    }
    const v0 = m.v;
    const dv = target - m.v;
    const rate = dv > 0 ? ACCEL : (obstacle && target < 0.5 ? 10 : 6);
    m.v += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
    m.s = Math.min(m.s + m.v * dt, m.path.length);
    place(m);
    // Animación: giro de las llantas delanteras, inclinación y direccional en las vueltas que vienen
    const T = CAR_TYPES[m.car.typeId];
    const steer = THREE.MathUtils.clamp(Math.atan((turn(m, 0, 1.6) / 1.6) * T.len * 0.6), -0.6, 0.6);
    const upcoming = turn(m, 2, 18);
    const signal = m.v > 0.5 && Math.abs(upcoming) > 0.7 ? Math.sign(upcoming) : 0;
    m.car.motion(m.v, dt > 0 ? (m.v - v0) / dt : 0, steer, signal);
  }

  // ---------- Llegadas ----------
  function newCustomer(bay) {
    const lv = state.level();
    const patienceMult = state.has('parking') ? BAL.parkingPatience : 1;
    if (bay.kind === 'fuel') {
      const typeId = pickType(Math.random, 'chance', (T) => T.level <= lv);
      const T = CAR_TYPES[typeId];
      const want = Math.round(T.want[0] + Math.random() * (T.want[1] - T.want[0]));
      const patience = T.patience * patienceMult;
      // Lo que querrá comprar en la tienda (los camiones no caben en el estacionamiento)
      const big = state.has('shop') ? 1 : 0;
      let shop = null;
      if (typeId !== 'truck' && Math.random() < state.shopChance()) {
        shop = {
          soda: Math.random() < 0.8 ? 1 + Math.floor(Math.random() * (2 + big)) : 0,
          snack: Math.random() < 0.6 ? 1 + Math.floor(Math.random() * (1 + big)) : 0,
          coffee: state.has('cafe') && Math.random() < BAL.cafeChance ? 1 : 0,
        };
        if (!shop.soda && !shop.snack) shop.soda = 1;
      }
      return {
        kind: 'fuel', typeId, name: T.name, want, got: 0, fill: T.fill || BAL.fillSeconds,
        patience, patienceMax: patience, tipBase: T.tip, quality: null, shop,
      };
    }
    const typeId = pickType(Math.random, 'chance', (T) => T.service && T.level <= lv);
    const T = CAR_TYPES[typeId];
    const jobs = BAL.jobs[bay.kind];
    const job = jobs[(Math.random() * jobs.length) | 0];
    const patience = BAL.servicePatience * patienceMult;
    return {
      kind: bay.kind, typeId, name: T.name, job: job.id, work: job.work, done: 0, pay: job.pay,
      patience, patienceMax: patience, tipBase: BAL.serviceTip + T.tip * 0.5,
    };
  }

  // queued: si la bomba está ocupada, el auto llega y se forma detrás
  function spawn(bay, m, queued) {
    const c = newCustomer(bay);
    const T = CAR_TYPES[c.typeId];
    m.car.setType(c.typeId, T.colors[(Math.random() * T.colors.length) | 0]);
    if (queued) bay.next = { c, m };
    else {
      bay.c = c;
      bay.phase = 'inbound';
      bay.m = m;
      bay.byHelper = false; bay.helperWait = 0;
    }
    m.mode = 'bay'; m.released = true;
    m.path = bay.inPath; m.s = 0; m.v = ROAD_SPEED;
    hold(m);
    m.car.group.visible = true;
    place(m);
  }

  function nextSpawnDelay() {
    const n = bays.filter((b) => b.unlocked()).length;
    // Mejor reputación y más lugares = llegadas más seguidas
    const rep = BAL.repSpeed[0] + (BAL.repSpeed[1] - BAL.repSpeed[0]) * (state.rep / 100);
    const base = BAL.nextCustomer[0] + Math.random() * (BAL.nextCustomer[1] - BAL.nextCustomer[0]);
    return (base * rep * (state.has('neon') ? BAL.neonSpawn : 1)) / Math.sqrt(n);
  }

  function trySpawn() {
    // El autolavado está después del taller en el mismo carril: no mandar a nadie a lavar si el taller está ocupado
    const garageBusy = bays[2].phase !== 'idle';
    const free = bays.filter((b) => b.unlocked() && b.phase === 'idle' && !(b.kind === 'wash' && garageBusy));
    // Bombas ocupadas sin nadie formado: el siguiente puede esperar detrás
    const line = bays.filter((b) => b.kind === 'fuel' && b.unlocked() && !b.next && (b.phase === 'waiting' || b.phase === 'fueling'));
    const m = movers.find((x) => !busy(x));
    if ((!free.length && !line.length) || !m) return;
    // Toca cliente: se pausa el carril y sale en cuanto el punto de aparición queda despejado
    if (!pending) { pending = true; holds++; traffic.holdWest(true); }
    if (!traffic.westClear(SPAWN_X - 25, 330)) return;
    pending = false; holds--;
    if (!free.length) { spawn(line[(Math.random() * line.length) | 0], m, true); spawnTimer = nextSpawnDelay() * 1.6; return; }
    let total = 0;
    for (const b of free) total += BAL.bayWeight[b.kind];
    let r = Math.random() * total;
    let bay = free[0];
    for (const b of free) { r -= BAL.bayWeight[b.kind]; if (r <= 0) { bay = b; break; } }
    spawn(bay, m, false);
    spawnTimer = nextSpawnDelay();
  }

  // La bahía queda libre; el auto sigue por su cuenta
  function freeBay(bay) {
    bay.m = null; bay.c = null;
    bay.phase = 'idle';
    bay.byHelper = false; bay.helperWait = 0;
    // El que estaba formado avanza a la bomba
    if (bay.next) {
      bay.m = bay.next.m; bay.c = bay.next.c;
      bay.next = null;
      bay.phase = 'inbound';
    }
    spawnTimer = Math.max(spawnTimer, BAL.afterLeave);
  }

  function startLeaving(m, path, yieldS) {
    m.path = path; m.s = 0; m.v = 0; m.merged = false; m.yieldS = yieldS;
    m.mode = 'leaving';
    hold(m);
  }

  function leave(bay) {
    startLeaving(bay.m, bay.outPath, bay.yieldS);
    freeBay(bay);
  }

  function updateLeaving(m, dt, player) {
    if (!m.merged && m.s > m.yieldS - 14 && traffic.westClear(-75, 115)) m.merged = true;
    const onRoad = m.merged && m.pos.x < -44;
    drive(m, dt, onRoad ? Math.min(ROAD_SPEED, traffic.westAheadSpeed(m.pos.x, 30)) : LOT_SPEED,
      m.merged ? Infinity : m.yieldS, player);
    // Al salir del cajón, queda libre para el siguiente
    if (m.stall && m.s > 9) { m.stall.shopper = null; m.stall = null; }
    if (m.pos.x < -70) release(m);
    if (m.s >= m.path.length) {
      release(m);
      m.car.group.visible = false;
      m.mode = 'free';
    }
  }

  // ---------- Gasolina: se cobra sola al terminar de cargar ----------
  function finishFuel(bay) {
    const c = bay.c;
    const r = c.got / c.want;
    // El ayudante siempre deja una carga "normal": la propina doble es solo para ti
    c.quality = bay.byHelper ? 'ok' : r > BAL.perfectMax ? 'over' : r >= BAL.perfectMin ? 'perfect' : 'ok';
    const mult = c.quality === 'perfect' ? 2 : c.quality === 'ok' ? 1 : 0;
    const tip = Math.round(c.tipBase * mult * (0.4 + 0.6 * (c.patience / c.patienceMax)) * 100) / 100;
    const total = Math.round((Math.min(c.got, c.want) * BAL.pricePerGal + tip) * 100) / 100;
    state.served++;
    state.addMoney(total, true);
    state.addRep(c.quality === 'perfect' ? BAL.repPerfect : c.quality === 'ok' ? BAL.repOk : BAL.repOver);
    state.emit('served', { quality: c.quality, typeId: c.typeId, byHelper: bay.byHelper });
    const m = fmtMoney(total);
    onEvent(bay.byHelper ? 'toastHelperPaid' : c.quality === 'perfect' ? 'toastFuelPerfect' : c.quality === 'over' ? 'toastFuelOver' : 'toastFuelPaid', { m, t: fmtMoney(tip) });
    // Si quiere comprar y hay cajón libre, se estaciona; si no, se va
    const st = c.shop && state.open ? stalls.slice(0, state.stallCount()).find((x) => !x.shopper) : null;
    if (st) sendToStall(bay, st, c.shop);
    else leave(bay);
  }

  function pump(bay, dt, speed) {
    const c = bay.c;
    const amount = Math.min((c.want / c.fill) * speed * dt, state.fuel, c.want * BAL.overfillMax - c.got);
    c.got += amount;
    state.useFuel(amount);
  }

  // Ayudante: atiende una sola bomba (la segunda si existe), más lento que tú
  const helperBay = () => (state.has('helper') ? (bays[1].unlocked() ? bays[1] : bays[0]) : null);

  function updateHelper(bay, dt) {
    if (bay.phase === 'waiting') {
      if (state.fuel <= 0) return;
      bay.helperWait += dt;
      if (bay.helperWait >= BAL.helperDelay) { bay.phase = 'fueling'; bay.byHelper = true; }
    } else if (bay.phase === 'fueling' && bay.byHelper) {
      if (state.fuel <= 0) { bay.phase = 'waiting'; bay.byHelper = false; return; }
      pump(bay, dt, BAL.helperSpeed);
      if (bay.c.got >= bay.c.want * 0.985) finishFuel(bay);
    }
  }

  // ---------- Servicios (autolavado y taller) ----------
  function finishService(bay) {
    const c = bay.c;
    const tip = Math.round(c.tipBase * (0.4 + 0.6 * (c.patience / c.patienceMax)) * 100) / 100;
    const total = Math.round((c.pay + tip) * 100) / 100;
    state.served++;
    state.addMoney(total, true);
    state.addRep(BAL.repOk);
    state.emit('service', { job: c.job, typeId: c.typeId });
    onEvent('toastPaid', { m: fmtMoney(total), t: fmtMoney(tip) });
    leave(bay);
  }

  function angryBay(bay) {
    state.lost++;
    state.addRep(BAL.repAngry);
    state.emit('angry');
    onEvent('toastAngry');
    leave(bay);
  }

  // ---------- Compradores: estacionarse, caminar, tomar cosas y pagar en la caja ----------
  const people = createPeople(scene, stalls.length);
  const shoppers = []; // activos
  const queue = []; // formados en la caja, en orden

  function sendToStall(bay, st, wants) {
    const m = bay.m;
    const sh = {
      st, m, person: st.i, wants, got: { soda: 0, snack: 0, coffee: 0 },
      state: 'driving', x: 0, z: 0, yaw: 0, route: null, ri: 0, wait: 0, walkT: 0,
      patience: BAL.counterPatience * (state.has('parking') ? BAL.parkingPatience : 1), patienceMax: 0, slot: -1,
    };
    sh.patienceMax = sh.patience;
    st.shopper = sh;
    shoppers.push(sh);
    m.mode = 'toStall'; m.stall = st;
    m.path = bay.toStall[st.i]; m.s = 0; m.v = 0;
    freeBay(bay);
    onEvent('toastShopper');
  }

  function walkTo(sh, points, next) {
    sh.route = points; sh.ri = 0; sh.state = next;
  }

  function queueSpot(sh) { return QUEUE[Math.min(sh.slot, QUEUE.length - 1)]; }

  function joinQueue(sh) {
    queue.push(sh);
    sh.slot = queue.length - 1;
    walkTo(sh, [queueSpot(sh)], 'toQueue');
  }

  function leaveQueue(sh) {
    const i = queue.indexOf(sh);
    if (i < 0) return;
    queue.splice(i, 1);
    queue.forEach((q, k) => {
      if (q.slot === k) return;
      q.slot = k;
      walkTo(q, [queueSpot(q)], 'toQueue'); // todos avanzan un lugar
    });
  }

  function walkOut(sh) {
    leaveQueue(sh);
    const [cx, cz] = sh.st.carSpot;
    walkTo(sh, [...FROM_STORE, [cx, SIDEWALK_Z], [cx, cz]], 'toCar');
  }

  function shopperTotal(sh) {
    const g = sh.got;
    return Math.round((g.soda * BAL.sodaPrice + g.snack * BAL.snackPrice + g.coffee * BAL.cafePrice) * 100) / 100;
  }

  // Texto de lo que lleva: "2 refrescos, 1 botana"
  function itemsText(g) {
    const parts = [];
    if (g.soda) parts.push(t(g.soda === 1 ? 'soda1' : 'sodaN', { n: g.soda }));
    if (g.snack) parts.push(t(g.snack === 1 ? 'snack1' : 'snackN', { n: g.snack }));
    if (g.coffee) parts.push(t('coffee1'));
    return parts.join(', ');
  }

  function chargeShopper() {
    const sh = queue[0];
    if (!sh || sh.state !== 'queue') return;
    const total = shopperTotal(sh);
    state.addMoney(total, true);
    state.addRep(BAL.repOk);
    for (let i = 0; i < sh.got.soda; i++) state.emit('soldSoda');
    state.emit('sale', { total, items: { ...sh.got } });
    onEvent('toastSale', { m: fmtMoney(total) });
    walkOut(sh);
  }

  function updateShopper(sh, dt) {
    // Caminar por la ruta
    if (sh.route) {
      let step = BAL.walkSpeed * dt;
      while (step > 0 && sh.ri < sh.route.length) {
        const [tx, tz] = sh.route[sh.ri];
        const dx = tx - sh.x, dz = tz - sh.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001) sh.yaw = Math.atan2(dx, dz);
        if (d <= step) { sh.x = tx; sh.z = tz; step -= d; sh.ri++; } else { sh.x += (dx / d) * step; sh.z += (dz / d) * step; step = 0; }
      }
      sh.walkT += dt;
      people.place(sh.person, sh.x, sh.z, sh.yaw, sh.walkT);
      if (sh.ri < sh.route.length) return;
      sh.route = null;
      arrive(sh);
      return;
    }
    if (sh.wait > 0) {
      sh.wait -= dt;
      if (sh.wait <= 0) afterWait(sh);
    }
    if (sh.state === 'queue' || sh.state === 'toQueue') {
      sh.patience -= dt;
      if (sh.patience <= 0) {
        // Se cansa: devuelve lo que tomó y se va
        state.takeStock('soda', -sh.got.soda);
        state.takeStock('snack', -sh.got.snack);
        sh.got = { soda: 0, snack: 0, coffee: 0 };
        state.lost++;
        state.addRep(BAL.repAngry);
        state.emit('angry');
        onEvent('toastAngryShop');
        walkOut(sh);
      }
    }
    people.place(sh.person, sh.x, sh.z, sh.state === 'queue' ? 0 : sh.yaw, null); // en la fila mira hacia el mostrador
  }

  function arrive(sh) {
    switch (sh.state) {
      case 'toFridge':
        sh.got.soda = state.takeStock('soda', sh.wants.soda);
        sh.state = 'fridge'; sh.wait = 1.2; sh.yaw = Math.PI;
        break;
      case 'toShelf':
        sh.got.snack = state.takeStock('snack', sh.wants.snack);
        sh.state = 'shelf'; sh.wait = 1.2; sh.yaw = Math.PI;
        break;
      case 'toQueue':
        if (sh.slot === 0 && sh.state !== 'queue') onEvent('toastAtCounter');
        sh.state = 'queue';
        break;
      case 'toCar': {
        // Se sube y el auto sale por la parte de atrás del estacionamiento
        people.show(sh.person, false);
        sh.state = 'gone';
        const m = sh.m;
        startLeaving(m, sh.st.outPath, sh.st.yieldS);
        shoppers.splice(shoppers.indexOf(sh), 1);
        break;
      }
      default:
        break;
    }
  }

  function afterWait(sh) {
    if (sh.state === 'fridge') goShelf(sh);
    else if (sh.state === 'shelf') checkout(sh);
  }

  function goShelf(sh) {
    if (!sh.wants.snack) return checkout(sh);
    const shelves = LAYOUT.shelves;
    const shelf = shelves[(Math.random() * shelves.length) | 0];
    walkTo(sh, [[shelf.x + (Math.random() - 0.5) * 1.2, SHELF_Z]], 'toShelf');
  }

  function checkout(sh) {
    if (sh.got.soda + sh.got.snack === 0) {
      // No había nada de lo que buscaba
      state.addRep(-1);
      onEvent('toastNothing');
      walkOut(sh);
      return;
    }
    sh.got.coffee = sh.wants.coffee;
    joinQueue(sh);
  }

  function parked(m) {
    const sh = m.stall.shopper;
    m.mode = 'parked';
    m.v = 0;
    const [cx, cz] = sh.st.carSpot;
    sh.x = cx; sh.z = cz;
    people.show(sh.person, true);
    const route = [[cx, SIDEWALK_Z], ...TO_STORE];
    if (sh.wants.soda) walkTo(sh, [...route, FRIDGE_SPOT], 'toFridge');
    else { walkTo(sh, route, 'toShelfStart'); }
  }

  // ---------- Bahía que muestra la tarjeta y lista de marcadores ----------

  const api = {
    bays,
    movers,
    stalls,
    shoppers,
    queue,
    helperBay,

    update(dt, player) {
      for (const m of movers) {
        if (m.mode === 'leaving') updateLeaving(m, dt, player);
        else if (m.mode === 'toStall') {
          drive(m, dt, LOT_SPEED * 0.75, m.path.length, player);
          if (m.s >= m.path.length - 0.05 && m.v < 0.2) parked(m);
        }
      }
      for (const m of movers) {
        if (m.mode === 'parked') m.car.motion(0, 0, 0, 0, false);
        updateBox(m);
      }
      for (const sh of shoppers.slice()) {
        if (sh.state === 'toShelfStart' && !sh.route) goShelf(sh);
        else if (sh.state !== 'driving') updateShopper(sh, dt);
      }

      if (state.open) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) trySpawn();
      }

      const hb = helperBay();
      for (const bay of bays) {
        if (bay.m && bay.phase !== 'inbound') bay.m.car.motion(0, 0, 0, 0, false);
        // Auto formado: avanza por la misma ruta y se detiene detrás del que está cargando
        if (bay.next) {
          const q = bay.next.m;
          drive(q, dt, q.pos.x > 80 ? Math.min(ROAD_SPEED, traffic.westAheadSpeed(q.pos.x, 30)) : q.pos.x > 42 ? 9 : LOT_SPEED, q.path.length, player);
          if (q.pos.z < -4) release(q);
        }
        const c = bay.c, m = bay.m;
        switch (bay.phase) {
          case 'inbound': {
            // En carretera no rebasa: iguala la velocidad del auto de adelante
            const vMax = m.pos.x > 80 ? Math.min(ROAD_SPEED, traffic.westAheadSpeed(m.pos.x, 30))
              : m.pos.x > 42 ? 9 : LOT_SPEED;
            drive(m, dt, vMax, m.path.length, player);
            if (m.pos.z < -4) release(m);
            if (m.s >= m.path.length - 0.05 && m.v < 0.2) {
              m.v = 0;
              bay.phase = 'waiting';
              onEvent(c.kind !== 'fuel' ? 'toastArriveService' : 'toastArrive', { j: c.job ? t(c.job) : '' });
            }
            break;
          }
          case 'waiting':
            c.patience -= dt;
            if (c.patience <= 0) { angryBay(bay); continue; }
            break;
          default:
            break; // mientras cargas o trabajas, la paciencia no baja
        }
        if (bay === hb && bay.c) updateHelper(bay, dt);
      }
    },

    // ---- Acciones del jugador ----
    canFuel(bay) { return bay.c && bay.c.kind === 'fuel' && (bay.phase === 'waiting' || bay.phase === 'fueling'); },
    fuelHold(bay, dt) {
      if (!api.canFuel(bay)) return;
      if (state.fuel <= 0) {
        if (bay.phase === 'fueling' && !bay.byHelper) api.fuelRelease(bay);
        return;
      }
      bay.phase = 'fueling';
      bay.byHelper = false; // si el ayudante estaba cargando, tú tomas la manguera
      pump(bay, dt, 1);
      if (bay.c.got >= bay.c.want * BAL.overfillMax - 1e-6) finishFuel(bay);
    },
    fuelRelease(bay) {
      if (bay.phase !== 'fueling' || bay.byHelper) return;
      if (bay.c.got >= bay.c.want * BAL.doneMin) finishFuel(bay);
      else { bay.phase = 'waiting'; onEvent('toastShort'); }
    },
    canWork(bay) { return bay.c && bay.c.kind !== 'fuel' && (bay.phase === 'waiting' || bay.phase === 'working'); },
    workHold(bay, dt) {
      if (!api.canWork(bay)) return;
      bay.phase = 'working';
      bay.c.done += dt;
      if (bay.c.done >= bay.c.work) finishService(bay);
    },
    workRelease(bay) { if (bay.phase === 'working') bay.phase = 'waiting'; },
    chargeShopper,
    shopperTotal,

    // Datos para la tarjeta del HUD: el cliente del objeto que tienes enfrente, o el más cercano
    focusInfo(player, item) {
      const head = queue[0];
      if (item && item.id === 'register' && head) return shopperInfo(head);
      if (item && item.bay && item.bay.c && item.bay.phase !== 'inbound') return bayInfo(item.bay);
      if (insideStore(player) && head) return shopperInfo(head);
      let best = null, bestD = Infinity;
      for (const b of bays) {
        if (!b.c || b.phase === 'inbound') continue;
        const d = Math.hypot(b.stopX - player.x, b.z - player.z);
        if (d < bestD) { bestD = d; best = b; }
      }
      return best ? bayInfo(best) : null;
    },

    // Íconos flotantes: autos esperando servicio y clientes formados en la caja
    markers() {
      const out = [];
      for (const b of bays) {
        if (!b.c || b.phase === 'inbound') continue;
        out.push({ x: b.m.pos.x, y: b.c.typeId === 'truck' ? 4.2 : 2.3, z: b.m.pos.z, icon: b.c.kind, p: b.c.patience / b.c.patienceMax });
      }
      for (const sh of queue) out.push({ x: sh.x, y: 2.15, z: sh.z, icon: 'pay', p: sh.patience / sh.patienceMax });
      return out;
    },

    // Puntos de interacción que dependen de los clientes
    interactables() {
      const items = [];
      for (const bay of bays) {
        if (bay.kind === 'fuel') {
          const p = LAYOUT.pumps[bay.pump];
          items.push({
            id: 'pump', bay, x: p.x, y: 1.2, z: p.z, holdable: true,
            label: () => (!bay.unlocked() || !api.canFuel(bay) ? null : state.fuel > 0 ? t('promptFuel') : t('promptNoFuel')),
            hold: (dt) => api.fuelHold(bay, dt),
            release: () => api.fuelRelease(bay),
          });
        } else {
          const spot = bay.kind === 'wash' ? LAYOUT.carwash : LAYOUT.garage;
          items.push({
            id: 'service', bay, x: spot.x, y: 1.0, z: spot.ctrlZ, holdable: true,
            label: () => (!bay.unlocked() || !api.canWork(bay) ? null : t('promptWork', { j: t(bay.c.job) })),
            hold: (dt) => api.workHold(bay, dt),
            release: () => api.workRelease(bay),
          });
        }
      }
      items.push({
        id: 'register', x: LAYOUT.register.x, y: 1.2, z: LAYOUT.register.z, near: insideStore,
        label: () => {
          const sh = queue[0];
          return sh && sh.state === 'queue' ? t('promptCharge', { m: fmtMoney(shopperTotal(sh)) }) : null;
        },
        use: chargeShopper,
      });
      return items;
    },
  };

  function bayInfo(b) {
    const c = b.c;
    const ask = c.kind === 'fuel' ? t('wants', { n: c.want }) : t(c.job);
    return {
      key: `${b.id}|${c.typeId}|${c.want}|${c.job}|${b.byHelper}`,
      title: `${t(c.name)} · ${ask}`,
      status: t(b.byHelper ? 'stHelper' : c.kind === 'fuel' ? 'stWaiting' : 'stService'),
      p: c.patience / c.patienceMax,
    };
  }
  function shopperInfo(sh) {
    return {
      key: `shop|${sh.person}|${sh.state}|${sh.got.soda}|${sh.got.snack}`,
      title: `${t('customer')} · ${itemsText(sh.got)}`,
      status: t(sh.state === 'queue' ? 'stPay' : 'stComing'),
      p: sh.patience / sh.patienceMax,
    };
  }

  return api;
}
