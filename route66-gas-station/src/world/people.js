// Personas low-poly con piernas y brazos articulados (caminan de verdad).
// Cuerpo y extremidades comparten materiales; solo la camisa tiene color propio.
import * as THREE from 'three';
import { box, merge, vertexMat } from './geo.js';

const SHIRTS = [0xc9584a, 0x2f9c95, 0xe2c27a, 0x6f8fb8, 0x8fa67a, 0xd3a15a, 0xe9e0cc, 0x9b5f4a];
const SKINS = [0xe0a878, 0xc68a5c, 0x9a6440, 0xf0c8a0];
const PANTS = [0x3d4a66, 0x4a3a2e, 0x2a2a33, 0x6b6f4a];
const HAIR = [0x3a2a22, 0x1e1a18, 0x8a5a2a, 0xb9b2a6];

// Geometrías por combinación de colores (piel, pantalón, pelo): se crean una vez
const cache = new Map();
function partsFor(skin, pants, hair) {
  const key = `${skin}|${pants}|${hair}`;
  if (cache.has(key)) return cache.get(key);
  const head = merge([
    box(0.26, 0.27, 0.25, skin, 0, 0.15, 0),
    box(0.28, 0.09, 0.28, hair, 0, 0.31, -0.01),
    box(0.28, 0.16, 0.06, hair, 0, 0.22, -0.13),
    box(0.1, 0.08, 0.1, skin, 0, -0.02, 0), // cuello
  ]);
  // Pierna: el origen está en la cadera, cuelga hacia abajo
  const leg = merge([box(0.17, 0.74, 0.2, pants, 0, -0.37, 0), box(0.18, 0.08, 0.28, 0x2a2220, 0, -0.76, 0.04)]);
  // Brazo: el origen está en el hombro
  const arm = merge([box(0.12, 0.5, 0.14, skin, 0, -0.27, 0), box(0.135, 0.17, 0.155, 0xe9e2d0, 0, -0.06, 0)]); // manga corta clara
  const g = { head, leg, arm };
  cache.set(key, g);
  return g;
}
const torsoGeo = merge([box(0.46, 0.62, 0.28, 0xffffff, 0, 0, 0), box(0.44, 0.1, 0.27, 0xe9e2d0, 0, -0.33, 0)]);

// Una persona. shirt: color de camisa (si no, al azar)
export function buildPerson(shirt, rand = Math.random) {
  const pick = (arr) => arr[(rand() * arr.length) | 0];
  const g = partsFor(pick(SKINS), pick(PANTS), pick(HAIR));
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt ?? pick(SHIRTS), flatShading: true });
  const root = new THREE.Group();
  const body = new THREE.Group(); // sube y baja al caminar
  root.add(body);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 1.11;
  const head = new THREE.Mesh(g.head, vertexMat);
  head.position.y = 1.44;
  const legL = new THREE.Mesh(g.leg, vertexMat), legR = new THREE.Mesh(g.leg, vertexMat);
  legL.position.set(-0.11, 0.8, 0); legR.position.set(0.11, 0.8, 0);
  const armL = new THREE.Mesh(g.arm, vertexMat), armR = new THREE.Mesh(g.arm, vertexMat);
  armL.position.set(-0.3, 1.38, 0); armR.position.set(0.3, 1.38, 0);
  body.add(torso, head, legL, legR, armL, armR);

  return {
    root,
    shirtMat,
    // walkT: tiempo de caminata (null = quieto). reach: brazo derecho extendido (trabajando)
    // sit: sentado en un banco · bend: agachado (recogiendo algo)
    pose(walkT, reach = 0, sit = false, bend = 0) {
      body.rotation.x = 0;
      if (walkT === null) {
        legL.rotation.x = legR.rotation.x = sit ? -1.25 : 0;
        armL.rotation.x = sit ? -0.6 : 0;
        armR.rotation.x = sit ? -0.9 : -reach * 1.2;
        body.position.y = 0;
        if (bend) { body.rotation.x = bend * 0.7; body.position.y = -bend * 0.15; armR.rotation.x = -bend * 1.3; armL.rotation.x = -bend * 1.1; }
        head.rotation.y = 0;
        return;
      }
      const sw = Math.sin(walkT * 7.5);
      legL.rotation.x = sw * 0.55; legR.rotation.x = -sw * 0.55;
      armL.rotation.x = -sw * 0.45; armR.rotation.x = sw * 0.45 - reach;
      body.position.y = Math.abs(Math.cos(walkT * 7.5)) * 0.045;
    },
  };
}

// Grupo de personas reutilizables (clientes que entran a la tienda)
export function createPeople(scene, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const p = buildPerson();
    p.root.visible = false;
    scene.add(p.root);
    list.push(p);
  }
  return {
    show(i, on) {
      const p = list[i];
      if (on && !p.root.visible) {
        p.shirtMat.color.set(SHIRTS[(Math.random() * SHIRTS.length) | 0]);
      }
      p.root.visible = on;
    },
    place(i, x, z, yaw, walking, sit = false) {
      const p = list[i];
      p.root.position.set(x, sit ? 0.02 : 0.08, z);
      p.root.rotation.y = yaw;
      p.pose(walking, 0, sit);
    },
  };
}
