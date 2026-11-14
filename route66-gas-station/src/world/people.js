// Personas low-poly con piernas y brazos articulados (caminan de verdad).
// Cuerpo y extremidades comparten materiales; solo la camisa tiene color propio.
import * as THREE from 'three';
import { box, cyl, merge, tint, rbox, capsule, vertexMat } from './geo.js';

const SHIRTS = [0xc9584a, 0x2f9c95, 0xe2c27a, 0x6f8fb8, 0x8fa67a, 0xd3a15a, 0xe9e0cc, 0x9b5f4a];
const SKINS = [0xe0a878, 0xc68a5c, 0x9a6440, 0xf0c8a0];
const PANTS = [0x3d4a66, 0x4a3a2e, 0x2a2a33, 0x6b6f4a];
const HAIR = [0x3a2a22, 0x1e1a18, 0x8a5a2a, 0xb9b2a6];

// Geometrías por combinación de colores (piel, pantalón, pelo): se crean una vez
const cache = new Map();
function partsFor(skin, pants, hair) {
  const key = `${skin}|${pants}|${hair}`;
  if (cache.has(key)) return cache.get(key);
  // Cabeza redonda con pelo, ojos, nariz y orejas (el frente de la persona es +z)
  const skull = new THREE.SphereGeometry(0.15, 9, 7); skull.scale(1, 1.08, 1); skull.translate(0, 0.16, 0);
  const hairCap = new THREE.SphereGeometry(0.158, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.52);
  hairCap.rotateX(-0.35); hairCap.translate(0, 0.19, -0.01);
  const parts = [tint(skull, skin), tint(hairCap, hair), cyl(0.06, 0.07, 0.1, 8, skin, 0, -0.01, 0)];
  for (const sx of [-1, 1]) {
    parts.push(box(0.035, 0.04, 0.02, 0x1e1a18, sx * 0.055, 0.17, 0.142)); // ojo
    parts.push(box(0.04, 0.07, 0.04, skin, sx * 0.152, 0.15, 0)); // oreja
  }
  parts.push(box(0.04, 0.06, 0.05, skin, 0, 0.12, 0.155)); // nariz
  const head = merge(parts);
  // Pierna: el origen está en la cadera, cuelga hacia abajo. Pantalón redondo y zapato con punta
  const leg = merge([
    capsule(0.09, 0.56, pants, 0, -0.36, 0, 6),
    rbox(0.17, 0.09, 0.28, 0.04, 0x2a2220, 0, -0.76, 0.045, 1),
  ]);
  // Brazo: el origen está en el hombro. Manga corta clara, brazo y mano
  const arm = merge([
    cyl(0.085, 0.075, 0.19, 8, 0xe9e2d0, 0, -0.07, 0),
    capsule(0.055, 0.34, skin, 0, -0.3, 0, 6),
    new THREE.SphereGeometry(0.065, 6, 5).translate(0, -0.53, 0.01),
  ].map((g, k) => (k === 2 ? tint(g, skin) : g)));
  const g = { head, leg, arm };
  cache.set(key, g);
  return g;
}
const torsoGeo = (() => {
  const t = new THREE.CylinderGeometry(0.24, 0.19, 0.62, 10); t.scale(1, 1, 0.62);
  const sh = new THREE.SphereGeometry(0.24, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2); sh.scale(1, 0.4, 0.62); sh.translate(0, 0.31, 0);
  const belt = new THREE.CylinderGeometry(0.195, 0.195, 0.08, 10); belt.scale(1, 1, 0.64); belt.translate(0, -0.3, 0);
  return merge([tint(t, 0xffffff), tint(sh, 0xffffff), tint(belt, 0x6b6159)]);
})();

// Una persona. shirt: color de camisa (si no, al azar)
export function buildPerson(shirt, rand = Math.random) {
  const pick = (arr) => arr[(rand() * arr.length) | 0];
  const g = partsFor(pick(SKINS), pick(PANTS), pick(HAIR));
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt ?? pick(SHIRTS), vertexColors: true, flatShading: true }); // el cinturón oscuro va en los colores de vértice
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
