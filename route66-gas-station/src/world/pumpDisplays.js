// Contadores de las bombas: galones y precio que suben mientras cargas (textura de canvas).
import * as THREE from 'three';
import { BAL } from '../config.js';
import { LAYOUT } from './station.js';

export function createPumpDisplays(scene) {
  const displays = LAYOUT.pumps.map((p) => {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 96;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const geo = new THREE.PlaneGeometry(0.4, 0.3);
    const meshes = [1, -1].map((side) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(p.x, 1.36, p.z + side * 0.267);
      m.rotation.y = side > 0 ? 0 : Math.PI;
      scene.add(m);
      return m;
    });
    return { cv, ctx: cv.getContext('2d'), tex, meshes, last: '' };
  });

  function draw(d, gal, active) {
    const c = d.ctx;
    c.fillStyle = '#efe4c6'; c.fillRect(0, 0, 128, 96);
    c.fillStyle = '#23202a'; c.fillRect(8, 8, 112, 36); c.fillRect(8, 52, 112, 36);
    c.font = 'bold 26px ui-monospace, Menlo, monospace';
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillStyle = active ? '#ffb347' : '#8a6a4a';
    c.fillText(gal.toFixed(1).padStart(4, '0'), 114, 27);
    c.fillText((gal * BAL.pricePerGal).toFixed(2), 114, 71);
    c.font = 'bold 12px ui-rounded, system-ui, sans-serif';
    c.textAlign = 'left'; c.fillStyle = '#8a6a4a';
    c.fillText('GAL', 12, 27); c.fillText('$', 12, 71);
    d.tex.needsUpdate = true;
  }

  return {
    // bays: bahías de gasolina (en el mismo orden que las bombas)
    update(bays, pump2Built) {
      displays.forEach((d, i) => {
        const visible = i === 0 || pump2Built;
        d.meshes.forEach((m) => { m.visible = visible; });
        if (!visible) return;
        const bay = bays[i];
        const gal = bay && bay.c && bay.c.kind === 'fuel' ? bay.c.got : 0;
        const active = !!bay && bay.phase === 'fueling';
        const key = `${gal.toFixed(1)}|${active}`;
        if (key === d.last) return;
        d.last = key;
        draw(d, gal, active);
      });
    },
  };
}
