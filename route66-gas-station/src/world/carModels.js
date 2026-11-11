// Construye autos low-poly. Cada auto son 3 mallas: carrocería (color propio),
// detalles (color por vértice, compartidos) y una sombra falsa.
// El frente del auto apunta a +X en su espacio local.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { CAR_TYPES } from '../data/carTypes.js';
import { box, wheel, merge, vertexMat } from './geo.js';

const cache = new Map();
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x1a1020, transparent: true, opacity: 0.3, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
});
const WHITE = 0xffffff; // la carrocería se tiñe con el color del material

function geometryFor(typeId) {
  if (cache.has(typeId)) return cache.get(typeId);
  const T = CAR_TYPES[typeId];
  const body = [];
  const detail = [];
  const hw = T.wid / 2;

  if (T.kind === 'truck') {
    const front = T.len / 2;
    // Cabina (color) + caja (crema)
    body.push(box(2.3, 2.1, T.wid, WHITE, front - 1.15, 0.75 + 1.05, 0));
    detail.push(box(2.34, 0.75, T.wid - 0.2, PAL.glass, front - 1.1, 2.3, 0));
    detail.push(box(1.2, 0.76, T.wid + 0.04, PAL.glass, front - 1.0, 2.3, 0));
    detail.push(box(7.6, 2.7, T.wid + 0.1, 0xe3d6b8, front - 2.5 - 3.8, 0.95 + 1.35, 0));
    detail.push(box(T.len - 0.6, 0.3, T.wid - 0.5, PAL.dark, -0.1, 0.72, 0)); // chasis
    detail.push(box(0.2, 0.3, T.wid + 0.1, PAL.chrome, front + 0.05, 0.7, 0));
    for (const s of [-1, 1]) {
      detail.push(box(0.1, 0.22, 0.34, 0xfff0b8, front + 0.02, 1.15, s * (hw - 0.35)));
      detail.push(box(0.1, 0.3, 0.3, 0xc0392b, -front + 0.25, 1.1, s * (hw - 0.3)));
      for (const wx of [front - 1.2, -front + 1.3, -front + 2.6]) {
        detail.push(wheel(T.wheelR, 0.45, PAL.dark, wx, T.wheelR, s * (hw - 0.2)));
      }
    }
  } else {
    const c = T.cabin;
    const bodyY = T.ground + T.bodyH / 2;
    const top = T.ground + T.bodyH;
    const front = T.len / 2;
    body.push(box(T.len, T.bodyH, T.wid, WHITE, 0, bodyY, 0));
    body.push(box(c.len, c.h, T.wid - 0.24, WHITE, c.offset, top + c.h / 2, 0));
    if (T.fins) for (const s of [-1, 1]) body.push(box(1.0, 0.16, 0.1, WHITE, -front + 0.5, top + 0.08, s * (hw - 0.05)));
    // Vidrios: una franja oscura un poco más grande que la cabina
    detail.push(box(c.len + 0.03, c.h * 0.52, T.wid - 0.2, PAL.glass, c.offset, top + c.h * 0.5, 0));
    detail.push(box(c.len - 0.4, c.h * 0.52, T.wid - 0.21, PAL.glass, c.offset, top + c.h * 0.5, 0));
    // Defensas, faros y calaveras
    detail.push(box(0.16, 0.16, T.wid + 0.06, PAL.chrome, front + 0.04, T.ground + 0.14, 0));
    detail.push(box(0.16, 0.16, T.wid + 0.06, PAL.chrome, -front - 0.04, T.ground + 0.14, 0));
    detail.push(box(0.06, 0.2, T.wid * 0.5, PAL.chrome, front + 0.02, bodyY + 0.08, 0)); // parrilla
    for (const s of [-1, 1]) {
      detail.push(box(0.08, 0.2, 0.3, 0xfff0b8, front + 0.01, bodyY + 0.1, s * (hw - 0.28)));
      detail.push(box(0.08, 0.18, 0.26, 0xc0392b, -front - 0.01, bodyY + 0.1, s * (hw - 0.26)));
      for (const wx of [front - 0.95, -front + 1.0]) {
        detail.push(wheel(T.wheelR, 0.26, PAL.dark, wx, T.wheelR, s * (hw - 0.08)));
        detail.push(wheel(T.wheelR * 0.5, 0.28, PAL.chrome, wx, T.wheelR, s * (hw - 0.08)));
      }
    }
  }
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

// Elige un tipo al azar según su peso
export function pickType(rand, ids = Object.keys(CAR_TYPES)) {
  let total = 0;
  for (const id of ids) total += CAR_TYPES[id].weight;
  let r = rand() * total;
  for (const id of ids) { r -= CAR_TYPES[id].weight; if (r <= 0) return id; }
  return ids[0];
}
