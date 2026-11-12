// Ayudantes para construir geometría low-poly con color por vértice.
// Varias piezas se fusionan en una sola malla = una sola llamada de dibujo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

export function tint(geo, hex) {
  _c.set(hex);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export function box(w, h, d, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return tint(g, hex);
}

export function cyl(rTop, rBottom, h, seg, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Rueda: cilindro con el eje a lo ancho del auto (eje Z)
export function wheel(r, w, hex, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, w, 12);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Perfil lateral (x, y) extruido a lo ancho (z): da siluetas con curvas baratas, como la de un auto
export function extrude(shape, depth, hex) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -depth / 2);
  return tint(g, hex);
}

export function shapeOf(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

// Lámina delgada apoyada sobre una pendiente del perfil (parabrisas, medallón)
export function slopePanel(x1, y1, x2, y2, width, hex, trim = 0.07) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const g = new THREE.BoxGeometry(len - trim * 2, 0.04, width);
  g.rotateZ(Math.atan2(dy, dx));
  let nx = dy / len, ny = -dx / len; // normal hacia afuera = la que apunta hacia arriba
  if (ny < 0) { nx = -nx; ny = -ny; }
  g.translate((x1 + x2) / 2 + nx * 0.012, (y1 + y2) / 2 + ny * 0.012, 0);
  return tint(g, hex);
}

// Cilindro con el eje a lo largo del auto (faros)
export function cylX(r, len, seg, hex, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}

export function merge(list) {
  // Las extrusiones no traen índices: se igualan todas para poder fusionarlas
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = mergeGeometries(flat, false);
  list.forEach((x) => x.dispose());
  flat.forEach((x) => x.dispose());
  return out;
}

// Material único para todo lo que usa color por vértice
export const vertexMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// Aleatorio determinista: el mundo queda igual en cada carga
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
