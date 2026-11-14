// Fuegos artificiales para la celebración final: estallidos de partículas que caen con gravedad.
import * as THREE from 'three';

const BURSTS = 6, PER = 70;
const COLORS = [0xffcf4a, 0xff5fa8, 0x4fe0d2, 0xff6a3a, 0xf6e7c8, 0x9fd0ff];

export function createFireworks(scene, onBoom) {
  const N = BURSTS * PER;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  const life = new Float32Array(BURSTS);
  let next = 0, timer = 0, active = false;
  const c = new THREE.Color();

  function burst(b) {
    const cx = (Math.random() - 0.5) * 50, cy = 18 + Math.random() * 12, cz = -22 + (Math.random() - 0.5) * 24;
    c.set(COLORS[(Math.random() * COLORS.length) | 0]);
    for (let i = 0; i < PER; i++) {
      const k = (b * PER + i) * 3;
      pos[k] = cx; pos[k + 1] = cy; pos[k + 2] = cz;
      // Dirección al azar sobre una esfera
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 7 + Math.random() * 4;
      vel[k] = r * Math.cos(a) * sp; vel[k + 1] = u * sp; vel[k + 2] = r * Math.sin(a) * sp;
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
    life[b] = 1;
    if (onBoom) onBoom();
  }

  return {
    start() { active = true; points.visible = true; timer = 0; },
    stop() { active = false; points.visible = false; },
    update(dt) {
      if (!active) return;
      timer -= dt;
      if (timer <= 0) { burst(next); next = (next + 1) % BURSTS; timer = 0.55 + Math.random() * 0.6; }
      for (let b = 0; b < BURSTS; b++) {
        if (life[b] <= 0) continue;
        life[b] -= dt * 0.55;
        const fade = Math.max(0, life[b]);
        for (let i = 0; i < PER; i++) {
          const k = (b * PER + i) * 3;
          vel[k + 1] -= 6 * dt; // gravedad
          vel[k] *= 0.985; vel[k + 1] *= 0.985; vel[k + 2] *= 0.985;
          pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
          if (fade <= 0) pos[k + 1] = -100;
        }
        // Se apaga poco a poco
        for (let i = 0; i < PER; i++) { const k = (b * PER + i) * 3; col[k] *= 0.992; col[k + 1] *= 0.992; col[k + 2] *= 0.992; }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
