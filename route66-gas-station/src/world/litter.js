// Basura en el patio: recogerla sube la reputación. Una malla instanciada.
import * as THREE from 'three';
import { BAL } from '../config.js';
import { t } from '../core/i18n.js';
import { cyl, merge, tint, vertexMat } from './geo.js';

// Lugares posibles (lejos de la bomba, la caja y el carril de los autos)
const SPOTS = [
  [-4, -19.4], [-11, -25.2], [-6, -24.8], [3, -23.8], [16, -24.6], [17, -26], [-14, -31], [10, -25.5],
  [-2, -24.6], [33, -16], [-12, -33.5], [2, -25.2], [-30, -22.5], [18.5, -28], [-34, -24], [32, -24],
  [-2, -39.3], [16, -34.6], [-17, -21.4], [33, -20],
];

export function createLitter(scene, state) {
  // Tres tipos de basura que se reconocen: papel arrugado, lata de refresco tirada y vaso con popote.
  // Una malla instanciada por tipo; cada lugar usa siempre el mismo tipo (i % 3).
  const paper = new THREE.IcosahedronGeometry(0.21, 0);
  { const pos = paper.attributes.position; // arrugarlo un poco
    for (let k = 0; k < pos.count; k++) { const f = 0.75 + ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.45; pos.setXYZ(k, pos.getX(k) * f, pos.getY(k) * f * 0.8, pos.getZ(k) * f); } }
  const can = new THREE.CylinderGeometry(0.08, 0.08, 0.26, 10);
  const canTop = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 10); canTop.translate(0, 0.13, 0);
  const canBand = new THREE.CylinderGeometry(0.082, 0.082, 0.08, 10);
  const canGeo = merge([tint(can, 0xc7352b), tint(canTop, 0xc9c7c2), tint(canBand, 0xf1ead6)]);
  canGeo.rotateZ(Math.PI / 2); canGeo.translate(0, 0.08, 0); // acostada
  const cup = new THREE.CylinderGeometry(0.1, 0.07, 0.24, 10);
  const lidG = new THREE.CylinderGeometry(0.105, 0.105, 0.03, 10); lidG.translate(0, 0.13, 0);
  const straw = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5); straw.translate(0.03, 0.22, 0);
  const cupGeo = merge([tint(cup, 0xf3ecd8), tint(lidG, 0xd8d2c4), tint(straw, 0xc7352b), cyl(0.1, 0.1, 0.05, 10, 0xc7352b, 0, 0.02, 0)]);
  cupGeo.rotateZ(Math.PI / 2); cupGeo.translate(0, 0.1, 0);
  const paperGeo = tint(paper, 0xffffff); paperGeo.translate(0, 0.14, 0);
  const meshes = [paperGeo, canGeo, cupGeo].map((g) => {
    const m = new THREE.InstancedMesh(g, vertexMat, SPOTS.length);
    m.castShadow = false;
    m.frustumCulled = false; // las instancias se mueven fuera de la caja original
    scene.add(m);
    return m;
  });
  // Al inicio todas las instancias escondidas (las que no son de su tipo se quedan así siempre)
  { const z = new THREE.Matrix4().makeTranslation(0, -5, 0);
    for (const m of meshes) for (let i = 0; i < SPOTS.length; i++) m.setMatrixAt(i, z); }
  const o = new THREE.Object3D();
  const active = SPOTS.map(() => false);
  let count = 0;
  let timer = BAL.litterEvery;

  const popping = []; // { i, t }
  function set(i, on, t = 0) {
    if (t === 0) active[i] = on;
    const up = t > 0 ? Math.sin(t * Math.PI / 0.35) * 0.45 : 0;
    o.position.set(SPOTS[i][0], on || t > 0 ? 0.03 + up : -5, SPOTS[i][1]);
    o.rotation.set(t * 8, i * 1.7 + t * 6, 0);
    o.scale.setScalar(t > 0 ? Math.max(0.01, 1.2 - t / 0.3) : 1.2); // un poco más grande para que se vea de lejos
    o.updateMatrix();
    const mesh = meshes[i % 3];
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

  function pick(i) {
    if (!active[i] || popping.some((p) => p.i === i)) return false;
    popping.push({ i, t: 0.001 });
    active[i] = false; // el conteo baja cuando termina de desaparecer
    state.litterPicked++;
    state.addRep(BAL.repLitter);
    state.emit('litter');
    return true;
  }

  return {
    get count() { return count; },
    // Guardado: qué lugares tienen basura
    activeList: () => active.map((on, i) => (on ? i : -1)).filter((i) => i >= 0),
    restore(list) {
      for (let i = 0; i < SPOTS.length; i++) if (active[i]) set(i, false);
      for (const i of list) if (i >= 0 && i < SPOTS.length && !active[i]) set(i, true);
    },
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
    // Basura que hay ahora: [{ i, x, z }] (la usa el conserje)
    activeSpots() {
      const out = [];
      for (let i = 0; i < SPOTS.length; i++) if (active[i]) out.push({ i, x: SPOTS[i][0], z: SPOTS[i][1] });
      return out;
    },
    isActive: (i) => active[i],
    pick,
    interactables() {
      return SPOTS.map(([x, z], i) => ({
        id: 'litter', x, y: 0.1, z,
        label: () => (active[i] ? t('promptLitter') : null),
        use: () => pick(i),
      }));
    },
  };
}
