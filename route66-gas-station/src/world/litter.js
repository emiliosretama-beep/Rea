// Basura en el patio: recogerla sube la reputación. Una malla instanciada.
import * as THREE from 'three';
import { BAL } from '../config.js';
import { t } from '../core/i18n.js';

// Lugares posibles (lejos de la bomba, la caja y el carril de los autos)
const SPOTS = [
  [-9, -19], [-15, -24], [-6, -24.5], [8, -22], [14, -20], [17, -25], [-19, -16], [10, -25.5],
  [-3, -21], [20, -17], [-12, -17.5], [2, -24], [-20, -23], [15, -16.5],
];

export function createLitter(scene, state) {
  const geo = new THREE.BoxGeometry(0.5, 0.14, 0.36);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xf3ecd8 }), SPOTS.length);
  scene.add(mesh);
  const o = new THREE.Object3D();
  const active = SPOTS.map(() => false);
  let count = 0;
  let timer = BAL.litterEvery;

  function set(i, on) {
    active[i] = on;
    o.position.set(SPOTS[i][0], on ? 0.13 : -5, SPOTS[i][1]);
    o.rotation.set(0.25, i * 1.7, 0.12);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    count += on ? 1 : -1;
  }
  function spawn() {
    const free = [];
    for (let i = 0; i < SPOTS.length; i++) if (!active[i]) free.push(i);
    if (free.length) set(free[(Math.random() * free.length) | 0], true);
  }
  for (let i = 0; i < SPOTS.length; i++) { active[i] = true; set(i, false); }
  count = 0;
  for (let i = 0; i < BAL.litterStart; i++) spawn();

  return {
    update(dt) {
      timer -= dt;
      if (timer <= 0) { timer = BAL.litterEvery; if (count < BAL.litterMax) spawn(); }
    },
    interactables() {
      return SPOTS.map(([x, z], i) => ({
        id: 'litter', x, y: 0.1, z,
        label: () => (active[i] ? t('promptLitter') : null),
        use: () => {
          if (!active[i]) return;
          set(i, false);
          state.addRep(BAL.repLitter);
          state.emit('litter');
        },
      }));
    },
  };
}
