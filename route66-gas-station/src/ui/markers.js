// Marcadores flotantes sobre cada auto que espera: qué necesita y cuánta paciencia le queda.
import * as THREE from 'three';

const ICONS = {
  fuel: '<path d="M12 3.500c3 3.800 5 6.400 5 9.200a5 5 0 0 1-10 0c0-2.800 2-5.400 5-9.200z"/>',
  pay: '<path d="M14.800 9.200c-.5-.9-1.500-1.400-2.800-1.400-1.700 0-2.900.9-2.900 2.200 0 3 5.900 1.300 5.900 4.200 0 1.300-1.300 2.100-3 2.100-1.400 0-2.500-.6-3-1.600M12 6v12"/>',
  wash: '<path d="M5 15c1.200-1.300 2.300-1.300 3.500 0s2.300 1.300 3.500 0 2.300-1.300 3.500 0 2.300 1.300 3.500 0M5 19c1.200-1.300 2.300-1.300 3.500 0s2.300 1.300 3.500 0 2.300-1.300 3.500 0 2.300 1.300 3.500 0M8 5v4M12 4v6M16 5v4"/>',
  garage: '<path d="M15.500 5.500a4 4 0 0 0-5.200 5.200L4.500 16.500a1.800 1.800 0 0 0 2.500 2.500l5.800-5.800a4 4 0 0 0 5.200-5.200l-2.500 2.500-2.200-.6-.600-2.200z"/>',
};

export function createMarkers(camera) {
  const root = document.getElementById('markers');
  const v = new THREE.Vector3();
  const pool = [];
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"></svg><i><b></b></i>';
    root.append(el);
    pool.push({ el, svg: el.firstChild, bar: el.querySelector('b'), icon: '', on: false, level: '' });
  }

  return {
    // list: [{ x, y, z, icon, p }] en coordenadas del mundo (p = paciencia de 0 a 1)
    update(list) {
      const w = window.innerWidth, h = window.innerHeight;
      for (let i = 0; i < pool.length; i++) {
        const mk = pool[i];
        const it = list[i];
        let show = !!it;
        if (show) {
          v.set(it.x, it.y, it.z).project(camera);
          show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.2;
        }
        if (show !== mk.on) { mk.on = show; mk.el.classList.toggle('on', show); }
        if (!show) continue;
        mk.el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px, 0)`;
        if (it.icon !== mk.icon) { mk.icon = it.icon; mk.svg.innerHTML = ICONS[it.icon]; mk.el.dataset.kind = it.icon; }
        const p = Math.max(0, it.p);
        mk.bar.style.transform = `scaleX(${p.toFixed(2)})`;
        const level = p > 0.5 ? '' : p > 0.25 ? 'warn' : 'bad';
        if (level !== mk.level) { mk.level = level; mk.bar.className = level; }
      }
    },
    hide() { for (const mk of pool) if (mk.on) { mk.on = false; mk.el.classList.remove('on'); } },
  };
}
