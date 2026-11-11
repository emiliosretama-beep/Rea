// Vegetación y rocas del desierto. Tres mallas instanciadas = tres llamadas de dibujo.
import * as THREE from 'three';
import { CFG, PAL } from '../config.js';
import { cyl, merge, rng } from './geo.js';
import { LAYOUT } from './station.js';

export function createProps(scene) {
  const rand = rng(1966);
  const colliders = [];
  const o = new THREE.Object3D();
  const lot = LAYOUT.lot;
  const roadHalf = CFG.road.width / 2 + 3.5;
  const b = CFG.bounds;

  const free = (x, z, pad) =>
    Math.abs(z) > roadHalf + pad &&
    !(Math.abs(x - lot.x) < lot.w / 2 + pad + 1 && Math.abs(z - lot.z) < lot.d / 2 + pad + 1);
  const walkable = (x, z) => x > b.minX - 2 && x < b.maxX + 2 && z > b.minZ - 2 && z < b.maxZ + 2;

  function scatter(geo, mat, count, range, place) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    let i = 0, guard = 0;
    while (i < count && guard++ < count * 30) {
      const x = (rand() * 2 - 1) * range;
      const z = (rand() * 2 - 1) * range;
      if (!place(x, z, o)) continue;
      o.updateMatrix();
      mesh.setMatrixAt(i++, o.matrix);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }

  // Saguaro: tronco + dos brazos
  const cactusGeo = merge([
    cyl(0.26, 0.3, 3.4, 6, PAL.cactus, 0, 1.7, 0),
    cyl(0.14, 0.14, 0.8, 5, PAL.cactus, 0.55, 1.6, 0),
    cyl(0.15, 0.16, 1.2, 5, PAL.cactus, 0.85, 2.2, 0),
    cyl(0.14, 0.15, 0.9, 5, PAL.cactus, -0.75, 2.5, 0),
    cyl(0.14, 0.14, 0.5, 5, PAL.cactus, -0.5, 2.05, 0),
  ]);
  scatter(cactusGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 70, 190, (x, z, obj) => {
    if (!free(x, z, 2)) return false;
    const s = 0.7 + rand() * 0.8;
    obj.position.set(x, 0, z);
    obj.rotation.set(0, rand() * Math.PI * 2, 0);
    obj.scale.set(s, s, s);
    if (walkable(x, z)) colliders.push({ type: 'circle', x, z, r: 0.45 * s });
    return true;
  });

  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  scatter(rockGeo, new THREE.MeshLambertMaterial({ color: PAL.rock, flatShading: true }), 90, 210, (x, z, obj) => {
    if (!free(x, z, 1)) return false;
    const s = 0.25 + rand() * rand() * 2.4;
    obj.position.set(x, s * 0.25, z);
    obj.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    obj.scale.set(s * (0.8 + rand() * 0.6), s * 0.7, s * (0.8 + rand() * 0.6));
    if (s > 0.7 && walkable(x, z)) colliders.push({ type: 'circle', x, z, r: s * 0.95 });
    return true;
  });

  // Matorrales secos
  scatter(rockGeo, new THREE.MeshLambertMaterial({ color: 0x8c8a4a, flatShading: true }), 110, 200, (x, z, obj) => {
    if (!free(x, z, 0.5)) return false;
    const s = 0.3 + rand() * 0.5;
    obj.position.set(x, s * 0.35, z);
    obj.rotation.set(0, rand() * 3, 0);
    obj.scale.set(s * 1.3, s * 0.7, s * 1.3);
    return true;
  });

  return { colliders };
}
