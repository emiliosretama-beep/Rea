// Mercancía visible en la tienda: botellas en el refrigerador y botanas en los estantes.
// La cantidad dibujada sigue al inventario (si vendes, se vacía).
import * as THREE from 'three';
import { PAL } from '../config.js';
import { LAYOUT } from './station.js';

export function createStockVisuals(scene) {
  const L = LAYOUT;
  const wallZ = L.building.z - L.building.d / 2 + 0.25;
  const o = new THREE.Object3D();
  const c = new THREE.Color();

  // Refrigerador: 3 repisas x 8 botellas
  const bottleGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.34, 7);
  bottleGeo.translate(0, 0.17, 0);
  const bottleSlots = [];
  for (const y of [0.55, 1.1, 1.65]) for (let i = 0; i < 8; i++) bottleSlots.push([L.fridge.x - 0.77 + i * 0.22, y, wallZ + 0.82]);
  const bottles = new THREE.InstancedMesh(bottleGeo, new THREE.MeshLambertMaterial({ flatShading: true }), bottleSlots.length);
  const bottleColors = [PAL.red, 0x8a3a2a, PAL.teal, 0xe8b23a];
  bottleSlots.forEach(([x, y, z], i) => {
    o.position.set(x, y, z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix();
    bottles.setMatrixAt(i, o.matrix);
    bottles.setColorAt(i, c.set(bottleColors[(i * 3 + Math.floor(i / 8)) % bottleColors.length]));
  });
  scene.add(bottles);
  // Repisas del refrigerador
  const rackGeo = new THREE.BoxGeometry(L.fridge.w - 0.12, 0.04, 0.3);
  const racks = new THREE.InstancedMesh(rackGeo, new THREE.MeshLambertMaterial({ color: 0xcfd6d8 }), 3);
  [0.53, 1.08, 1.63].forEach((y, i) => { o.position.set(L.fridge.x, y, wallZ + 0.82); o.updateMatrix(); racks.setMatrixAt(i, o.matrix); });
  scene.add(racks);

  // Botanas: 2 estantes x 3 niveles x 6 cajas
  const snackGeo = new THREE.BoxGeometry(0.3, 0.32, 0.22);
  snackGeo.translate(0, 0.16, 0);
  const snackSlots = [];
  for (const sy of [0.73, 1.28, 1.83]) for (const sh of L.shelves) for (let i = 0; i < 6; i++) snackSlots.push([sh.x - sh.w / 2 + 0.25 + i * 0.38, sy, wallZ + 0.3]);
  const snacks = new THREE.InstancedMesh(snackGeo, new THREE.MeshLambertMaterial({ flatShading: true }), snackSlots.length);
  const snackColors = [0xe8b23a, PAL.red, 0x6f8fb8, PAL.cream, 0x8fa67a, 0xd3a15a];
  snackSlots.forEach(([x, y, z], i) => {
    o.position.set(x, y, z); o.rotation.set(0, (i % 3 - 1) * 0.12, 0); o.updateMatrix();
    snacks.setMatrixAt(i, o.matrix);
    snacks.setColorAt(i, c.set(snackColors[(i * 5) % snackColors.length]));
  });
  scene.add(snacks);

  let lastS = -1, lastN = -1;
  return {
    update(state) {
      const s = Math.min(bottleSlots.length, state.sodas);
      const n = Math.min(snackSlots.length, state.snacks);
      if (s !== lastS) { lastS = s; bottles.count = s; }
      if (n !== lastN) { lastN = n; snacks.count = n; }
    },
  };
}
