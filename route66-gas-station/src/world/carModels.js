// Autos low-poly con silueta de los años 50. Cada auto son 3 mallas:
// carrocería (se tiñe con el color del auto), detalles (color por vértice, compartidos) y sombra falsa.
// El frente apunta a +X en espacio local. Las medidas (len, wid) vienen de data/carTypes.js.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { box, cyl, wheel, merge, vertexMat, extrude, shapeOf, slopePanel, cylX } from './geo.js';

const cache = new Map();
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x1a1020, transparent: true, opacity: 0.3, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
});
const WHITE = 0xffffff; // la carrocería se tiñe con el color del material
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

function wheels(out, T, ax, positions) {
  const r = T.wheelR, hw = T.wid / 2;
  for (const s of [-1, 1]) {
    for (const x of positions) {
      const z = s * (hw - 0.11);
      out.push(wheel(r, 0.24, TIRE, x, r, z));
      out.push(wheel(r * 0.74, 0.25, 0xe9e2d0, x, r, z + s * 0.005)); // cara blanca
      out.push(wheel(r * 0.42, 0.27, PAL.chrome, x, r, z + s * 0.006)); // tapón
    }
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
  sedan(T, body, detail) {
    const P = { L: T.len, floor: 0.3, belt: 0.93, hoodX: 0.95, noseY: 0.76, ax: 1.42, arch: 0.44, tail: 0.11 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-1.3, 0.93], [-0.95, 1.43], [0.2, 1.46], [0.85, 0.93]], { twoTone: true, pillars: [-0.36] });
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  wagon(T, body, detail) {
    const P = { L: T.len, floor: 0.3, belt: 0.93, hoodX: 1.1, noseY: 0.76, ax: 1.55, arch: 0.44 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-2.38, 0.93], [-2.2, 1.46], [0.4, 1.48], [1.02, 0.93]], { twoTone: true, pillars: [-1.35, -0.4] });
    detail.push(box(2.9, 0.3, T.wid + 0.025, 0x9a6a42, -0.75, 0.64, 0)); // panel de madera
    detail.push(box(2.6, 0.05, 1.2, PAL.chrome, -0.9, 1.5, 0)); // parrilla del techo
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  pickup(T, body, detail) {
    const P = { L: T.len, floor: 0.38, belt: 1.02, hoodX: 1.3, noseY: 0.84, ax: 1.6, arch: 0.5 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-0.2, 1.02], [-0.12, 1.62], [0.85, 1.62], [1.3, 1.02]], { twoTone: false });
    detail.push(box(2.05, 0.06, T.wid - 0.3, 0x3a2e2a, -1.35, 1.0, 0)); // fondo de la caja
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  // Deportivo: bajo, cabina pequeña y franja de carreras
  sports(T, body, detail) {
    const P = { L: T.len, floor: 0.22, belt: 0.78, hoodX: 0.55, noseY: 0.58, ax: 1.3, arch: 0.42 };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-0.95, 0.78], [-0.62, 1.13], [0.12, 1.15], [0.72, 0.78]], { twoTone: false });
    detail.push(box(1.4, 0.02, 0.34, ROOF, 1.3, 0.79, 0)); // franja en el cofre
    detail.push(box(1.0, 0.02, 0.34, ROOF, -1.55, 0.79, 0));
    detail.push(box(0.5, 0.05, T.wid - 0.3, PAL.dark, -T.len / 2 + 0.3, 0.92, 0)); // alerón
    for (const s of [-1, 1]) detail.push(box(0.06, 0.14, 0.06, PAL.dark, -T.len / 2 + 0.3, 0.85, s * 0.6));
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  // Clásico: cofre largo, cabina erguida, parrilla alta y estribos
  classic(T, body, detail) {
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
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  // VIP: limusina larga con molduras doradas
  vip(T, body, detail) {
    const GOLD = 0xd9b24a;
    const P = { L: T.len, floor: 0.3, belt: 0.95, hoodX: 2.25, noseY: 0.78, ax: 2.4, arch: 0.45, tail: 0.07, trim: GOLD };
    body.push(extrude(lowerShape(P), T.wid, WHITE));
    cabin(body, detail, T, [[-2.45, 0.95], [-2.15, 1.45], [1.45, 1.47], [2.05, 0.95]], { twoTone: false, pillars: [-1.3, -0.2, 0.9] });
    for (const s of [-1, 1]) {
      detail.push(box(0.03, 0.34, 0.03, PAL.chrome, T.len / 2 - 0.35, 1.05, s * (T.wid / 2 - 0.12))); // astas
      detail.push(box(0.2, 0.13, 0.02, GOLD, T.len / 2 - 0.44, 1.16, s * (T.wid / 2 - 0.12))); // banderines
    }
    frontRear(detail, T, P);
    wheels(detail, T, P.ax, [P.ax, -P.ax]);
  },
  // Motocicleta con su piloto
  moto(T, body, detail) {
    const r = T.wheelR;
    for (const x of [0.72, -0.72]) {
      detail.push(wheel(r, 0.14, TIRE, x, r, 0));
      detail.push(wheel(r * 0.5, 0.16, PAL.chrome, x, r, 0));
      body.push(box(0.5, 0.05, 0.18, WHITE, x, r * 2 + 0.03, 0)); // salpicadera
    }
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
  truck(T, body, detail) {
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
      for (const x of [f - 1.05, 1.1, -f + 1.2, -f + 2.45]) {
        const z = s * (hw - 0.2);
        detail.push(wheel(r, 0.46, TIRE, x, r, z));
        detail.push(wheel(r * 0.45, 0.48, PAL.chrome, x, r, z + s * 0.006));
      }
    }
  },
};

function geometryFor(typeId) {
  if (cache.has(typeId)) return cache.get(typeId);
  const body = [];
  const detail = [];
  BUILDERS[typeId](CAR_TYPES[typeId], body, detail);
  const g = { body: merge(body), detail: merge(detail) };
  cache.set(typeId, g);
  return g;
}

// Crea un auto reutilizable; setType cambia forma y color sin crear mallas nuevas
export function createCar() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const body = new THREE.Mesh(undefined, bodyMat);
  const detail = new THREE.Mesh(undefined, vertexMat);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.05;
  group.add(body, detail, shadow);

  return {
    group,
    typeId: null,
    setType(typeId, colorHex) {
      const g = geometryFor(typeId);
      const T = CAR_TYPES[typeId];
      body.geometry = g.body;
      detail.geometry = g.detail;
      bodyMat.color.set(colorHex);
      shadow.scale.set(T.len * 1.08, 1, T.wid * 1.25);
      this.typeId = typeId;
    },
  };
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
