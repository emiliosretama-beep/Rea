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

  // Letrero de texto (canvas) en un plano; dos caras si 'both'
  function textSign(text, w, h, x, y, z, rotY, colors, both = false) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = Math.round(512 * (h / w));
    const c = cv.getContext('2d');
    c.fillStyle = colors[0]; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = colors[2] || colors[1]; c.lineWidth = 10; c.strokeRect(8, 8, cv.width - 16, cv.height - 16);
    c.fillStyle = colors[1];
    c.font = `${Math.round(cv.height * 0.55)}px "Alfa Slab One", Impact, serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, cv.width / 2, cv.height * 0.54);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: both ? THREE.DoubleSide : THREE.FrontSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
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

    // Neón: letreros encendidos y tubos en las orillas de la marquesina en V y del letrero
    neon() {
      station.setNeon(true);
      const p = [];
      const ix = L.island.x, iz = L.island.z;
      const tube = (x1, y1, x2, y2, z) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        const g = new THREE.BoxGeometry(len, 0.08, 0.08);
        g.rotateZ(Math.atan2(y2 - y1, x2 - x1));
        g.translate((x1 + x2) / 2, (y1 + y2) / 2, z);
        return tint(g, PINK);
      };
      for (const s of [-1, 1]) {
        p.push(tube(ix - 6.45, 4.56, ix, 3.94, iz + s * 3.68), tube(ix, 3.94, ix + 6.45, 4.56, iz + s * 3.68));
        p.push(box(0.08, 0.08, 7.3, PINK, ix + s * 6.48, 4.56, iz));
        // Marco del letrero de la barda
        const S = L.sign, Y = L.yard;
        p.push(box(0.3, 0.09, 3.85, AQUA, S.x, 9.0 + s * 1.9, Y.maxZ));
        p.push(box(0.3, 3.85, 0.09, AQUA, S.x, 9.0, Y.maxZ + s * 1.9));
      }
      add(p, glowMat);
    },

    // Estacionamiento: pinta dos cajones más, letrero y farol
    parking() {
      const p = [];
      stallLines(p, 2, 4);
      const lx = -33, lz = -25;
      p.push(cyl(0.09, 0.12, 4.4, 6, PAL.dark, lx, 2.2, lz));
      p.push(box(1.2, 0.08, 0.08, PAL.dark, lx + 0.5, 4.36, lz));
      p.push(box(0.08, 2.2, 0.08, PAL.dark, -32.6, 1.1, -21.4));
      add(p);
      add([box(0.5, 0.14, 0.34, WARM, lx + 1.0, 4.28, lz)], glowMat);
      textSign('P', 0.9, 0.9, -32.6, 2.5, -21.36, 0, ['#3f6fb0', '#f6e7c8']);
      circle(lx, lz, 0.25);
      circle(-32.6, -21.4, 0.15);
    },

    // Tienda surtida: toldo a rayas, un estante más con variedad y carteles de oferta
    shop() {
      const p = [];
      const front = station.front;
      const x0 = 0.3, n = 8, w = 0.9; // sobre las ventanas (la puerta ya tiene su techito)
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

    // Autolavado (oeste): túnel que se cruza de este a oeste, con cepillos, rodillo y letrero
    carwash() {
      const p = [];
      const cx = L.carwash.x, z = L.carwash.z, len = 9, half = 2.25, h = 3.3;
      const x1 = cx - len / 2, x2 = cx + len / 2;
      p.push(box(len + 1, 0.04, half * 2 + 0.6, 0x5f7f8a, cx, 0.09, z)); // piso mojado
      for (let i = 0; i < 5; i++) p.push(box(0.1, 0.02, half * 2 - 0.4, 0x3a4a50, x1 + 1 + i * 1.75, 0.115, z)); // rejillas
      for (const s of [-1, 1]) {
        const wz = z + s * half;
        p.push(box(len, h, 0.24, 0xdfe6e8, cx, h / 2, wz));
        p.push(box(len + 0.02, 0.5, 0.26, PAL.teal, cx, h - 0.6, wz));
        p.push(box(len + 0.02, 0.18, 0.26, PAL.red, cx, 0.5, wz));
        for (let i = 0; i < 3; i++) p.push(box(1.6, 0.7, 0.27, 0x9fc3cf, x1 + 1.6 + i * 2.9, 1.9, wz)); // ventanitas
        aabb(cx, wz, len, 0.24);
        // Cepillos verticales a la entrada
        for (let k = 0; k < 3; k++) p.push(cyl(0.34, 0.34, 0.7, 8, k % 2 ? PAL.cream : PAL.teal, x2 - 1.2, 0.45 + k * 0.72, z + s * (half - 0.55)));
      }
      // Techo con alero en V invertida
      p.push(box(len + 1.2, 0.24, half * 2 + 1.0, 0x2f7f86, cx, h + 0.12, z));
      p.push(box(len + 1.25, 0.12, half * 2 + 1.05, PAL.cream, cx, h + 0.3, z));
      // Arco de entrada a rayas
      // Arco de entrada: dos postes a rayas y una viga arriba (el paso queda libre)
      for (const sz of [-1, 1]) {
        for (let k = 0; k < 6; k++) p.push(box(0.34, 0.5, 0.36, k % 2 ? PAL.cream : PAL.red, x2 + 0.12, 0.25 + k * 0.5, z + sz * (half + 0.04)));
      }
      p.push(box(0.36, 0.42, half * 2 + 0.5, PAL.red, x2 + 0.12, h - 0.15, z));
      const roller = new THREE.CylinderGeometry(0.32, 0.32, half * 2 - 0.4, 10);
      roller.rotateX(Math.PI / 2);
      roller.translate(cx + 1.4, 2.6, z);
      p.push(tint(roller, PAL.red));
      // Tablero de control afuera, junto a la entrada
      const px = L.carwash.px, pz = L.carwash.pz;
      p.push(box(0.12, 1.1, 0.12, PAL.dark, px, 0.55, pz));
      p.push(box(0.5, 0.6, 0.3, PAL.dark, px, 1.3, pz));
      p.push(box(0.16, 0.16, 0.05, PAL.red, px - 0.1, 1.35, pz + 0.16));
      p.push(box(0.16, 0.16, 0.05, 0x3fb06a, px + 0.12, 1.35, pz + 0.16));
      add(p);
      circle(px, pz, 0.3);
      // Letrero sobre el techo: una cara hacia la carretera y otra hacia la tienda
      add([box(5.4, 1.3, 0.1, PAL.dark, cx, h + 1.0, z)]);
      textSign('CAR WASH', 5.2, 1.1, cx, h + 1.0, z + 0.06, 0, ['#2f7f86', '#f6e7c8']);
      textSign('CAR WASH', 5.2, 1.1, cx, h + 1.0, z - 0.06, Math.PI, ['#2f7f86', '#f6e7c8']);
    },

    // Taller (este): nave abierta de lado oeste, muro de ladrillo al este, techo con letrero
    garage() {
      const p = [];
      const cx = L.garage.x, cz = L.garage.z, w = 6.6, len = 10.4, h = 3.8;
      const xw = cx - w / 2, xe = cx + w / 2, z1 = cz - len / 2, z2 = cz + len / 2;
      const BRICK = 0x9a5a44;
      p.push(box(w + 0.6, 0.05, len + 0.6, 0x77726b, cx, 0.09, cz)); // piso de concreto del taller
      p.push(box(1.0, 0.02, 3.2, 0x3a3434, cx, 0.12, cz)); // fosa
      // Muro este de ladrillo (completo) y medios muros al oeste, dejando la entrada lateral para ti
      p.push(box(0.3, h, len, BRICK, xe, h / 2, cz));
      for (let i = 0; i < 4; i++) p.push(box(0.32, 0.1, len, 0x7a4636, xe, 0.6 + i * 0.85, cz));
      aabb(xe, cz, 0.3, len);
      for (const [za, zb] of [[z1, cz - 2.3], [cz + 2.3, z2]]) {
        p.push(box(0.3, 1.1, zb - za, BRICK, xw, 0.55, (za + zb) / 2));
        aabb(xw, (za + zb) / 2, 0.3, zb - za);
      }
      // Postes y techo inclinado de lámina
      for (const z of [z1, cz - 2.3, cz + 2.3, z2]) { p.push(box(0.2, h, 0.2, PAL.dark, xw, h / 2, z)); circle(xw, z, 0.14); }
      const roof = new THREE.BoxGeometry(w + 1.2, 0.18, len + 1.0);
      roof.rotateZ(-0.08);
      roof.translate(cx, h + 0.2, cz);
      p.push(tint(roof, 0x6b5a4e));
      for (let i = 0; i < 9; i++) {
        const ribs = new THREE.BoxGeometry(w + 1.2, 0.06, 0.08);
        ribs.rotateZ(-0.08);
        ribs.translate(cx, h + 0.32, z1 - 0.4 + i * ((len + 0.8) / 8));
        p.push(tint(ribs, 0x5a4a40));
      }
      p.push(box(w + 1.3, 0.55, 0.12, PAL.cream, cx, h - 0.1, z2 + 0.5)); // fascia del frente
      // Herramientas: banco de trabajo junto al muro, llantas, tambos y gato
      p.push(box(0.7, 0.95, 2.4, PAL.wood, xe - 0.55, 0.5, cz + 2.8));
      p.push(box(0.8, 0.07, 2.5, 0x80583c, xe - 0.55, 1.0, cz + 2.8));
      p.push(box(0.4, 0.3, 0.6, PAL.red, xe - 0.55, 1.2, cz + 2.3));
      for (let i = 0; i < 4; i++) p.push(cyl(0.4, 0.4, 0.24, 9, PAL.dark, xe - 0.65, 0.18 + i * 0.25, cz - 3.4));
      p.push(cyl(0.3, 0.3, 0.9, 8, 0xd2a43c, xe - 0.6, 0.51, cz - 2.2));
      aabb(xe - 0.55, cz + 2.8, 0.8, 2.5);
      circle(xe - 0.65, cz - 3.4, 0.45);
      circle(xe - 0.6, cz - 2.2, 0.35);
      // Carrito de herramientas donde trabajas (lado oeste del auto)
      const tx = L.garage.px, tz = L.garage.pz;
      p.push(box(0.5, 0.85, 0.7, PAL.red, tx, 0.5, tz));
      for (let i = 0; i < 3; i++) p.push(box(0.52, 0.03, 0.6, PAL.chrome, tx, 0.35 + i * 0.22, tz));
      p.push(box(0.55, 0.05, 0.75, PAL.dark, tx, 0.95, tz));
      add(p);
      circle(tx, tz, 0.4);
      textSign('GARAGE', 5.6, 0.9, cx, h + 0.95, z2 + 0.58, 0, ['#23202a', '#e8b23a']);
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
