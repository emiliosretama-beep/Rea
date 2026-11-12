// Personas sencillas (clientes que entran a la tienda). Cada una: cuerpo compartido + camisa de color propio.
import * as THREE from 'three';
import { box, merge, vertexMat } from './geo.js';

const SHIRTS = [0xc9584a, 0x2f9c95, 0xe2c27a, 0x6f8fb8, 0x8fa67a, 0xd3a15a, 0xe9e0cc, 0x9b5f4a];
const JEANS = 0x3d4a66, SKIN = 0xe0a878, HAIR = 0x3a2a22;

const baseGeo = merge([
  box(0.17, 0.8, 0.2, JEANS, -0.11, 0.4, 0),
  box(0.17, 0.8, 0.2, JEANS, 0.11, 0.4, 0),
  box(0.26, 0.26, 0.26, SKIN, 0, 1.56, 0),
  box(0.28, 0.09, 0.28, HAIR, 0, 1.72, -0.01),
  box(0.1, 0.1, 0.1, SKIN, -0.3, 0.76, 0),
  box(0.1, 0.1, 0.1, SKIN, 0.3, 0.76, 0),
]);
const shirtGeo = merge([
  box(0.46, 0.62, 0.28, 0xffffff, 0, 1.11, 0),
  box(0.12, 0.56, 0.15, 0xffffff, -0.3, 1.08, 0),
  box(0.12, 0.56, 0.15, 0xffffff, 0.3, 1.08, 0),
]);

export function createPeople(scene, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const shirt = new THREE.Mesh(shirtGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    group.add(new THREE.Mesh(baseGeo, vertexMat), shirt);
    group.visible = false;
    scene.add(group);
    list.push({ group, shirt });
  }
  return {
    show(i, on) {
      const p = list[i];
      if (on && !p.group.visible) p.shirt.material.color.set(SHIRTS[(Math.random() * SHIRTS.length) | 0]);
      p.group.visible = on;
    },
    // walking: tiempo de caminata (para el balanceo); null si está quieto
    place(i, x, z, yaw, walking) {
      const g = list[i].group;
      g.position.set(x, walking === null ? 0.08 : 0.08 + Math.abs(Math.sin(walking * 9)) * 0.05, z);
      g.rotation.set(0, yaw, walking === null ? 0 : Math.sin(walking * 9) * 0.05);
    },
  };
}
