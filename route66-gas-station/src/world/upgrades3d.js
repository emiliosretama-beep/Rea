// Lo que cada mejora construye en el mundo. Cada mejora es una o dos mallas fusionadas.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge, tint, vertexMat } from './geo.js';
import { LAYOUT, pumpParts, stallLines } from './station.js';
import { buildPerson } from './people.js';

// Material sin sombreado para lo que "brilla" (neón, lámparas)
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
const PINK = 0xff5fa8, AQUA = 0x4fe0d2, WARM = 0xfff2c4;

export function createUpgradeVisuals(scene, { colliders, station }) {
  const L = LAYOUT;
  const built = new Set();
  const aabb = (x, z, w, d) => colliders.push({ type: 'box', off: false, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const circle = (x, z, r) => colliders.push({ type: 'circle', x, z, r });
  const add = (parts, mat = vertexMat) => { const m = new THREE.Mesh(merge(parts), mat); scene.add(m); return m; };
  let helper = null;

  // Cobertizo por donde pasa el auto (autolavado y taller): dos muros y techo sobre el carril de servicios
  function shed(parts, cx, wallHex, roofHex, h) {
    const z = L.lanes.service;
    for (const s of [-1, 1]) {
      parts.push(box(7, h, 0.22, wallHex, cx, h / 2, z + s * 1.95));
      aabb(cx, z + s * 1.95, 7, 0.22);
    }
    parts.push(box(7.5, 0.22, 4.6, roofHex, cx, h + 0.11, z));
  }

  const builders = {
    // Almacén: tanque grande y cajas en la franja este del terreno
    storage() {
      const p = [];
      const tank = new THREE.CylinderGeometry(1.25, 1.25, 5.2, 12);
      tank.rotateX(Math.PI / 2);
      tank.translate(34.5, 1.95, -30);
      p.push(tint(tank, 0xcfc8b8));
      for (const dz of [-1.9, 1.9]) {
        const ring = new THREE.CylinderGeometry(1.28, 1.28, 0.28, 12);
        ring.rotateX(Math.PI / 2);
        ring.translate(34.5, 1.95, -30 + dz);
        p.push(tint(ring, PAL.red));
        p.push(box(2.3, 0.8, 0.5, 0x7d7a74, 34.5, 0.4, -30 + dz * 0.8));
      }
      p.push(box(0.12, 1.5, 0.12, PAL.dark, 33.1, 0.75, -27.9));
      p.push(box(0.5, 0.12, 0.12, PAL.red, 33.1, 1.5, -27.9));
      p.push(box(1.0, 1.0, 1.0, PAL.wood, 31.6, 0.5, -33.6));
      p.push(box(0.9, 0.9, 0.9, 0x80583c, 32.7, 0.45, -34.2));
      p.push(box(0.8, 0.8, 0.8, PAL.wood, 32.0, 1.4, -33.9));
      p.push(cyl(0.3, 0.3, 0.9, 8, PAL.teal, 31.2, 0.45, -31.8));
      p.push(cyl(0.3, 0.3, 0.9, 8, PAL.red, 30.6, 0.45, -32.3));
      add(p);
      aabb(34.5, -30, 2.7, 5.4);
      circle(32.1, -33.9, 1.1);
      circle(30.9, -32.05, 0.6);
    },

    // Segunda bomba, sobre la base vacía de la isla
    pump2() {
      const p = [];
      pumpParts(p, L.pumps[1].x, L.pumps[1].z, PAL.teal);
      add(p);
      aabb(L.pumps[1].x, L.pumps[1].z, 0.72, 0.5);
    },

    // Neón: letreros encendidos y tubos en la marquesina
    neon() {
      station.setNeon(true);
      const p = [];
      const ix = L.island.x, iz = L.island.z;
      for (const s of [-1, 1]) {
        p.push(box(12.2, 0.09, 0.09, PINK, ix, 4.0, iz + s * 3.6));
        p.push(box(0.09, 0.09, 7.2, PINK, ix + s * 6.1, 4.0, iz));
        // Marco del letrero de carretera
        p.push(box(0.22, 0.09, 3.5, AQUA, L.sign.x, 6.5 + s * 1.72, L.sign.z));
        p.push(box(0.22, 3.5, 0.09, AQUA, L.sign.x, 6.5, L.sign.z + s * 1.72));
      }
      add(p, glowMat);
    },

    // Estacionamiento: pinta dos cajones más, letrero y farol
    parking() {
      const p = [];
      stallLines(p, 2, 4);
      const px = LAYOUT.stalls[3] - 2.4, pz = LAYOUT.stallZ - 3.4;
      p.push(cyl(0.09, 0.12, 4.4, 6, PAL.dark, px, 2.2, pz));
      p.push(box(1.2, 0.08, 0.08, PAL.dark, px + 0.5, 4.36, pz));
      p.push(box(0.08, 2.2, 0.08, PAL.dark, -14.6, 1.1, -22.2));
      p.push(box(0.9, 0.9, 0.06, 0x3f6fb0, -14.6, 2.4, -22.2)); // letrero azul de "P"
      p.push(box(0.16, 0.6, 0.07, PAL.cream, -14.75, 2.4, -22.2));
      p.push(box(0.36, 0.14, 0.07, PAL.cream, -14.6, 2.62, -22.2));
      p.push(box(0.14, 0.32, 0.07, PAL.cream, -14.45, 2.5, -22.2));
      p.push(box(0.36, 0.12, 0.07, PAL.cream, -14.6, 2.36, -22.2));
      add(p);
      add([box(0.5, 0.14, 0.34, WARM, px + 1.0, 4.28, pz)], glowMat);
      circle(px, pz, 0.25);
      circle(-14.6, -22.2, 0.15);
    },

    // Tienda surtida: toldo a rayas, un estante más con variedad y carteles de oferta
    shop() {
      const p = [];
      const front = station.front;
      const x0 = -4.4, n = 12, w = 1.0;
      for (let i = 0; i < n; i++) {
        p.push(box(w, 0.07, 1.5, i % 2 ? PAL.cream : PAL.red, x0 + w / 2 + i * w, 2.98, front + 0.7));
        p.push(box(w, 0.26, 0.05, i % 2 ? PAL.red : PAL.cream, x0 + w / 2 + i * w, 2.83, front + 1.45));
      }
      add(p);
      // Estante extra al fondo a la derecha (usa el material del interior)
      const wallZ = L.building.z - L.building.d / 2 + 0.25;
      const goods = [box(2.0, 2.1, 0.45, 0x8a6a4a, 6.3, 1.15, wallZ + 0.25)];
      const colors = [PAL.red, PAL.teal, 0xe8b23a, PAL.cream, 0x6f8fb8, 0xd3a15a];
      let k = 0;
      for (const sy of [0.7, 1.25, 1.8]) {
        goods.push(box(1.9, 0.05, 0.5, 0x6e4a32, 6.3, sy, wallZ + 0.3));
        for (let i = 0; i < 5; i++) {
          const h = 0.22 + ((k * 7) % 5) * 0.04;
          goods.push(box(0.26, h, 0.26, colors[(k * 5 + i) % colors.length], 5.55 + i * 0.37, sy + 0.025 + h / 2, wallZ + 0.3));
          k++;
        }
      }
      goods.push(box(1.2, 0.5, 0.04, 0xe8b23a, 6.3, 2.6, wallZ + 0.03)); // cartel de oferta
      add(goods, station.insideMat);
      aabb(6.3, wallZ + 0.3, 2.0, 0.6);
    },

    // Cafetería al este de la tienda: barra con techo a rayas, bancos y una mesa con sombrilla
    cafe() {
      const p = [];
      const cx = 12.2, cz = -31;
      p.push(box(6.6, 0.1, 5.8, 0xb08a62, cx, 0.11, cz));
      p.push(box(4.8, 1.05, 0.7, PAL.cream, cx, 0.68, cz + 2.0));
      p.push(box(4.82, 0.22, 0.72, PAL.red, cx, 0.9, cz + 2.0));
      p.push(box(5.0, 0.07, 0.9, 0x80583c, cx, 1.24, cz + 2.0));
      p.push(box(0.5, 0.55, 0.4, PAL.chrome, cx - 1.5, 1.55, cz + 1.9)); // cafetera
      p.push(box(0.3, 0.3, 0.3, PAL.red, cx + 0.2, 1.42, cz + 1.9));
      for (let i = 0; i < 7; i++) p.push(box(1.0, 0.14, 6.4, i % 2 ? PAL.cream : PAL.teal, cx - 3 + i * 1.0, 3.1, cz));
      for (const dz of [-2.7, 2.9]) p.push(box(0.14, 3.0, 0.14, PAL.dark, cx + 3.2, 1.5, cz + dz));
      for (let i = 0; i < 4; i++) {
        p.push(cyl(0.05, 0.05, 0.7, 6, PAL.chrome, cx - 1.8 + i * 1.2, 0.35, cz + 2.75));
        p.push(cyl(0.22, 0.22, 0.08, 8, PAL.red, cx - 1.8 + i * 1.2, 0.74, cz + 2.75));
      }
      // Mesa con sombrilla
      const tx = 13.6, tz = -25.9;
      p.push(cyl(0.06, 0.06, 2.3, 6, PAL.dark, tx, 1.15, tz));
      p.push(cyl(0.65, 0.65, 0.06, 10, PAL.cream, tx, 0.76, tz));
      const cone = new THREE.ConeGeometry(1.4, 0.5, 8);
      cone.translate(tx, 2.45, tz);
      p.push(tint(cone, PAL.red));
      for (const s of [-1, 1]) p.push(box(0.4, 0.45, 0.4, PAL.teal, tx + s * 0.95, 0.23, tz));
      add(p);
      aabb(cx, cz + 2.0, 5.0, 0.9);
      circle(tx, tz, 1.25);
      circle(cx + 3.2, cz + 2.9, 0.2);
    },

    // Autolavado: túnel con rodillos sobre el carril de servicios
    carwash() {
      const p = [];
      const cx = L.carwash.x, z = L.lanes.service;
      shed(p, cx, 0xdfe6e8, PAL.teal, 2.9);
      p.push(box(7, 0.03, 3.6, 0x6f8f9a, cx, 0.085, z));
      for (const s of [-1, 1]) {
        p.push(box(7.02, 0.4, 0.26, PAL.teal, cx, 2.3, z + s * 1.95));
        for (let i = 0; i < 3; i++) p.push(cyl(0.33, 0.33, 0.7, 8, i % 2 ? PAL.cream : PAL.teal, cx, 0.45 + i * 0.7, z + s * 1.5));
      }
      const roller = new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8);
      roller.rotateX(Math.PI / 2);
      roller.translate(cx, 2.45, z);
      p.push(tint(roller, PAL.red));
      p.push(box(0.4, 1.3, 0.3, PAL.dark, cx, 0.65, L.carwash.ctrlZ + 0.15)); // tablero
      p.push(box(0.2, 0.2, 0.08, PAL.red, cx, 1.1, L.carwash.ctrlZ - 0.03));
      add(p);
    },

    // Taller: cobertizo de ladrillo con banco de herramientas y llantas
    garage() {
      const p = [];
      const cx = L.garage.x, z = L.lanes.service;
      shed(p, cx, 0x9a5a44, 0x6b5a4e, 3.2);
      p.push(box(3.4, 0.02, 0.9, PAL.dark, cx, 0.08, z)); // fosa
      for (const s of [-1, 1]) p.push(box(7.02, 0.3, 0.26, PAL.cream, cx, 2.75, z + s * 1.95));
      const bz = L.garage.ctrlZ;
      p.push(box(2.2, 0.9, 0.6, PAL.wood, cx, 0.5, bz + 0.1));
      p.push(box(2.3, 0.07, 0.7, 0x80583c, cx, 0.98, bz + 0.1));
      p.push(box(0.6, 0.3, 0.34, PAL.red, cx - 0.5, 1.17, bz + 0.1)); // caja de herramientas
      p.push(box(0.5, 0.1, 0.12, PAL.chrome, cx + 0.5, 1.07, bz + 0.05));
      for (let i = 0; i < 4; i++) p.push(cyl(0.4, 0.4, 0.24, 9, PAL.dark, cx + 2.4, 0.18 + i * 0.25, bz + 0.05));
      p.push(cyl(0.3, 0.3, 0.9, 8, 0xd2a43c, cx - 2.2, 0.51, bz + 0.05));
      add(p);
      circle(cx + 2.4, bz + 0.05, 0.5);
      circle(cx - 2.2, bz + 0.05, 0.4);
    },

    // Ayudante: persona con overol turquesa junto a su bomba
    helper() {
      helper = buildPerson(PAL.teal);
      helper.root.userData.x = helper.root.userData.z = null;
      helper.walkT = 0;
      scene.add(helper.root);
    },
  };

  return {
    build(id) {
      if (built.has(id) || !builders[id]) return;
      built.add(id);
      builders[id]();
    },
    // Mueve al ayudante entre su lugar de descanso y la bomba
    update(dt, time, bay) {
      if (!helper || !bay) return;
      const pump = L.pumps[bay.pump];
      const side = bay.z > pump.z ? 1 : -1; // lado del carril
      const busy = bay.c && (bay.byHelper || (bay.phase === 'waiting' && bay.helperWait > 0));
      const tx = busy ? pump.x - 0.05 : pump.x + (pump.x > 0 ? 0.63 : -0.63);
      const tz = busy ? pump.z + side * 0.5 : pump.z;
      const u = helper.root.userData;
      if (u.x === null) { u.x = tx; u.z = tz; }
      // Camina hacia su lugar a paso normal
      const dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz);
      const step = Math.min(d, 1.6 * dt);
      if (d > 0.01) { u.x += (dx / d) * step; u.z += (dz / d) * step; }
      const walking = d > 0.05;
      if (walking) helper.walkT += dt;
      const working = bay.byHelper && bay.phase === 'fueling';
      helper.root.position.set(u.x, 0.2, u.z);
      helper.root.rotation.y = walking ? Math.atan2(dx, dz) : side > 0 ? 0 : Math.PI;
      helper.pose(walking ? helper.walkT : null, working ? 1 : 0);
    },

  };
}
