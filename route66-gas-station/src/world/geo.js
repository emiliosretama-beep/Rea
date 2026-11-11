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
  const g = new THREE.CylinderGeometry(r, r, w, 10);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}

export function merge(list) {
  const g = mergeGeometries(list, false);
  list.forEach((x) => x.dispose());
  return g;
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
