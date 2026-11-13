// Lo que cada mejora construye en el mundo. Cada mejora es una o dos mallas fusionadas.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge, tint, vertexMat } from './geo.js';
import { LAYOUT, pumpParts, stallLines, gondola } from './station.js';
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
  // Personal visible: cajero, barista y mecánico (se paran en su lugar de trabajo)
  const staffPeople = {};
  const STAFF_SPOTS = {
    cashier: { x: 0.45, z: -28.45, yaw: Math.PI, shirt: PAL.red },
    barista: { x: 11.0, z: -29.75, yaw: 0, shirt: 0xe9e0cc },
    mechanic: { x: 22.3, z: -27.4, yaw: Math.PI / 2, shirt: 0x3d4a66 },
  };
  function addStaff(id) {
    const sp = STAFF_SPOTS[id];
    const p = buildPerson(sp.shirt);
    p.root.position.set(sp.x, 0.08, sp.z);
    p.root.rotation.y = sp.yaw;
    scene.add(p.root);
    staffPeople[id] = p;
    circle(sp.x, sp.z, 0.3);
  }
  let washFx = null, garageFx = null;

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
      // Tanque grande pegado a la barda este (el camino del autolavado pasa por x = 30)
      const p = [];
      const tx = 35.6, tz = -29;
      const tank = new THREE.CylinderGeometry(1.25, 1.25, 5.2, 12);
      tank.rotateX(Math.PI / 2);
      tank.translate(tx, 1.95, tz);
      p.push(tint(tank, 0xcfc8b8));
      for (const dz of [-1.9, 1.9]) {
        const ring = new THREE.CylinderGeometry(1.28, 1.28, 0.28, 12);
        ring.rotateX(Math.PI / 2);
        ring.translate(tx, 1.95, tz + dz);
        p.push(tint(ring, PAL.red));
        p.push(box(2.3, 0.8, 0.5, 0x7d7a74, tx, 0.4, tz + dz * 0.8));
      }
      p.push(box(0.12, 1.5, 0.12, PAL.dark, tx - 1.4, 0.75, tz + 2.1));
      p.push(box(0.5, 0.12, 0.12, PAL.red, tx - 1.4, 1.5, tz + 2.1));
      p.push(box(1.0, 1.0, 1.0, PAL.wood, 36.4, 0.5, -34.4));
      p.push(box(0.9, 0.9, 0.9, 0x80583c, 37.5, 0.45, -35.1));
      p.push(box(0.8, 0.8, 0.8, PAL.wood, 36.8, 1.4, -34.8));
      p.push(cyl(0.3, 0.3, 0.9, 8, PAL.teal, 37.6, 0.45, -24.6));
      p.push(cyl(0.3, 0.3, 0.9, 8, PAL.red, 37.0, 0.45, -24.1));
      add(p);
      aabb(tx, tz, 2.7, 5.4);
      circle(36.9, -34.8, 1.1);
      circle(37.3, -24.35, 0.6);
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
      const lx = -20.2, lz = -9.4;
      p.push(cyl(0.09, 0.12, 4.4, 6, PAL.dark, lx, 2.2, lz));
      p.push(box(1.2, 0.08, 0.08, PAL.dark, lx - 0.5, 4.36, lz));
      p.push(box(0.08, 2.2, 0.08, PAL.dark, -21.2, 1.1, -7.6));
      add(p);
      add([box(0.5, 0.14, 0.34, WARM, lx - 1.0, 4.28, lz)], glowMat);
      textSign('P', 0.9, 0.9, -21.2, 2.5, -7.56, 0, ['#3f6fb0', '#f6e7c8']);
      circle(lx, lz, 0.25);
      circle(-21.2, -7.6, 0.15);
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
      const goods = [];
      gondola(goods, 6.3, 2.0, wallZ, 23);
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

    // Autolavado (fondo oeste): túnel con un pórtico que recorre el auto (rodillo y cepillos que giran, agua)
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
        // Rieles del pórtico a lo largo de cada muro
        p.push(box(len - 0.4, 0.1, 0.12, PAL.chrome, cx, h - 0.25, wz - s * 0.2));
      }
      p.push(box(len + 1.2, 0.24, half * 2 + 1.0, 0x2f7f86, cx, h + 0.12, z));
      p.push(box(len + 1.25, 0.12, half * 2 + 1.05, PAL.cream, cx, h + 0.3, z));
      // Arco de entrada: dos postes a rayas y una viga arriba (el paso queda libre)
      for (const sz of [-1, 1]) {
        for (let k = 0; k < 6; k++) p.push(box(0.34, 0.5, 0.36, k % 2 ? PAL.cream : PAL.red, x2 + 0.12, 0.25 + k * 0.5, z + sz * (half + 0.04)));
      }
      p.push(box(0.36, 0.42, half * 2 + 0.5, PAL.red, x2 + 0.12, h - 0.15, z));
      // Botón de inicio afuera, junto a la entrada (pedestal con botón grande)
      const px = L.carwash.px, pz = L.carwash.pz;
      p.push(box(0.16, 1.0, 0.16, PAL.dark, px, 0.5, pz));
      p.push(box(0.55, 0.65, 0.35, 0xe3d6b8, px, 1.3, pz));
      p.push(box(0.5, 0.12, 0.38, PAL.teal, px, 1.66, pz));
      add(p);
      circle(px, pz, 0.3);
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3fb06a, toneMapped: false }));
      button.position.set(px, 1.32, pz + 0.19);
      scene.add(button);
      // Letrero sobre el techo: una cara hacia la carretera y otra hacia atrás
      add([box(5.4, 1.3, 0.1, PAL.dark, cx, h + 1.0, z)]);
      textSign('CAR WASH', 5.2, 1.1, cx, h + 1.0, z + 0.06, 0, ['#2f7f86', '#f6e7c8']);
      textSign('CAR WASH', 5.2, 1.1, cx, h + 1.0, z - 0.06, Math.PI, ['#2f7f86', '#f6e7c8']);

      // ----- Pórtico móvil -----
      const gantry = new THREE.Group();
      const frame = [];
      for (const s of [-1, 1]) frame.push(box(0.18, h - 0.35, 0.18, PAL.chrome, 0, (h - 0.35) / 2, s * (half - 0.32)));
      frame.push(box(0.22, 0.22, half * 2 - 0.4, PAL.chrome, 0, h - 0.4, 0));
      frame.push(box(0.12, 0.08, half * 2 - 0.7, 0x3a4a50, -0.32, h - 0.62, 0)); // barra de rociadores
      gantry.add(new THREE.Mesh(merge(frame), vertexMat));
      // Rodillo de arriba (gira sobre su eje a lo ancho) y cepillos verticales a los lados
      const brushParts = (radius, length, axis) => {
        const g = [];
        const n = 8;
        g.push(cyl(radius * 0.35, radius * 0.35, length, 6, PAL.chrome, 0, 0, 0));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          g.push(box(0.09, length * 0.96, radius * 0.9, i % 2 ? 0x2f9c95 : 0xd84a3a, Math.cos(a) * radius * 0.55, 0, Math.sin(a) * radius * 0.55));
        }
        const m = merge(g);
        if (axis === 'z') m.rotateX(Math.PI / 2);
        return m;
      };
      const roller = new THREE.Mesh(brushParts(0.42, half * 2 - 0.9, 'z'), vertexMat);
      roller.position.set(0.25, h - 1.15, 0);
      gantry.add(roller);
      const sideBrushes = [-1, 1].map((s) => {
        const b2 = new THREE.Mesh(brushParts(0.38, 1.6, 'y'), vertexMat);
        b2.position.set(0.25, 1.05, s * 1.5);
        gantry.add(b2);
        return b2;
      });
      gantry.position.set(x2 - 0.9, 0, z);
      scene.add(gantry);
      // Agua: gotas que caen de la barra de rociadores
      const N = 140;
      const drops = new Float32Array(N * 3);
      const speeds = new Float32Array(N);
      for (let i = 0; i < N; i++) { drops[i * 3] = 0; drops[i * 3 + 1] = -10; drops[i * 3 + 2] = 0; speeds[i] = 3 + Math.random() * 3; }
      const waterGeo = new THREE.BufferGeometry();
      waterGeo.setAttribute('position', new THREE.BufferAttribute(drops, 3));
      const water = new THREE.Points(waterGeo, new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false }));
      water.frustumCulled = false;
      scene.add(water);
      let spin = 0;
      washFx = {
        // active: el ciclo está corriendo · progress: 0 a 1
        update(dt, active, progress, waiting) {
          spin += dt * (active ? 9 : 0);
          roller.rotation.z = spin;
          sideBrushes[0].rotation.y = spin;
          sideBrushes[1].rotation.y = -spin;
          // Ida (este a oeste) y vuelta
          const rest = x2 - 0.9, far = x1 + 1.0;
          const k = progress < 0.5 ? progress * 2 : 2 - progress * 2;
          const target = active ? rest + (far - rest) * k : rest;
          gantry.position.x += (target - gantry.position.x) * (1 - Math.exp(-6 * dt));
          // Botón verde que parpadea cuando hay un auto esperando
          button.material.color.set(waiting ? (Math.sin(performance.now() / 180) > 0 ? 0x5dff8f : 0x2f8a4f) : active ? 0xffb347 : 0x2f6a4a);
          // Agua
          const arr = waterGeo.attributes.position.array;
          for (let i = 0; i < N; i++) {
            if (arr[i * 3 + 1] < 0.12) {
              if (!active) { arr[i * 3 + 1] = -10; continue; }
              arr[i * 3] = gantry.position.x - 0.32 + (Math.random() - 0.5) * 0.3;
              arr[i * 3 + 1] = h - 0.7;
              arr[i * 3 + 2] = z + (Math.random() - 0.5) * (half * 2 - 0.9);
            }
            arr[i * 3 + 1] -= speeds[i] * dt;
          }
          waterGeo.attributes.position.needsUpdate = true;
        },
      };
    },

    // Taller (este): nave de ladrillo con elevador hidráulico, herramientas y letreros
    garage() {
      const p = [];
      const glow = [];
      const cx = L.garage.x, cz = L.garage.z, w = 6.6, len = 10.4, h = 3.8;
      const xw = cx - w / 2, xe = cx + w / 2, z1 = cz - len / 2, z2 = cz + len / 2;
      const BRICK = 0x9a5a44, YELLOW = 0xe8b23a;
      p.push(box(w + 0.6, 0.05, len + 0.6, 0x77726b, cx, 0.09, cz)); // piso de concreto del taller
      for (let i = 0; i < 2; i++) p.push(box(0.12, 0.02, len, YELLOW, cx + (i ? 1.55 : -1.55) + (i ? 0.45 : -0.45), 0.12, cz)); // franjas de seguridad
      // Muro este de ladrillo con hileras y una ventana; medios muros al oeste
      p.push(box(0.3, h, len, BRICK, xe, h / 2, cz));
      for (let i = 0; i < 4; i++) p.push(box(0.32, 0.08, len, 0x7a4636, xe, 0.6 + i * 0.85, cz));
      p.push(box(0.34, 0.9, 2.2, 0x9fc3cf, xe, 2.6, cz - 2.6));
      aabb(xe, cz, 0.3, len);
      for (const [za, zb] of [[z1, cz - 2.3], [cz + 2.3, z2]]) {
        p.push(box(0.3, 1.1, zb - za, BRICK, xw, 0.55, (za + zb) / 2));
        p.push(box(0.34, 0.08, zb - za, 0x8f877b, xw, 1.12, (za + zb) / 2));
        aabb(xw, (za + zb) / 2, 0.3, zb - za);
      }
      // Postes, techo inclinado de lámina y cortinas enrolladas arriba de cada entrada
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
      for (const zz of [z1, z2]) {
        const roll = new THREE.CylinderGeometry(0.28, 0.28, w - 0.6, 10);
        roll.rotateZ(Math.PI / 2);
        roll.translate(cx + 0.2, h - 0.35, zz);
        p.push(tint(roll, 0x8f877b));
        p.push(box(w - 0.6, 0.45, 0.04, 0xb5ab9b, cx + 0.2, h - 0.8, zz)); // cortina a medio subir
      }
      p.push(box(w + 1.3, 0.55, 0.12, PAL.cream, cx, h - 0.1, z2 + 0.5)); // fascia del frente
      // Elevador hidráulico: dos postes amarillos a los lados del auto
      for (const s of [-1, 1]) {
        p.push(box(0.26, 2.7, 0.36, YELLOW, cx + s * 1.55, 1.35, cz));
        p.push(box(0.6, 0.06, 0.7, PAL.dark, cx + s * 1.55, 0.12, cz));
        p.push(box(0.12, 0.25, 0.12, PAL.red, cx + s * 1.55, 2.75, cz)); // tope
        circle(cx + s * 1.55, cz, 0.22);
      }
      // Tablero de herramientas en el muro y banco de trabajo
      p.push(box(0.05, 1.3, 2.6, 0x8a6a4a, xe - 0.18, 1.9, cz + 2.8));
      const tools = [[0.3, 0.06, PAL.chrome], [0.06, 0.4, PAL.red], [0.35, 0.05, PAL.chrome], [0.06, 0.3, 0x2f7f86], [0.25, 0.08, PAL.dark]];
      for (let i = 0; i < 10; i++) {
        const [tw, th, c] = tools[i % tools.length];
        p.push(box(0.04, th, tw, c, xe - 0.22, 1.5 + (i % 2) * 0.55, cz + 1.7 + Math.floor(i / 2) * 0.5));
      }
      p.push(box(0.7, 0.95, 2.4, PAL.wood, xe - 0.55, 0.5, cz + 2.8));
      p.push(box(0.8, 0.07, 2.5, 0x80583c, xe - 0.55, 1.0, cz + 2.8));
      p.push(box(0.22, 0.2, 0.3, PAL.dark, xe - 0.4, 1.14, cz + 2.0)); // prensa
      // Repisa con latas de aceite
      p.push(box(0.4, 0.05, 1.6, 0x6e4a32, xe - 0.3, 2.95, cz + 0.2));
      for (let i = 0; i < 6; i++) p.push(cyl(0.08, 0.08, 0.22, 8, [PAL.red, 0xe8b23a, 0x2f7f86][i % 3], xe - 0.3, 3.09, cz - 0.4 + i * 0.25));
      // Rack de llantas, compresor de aire y tambo
      p.push(box(0.6, 1.6, 0.06, PAL.dark, xe - 0.6, 0.8, cz - 4.4));
      for (let i = 0; i < 4; i++) {
        const tire = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 10);
        tire.rotateZ(Math.PI / 2);
        tire.translate(xe - 0.6, 0.5 + (i % 2) * 0.82, cz - 4.1 + Math.floor(i / 2) * 0.5);
        p.push(tint(tire, 0x1e1b22));
      }
      const tank = new THREE.CylinderGeometry(0.3, 0.3, 1.1, 10);
      tank.rotateX(Math.PI / 2);
      tank.translate(xe - 0.7, 0.45, cz - 2.2);
      p.push(tint(tank, PAL.red));
      p.push(box(0.25, 0.25, 0.25, PAL.dark, xe - 0.7, 0.85, cz - 2.4)); // motor del compresor
      p.push(cyl(0.06, 0.06, 0.05, 8, PAL.cream, xe - 0.45, 0.85, cz - 2.4)); // manómetro
      aabb(xe - 0.55, cz + 2.8, 0.8, 2.5);
      circle(xe - 0.6, cz - 4.15, 0.5);
      circle(xe - 0.7, cz - 2.2, 0.55);
      // Extintor en el poste
      p.push(cyl(0.09, 0.09, 0.45, 8, PAL.red, xw + 0.18, 1.0, cz + 2.3));
      // Lámparas colgantes sobre el elevador
      for (const zz of [cz - 1.6, cz + 1.6]) {
        p.push(box(0.03, 0.6, 0.03, PAL.dark, cx, h - 0.3, zz));
        const shade = new THREE.ConeGeometry(0.32, 0.25, 8, 1, true);
        shade.translate(cx, h - 0.72, zz);
        p.push(tint(shade, 0x2f7f86));
        glow.push(box(0.16, 0.06, 0.16, WARM, cx, h - 0.86, zz));
      }
      // Carrito de herramientas donde trabajas (lado oeste, a la entrada del taller)
      const tx = L.garage.px, tz = L.garage.pz;
      p.push(box(0.5, 0.85, 0.7, PAL.red, tx, 0.5, tz));
      for (let i = 0; i < 3; i++) p.push(box(0.52, 0.03, 0.6, PAL.chrome, tx, 0.35 + i * 0.22, tz));
      p.push(box(0.55, 0.05, 0.75, PAL.dark, tx, 0.95, tz));
      // Letrero redondo de servicio en un poste afuera
      p.push(box(0.1, 3.2, 0.1, PAL.dark, xw - 0.9, 1.6, z2 + 0.6));
      add(p);
      add(glow, glowMat);
      circle(tx, tz, 0.4);
      circle(xw - 0.9, z2 + 0.6, 0.12);
      textSign('GARAGE', 5.6, 0.9, cx, h + 0.95, z2 + 0.58, 0, ['#23202a', '#e8b23a']);
      const disc = textSign('SERVICE', 1.6, 1.6, xw - 0.9, 3.4, z2 + 0.67, 0, ['#c8322b', '#f6e7c8', '#f6e7c8']);
      void disc;
      // Brazos del elevador: suben con el auto
      const arms = new THREE.Group();
      const armParts = [];
      for (const s of [-1, 1]) for (const dz of [-1.1, 1.1]) {
        armParts.push(box(1.0, 0.08, 0.14, PAL.dark, cx + s * 1.05, 0.22, cz + dz));
        armParts.push(box(0.2, 0.06, 0.2, PAL.red, cx + s * 0.6, 0.29, cz + dz));
      }
      for (const s of [-1, 1]) armParts.push(box(0.32, 0.36, 0.42, YELLOW, cx + s * 1.55, 0.25, cz)); // carros que suben por el poste
      arms.add(new THREE.Mesh(merge(armParts), vertexMat));
      scene.add(arms);
      garageFx = { update(liftY) { arms.position.y = liftY; } };
    },

    cashier() { addStaff('cashier'); },
    barista() { addStaff('barista'); },
    mechanic() { addStaff('mechanic'); },

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
    // Personal: brazo en movimiento cuando trabaja
    staff(dt, time, flags) {
      for (const id in staffPeople) {
        const busy = flags[id];
        const p = staffPeople[id];
        p.pose(null, busy ? 0.7 + Math.sin(time * 7) * 0.3 : 0);
        p.root.position.y = 0.08 + (busy ? Math.abs(Math.sin(time * 3.5)) * 0.02 : 0);
      }
    },
    // Animaciones de los servicios: autolavado y elevador del taller
    services(dt, washBay, garageBay) {
      if (washFx && washBay) {
        const c = washBay.c;
        washFx.update(dt, washBay.phase === 'working', c && c.work ? Math.min(1, c.done / c.work) : 0, washBay.phase === 'waiting');
      }
      if (garageFx && garageBay) garageFx.update(garageBay.liftY || 0);
    },
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
