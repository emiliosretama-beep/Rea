// Jugador en primera persona: movimiento con suavizado, colisiones y cámara.
import { CFG } from '../config.js';

export function createPlayer(camera, colliders) {
  const p = {
    x: 6, z: -21.5,
    yaw: 2.45, pitch: -0.04, // mirando hacia la bomba y la carretera
    vx: 0, vz: 0,
    bob: 0,
  };
  const lookDelta = { x: 0, y: 0 };
  const R = CFG.radius;

  function collide() {
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) {
        if (c.type === 'box') {
          const nx = Math.max(c.minX, Math.min(p.x, c.maxX));
          const nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
          let dx = p.x - nx, dz = p.z - nz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= R * R) continue;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            p.x = nx + (dx / d) * R; p.z = nz + (dz / d) * R;
          } else {
            // Centro dentro de la caja: salir por la cara más cercana
            const l = p.x - c.minX, r = c.maxX - p.x, n = p.z - c.minZ, f = c.maxZ - p.z;
            const m = Math.min(l, r, n, f);
            if (m === l) p.x = c.minX - R; else if (m === r) p.x = c.maxX + R;
            else if (m === n) p.z = c.minZ - R; else p.z = c.maxZ + R;
          }
        } else {
          const dx = p.x - c.x, dz = p.z - c.z;
          const min = R + c.r;
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2) || 0.0001;
          p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min;
        }
      }
    }
    const b = CFG.bounds;
    p.x = Math.max(b.minX, Math.min(b.maxX, p.x));
    p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
  }

  function applyCamera() {
    const speed = Math.hypot(p.vx, p.vz);
    const bobY = Math.sin(p.bob) * 0.035 * Math.min(1, speed / CFG.walkSpeed);
    camera.position.set(p.x, CFG.eyeHeight + bobY, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }

  return Object.assign(p, {
    update(dt, input) {
      input.consumeLook(lookDelta);
      p.yaw -= lookDelta.x;
      p.pitch = Math.max(-1.25, Math.min(1.25, p.pitch - lookDelta.y));

      // Velocidad deseada en el plano, relativa a hacia dónde miro
      const max = input.joystick ? CFG.touchMaxSpeed : (input.run ? CFG.runSpeed : CFG.walkSpeed);
      const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
      const tx = (-sin * input.moveY + cos * input.moveX) * max;
      const tz = (-cos * input.moveY - sin * input.moveX) * max;

      // Suavizado independiente de los FPS
      const k = 1 - Math.exp(-14 * dt);
      p.vx += (tx - p.vx) * k;
      p.vz += (tz - p.vz) * k;

      const ox = p.x, oz = p.z;
      p.x += p.vx * dt; p.z += p.vz * dt;
      collide();
      // Si una pared frenó el paso, que la velocidad lo refleje (sin "patinar")
      if (dt > 0) { p.vx = (p.x - ox) / dt; p.vz = (p.z - oz) / dt; }

      p.bob += Math.hypot(p.x - ox, p.z - oz) * 3.4;
      applyCamera();
    },
    applyCamera,
  });
}
