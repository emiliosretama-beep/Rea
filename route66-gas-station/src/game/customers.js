// Clientes: autos que salen de la carretera, esperan en la bomba, se les carga
// gasolina, pagan en la caja y se van. Una "bahía" por bomba (por ahora una).
import * as THREE from 'three';
import { BAL } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { createCar, pickType } from '../world/carModels.js';
import { LAYOUT } from '../world/station.js';
import { fmtMoney } from './state.js';
import { t } from '../core/i18n.js';

const ROAD_Z = -2.5; // carril hacia el oeste (el del lado de la estación)
const SPAWN_X = 220;
const ROAD_SPEED = 26;
const LOT_SPEED = 7.5;

function makePath(points) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  curve.arcLengthDivisions = 800;
  return { curve, length: curve.getLength() };
}

export function createCustomers(scene, { traffic, state, colliders, onEvent }) {
  const lz = LAYOUT.laneZ;
  const px = LAYOUT.pump.x;

  const inPath = makePath([
    [SPAWN_X, ROAD_Z], [120, ROAD_Z], [70, ROAD_Z], [48, ROAD_Z],
    [38, -3.3], [28, -7.2], [19, -11.6], [11, lz], [px, lz],
  ]);
  const outPath = makePath([
    [px, lz], [-11, lz], [-19, -11.6], [-28, -7.2], [-38, -3.3],
    [-48, ROAD_Z], [-70, ROAD_Z], [-120, ROAD_Z], [-300, ROAD_Z],
  ]);
  // Punto donde el auto cede el paso antes de volver a la carretera
  const yieldS = findS(outPath, (p) => p.x < -25);

  // Dos autos reutilizables: mientras uno se aleja por la carretera, el siguiente ya puede venir
  const movers = [0, 1].map(() => {
    const car = createCar();
    car.group.visible = false;
    scene.add(car.group);
    return { car, busy: false, leaving: false, path: null, s: 0, v: 0, merged: false, released: false, pos: new THREE.Vector3(), tan: new THREE.Vector3() };
  });
  const carBox = { type: 'box', off: true, minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  colliders.push(carBox);

  // El carril oeste se pausa mientras algún cliente entra o sale (contador, no bandera)
  let holds = 0;
  const hold = (m) => { if (m.released) { m.released = false; holds++; traffic.holdWest(true); } };
  const release = (m) => { if (!m.released) { m.released = true; holds--; if (holds === 0) traffic.holdWest(false); } };

  // Estado de la bahía. phase: idle | inbound | waiting | fueling | toPay
  const bay = {
    phase: 'idle',
    timer: BAL.firstCustomer,
    pending: false, // esperando hueco en la carretera para aparecer
    m: null, // auto que ocupa la bomba
    c: null, // datos del cliente actual
  };

  function findS(path, test) {
    const p = new THREE.Vector3();
    for (let s = 0; s < path.length; s += 0.25) {
      path.curve.getPointAt(s / path.length, p);
      if (test(p)) return s;
    }
    return path.length;
  }

  function place(m) {
    const u = Math.min(1, m.s / m.path.length);
    m.path.curve.getPointAt(u, m.pos);
    m.path.curve.getTangentAt(u, m.tan);
    m.car.group.position.copy(m.pos);
    m.car.group.rotation.y = Math.atan2(-m.tan.z, m.tan.x);
  }

  function spawn(m) {
    const typeId = pickType(Math.random, 'chance');
    const T = CAR_TYPES[typeId];
    m.car.setType(typeId, T.colors[(Math.random() * T.colors.length) | 0]);
    const want = Math.round(T.want[0] + Math.random() * (T.want[1] - T.want[0]));
    bay.c = {
      typeId, name: T.name, want, got: 0, patience: T.patience, patienceMax: T.patience, tipBase: T.tip, quality: null,
      soda: Math.random() < BAL.sodaChance,
    };
    bay.phase = 'inbound';
    bay.m = m;
    m.busy = true; m.leaving = false; m.released = true;
    m.path = inPath; m.s = 0; m.v = ROAD_SPEED;
    hold(m);
    m.car.group.visible = true;
    place(m);
  }

  // El cliente deja la bomba: la bahía queda libre y el auto sigue su salida por su cuenta
  function leave() {
    const m = bay.m;
    m.path = outPath; m.s = 0; m.v = 0; m.merged = false;
    hold(m);
    carBox.off = true;
    m.leaving = true;
    bay.m = null; bay.c = null;
    bay.phase = 'idle';
    // Mejor reputación = clientes más seguido
    const speed = BAL.repSpeed[0] + (BAL.repSpeed[1] - BAL.repSpeed[0]) * (state.rep / 100);
    bay.timer = (BAL.nextCustomer[0] + Math.random() * (BAL.nextCustomer[1] - BAL.nextCustomer[0])) * speed;
  }

  // Avanza por la ruta respetando un límite de velocidad y un punto donde debe poder frenar
  function drive(m, dt, vMax, stopS, player) {
    let target = Math.min(vMax, Math.sqrt(Math.max(0, 2 * 4 * (stopS - m.s))));
    // Frenar si el jugador está parado enfrente (solo dentro de la estación)
    if (m.pos.z < -4.5) {
      const dx = player.x - m.pos.x, dz = player.z - m.pos.z;
      const d = Math.hypot(dx, dz);
      const reach = CAR_TYPES[m.car.typeId].len / 2 + 3.4;
      if (d < reach && (dx * m.tan.x + dz * m.tan.z) / (d || 1) > 0.45) target = 0;
    }
    const rate = target < m.v ? 9 : 5;
    const dv = target - m.v;
    m.v += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
    m.s = Math.min(m.s + m.v * dt, m.path.length);
    place(m);
  }

  function updateDeparting(m, dt, player) {
    if (!m.merged && m.s > yieldS - 14 && traffic.westClear(-75, 115)) m.merged = true;
    const onRoad = m.merged && m.pos.x < -44;
    drive(m, dt, onRoad ? Math.min(ROAD_SPEED, traffic.westAheadSpeed(m.pos.x, 30)) : LOT_SPEED, m.merged ? Infinity : yieldS, player);
    if (m.pos.x < -70) release(m);
    if (m.s >= m.path.length) {
      release(m);
      m.car.group.visible = false;
      m.busy = false;
      m.leaving = false;
    }
  }

  function payout() {
    const c = bay.c;
    const fuel = Math.min(c.got, c.want) * BAL.pricePerGal;
    const mult = c.quality === 'perfect' ? 2 : c.quality === 'ok' ? 1 : 0;
    const tip = c.tipBase * mult * (0.4 + 0.6 * (c.patience / c.patienceMax));
    const soda = c.soda && state.carrying; // solo se vende si llevas el refresco en la mano
    return { total: Math.round((fuel + tip + (soda ? BAL.sodaPrice : 0)) * 100) / 100, tip: Math.round(tip * 100) / 100, soda };
  }

  function finishFuel() {
    const c = bay.c;
    const r = c.got / c.want;
    c.quality = r > BAL.perfectMax ? 'over' : r >= BAL.perfectMin ? 'perfect' : 'ok';
    bay.phase = 'toPay';
    state.emit('fuelDone', { quality: c.quality });
    onEvent(c.quality === 'perfect' ? 'toastPerfect' : c.quality === 'over' ? 'toastOver' : 'toastOk');
  }

  const api = {
    bay,
    update(dt, player) {
      for (const x of movers) if (x.leaving) updateDeparting(x, dt, player);
      const c = bay.c;
      const m = bay.m;
      switch (bay.phase) {
        case 'idle': {
          if (!state.open) break; // cerrado: nadie entra
          bay.timer -= dt;
          if (bay.timer > 0) break;
          // Toca cliente: se pausa el carril y sale en cuanto el punto de aparición queda despejado
          const free = movers.find((x) => !x.busy);
          if (!free) break;
          if (!bay.pending) { bay.pending = true; holds++; traffic.holdWest(true); }
          if (traffic.westClear(SPAWN_X - 25, 330)) {
            bay.pending = false; holds--;
            spawn(free);
          }
          break;
        }

        case 'inbound': {
          // En carretera no rebasa: iguala la velocidad del auto de adelante
          const vMax = m.pos.x > 80 ? Math.min(ROAD_SPEED, traffic.westAheadSpeed(m.pos.x, 30))
            : m.pos.x > 42 ? 9 : LOT_SPEED;
          drive(m, dt, vMax, m.path.length, player);
          if (m.pos.z < -4) release(m);
          if (m.s >= m.path.length - 0.05 && m.v < 0.2) {
            m.v = 0;
            bay.phase = 'waiting';
            const T = CAR_TYPES[c.typeId];
            carBox.minX = m.pos.x - T.len / 2; carBox.maxX = m.pos.x + T.len / 2;
            carBox.minZ = m.pos.z - T.wid / 2; carBox.maxZ = m.pos.z + T.wid / 2;
            carBox.off = false;
            onEvent(c.soda ? 'toastArriveSoda' : 'toastArrive');
          }
          break;
        }

        case 'waiting':
        case 'toPay':
          c.patience -= dt * (bay.phase === 'toPay' ? BAL.payPatienceRate : 1);
          if (c.patience <= 0) {
            state.lost++;
            state.addRep(BAL.repAngry);
            state.emit('angry');
            onEvent(bay.phase === 'toPay' ? 'toastAngryUnpaid' : 'toastAngry');
            leave();
          }
          break;

        case 'fueling':
          break; // mientras cargas, la paciencia no baja
      }
    },

    // ---- Acciones del jugador ----
    canFuel() { return bay.phase === 'waiting' || bay.phase === 'fueling'; },
    fuelHold(dt) {
      if (!api.canFuel()) return;
      const c = bay.c;
      // La gasolina sale del tanque de la estación (también la que se derrama)
      const amount = Math.min((c.want / BAL.fillSeconds) * dt, state.fuel, c.want * BAL.overfillMax - c.got);
      if (state.fuel <= 0) {
        if (bay.phase === 'fueling') api.fuelRelease();
        return;
      }
      bay.phase = 'fueling';
      c.got += amount;
      state.useFuel(amount);
      if (c.got >= c.want * BAL.overfillMax - 1e-6) finishFuel();
    },
    fuelRelease() {
      if (bay.phase !== 'fueling') return;
      if (bay.c.got >= bay.c.want * BAL.doneMin) finishFuel();
      else { bay.phase = 'waiting'; onEvent('toastShort'); }
    },
    canCharge() { return bay.phase === 'toPay'; },
    bill() { return payout(); },
    charge() {
      if (bay.phase !== 'toPay') return;
      const c = bay.c;
      const { total, tip, soda } = payout();
      if (soda) state.setCarrying(false);
      state.served++;
      state.addMoney(total, true);
      state.addRep(c.quality === 'perfect' ? BAL.repPerfect : c.quality === 'ok' ? BAL.repOk : BAL.repOver);
      state.emit('served', { quality: c.quality, soda, typeId: c.typeId });
      onEvent(tip > 0 ? 'toastPaid' : 'toastPaidNoTip', { m: fmtMoney(total), t: fmtMoney(tip) });
      leave();
    },

    // Puntos de interacción que dependen del cliente
    interactables() {
      return [
        {
          id: 'pump', x: LAYOUT.pump.x, y: 1.2, z: LAYOUT.pump.z, holdable: true,
          label: () => (!api.canFuel() ? null : state.fuel > 0 ? t('promptFuel') : t('promptNoFuel')),
          hold: (dt) => api.fuelHold(dt),
          release: () => api.fuelRelease(),
        },
        {
          id: 'register', x: LAYOUT.register.x, y: 1.2, z: LAYOUT.register.z,
          label: () => {
            if (!api.canCharge()) return null;
            const missing = bay.c.soda && !state.carrying;
            return t(missing ? 'promptChargeNoSoda' : 'promptCharge', { m: fmtMoney(payout().total) });
          },
          use: () => api.charge(),
        },
        {
          id: 'cooler', x: LAYOUT.cooler.x, y: 0.9, z: LAYOUT.cooler.z,
          label: () => (state.carrying ? null : t(state.sodas > 0 ? 'promptSoda' : 'promptNoSoda')),
          use: () => {
            if (state.sodas > 0) { state.takeSoda(); onEvent('toastSoda'); } else onEvent('toastNoSoda');
          },
        },
      ];
    },
  };
  return api;
}
