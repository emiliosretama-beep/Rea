// Tráfico de fondo: autos que pasan por la Ruta 66. Se reciclan (pool), sin crear objetos al jugar.
import { CFG } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { createCar, pickType } from './carModels.js';

const POOL = 6;
const SPAWN_X = 300;

export function createTraffic(scene) {
  const cars = [];
  for (let i = 0; i < POOL; i++) {
    const car = createCar();
    car.active = false;
    car.speed = 0;
    car.dir = 1;
    car.group.visible = false;
    scene.add(car.group);
    cars.push(car);
  }

  // Dos carriles: hacia el este (+X, lado lejano) y hacia el oeste (−X, lado de la estación)
  const lanes = [
    { dir: 1, z: CFG.road.laneZ, timer: 1.5, last: null },
    { dir: -1, z: -CFG.road.laneZ, timer: 3.5, last: null },
  ];

  let westHold = false;
  let level = 1;

  function spawn(lane) {
    if (lane.dir === -1 && westHold) return false;
    const car = cars.find((c) => !c.active);
    if (!car) return false;
    // No encimar: esperar a que el anterior se aleje del punto de salida
    const prev = lane.last;
    if (prev && prev.active && Math.abs(prev.group.position.x - (-lane.dir * SPAWN_X)) < 45) return false;
    const typeId = pickType(Math.random, 'weight', (T) => T.level <= level);
    const T = CAR_TYPES[typeId];
    car.setType(typeId, T.colors[(Math.random() * T.colors.length) | 0]);
    car.dir = lane.dir;
    car.speed = (typeId === 'truck' ? 17 : 21) + Math.random() * 7;
    if (typeId === 'sports') car.speed = 27;
    // Nunca más rápido que el de adelante: así no se alcanzan
    if (prev && prev.active) car.speed = Math.min(car.speed, prev.speed);
    car.group.position.set(-lane.dir * SPAWN_X, 0, lane.z);
    car.group.rotation.y = lane.dir === 1 ? 0 : Math.PI;
    car.group.visible = true;
    car.active = true;
    lane.last = car;
    return true;
  }

  return {
    cars,
    // Los clientes usan el carril hacia el oeste: se pausa la salida de autos nuevos mientras entran o salen
    holdWest(on) { westHold = on; },
    // Con cada nivel pasan más tipos de auto por la carretera
    setLevel(n) { level = n; },
    // Velocidad del auto más cercano que va adelante en el carril oeste (Infinity si no hay)
    westAheadSpeed(x, range) {
      let best = Infinity, bestD = range;
      for (const c of cars) {
        if (!c.active || c.dir !== -1) continue;
        const d = x - c.group.position.x;
        if (d > 0 && d < bestD) { bestD = d; best = c.speed; }
      }
      return best;
    },
    westClear(minX, maxX) {
      for (const c of cars) {
        if (c.active && c.dir === -1 && c.group.position.x > minX && c.group.position.x < maxX) return false;
      }
      return true;
    },
    update(dt) {
      for (const lane of lanes) {
        lane.timer -= dt;
        if (lane.timer <= 0) lane.timer = spawn(lane) ? 3 + Math.random() * 6 : 1;
      }
      for (const car of cars) {
        if (!car.active) continue;
        car.group.position.x += car.dir * car.speed * dt;
        if (car.group.position.x * car.dir > SPAWN_X) {
          car.active = false;
          car.group.visible = false;
        }
      }
    },
  };
}
