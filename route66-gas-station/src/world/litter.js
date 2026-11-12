// Basura en el patio: recogerla sube la reputación. Una malla instanciada.
import * as THREE from 'three';
import { BAL } from '../config.js';
import { t } from '../core/i18n.js';

// Lugares posibles (lejos de la bomba, la caja y el carril de los autos)
const SPOTS = [
  [-4, -19.4], [-11, -25.2], [-6, -24.8], [3, -23.8], [16, -24.6], [17, -26], [-14, -31], [10, -25.5],
  [-2, -24.6], [27, -16], [-12, -36.5], [2, -25.2], [-31, -17], [19, -27.5], [-10, -32.5], [26, -31],
  [5, -37], [20, -34], [-32, -22], [31, -22],
];

export function createLitter(scene, state) {
  const geo = new THREE.BoxGeometry(0.5, 0.14, 0.36);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xf3ecd8 }), SPOTS.length);
  scene.add(mesh);
  const o = new THREE.Object3D();
  const active = SPOTS.map(() => false);
  let count = 0;
  let timer = BAL.litterEvery;

  const popping = []; // { i, t }
  function set(i, on, t = 0) {
    if (t === 0) active[i] = on;
    const up = t > 0 ? Math.sin(t * Math.PI / 0.35) * 0.45 : 0;
    o.position.set(SPOTS[i][0], on || t > 0 ? 0.13 + up : -5, SPOTS[i][1]);
    o.rotation.set(0.25 + t * 8, i * 1.7 + t * 6, 0.12);
    o.scale.setScalar(t > 0 ? Math.max(0.01, 1 - t / 0.35) : 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    if (t === 0) count += on ? 1 : -1;
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
    get count() { return count; },
    update(dt) {
      for (let k = popping.length - 1; k >= 0; k--) {
        const p = popping[k];
        p.t += dt;
        if (p.t >= 0.35) { popping.splice(k, 1); o.scale.setScalar(1); active[p.i] = true; set(p.i, false); } else set(p.i, false, p.t);
      }
      timer -= dt;
      // La basura nueva solo aparece con la gasolinera abierta (la tiran los clientes)
      if (!state.open) return;
      if (timer <= 0) { timer = BAL.litterEvery; if (count < BAL.litterMax) spawn(); }
    },
    interactables() {
      return SPOTS.map(([x, z], i) => ({
        id: 'litter', x, y: 0.1, z,
        label: () => (active[i] ? t('promptLitter') : null),
        use: () => {
          if (!active[i] || popping.some((p) => p.i === i)) return;
          popping.push({ i, t: 0.001 });
          active[i] = false; // el conteo baja cuando termina de desaparecer
          state.litterPicked++;
          state.addRep(BAL.repLitter);
          state.emit('litter');
        },
      }));
    },
  };
}
