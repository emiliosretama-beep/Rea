// Plantas rodadoras: de vez en cuando cruzan rodando junto a la carretera, empujadas por el viento.
import * as THREE from 'three';
import { merge, tint, rng } from './geo.js';

function weedGeometry(seed) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < 34; i++) {
    const g = new THREE.BoxGeometry(0.035, 0.035, 0.5 + r() * 0.5);
    g.rotateX(r() * Math.PI); g.rotateY(r() * Math.PI); g.rotateZ(r() * Math.PI);
    g.translate((r() - 0.5) * 0.5, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5);
    parts.push(tint(g, r() > 0.5 ? 0x9a7a4a : 0x7a5e38));
  }
  return merge(parts);
}

export function createTumbleweeds(scene) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const weeds = [0, 1].map((i) => {
    const mesh = new THREE.Mesh(weedGeometry(31 + i), mat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, timer: 4 + i * 11, x: 0, z: 0, vx: 0, phase: 0, size: 1 };
  });

  return {
    update(dt) {
      for (const w of weeds) {
        if (!w.mesh.visible) {
          w.timer -= dt;
          if (w.timer > 0) continue;
          // Aparece lejos al oeste, del otro lado de la carretera, y rueda hacia el este
          w.x = -140 - Math.random() * 40;
          w.z = 6 + Math.random() * 18;
          w.vx = 4 + Math.random() * 3;
          w.size = 0.8 + Math.random() * 0.6;
          w.mesh.scale.setScalar(w.size);
          w.mesh.visible = true;
        }
        w.phase += dt;
        w.x += w.vx * dt * (0.8 + Math.sin(w.phase * 0.7) * 0.3); // ráfagas
        const hop = Math.abs(Math.sin(w.phase * 3.1)) * 0.5 * w.size;
        w.mesh.position.set(w.x, 0.45 * w.size + hop, w.z + Math.sin(w.phase * 0.4) * 1.5);
        w.mesh.rotation.z -= (w.vx * dt) / (0.5 * w.size);
        w.mesh.rotation.x += dt * 0.6;
        if (w.x > 160) { w.mesh.visible = false; w.timer = 18 + Math.random() * 25; }
      }
    },
  };
}
