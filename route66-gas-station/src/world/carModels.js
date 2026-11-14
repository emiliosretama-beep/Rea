// Autos low-poly con silueta de los años 50. Cada auto son 3 mallas:
// carrocería (se tiñe con el color del auto), detalles (color por vértice, compartidos) y sombra falsa.
// El frente apunta a +X en espacio local. Las medidas (len, wid) vienen de data/carTypes.js.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { box, cyl, wheel, merge, extrude, shapeOf, slopePanel, cylX } from './geo.js';

const cache = new Map();
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x1a1020, transparent: true, opacity: 0.22, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
});
const WHITE = 0xffffff; // la carrocería se tiñe con el color del material
const detailMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const ROOF = 0xf1e6cc; // techo crema de los autos de dos tonos
const LAMP = 0xfff0b8;
const TAIL = 0xc0392b;
const TIRE = 0x1e1b22;

// Perfil inferior de un auto: cofre, línea de cintura, cajuela y los dos arcos de rueda
function lowerShape({ L, floor, belt, hoodX, noseY, ax, arch, tail }) {
  const f = L / 2;
  const s = new THREE.Shape();
  s.moveTo(-f, floor + 0.12);
  if (tail) { s.lineTo(-f, belt - 0.03); s.lineTo(-f + 0.08, belt + tail); s.lineTo(-f + 0.85, belt); } else s.lineTo(-f, belt);
  s.lineTo(hoodX, belt);
  s.lineTo(f - 0.25, belt - 0.07);
  s.lineTo(f, noseY);
  s.lineTo(f, floor + 0.12);
  s.lineTo(f - 0.1, floor);
  s.lineTo(ax + arch, floor);
  s.absarc(ax, floor, arch, 0, Math.PI, false);
  s.lineTo(-ax + arch, floor);
  s.absarc(-ax, floor, arch, 0, Math.PI, false);
  s.lineTo(-f + 0.1, floor);
  s.closePath();
  return s;
}

// Llantas: ya no son parte de la geometría; se guardan sus lugares y se dibujan animadas (giran y voltean)
function wheels(meta, T, ax, positions) {
  const r = T.wheelR, hw = T.wid / 2;
  for (const s of [-1, 1]) {
    for (const x of positions) meta.wheels.push({ x, z: s * (hw - 0.11), r, w: 0.24, front: x > 0 });
  }
}

function frontRear(out, T, P) {
  const f = T.len / 2, hw = T.wid / 2;
  const mid = (P.floor + P.belt) / 2;
  out.push(box(0.16, 0.15, T.wid + 0.1, PAL.chrome, f + 0.05, P.floor + 0.16, 0));
  out.push(box(0.16, 0.15, T.wid + 0.1, PAL.chrome, -f - 0.05, P.floor + 0.16, 0));
  out.push(box(0.05, 0.2, T.wid * 0.6, PAL.dark, f + 0.005, mid + 0.02, 0)); // parrilla
  out.push(box(0.07, 0.045, T.wid * 0.64, PAL.chrome, f + 0.01, mid + 0.06, 0));
  out.push(box(0.07, 0.045, T.wid * 0.64, PAL.chrome, f + 0.01, mid - 0.04, 0));
  out.push(box(T.len * 0.8, 0.04, T.wid + 0.03, P.trim || PAL.chrome, 0, mid + 0.04, 0)); // moldura lateral
  for (const s of [-1, 1]) {
    out.push(cylX(0.12, 0.08, 8, LAMP, f - 0.0, mid + 0.1, s * (hw - 0.26)));
    out.push(box(0.06, 0.16, 0.2, TAIL, -f - 0.005, P.belt - 0.14, s * (hw - 0.2)));
    if (P.meta) {
      P.meta.head.push([f + 0.03, mid + 0.1, s * (hw - 0.26)]);
      P.meta.tail.push([-f - 0.03, P.belt - 0.14, s * (hw - 0.2)]);
      P.meta.signal.push([f - 0.05, mid - 0.06, s * (hw - 0.05)], [-f + 0.05, P.belt - 0.14, s * (hw - 0.02)]);
    }
  }
}

// Cabina: pts = [base trasera, techo atrás, techo adelante, base delantera]
function cabin(body, detail, T, pts, { twoTone, pillars = [] }) {
  const w = T.wid - 0.34;
  const [a, b, c, d] = pts;
  (twoTone ? detail : body).push(extrude(shapeOf(pts), w, twoTone ? ROOF : WHITE));
  // Vidrios laterales: perfil un poco más chico, apenas salido
  const g = [[a[0] + 0.2, a[1] + 0.06], [b[0] + 0.1, b[1] - 0.07], [c[0] - 0.05, c[1] - 0.07], [d[0] - 0.18, d[1] + 0.06]];
  detail.push(extrude(shapeOf(g), w + 0.02, PAL.glass));
  for (const px of pillars) (twoTone ? detail : body).push(box(0.09, b[1] - a[1] - 0.06, w + 0.04, twoTone ? ROOF : WHITE, px, (a[1] + b[1]) / 2, 0));
  detail.push(slopePanel(d[0], d[1], c[0], c[1], w - 0.2, PAL.glass)); // parabrisas
  detail.push(slopePanel(a[0], a[1], b[0], b[1], w - 0.26, PAL.glass)); // medallón
}

const BUILDERS = {
  sedan(T, body, detail, meta) {
    const P = { L: T.len, floor: 0.3, belt: 0.93, hoodX: 0.95, noseY: 0.76, ax: 1.42, arch: 0.44, tail: 0.11 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-1.3, 0.93], [-0.95, 1.43], [0.2, 1.46], [0.85, 0.93]], { twoTone: true, pillars: [-0.36] });
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  wagon(T, body, detail, meta) {
    const P = { L: T.len, floor: 0.3, belt: 0.93, hoodX: 1.1, noseY: 0.76, ax: 1.55, arch: 0.44 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-2.38, 0.93], [-2.2, 1.46], [0.4, 1.48], [1.02, 0.93]], { twoTone: true, pillars: [-1.35, -0.4] });
    detail.push(box(2.9, 0.3, T.wid + 0.025, 0x9a6a42, -0.75, 0.64, 0)); // panel de madera
    detail.push(box(2.6, 0.05, 1.2, PAL.chrome, -0.9, 1.5, 0)); // parrilla del techo
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  pickup(T, body, detail, meta) {
    const P = { L: T.len, floor: 0.38, belt: 1.02, hoodX: 1.3, noseY: 0.84, ax: 1.6, arch: 0.5 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-0.2, 1.02], [-0.12, 1.62], [0.85, 1.62], [1.3, 1.02]], { twoTone: false });
    detail.push(box(2.05, 0.06, T.wid - 0.3, 0x3a2e2a, -1.35, 1.0, 0)); // fondo de la caja
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  // Deportivo: bajo, cabina pequeña y franja de carreras
  sports(T, body, detail, meta) {
    const P = { L: T.len, floor: 0.22, belt: 0.78, hoodX: 0.55, noseY: 0.58, ax: 1.3, arch: 0.42 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-0.95, 0.78], [-0.62, 1.13], [0.12, 1.15], [0.72, 0.78]], { twoTone: false });
    detail.push(box(1.4, 0.02, 0.34, ROOF, 1.3, 0.79, 0)); // franja en el cofre
    detail.push(box(1.0, 0.02, 0.34, ROOF, -1.55, 0.79, 0));
    detail.push(box(0.5, 0.05, T.wid - 0.3, PAL.dark, -T.len / 2 + 0.3, 0.92, 0)); // alerón
    for (const s of [-1, 1]) detail.push(box(0.06, 0.14, 0.06, PAL.dark, -T.len / 2 + 0.3, 0.85, s * 0.6));
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  // Clásico: cofre largo, cabina erguida, parrilla alta y estribos
  classic(T, body, detail, meta) {
    const P = { L: T.len, floor: 0.32, belt: 1.0, hoodX: 1.25, noseY: 0.9, ax: 1.78, arch: 0.5 };
    body.push(extrude(lowerShape(P), T.wid - 0.16, WHITE));
    cabin(body, detail, T, [[-1.95, 1.0], [-1.68, 1.62], [0.05, 1.64], [0.42, 1.0]], { twoTone: true, pillars: [-0.85] });
    // Salpicaderas anchas sobre cada rueda y estribo entre ellas
    for (const s of [-1, 1]) {
      const z = s * (T.wid / 2 - 0.12);
      detail.push(box(1.25, 0.14, 0.3, PAL.dark, P.ax, 0.9, z));
      detail.push(box(1.25, 0.14, 0.3, PAL.dark, -P.ax, 0.9, z));
      detail.push(box(2.3, 0.07, 0.3, PAL.dark, 0, 0.36, z));
    }
    detail.push(box(0.1, 0.62, 0.8, PAL.chrome, T.len / 2 + 0.01, 0.72, 0)); // parrilla alta
    detail.push(box(0.12, 0.1, 0.06, PAL.chrome, T.len / 2 - 0.15, 1.02, 0)); // adorno del cofre
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  // VIP: limusina larga con molduras doradas
  vip(T, body, detail, meta) {
    const GOLD = 0xd9b24a;
    const P = { L: T.len, floor: 0.3, belt: 0.95, hoodX: 2.25, noseY: 0.78, ax: 2.4, arch: 0.45, tail: 0.07, trim: GOLD };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-2.45, 0.95], [-2.15, 1.45], [1.45, 1.47], [2.05, 0.95]], { twoTone: false, pillars: [-1.3, -0.2, 0.9] });
    for (const s of [-1, 1]) {
      detail.push(box(0.03, 0.34, 0.03, PAL.chrome, T.len / 2 - 0.35, 1.05, s * (T.wid / 2 - 0.12))); // astas
      detail.push(box(0.2, 0.13, 0.02, GOLD, T.len / 2 - 0.44, 1.16, s * (T.wid / 2 - 0.12))); // banderines
    }
    P.meta = meta;
    frontRear(detail, T, P);
    wheels(meta, T, P.ax, [P.ax, -P.ax]);
  },
  // Motocicleta con su piloto
  moto(T, body, detail, meta) {
    const r = T.wheelR;
    for (const x of [0.72, -0.72]) {
      meta.wheels.push({ x, z: 0, r, w: 0.14, front: x > 0 });
      body.push(box(0.5, 0.05, 0.18, WHITE, x, r * 2 + 0.03, 0)); // salpicadera
    }
    meta.head.push([0.68, 0.95, 0]);
    meta.tail.push([-1.04, 0.7, 0]);
    body.push(box(0.62, 0.26, 0.3, WHITE, 0.12, 0.84, 0)); // tanque
    detail.push(box(0.6, 0.1, 0.28, PAL.dark, -0.42, 0.82, 0)); // asiento
    detail.push(box(0.5, 0.36, 0.3, 0x55585c, 0.02, 0.5, 0)); // motor
    detail.push(slopePanel(0.72, 0.36, 0.5, 1.06, 0.12, PAL.chrome, 0)); // horquilla
    detail.push(box(0.06, 0.06, 0.72, PAL.chrome, 0.5, 1.08, 0)); // manubrio
    detail.push(cylX(0.1, 0.1, 8, LAMP, 0.62, 0.95, 0));
    detail.push(cylX(0.045, 0.9, 6, PAL.chrome, -0.5, 0.36, 0.2)); // escape
    detail.push(box(0.06, 0.1, 0.12, TAIL, -1.0, 0.7, 0));
    // Piloto
    const SKIN = 0xe0a878, JACKET = 0x3a2e2a, JEANS = 0x3d4a66;
    detail.push(box(0.3, 0.56, 0.42, JACKET, -0.3, 1.2, 0));
    detail.push(slopePanel(-0.18, 1.34, 0.46, 1.1, 0.5, JACKET, 0)); // brazos al manubrio
    detail.push(box(0.26, 0.26, 0.26, SKIN, -0.24, 1.62, 0));
    body.push(box(0.3, 0.16, 0.3, WHITE, -0.25, 1.75, 0)); // casco
    for (const s of [-1, 1]) {
      detail.push(box(0.5, 0.16, 0.16, JEANS, -0.12, 0.9, s * 0.22));
      detail.push(box(0.14, 0.5, 0.14, JEANS, 0.1, 0.62, s * 0.24));
    }
  },
  truck(T, body, detail, meta) {
    const f = T.len / 2, hw = T.wid / 2, r = T.wheelR;
    // Tractor: cofre largo y cabina con parabrisas inclinado
    body.push(extrude(shapeOf([[1.9, 0.8], [1.9, 2.75], [3.2, 2.75], [3.62, 1.82], [f - 0.15, 1.72], [f, 1.5], [f, 0.8]]), T.wid - 0.2, WHITE));
    detail.push(slopePanel(3.62, 1.82, 3.2, 2.75, T.wid - 0.5, PAL.glass, 0.1));
    detail.push(box(0.95, 0.6, T.wid - 0.17, PAL.glass, 2.62, 2.3, 0));
    detail.push(box(0.06, 0.7, 1.2, PAL.chrome, f + 0.01, 1.25, 0));
    detail.push(box(0.2, 0.26, T.wid + 0.1, PAL.chrome, f + 0.06, 0.72, 0));
    detail.push(box(T.len - 0.5, 0.26, T.wid - 0.7, PAL.dark, -0.1, 0.78, 0)); // chasis
    // Caja
    detail.push(box(7.2, 2.7, T.wid + 0.1, 0xe3d6b8, -f + 3.6, 1.05 + 1.35, 0));
    detail.push(box(7.22, 0.34, T.wid + 0.12, PAL.red, -f + 3.6, 1.75, 0));
    for (const s of [-1, 1]) {
      detail.push(cylX(0.14, 0.08, 8, LAMP, f, 1.2, s * (hw - 0.3)));
      detail.push(box(0.08, 0.26, 0.26, TAIL, -f - 0.01, 1.3, s * (hw - 0.25)));
      detail.push(cyl(0.07, 0.07, 1.5, 6, PAL.chrome, 1.8, 2.75, s * (hw - 0.22))); // escape
      for (const x of [f - 1.05, 1.1, -f + 1.2, -f + 2.45]) meta.wheels.push({ x, z: s * (hw - 0.2), r, w: 0.46, front: x > 3 });
      meta.head.push([f + 0.03, 1.2, s * (hw - 0.3)]);
      meta.tail.push([-f - 0.04, 1.3, s * (hw - 0.25)]);
      meta.signal.push([f + 0.02, 1.55, s * (hw - 0.12)], [-f - 0.03, 1.6, s * (hw - 0.25)]);
    }
  },
};

function geometryFor(typeId) {
  if (cache.has(typeId)) return cache.get(typeId);
  const body = [];
  const detail = [];
  const meta = { wheels: [], head: [], tail: [], signal: [] };
  BUILDERS[typeId](CAR_TYPES[typeId], body, detail, meta);
  const g = { body: merge(body), detail: merge(detail), meta };
  cache.set(typeId, g);
  return g;
}

// Crea un auto reutilizable; setType cambia forma y color sin crear mallas nuevas.
// motion(): el que lo mueve informa velocidad, aceleración, giro, freno y direccional para animarlo.
export function createCar() {
  const group = new THREE.Group();
  const chassis = new THREE.Group(); // se inclina al frenar y en curvas; las llantas no
  const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const body = new THREE.Mesh(undefined, bodyMat);
  const detail = new THREE.Mesh(undefined, detailMat);
  for (const m of [body, detail]) { m.castShadow = true; m.receiveShadow = true; }
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.05;
  chassis.add(body, detail);
  group.add(chassis, shadow);

  const car = {
    group,
    chassis,
    typeId: null,
    meta: null,
    // Estado de animación
    v: 0, accel: 0, steer: 0, braking: false, signal: 0, spin: 0, pitch: 0, roll: 0, lights: true,
    setType(typeId, colorHex) {
      const g = geometryFor(typeId);
      const T = CAR_TYPES[typeId];
      body.geometry = g.body;
      detail.geometry = g.detail;
      bodyMat.color.set(colorHex);
      shadow.scale.set(T.len * 1.05, 1, T.wid * 1.2);
      car.typeId = typeId;
      car.meta = g.meta;
      car.v = 0; car.accel = 0; car.steer = 0; car.braking = false; car.signal = 0;
    },
    // v: m/s · accel: m/s² · steer: radianes (+ izquierda) · signal: -1 der., 0, 1 izq.
    // engineOn = false: estacionado o apagado (sin luz de freno)
    motion(v, accel, steer, signal, engineOn = true) {
      car.v = v; car.accel = accel; car.steer = steer; car.signal = signal;
      car.braking = engineOn && (accel < -1.2 || v < 0.3);
    },
  };
  fx.cars.push(car);
  return car;
}

// ---------- Efectos de todos los autos: llantas animadas y luces (2 llamadas de dibujo en total) ----------
const fx = { cars: [], wheels: null, lamps: null, cap: 0, lampCap: 0 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const C_HEAD = new THREE.Color(0xfff1c8), C_TAIL = new THREE.Color(0x6a1712), C_BRAKE = new THREE.Color(0xff3020), C_SIG = new THREE.Color(0xffa31a);

function wheelGeometry() {
  // Unidad: radio 1, ancho 1, eje en Z. Cara blanca y tapón con birlos (se nota que gira).
  const parts = [
    wheel(1, 1, TIRE, 0, 0, 0),
    wheel(0.74, 1.04, 0xe9e2d0, 0, 0, 0),
    wheel(0.46, 1.08, PAL.chrome, 0, 0, 0),
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push(box(0.16, 0.16, 1.12, PAL.dark, Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0));
  }
  return merge(parts);
}

// Llamar una vez, después de crear todos los autos
export function initCarFx(scene) {
  fx.cap = fx.cars.length * 8;
  fx.wheels = new THREE.InstancedMesh(wheelGeometry(), detailMat, fx.cap);
  fx.wheels.castShadow = true;
  fx.wheels.frustumCulled = false;
  scene.add(fx.wheels);
  fx.lampCap = fx.cars.length * 8;
  const lampGeo = new THREE.BoxGeometry(1, 1, 1);
  fx.lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), fx.lampCap);
  fx.lamps.frustumCulled = false;
  for (let i = 0; i < fx.lampCap; i++) fx.lamps.setColorAt(i, C_HEAD);
  scene.add(fx.lamps);
}

// Actualiza llantas, inclinación y luces de todos los autos visibles
export function updateCarFx(dt, time) {
  if (!fx.wheels) return;
  let wi = 0, li = 0;
  const blink = Math.sin(time * 9.5) > 0;
  for (const car of fx.cars) {
    if (!car.group.visible || !car.meta) continue;
    const T = CAR_TYPES[car.typeId];
    // Inclinación: nariz abajo al frenar, se ladea en curvas (suavizado)
    const k = 1 - Math.exp(-8 * dt);
    const targetPitch = THREE.MathUtils.clamp(car.accel * 0.006, -0.045, 0.03);
    const targetRoll = THREE.MathUtils.clamp(car.v * car.v * car.steer * 0.004, -0.05, 0.05); // se ladea hacia afuera
    car.pitch += (targetPitch - car.pitch) * k;
    car.roll += (targetRoll - car.roll) * k;
    car.chassis.rotation.set(car.roll, 0, car.pitch);
    car.group.updateMatrixWorld(true);
    // Llantas
    car.spin -= (car.v * dt) / T.wheelR;
    for (const w of car.meta.wheels) {
      if (wi >= fx.cap) break;
      _e.set(0, w.front ? car.steer : 0, car.spin);
      _q.setFromEuler(_e);
      _p.set(w.x, w.r, w.z);
      _s.set(w.r, w.r, w.w);
      _m.compose(_p, _q, _s).premultiply(car.group.matrixWorld);
      fx.wheels.setMatrixAt(wi++, _m);
    }
    // Luces (siguen al chasis)
    const lamp = (pos, sx, sy, sz, color) => {
      if (li >= fx.lampCap) return;
      _p.set(pos[0], pos[1], pos[2]);
      _s.set(sx, sy, sz);
      _m.compose(_p, _q.identity(), _s).premultiply(car.chassis.matrixWorld);
      fx.lamps.setMatrixAt(li, _m);
      fx.lamps.setColorAt(li++, color);
    };
    for (const p of car.meta.head) lamp(p, 0.04, 0.17, 0.26, C_HEAD);
    for (const p of car.meta.tail) lamp(p, 0.04, 0.15, 0.2, car.braking ? C_BRAKE : C_TAIL);
    if (car.signal && blink) {
      for (const p of car.meta.signal) {
        if ((p[2] < 0) === (car.signal > 0)) lamp(p, 0.06, 0.08, 0.1, C_SIG); // izquierda = lado -z
      }
    }
  }
  for (let i = wi; i < fx.cap; i++) fx.wheels.setMatrixAt(i, ZERO);
  for (let i = li; i < fx.lampCap; i++) fx.lamps.setMatrixAt(i, ZERO);
  fx.wheels.instanceMatrix.needsUpdate = true;
  fx.lamps.instanceMatrix.needsUpdate = true;
  if (fx.lamps.instanceColor) fx.lamps.instanceColor.needsUpdate = true;
}

// Elige un tipo al azar. field: 'weight' para el tráfico de fondo, 'chance' para clientes
// only: filtro opcional (por nivel de la estación, o solo los que piden servicios)
export function pickType(rand, field = 'weight', only = null) {
  const ids = Object.keys(CAR_TYPES).filter((id) => CAR_TYPES[id][field] > 0 && (!only || only(CAR_TYPES[id])));
  let total = 0;
  for (const id of ids) total += CAR_TYPES[id][field];
  let r = rand() * total;
  for (const id of ids) { r -= CAR_TYPES[id][field]; if (r <= 0) return id; }
  return ids[0];
}
