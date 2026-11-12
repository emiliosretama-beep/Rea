// Lo que el jugador tiene en la mano (primera persona): pistola de gasolina, llave o esponja.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge } from '../world/geo.js';

export function createViewModel(scene, camera) {
  scene.add(camera); // para que lo que cuelga de la cámara se dibuje
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const SKIN = 0xe0a878, SLEEVE = PAL.teal;
  const hand = [box(0.1, 0.09, 0.16, SKIN, 0, -0.02, 0.04), box(0.13, 0.12, 0.28, SLEEVE, 0.02, -0.04, 0.24)];

  const spout = cyl(0.016, 0.02, 0.22, 6, PAL.chrome, 0, 0.04, -0.2);
  spout.rotateX(Math.PI / 2 - 0.25);
  const nozzle = merge([
    ...hand.map((g) => g.clone()),
    box(0.06, 0.12, 0.1, PAL.dark, 0, 0.0, -0.02), // mango
    box(0.07, 0.06, 0.2, PAL.red, 0, 0.06, -0.07), // cuerpo
    spout,
    cyl(0.025, 0.025, 0.5, 6, 0x1e1b22, 0, -0.18, 0.1), // manguera
  ]);
  const wrench = merge([
    ...hand.map((g) => g.clone()),
    box(0.04, 0.03, 0.34, PAL.chrome, 0, 0.02, -0.18),
    box(0.1, 0.03, 0.06, PAL.chrome, 0, 0.02, -0.36),
  ]);
  const sponge = merge([
    ...hand.map((g) => g.clone()),
    box(0.16, 0.08, 0.12, 0xe8b23a, 0, 0.05, -0.06),
  ]);
  hand.forEach((g) => g.dispose());
  const tools = { fuel: nozzle, garage: wrench, wash: sponge };

  const holder = new THREE.Mesh(nozzle, mat);
  holder.position.set(0.2, -0.24, -0.55);
  holder.visible = false;
  holder.renderOrder = 10;
  camera.add(holder);
  let kind = null;
  let t = 0;
  let shown = 0; // 0 a 1: animación de sacar/guardar

  return {
    hide() { shown = 0; holder.visible = false; kind = null; },
    // which: 'fuel' | 'garage' | 'wash' | null · working: está usando la herramienta
    update(dt, which, working) {
      if (which && which !== kind) { kind = which; holder.geometry = tools[which]; }
      shown += ((which ? 1 : 0) - shown) * (1 - Math.exp(-12 * dt));
      holder.visible = shown > 0.02;
      if (!holder.visible) { kind = null; return; }
      t += dt;
      const shake = working ? (kind === 'fuel' ? 0.004 : 0.025) : 0;
      holder.position.set(
        0.2 + Math.sin(t * 31) * shake,
        -0.24 - (1 - shown) * 0.35 + Math.sin(t * 2) * 0.006 + (working && kind !== 'fuel' ? Math.sin(t * 9) * 0.03 : 0),
        -0.55,
      );
      holder.rotation.set(working && kind === 'fuel' ? 0.12 : 0, -0.2, working && kind === 'wash' ? Math.sin(t * 9) * 0.3 : 0);
    },
  };
}
