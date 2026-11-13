// La estación: patio, barda, bomba, caja y la tienda (con interior).
// Empieza abandonada: tablas en puerta y ventanas, sin luz y con el letrero apagado.
// Las mejoras de la Etapa 4 agregarán piezas alrededor sin mover lo esencial.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge, tint, vertexMat, addGrain, extrude, shapeOf } from './geo.js';

// Posiciones clave
export const LAYOUT = {
  lot: { x: 0, z: -22, w: 48, d: 32 },
  yard: { minX: -39, maxX: 39, minZ: -40.5, maxZ: -6.2 }, // terreno cercado por la barda
  island: { x: 0, z: -15, w: 5.2, d: 1.5 },
  pumps: [{ x: -1.2, z: -15 }, { x: 1.2, z: -15 }], // la segunda es una mejora
  // Carriles donde paran los autos al cargar: norte y sur de la isla
  lanes: { north: -12.9, south: -17.1 },
  // Taller al este: los autos entran por el norte, paran adentro y salen por el sur (px, pz: carrito de herramientas)
  garage: { x: 24, z: -26, px: 21.35, pz: -24.3 },
  // Autolavado al fondo oeste: túnel que se cruza de este a oeste (px, pz: botón de inicio)
  carwash: { x: -27, z: -30, px: -21.4, pz: -27.1 },
  westRoadX: -36.6, // camino de salida por el lado oeste del terreno
  building: { x: 0, z: -31, w: 16, d: 8, h: 4 },
  door: { x: -3, w: 1.3, h: 2.35 },
  windows: [{ x: 2.2, w: 3.0 }, { x: 5.8, w: 3.0 }],
  winY: [1.1, 2.7],
  fuse: { x: -6.3, z: -34.6 },
  sign: { x: 0, z: -6.75 }, // sobre la barda del frente, delante de las bombas
  // Dentro de la tienda: caja junto a la puerta, refrigerador y estantes al fondo
  counter: { x: -0.3, z: -29.3, w: 2.8, d: 0.8 },
  register: { x: -1.0, z: -29.3 },
  fridge: { x: -3.4, w: 2.0 },
  shelves: [{ x: 0.2, w: 2.4 }, { x: 3.2, w: 2.4 }],
  // Estacionamiento al frente oeste, de cara a la carretera: se entra por el pasillo (sur)
  // y se sale de frente directo a la carretera
  stalls: [-22, -25.5, -29, -32.5],
  stallZ: -12.2,
  aisleZ: -18.6,
  phone: { x: -5.4, z: -27.35 }, // dentro de la tienda, junto a la puerta
};

export function createStation(scene) {
  const L = LAYOUT;
  const parts = []; // exterior
  const inside = []; // interior de la tienda (se oscurece sin luz)
  const colliders = [];
  const aabb = (x, z, w, d) => {
    const c = { type: 'box', off: false, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
    colliders.push(c);
    return c;
  };
  const circle = (x, z, r) => colliders.push({ type: 'circle', x, z, r });

  // ---------- Patio ----------
  // Todo el terreno cercado está pavimentado; la losa central de concreto queda un poco más clara
  const Yd = L.yard;
  parts.push(box(Yd.maxX - Yd.minX, 0.024, Yd.maxZ - Yd.minZ, 0x8f8983, (Yd.minX + Yd.maxX) / 2, 0.012, (Yd.minZ + Yd.maxZ) / 2));
  // Asfalto del estacionamiento (cuatro cajones; los dos últimos se pintan con la mejora)
  parts.push(box(15.6, 0.07, 12.2, 0x4b4753, -27.25, 0.035, -14.1));
  parts.push(box(L.lot.w, 0.06, L.lot.d, PAL.concrete, L.lot.x, 0.03, L.lot.z));
  parts.push(box(9, 0.07, 6, 0x9a958d, -12, 0.035, -18));
  parts.push(box(7, 0.07, 9, 0xb7b2a9, 13, 0.035, -24));
  // Accesos desde la carretera (entrada al este, salida al oeste)
  for (const sx of [1, -1]) parts.push(box(27, 0.055, 7, PAL.concrete, sx * 25.5, 0.025, -7.6));

  // Juntas del concreto cada 4 m (la parte oeste lleva asfalto y servicios)
  const JOINT = 0x8c867d;
  for (let x = -12; x <= 24; x += 4) parts.push(box(0.05, 0.012, L.lot.d, JOINT, x, 0.07, L.lot.z));
  for (let z = L.lot.z - L.lot.d / 2 + 4; z < L.lot.z + L.lot.d / 2; z += 4) parts.push(box(36, 0.012, 0.05, JOINT, 6, 0.07, z));

  // Estacionamiento: líneas blancas de los dos primeros cajones (los demás llegan con la mejora)
  stallLines(parts, 0, 2);

  // ---------- Barda de concreto alrededor del terreno ----------
  const Y = L.yard;
  const WALL = 0xb5ab9b, CAP = 0x8f877b;
  const wallX = (x1, x2, z) => {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    parts.push(box(len, 1.25, 0.3, WALL, cx, 0.625, z));
    parts.push(box(len + 0.1, 0.09, 0.42, CAP, cx, 1.295, z));
    const n = Math.max(1, Math.round(len / 6.5));
    for (let i = 0; i <= n; i++) parts.push(box(0.46, 1.5, 0.46, CAP, x1 + (len * i) / n, 0.75, z));
  };
  const wallZ = (z1, z2, x) => {
    const len = z2 - z1, cz = (z1 + z2) / 2;
    parts.push(box(0.3, 1.25, len, WALL, x, 0.625, cz));
    parts.push(box(0.42, 0.09, len + 0.1, CAP, x, 1.295, cz));
    const n = Math.max(1, Math.round(len / 6.5));
    for (let i = 1; i < n; i++) parts.push(box(0.46, 1.5, 0.46, CAP, x, 0.75, z1 + (len * i) / n));
  };
  wallX(Y.minX, Y.maxX, Y.minZ); // fondo
  wallZ(Y.minZ, Y.maxZ, Y.minX); // oeste
  wallZ(Y.minZ, Y.maxZ, Y.maxX); // este
  wallX(-12, 12, Y.maxZ); // frente, entre los dos accesos
  for (const sx of [1, -1]) parts.push(box(0.46, 1.5, 0.46, CAP, sx * Y.maxX, 0.75, Y.maxZ));

  // ---------- Isla, bomba y marquesina ----------
  // La isla no es colisionador: se puede caminar sobre ella para llegar a las bombas con autos a ambos lados
  const ix = L.island.x, iz = L.island.z;
  parts.push(box(L.island.w, 0.2, L.island.d, 0xc9c4ba, ix, 0.16, iz));
  pumpParts(parts, L.pumps[0].x, L.pumps[0].z, PAL.red);
  aabb(L.pumps[0].x, L.pumps[0].z, 0.72, 0.5);
  // Base vacía donde irá la segunda bomba
  parts.push(box(0.5, 0.26, 0.4, 0x7d7a74, L.pumps[1].x, 0.39, L.pumps[1].z));
  parts.push(box(0.14, 0.2, 0.14, 0x5a4a44, L.pumps[1].x, 0.6, L.pumps[1].z));
  // Losa en V: baja al centro y sube hacia las puntas, con franja turquesa en las orillas
  const slab = extrude(shapeOf([[-6.4, 4.88], [0, 4.26], [6.4, 4.88], [6.4, 4.62], [0, 4.0], [-6.4, 4.62]]), 7.2, PAL.cream);
  slab.translate(ix, 0, iz);
  parts.push(slab);
  const band = (x1, y1, x2, y2, z, hex, h = 0.34, t = 0.07) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const g = new THREE.BoxGeometry(len, h, t);
    g.rotateZ(Math.atan2(y2 - y1, x2 - x1));
    g.translate((x1 + x2) / 2, (y1 + y2) / 2 + 0.12, z);
    return tint(g, hex);
  };
  for (const sz of [-1, 1]) {
    parts.push(band(ix - 6.45, 4.62, ix, 4.0, iz + sz * 3.63, PAL.teal));
    parts.push(band(ix, 4.0, ix + 6.45, 4.62, iz + sz * 3.63, PAL.teal));
  }
  for (const sx of [-1, 1]) parts.push(box(0.07, 0.34, 7.3, PAL.teal, ix + sx * 6.43, 4.86, iz));
  // Columnas cónicas con anillo cromado
  for (const sx of [-2.25, 2.25]) {
    parts.push(cyl(0.13, 0.24, 3.98, 8, PAL.cream, ix + sx, 2.24, iz));
    parts.push(cyl(0.26, 0.26, 0.12, 8, PAL.chrome, ix + sx, 1.2, iz));
    parts.push(cyl(0.3, 0.3, 0.18, 8, 0x8f877b, ix + sx, 0.35, iz));
    aabb(ix + sx, iz, 0.4, 0.4);
  }
  // Lámparas bajo la marquesina
  const canopyLamps = [];
  for (const sx of [-4.4, -1.6, 1.6, 4.4]) for (const sz of [-2, 2]) canopyLamps.push(box(0.7, 0.05, 0.22, 0xffffff, ix + sx, 3.97 + Math.abs(sx) * 0.094, iz + sz));
  const px = ix, pz = iz; // centro de la marquesina (para la sombra)

  // ---------- Tienda: paredes huecas con puerta y ventanas ----------
  const b = L.building;
  const T = 0.25; // grosor de pared
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
  const back = b.z - b.d / 2, front = b.z + b.d / 2;
  const fz = front - T / 2; // centro de la pared del frente
  const [wy0, wy1] = L.winY;
  const dL = L.door.x - L.door.w / 2, dR = L.door.x + L.door.w / 2;

  parts.push(box(b.w, b.h, T, PAL.cream, b.x, b.h / 2, back + T / 2));
  parts.push(box(T, b.h, b.d - T * 2, PAL.cream, x0 + T / 2, b.h / 2, b.z));
  parts.push(box(T, b.h, b.d - T * 2, PAL.cream, x1 - T / 2, b.h / 2, b.z));
  // Pared del frente por tramos (xa a xb, ya a yb); el forro interior va en la malla de adentro
  const INNER = 0xcfc3a6;
  const seg = (xa, xb, ya, yb) => {
    parts.push(box(xb - xa, yb - ya, T, PAL.cream, (xa + xb) / 2, (ya + yb) / 2, fz));
    inside.push(box(xb - xa, yb - ya, 0.04, INNER, (xa + xb) / 2, (ya + yb) / 2, front - T - 0.02));
  };
  let cursor = x0;
  const openings = [{ a: dL, b: dR, y0: 0, y1: L.door.h }, ...L.windows.map((w) => ({ a: w.x - w.w / 2, b: w.x + w.w / 2, y0: wy0, y1: wy1 }))];
  for (const o of openings) {
    seg(cursor, o.a, 0, b.h);
    if (o.y0 > 0) seg(o.a, o.b, 0, o.y0);
    seg(o.a, o.b, o.y1, b.h);
    cursor = o.b;
  }
  seg(cursor, x1, 0, b.h);
  // Franja roja y zócalo, como tiras por fuera (no rellenan el interior)
  const ring = (y, h, hex, skipDoor) => {
    const e = 0.04;
    parts.push(box(b.w + e * 2, h, e, hex, b.x, y, back - e / 2));
    parts.push(box(e, h, b.d, hex, x0 - e / 2, y, b.z));
    parts.push(box(e, h, b.d, hex, x1 + e / 2, y, b.z));
    if (skipDoor) {
      parts.push(box(dL - x0, h, e, hex, (x0 + dL) / 2, y, front + e / 2));
      parts.push(box(x1 - dR, h, e, hex, (dR + x1) / 2, y, front + e / 2));
    } else parts.push(box(b.w + e * 2, h, e, hex, b.x, y, front + e / 2));
  };
  ring(3.25, 0.42, PAL.red, false);
  ring(0.25, 0.5, 0x8f7f69, true);
  parts.push(box(b.w + 1.2, 0.28, b.d + 1.4, 0x6b5a4e, b.x, b.h + 0.14, b.z)); // losa del techo
  for (const sx of [-2.4, 2.4]) parts.push(box(0.12, 0.7, 0.12, PAL.dark, b.x + sx, b.h + 0.6, front - 0.6));
  // Teléfono de pared para llamar al proveedor
  const pz0 = front - T; // cara interior de la pared del frente
  inside.push(box(0.6, 0.8, 0.06, PAL.teal, L.phone.x, 1.5, pz0 - 0.03));
  inside.push(box(0.34, 0.46, 0.14, PAL.dark, L.phone.x, 1.45, pz0 - 0.1));
  inside.push(box(0.1, 0.34, 0.1, PAL.chrome, L.phone.x - 0.24, 1.45, pz0 - 0.12));

  // Techito "boomerang" sobre la puerta, con poste cromado
  const awn = extrude(shapeOf([[0, 3.02], [2.5, 3.5], [2.5, 3.66], [0, 3.24]]), 3.2, PAL.cream);
  awn.rotateY(-Math.PI / 2);
  awn.translate(L.door.x + 0.2, 0, front);
  parts.push(awn);
  const awnBand = extrude(shapeOf([[0, 2.94], [2.56, 3.42], [2.56, 3.5], [0, 3.02]]), 3.24, PAL.teal);
  awnBand.rotateY(-Math.PI / 2);
  awnBand.translate(L.door.x + 0.2, 0, front);
  parts.push(awnBand);
  parts.push(cyl(0.06, 0.06, 3.45, 6, PAL.chrome, L.door.x + 1.55, 1.72, front + 2.25));
  circle(L.door.x + 1.55, front + 2.25, 0.12);
  // Torreón en la esquina del frente con una esfera "atómica" arriba
  const tx = x1 - 0.4, tz = front - 0.9;
  parts.push(box(0.4, 6.4, 1.9, PAL.red, tx, b.h + 3.2, tz));
  for (let i = 0; i < 4; i++) parts.push(box(0.43, 0.14, 1.94, PAL.cream, tx, b.h + 0.8 + i * 1.6, tz));
  const ball = new THREE.SphereGeometry(0.42, 10, 8);
  ball.translate(tx, b.h + 6.85, tz);
  parts.push(tint(ball, PAL.chrome));
  for (const [ax, ay, az] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const spike = new THREE.BoxGeometry(ax ? 1.6 : 0.06, ay ? 1.6 : 0.06, az ? 1.6 : 0.06);
    spike.translate(tx, b.h + 6.85, tz);
    parts.push(tint(spike, 0xe8b23a));
  }

  aabb(b.x, back + T / 2, b.w, T);
  aabb(x0 + T / 2, b.z, T, b.d);
  aabb(x1 - T / 2, b.z, T, b.d);
  aabb((x0 + dL) / 2, fz, dL - x0, T);
  aabb((dR + x1) / 2, fz, x1 - dR, T);
  const doorBlock = aabb(L.door.x, fz, L.door.w, T); // se quita al destapar la puerta
  // Puerta: gira sobre la bisagra izquierda hacia adentro cuando alguien se acerca
  const doorGeo = merge([
    box(L.door.w - 0.04, L.door.h - 0.04, 0.06, PAL.wood, (L.door.w - 0.04) / 2, 0, 0),
    box(0.7, 0.8, 0.07, PAL.glass, (L.door.w - 0.04) / 2, 0.45, 0),
    box(0.06, 0.06, 0.16, PAL.chrome, L.door.w - 0.2, -0.05, 0),
    box(0.9, 0.12, 0.075, PAL.red, (L.door.w - 0.04) / 2, -0.3, 0), // placa de empuje
  ]);
  const door = new THREE.Mesh(doorGeo, vertexMat);
  door.position.set(dL + 0.02, L.door.h / 2, fz);
  scene.add(door);
  let doorAngle = 0;

  // ---------- Interior ----------
  const iw = b.w - T * 2, id = b.d - T * 2;
  inside.push(box(iw, 0.04, id, 0x7d9a92, b.x, 0.08, b.z)); // piso (debajo del de cuadros)
  inside.push(box(iw, 0.04, id, 0xd8ccb0, b.x, b.h - 0.02, b.z)); // techo
  inside.push(box(iw, b.h, 0.04, INNER, b.x, b.h / 2, back + T + 0.02));
  inside.push(box(0.04, b.h, id, INNER, x0 + T + 0.02, b.h / 2, b.z));
  inside.push(box(0.04, b.h, id, INNER, x1 - T - 0.02, b.h / 2, b.z));
  // Mostrador con la caja registradora, junto a la puerta
  const C = L.counter;
  const BRASS = 0xc9a24a;
  // Mostrador: frente turquesa con molduras cromadas y vitrina de dulces del lado del cliente
  inside.push(box(C.w, 1.0, C.d, PAL.teal, C.x, 0.6, C.z));
  for (const yy of [0.3, 0.9]) inside.push(box(C.w + 0.02, 0.05, C.d + 0.02, PAL.chrome, C.x, yy, C.z));
  inside.push(box(C.w + 0.14, 0.07, C.d + 0.14, 0xe9dcc0, C.x, 1.13, C.z));
  inside.push(box(1.2, 0.5, 0.06, 0x9fd0e0, C.x + 0.6, 0.62, C.z - C.d / 2 - 0.03)); // vidrio de la vitrina
  for (let i = 0; i < 8; i++) inside.push(box(0.1, 0.07, 0.08, [PAL.red, 0xe8b23a, PAL.teal, 0xe9e0cc][i % 4], C.x + 0.15 + (i % 4) * 0.27, 0.5 + Math.floor(i / 4) * 0.18, C.z - C.d / 2 + 0.05));
  // Frascos de dulces y campana
  for (let i = 0; i < 3; i++) {
    inside.push(cyl(0.09, 0.09, 0.22, 8, 0xcfe6ea, C.x + 0.55 + i * 0.25, 1.28, C.z - 0.1));
    inside.push(cyl(0.095, 0.095, 0.04, 8, [PAL.red, 0xe8b23a, PAL.teal][i], C.x + 0.55 + i * 0.25, 1.41, C.z - 0.1));
  }
  inside.push(cyl(0.06, 0.08, 0.06, 8, BRASS, C.x - 0.05, 1.2, C.z - 0.25));
  // Caja registradora antigua de latón: base con cajón, teclado en escalones, ventanita con banderitas y manivela
  const rx = L.register.x, rz = L.register.z;
  inside.push(box(0.62, 0.16, 0.5, BRASS, rx, 1.24, rz));
  inside.push(box(0.6, 0.04, 0.02, 0x8a6a2a, rx, 1.22, rz - 0.255)); // ranura del cajón
  inside.push(box(0.5, 0.26, 0.24, BRASS, rx, 1.43, rz + 0.08));
  const keysBase = new THREE.BoxGeometry(0.52, 0.04, 0.3);
  keysBase.rotateX(0.55);
  keysBase.translate(rx, 1.42, rz - 0.13);
  inside.push(tint(keysBase, 0x8a6a2a));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) {
    const key = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6);
    key.translate(rx - 0.19 + k * 0.076, 1.36 + r * 0.06, rz - 0.22 + r * 0.075);
    inside.push(tint(key, (r + k) % 3 === 0 ? PAL.dark : 0xf3ead6));
  }
  inside.push(box(0.36, 0.14, 0.2, BRASS, rx, 1.63, rz + 0.08)); // caja del visor
  inside.push(box(0.3, 0.09, 0.02, 0x23202a, rx, 1.64, rz - 0.025)); // visor
  for (let i = 0; i < 3; i++) inside.push(box(0.07, 0.07, 0.015, i === 1 ? PAL.red : 0xf3ead6, rx - 0.09 + i * 0.09, 1.65, rz - 0.04)); // banderitas
  const crank = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10);
  crank.rotateZ(Math.PI / 2);
  crank.translate(rx + 0.33, 1.42, rz + 0.08);
  inside.push(tint(crank, PAL.chrome));
  inside.push(box(0.03, 0.03, 0.14, PAL.dark, rx + 0.36, 1.42, rz + 0.01));
  aabb(C.x, C.z, C.w, C.d);
  // Refrigerador de sodas: mueble con marco; las botellas se dibujan aparte según el inventario
  const backZ = back + T; // cara interior de la pared del fondo
  const F = L.fridge;
  inside.push(box(F.w, 2.25, 0.66, 0xdfe7ea, F.x, 1.2, backZ + 0.35));
  inside.push(box(F.w - 0.16, 1.7, 0.05, 0x2a3440, F.x, 1.25, backZ + 0.7)); // fondo oscuro de la puerta
  inside.push(box(F.w, 0.3, 0.68, PAL.red, F.x, 2.2, backZ + 0.36));
  inside.push(box(0.06, 1.7, 0.07, 0xdfe7ea, F.x, 1.25, backZ + 0.72));
  // Estantes de comida
  for (const sh of L.shelves) {
    inside.push(box(sh.w, 2.1, 0.45, 0x8a6a4a, sh.x, 1.15, backZ + 0.25));
    for (const sy of [0.7, 1.25, 1.8]) inside.push(box(sh.w - 0.1, 0.05, 0.5, 0x6e4a32, sh.x, sy, backZ + 0.3));
  }
  aabb((F.x - F.w / 2 + L.shelves[1].x + L.shelves[1].w / 2) / 2, backZ + 0.33, L.shelves[1].x + L.shelves[1].w / 2 - (F.x - F.w / 2), 0.7);
  // Lambrín turquesa con moldura roja en las paredes interiores
  for (const [w2, d2, x2, z2] of [[iw, 0.03, b.x, back + T + 0.04], [0.03, id, x0 + T + 0.04, b.z], [0.03, id, x1 - T - 0.04, b.z]]) {
    inside.push(box(w2, 0.9, d2, 0x3e8f88, x2, 0.55, z2));
    inside.push(box(w2 + (d2 > 0.1 ? 0 : 0.01), 0.07, d2 + (d2 > 0.1 ? 0.01 : 0), PAL.red, x2, 1.03, z2));
  }
  // Rocola en la pared oeste, congelador de helados y revistero junto a la puerta
  const jx = x0 + T + 0.45, jz = b.z + 0.9;
  inside.push(box(0.7, 1.1, 1.0, 0x6b3a2a, jx, 0.6, jz));
  const dome = new THREE.CylinderGeometry(0.5, 0.5, 0.7, 12, 1, false, 0, Math.PI);
  dome.rotateZ(Math.PI / 2);
  dome.rotateX(Math.PI / 2);
  dome.translate(jx, 1.15, jz);
  inside.push(tint(dome, 0x8a4a2a));
  inside.push(box(0.72, 0.08, 1.02, PAL.chrome, jx, 0.08, jz));
  aabb(jx, jz, 0.7, 1.0);
  const fzx = x0 + T + 0.5, fzz = back + T + 1.5;
  inside.push(box(0.85, 0.85, 1.3, 0xe9e2d0, fzx, 0.45, fzz));
  inside.push(box(0.87, 0.08, 1.32, 0x9fc3cf, fzx, 0.9, fzz));
  inside.push(box(0.02, 0.22, 0.8, PAL.teal, fzx + 0.43, 0.6, fzz));
  aabb(fzx, fzz, 0.85, 1.3);
  const mrx = L.door.x - 1.9, mrz = front - T - 0.7;
  inside.push(cyl(0.04, 0.04, 1.7, 6, PAL.chrome, mrx, 0.85, mrz));
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    inside.push(box(0.2, 0.26, 0.02, [PAL.red, 0xe8b23a, PAL.teal, 0x6f8fb8][(i + k) % 4], mrx + Math.cos(a) * 0.14, 0.75 + i * 0.36, mrz + Math.sin(a) * 0.14));
  }
  circle(mrx, mrz, 0.25);

  // Tapete de la entrada
  inside.push(box(1.6, 0.02, 1.0, PAL.red, L.door.x, 0.11, front - T - 0.75));
  // Caja de fusibles
  inside.push(box(0.6, 0.8, 0.14, 0x5a6b6f, L.fuse.x, 1.5, back + T + 0.09));
  inside.push(box(0.12, 0.3, 0.06, PAL.red, L.fuse.x + 0.12, 1.5, back + T + 0.19));
  inside.push(box(0.06, 1.5, 0.06, 0x5a6b6f, L.fuse.x, 2.65, back + T + 0.06)); // tubo al techo

  // ---------- Mallas ----------
  scene.add(new THREE.Mesh(merge(parts), vertexMat));
  // El interior tiene su propio material: oscuro sin luz, normal con luz
  const insideMat = addGrain(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 0.5, 0.12);
  scene.add(new THREE.Mesh(merge(inside), insideMat));
  // Lámparas del techo
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x3a3838 });
  scene.add(new THREE.Mesh(merge([-3.5, 3.5].map((sx) => box(1.8, 0.07, 0.34, 0xffffff, b.x + sx, b.h - 0.08, b.z))), lampMat));
  // Vidrios
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x1c2530, transparent: true, opacity: 0.55, depthWrite: false });
  scene.add(new THREE.Mesh(merge(L.windows.map((w) => box(w.w, wy1 - wy0, 0.04, 0xffffff, w.x, (wy0 + wy1) / 2, fz))), glassMat));

  // Tablas clavadas: 2 en la puerta y 2 por ventana (una malla instanciada)
  const boardDefs = [
    { x: L.door.x, y: 0.85, w: 1.9, rot: 0.1, door: true },
    { x: L.door.x, y: 1.7, w: 1.9, rot: -0.12, door: true },
    ...L.windows.flatMap((w) => [
      { x: w.x, y: 1.55, w: w.w + 0.4, rot: 0.04 },
      { x: w.x + 0.05, y: 2.25, w: w.w + 0.4, rot: -0.05 },
    ]),
  ];
  const boardMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.24, 0.07), new THREE.MeshLambertMaterial({ color: PAL.wood, flatShading: true }), boardDefs.length);
  const o = new THREE.Object3D();
  const boardOn = boardDefs.map(() => true);
  const falling = []; // { i, t }: tablas que van cayendo
  function placeBoard(i, t = 0) {
    const d = boardDefs[i];
    const gone = !boardOn[i] && t <= 0;
    // Al caer: se despega hacia afuera, gira y cae con gravedad
    o.position.set(d.x + t * 0.3, gone ? -5 : Math.max(0.12, d.y - 4.9 * t * t), front + 0.07 + t * 1.1);
    o.rotation.set(t * 2.2, 0, d.rot + t * 1.6);
    o.scale.set(d.w, 1, 1);
    o.updateMatrix();
    boardMesh.setMatrixAt(i, o.matrix);
    boardMesh.instanceMatrix.needsUpdate = true;
  }
  boardDefs.forEach((_, i) => placeBoard(i));
  scene.add(boardMesh);

  // Cosas abandonadas junto a la fachada
  const drumX = -10.6, drumZ = front + 0.75; // cosas viejas a un lado de la tienda
  const junk = [
    cyl(0.3, 0.3, 0.9, 8, PAL.teal, drumX, 0.51, drumZ),
    cyl(0.3, 0.3, 0.9, 8, 0x8a4b33, drumX + 0.7, 0.51, drumZ + 0.15),
    box(0.8, 0.8, 0.8, PAL.wood, drumX + 1.6, 0.46, drumZ - 0.05),
  ];
  for (let i = 0; i < 3; i++) junk.push(cyl(0.4, 0.4, 0.24, 9, PAL.dark, 8.9, 0.18 + i * 0.25, front + 0.8));
  // Máquina de refrescos junto a la puerta, banca bajo las ventanas, caja de periódicos y macetas con cactus
  const vx = L.door.x - 2.7, vz = front + 0.42;
  junk.push(box(1.0, 1.85, 0.75, PAL.red, vx, 0.93, vz));
  junk.push(box(0.8, 0.3, 0.04, PAL.cream, vx, 1.55, vz + 0.38));
  junk.push(box(0.2, 0.5, 0.05, PAL.chrome, vx + 0.3, 0.95, vz + 0.38));
  junk.push(box(0.5, 0.14, 0.06, PAL.dark, vx - 0.15, 0.45, vz + 0.38));
  aabb(vx, vz, 1.0, 0.75);
  const bx = 4.0, bz = front + 0.55;
  junk.push(box(2.0, 0.08, 0.45, PAL.wood, bx, 0.48, bz));
  junk.push(box(2.0, 0.4, 0.06, PAL.wood, bx, 0.75, bz + 0.2));
  for (const s of [-0.85, 0.85]) junk.push(box(0.08, 0.45, 0.4, PAL.dark, bx + s, 0.25, bz));
  aabb(bx, bz, 2.0, 0.5);
  junk.push(box(0.5, 0.95, 0.42, 0x3f6fb0, 0.4, 0.48, front + 0.35));
  junk.push(box(0.4, 0.3, 0.02, 0xe9e2d0, 0.4, 0.75, front + 0.57));
  circle(0.4, front + 0.35, 0.33);
  for (const px2 of [-0.9, 7.4]) {
    junk.push(box(0.8, 0.5, 0.6, 0x9a5a44, px2, 0.25, front + 0.4));
    junk.push(cyl(0.13, 0.15, 0.9, 6, PAL.cactus, px2, 0.95, front + 0.4));
    junk.push(cyl(0.08, 0.08, 0.35, 5, PAL.cactus, px2 + 0.2, 1.1, front + 0.4));
    aabb(px2, front + 0.4, 0.8, 0.6);
  }
  // Letrero de carretera: base de ladrillo sobre la barda, poste, tablero, flecha con focos y placa de abierto
  const S = L.sign;
  const BRICK = 0x9a5a44;
  junk.push(box(1.5, 1.7, 1.5, BRICK, S.x, 0.85, Y.maxZ));
  junk.push(box(1.7, 0.16, 1.7, 0x8f877b, S.x, 1.78, Y.maxZ));
  junk.push(cyl(0.17, 0.22, 6.4, 8, PAL.dark, S.x, 4.9, Y.maxZ));
  junk.push(box(0.24, 3.75, 3.75, PAL.dark, S.x, 9.0, Y.maxZ)); // marco del tablero
  const arrow = extrude(shapeOf([[-2.6, 0.32], [0.7, 0.32], [0.7, 0.7], [1.75, 0], [0.7, -0.7], [0.7, -0.32], [-2.6, -0.32]]), 0.2, PAL.red);
  arrow.rotateZ(-0.35);
  arrow.rotateY(Math.PI / 2); // en el plano del letrero, apuntando hacia la estación
  arrow.translate(S.x, 6.0, Y.maxZ - 0.3);
  junk.push(arrow);
  junk.push(box(0.2, 0.7, 2.0, PAL.dark, S.x, 4.2, Y.maxZ)); // placa de abierto
  scene.add(new THREE.Mesh(merge(junk), vertexMat));
  aabb(S.x, Y.maxZ, 1.5, 1.5);
  // Focos de la flecha: dos grupos que se encienden alternados (efecto de luces que corren)
  const bulbs = [[], []];
  for (let i = 0; i < 12; i++) {
    const u = i / 11;
    const lx = -2.4 + u * 3.9, ly = 0;
    const c = Math.cos(-0.35), sn = Math.sin(-0.35);
    const wy = 6.0 + lx * sn + ly * c, wz = Y.maxZ - 0.3 - (lx * c - ly * sn);
    for (const side of [-1, 1]) bulbs[i % 2].push(box(0.08, 0.13, 0.13, 0xffffff, S.x + side * 0.13, wy, wz));
  }
  const bulbMats = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0x4a3a30, toneMapped: false }));
  bulbs.forEach((list, k) => scene.add(new THREE.Mesh(merge(list), bulbMats[k])));
  // Placa OPEN / CLOSED
  const openCv = document.createElement('canvas');
  openCv.width = 256; openCv.height = 96;
  const openTex = new THREE.CanvasTexture(openCv);
  openTex.colorSpace = THREE.SRGBColorSpace;
  const openMat = new THREE.MeshBasicMaterial({ map: openTex, toneMapped: false });
  for (const dir of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.6), openMat);
    m.position.set(S.x + dir * 0.11, 4.2, Y.maxZ);
    m.rotation.y = dir * Math.PI / 2;
    scene.add(m);
  }
  function drawOpen(on) {
    const c = openCv.getContext('2d');
    c.fillStyle = '#17122a'; c.fillRect(0, 0, 256, 96);
    c.font = '64px "Alfa Slab One", Impact, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = on ? '#ff4a3a' : 'transparent'; c.shadowBlur = on ? 18 : 0;
    c.fillStyle = on ? '#ff6a5a' : '#4a3a40';
    c.fillText(on ? 'OPEN' : 'CLOSED', 128, 52);
    openTex.needsUpdate = true;
  }
  drawOpen(false);
  circle(drumX + 0.35, drumZ + 0.05, 0.75);
  circle(drumX + 1.6, drumZ, 0.6);
  circle(8.9, front + 0.8, 0.55);

  // Letreros con textura de canvas (apagados hasta que haya luz / se abra)
  const art = signTextures();
  const signMat = new THREE.MeshBasicMaterial({ map: art.shield });
  for (const dir of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), signMat);
    p.position.set(S.x + dir * 0.13, 9.0, Y.maxZ);
    p.rotation.y = dir * Math.PI / 2;
    scene.add(p);
  }
  const towerMat = new THREE.MeshBasicMaterial({ map: art.tower, toneMapped: false, color: 0x8a8580 });
  for (const dir of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.4), towerMat);
    m.position.set(tx + dir * 0.21, b.h + 3.3, tz);
    m.rotation.y = dir * Math.PI / 2;
    scene.add(m);
  }
  // Piso de cuadros blanco y negro (textura pequeña que se repite)
  const ck = document.createElement('canvas');
  ck.width = ck.height = 64;
  const cc = ck.getContext('2d');
  for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) { cc.fillStyle = (xx + yy) % 2 ? '#2a2630' : '#ece2cc'; cc.fillRect(xx * 32, yy * 32, 32, 32); }
  const checkTex = new THREE.CanvasTexture(ck);
  checkTex.colorSpace = THREE.SRGBColorSpace;
  checkTex.wrapS = checkTex.wrapT = THREE.RepeatWrapping;
  checkTex.repeat.set(iw / 1.2, id / 1.2);
  checkTex.magFilter = THREE.NearestFilter;
  const floorMat = new THREE.MeshLambertMaterial({ map: checkTex });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(iw, id).rotateX(-Math.PI / 2), floorMat);
  floor.position.set(b.x, 0.105, b.z);
  scene.add(floor);
  // Pósters y letrero del fondo
  const poster = (lines, bg, fg, w2, h2, x2, y2, z2, rotY) => {
    const pc = document.createElement('canvas');
    pc.width = 256; pc.height = Math.round(256 * h2 / w2);
    const g = pc.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, pc.width, pc.height);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, pc.width - 20, pc.height - 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([txt, size], i) => { g.font = `${size}px "Alfa Slab One", Impact, serif`; g.fillText(txt, pc.width / 2, (pc.height / (lines.length + 1)) * (i + 1)); });
    const tex = new THREE.CanvasTexture(pc);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(x2, y2, z2);
    m.rotation.y = rotY;
    scene.add(m);
    posterMats.push(m.material);
  };
  const posterMats = [floorMat];
  poster([['GROCERIES', 40], ['SNACKS · SOUVENIRS', 22]], '#a8412f', '#f0e4c6', 4.2, 0.9, 1.7, 3.15, back + T + 0.06, 0);
  poster([['ICE COLD', 44], ['SODA', 64], ['5¢', 54]], '#2f8a84', '#f0e4c6', 1.0, 1.4, L.fridge.x, 3.05, back + T + 0.06, 0);
  poster([['ROUTE', 30], ['66', 96], ['MAPS', 30]], '#e3d6b8', '#2a2430', 1.1, 1.5, x0 + T + 0.06, 2.3, b.z - 1.6, Math.PI / 2);
  poster([['MOTOR', 34], ['OIL', 60], ['QUALITY', 22]], '#23202a', '#e8b23a', 1.1, 1.5, x1 - T - 0.06, 2.3, b.z - 1.0, -Math.PI / 2);
  poster([['FRESH', 34], ['COFFEE', 40]], '#6b3a2a', '#f0e4c6', 1.1, 1.0, x1 - T - 0.06, 2.3, b.z + 1.2, -Math.PI / 2);
  // Ventiladores de techo (giran con la luz)
  const fanGeo = merge([
    cyl(0.12, 0.12, 0.12, 8, PAL.chrome, 0, 0, 0),
    ...[0, 1, 2, 3].map((k) => { const g = new THREE.BoxGeometry(0.9, 0.02, 0.16); g.translate(0.5, -0.04, 0); g.rotateY((k * Math.PI) / 2); return tint(g, 0x6e4a32); }),
  ]);
  const fans = [b.x - 1.2, b.x + 5.2].map((fx2) => {
    const f = new THREE.Mesh(fanGeo, vertexMat);
    f.position.set(fx2, b.h - 0.45, b.z - 0.4);
    scene.add(f);
    return f;
  });
  scene.add(new THREE.Mesh(merge([b.x - 1.2, b.x + 5.2].map((fx2) => box(0.03, 0.35, 0.03, PAL.chrome, fx2, b.h - 0.22, b.z - 0.4))), vertexMat));
  // Neón en las ventanas y luces de la rocola y la máquina de refrescos
  const neonPlate = (txt, color, w2, h2, x2, y2, z2) => {
    const pc = document.createElement('canvas');
    pc.width = 256; pc.height = Math.round(256 * h2 / w2);
    const g = pc.getContext('2d');
    g.clearRect(0, 0, pc.width, pc.height);
    g.font = `${Math.round(pc.height * 0.55)}px "Alfa Slab One", Impact, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 16; g.fillStyle = color;
    g.fillText(txt, pc.width / 2, pc.height / 2);
    g.shadowBlur = 0; g.globalAlpha = 0.6; g.fillStyle = '#fff6e6'; g.fillText(txt, pc.width / 2, pc.height / 2);
    const tex = new THREE.CanvasTexture(pc);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, color: 0x000000 }));
    m.position.set(x2, y2, z2);
    scene.add(m);
    return m.material;
  };
  const windowNeon = [
    neonPlate('OPEN', '#ff4a3a', 1.2, 0.5, L.windows[1].x, 2.25, front - T - 0.05),
    neonPlate('ICE COLD', '#4fe0d2', 1.6, 0.45, L.windows[0].x, 2.3, front - T - 0.05),
  ];
  const storeGlow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const glowParts = [
    box(0.04, 0.6, 0.12, 0xffb347, jx + 0.36, 0.75, jz - 0.38),
    box(0.04, 0.6, 0.12, 0xff5fa8, jx + 0.36, 0.75, jz + 0.38),
    box(0.04, 0.18, 0.7, 0xffe2a0, jx + 0.36, 1.18, jz),
    box(0.82, 0.32, 0.03, 0xffe9c0, vx, 1.55, vz + 0.4),
  ];
  const storeGlowMesh = new THREE.Mesh(merge(glowParts), storeGlow);
  scene.add(storeGlowMesh);
  const lampMesh = new THREE.Mesh(merge(canopyLamps), new THREE.MeshBasicMaterial({ color: 0x8a8070, toneMapped: false }));
  scene.add(lampMesh);
  const roofMat = new THREE.MeshBasicMaterial({ map: art.roof });
  const roofSign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.5), roofMat);
  roofSign.position.set(b.x, b.h + 1.55, front - 0.55);
  scene.add(roofSign);

  // Sombras falsas (el sol está al oeste: caen hacia el este)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x1a1020, transparent: true, opacity: 0.26, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const flat = (w, d, x, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, 0.07, z); return g; };
  // Manchas de aceite donde se detienen los autos
  scene.add(oilStains());

  const fakeShadows = new THREE.Mesh(merge([
    flat(13, 7, px + 4.5, pz),
    flat(7, b.d + 1, b.x + b.w / 2 + 3.5, b.z),
    flat(3.6, 3.6, S.x + 6, S.z - 1.6),
    flat(2.2, Y.maxZ - Y.minZ, Y.minX + 1.25, (Y.minZ + Y.maxZ) / 2),
  ]), shadowMat);
  scene.add(fakeShadows);

  let neon = false;
  function setNeon(on) {
    neon = on;
    art.draw(on);
    if (on) { signMat.color.set(0xffffff); roofMat.color.set(0xffffff); }
  }
  function setPower(on) {
    insideMat.color.set(on ? 0xffffff : 0x4b4654);
    insideMat.emissive.set(on ? 0x3d3222 : 0x000000); // con luz, todo el interior se aclara
    lampMat.color.set(on ? 0xfff2c4 : 0x3a3838);
    glassMat.color.set(on ? 0xffd27a : 0x1c2530);
    glassMat.opacity = on ? 0.4 : 0.55;
    roofMat.color.set(on || neon ? 0xffffff : 0x8a8580);
    towerMat.color.set(on ? 0xffffff : 0x8a8580);
    lampMesh.material.color.set(on ? 0xfff0c8 : 0x8a8070);
    for (const m of posterMats) m.color.set(on ? 0xffffff : 0x4b4654);
    storeGlow.color.set(on ? 0xffffff : 0x2a2420);
    powered = on;
  }
  let powered = false;
  let isOpen = false;
  function setOpen(on) {
    isOpen = on;
    windowNeon.forEach((m) => m.color.set(on ? 0xffffff : 0x000000));
    signMat.color.set(on || neon ? 0xffffff : 0x8a8580);
    drawOpen(on);
  }

  let chase = 0;
  // dt y lista de puntos {x, z} que abren la puerta (jugador y clientes)
  function update(dt, near) {
    for (let k = falling.length - 1; k >= 0; k--) {
      const f = falling[k];
      f.t += dt;
      if (f.t > 0.75) { falling.splice(k, 1); placeBoard(f.i, 0); } else placeBoard(f.i, f.t);
    }
    // Ventiladores y luces de la rocola
    if (powered) for (const f of fans) f.rotation.y += dt * 5;
    // Focos de la flecha: corren cuando la gasolinera está abierta
    chase += dt;
    const phase = Math.floor(chase * 3) % 2;
    bulbMats[0].color.set(isOpen && phase === 0 ? 0xffe9a8 : 0x4a3a30);
    bulbMats[1].color.set(isOpen && phase === 1 ? 0xffe9a8 : 0x4a3a30);
    // La puerta solo funciona cuando ya no tiene tablas
    let open = false;
    if (doorBlock.off) for (const p of near) if (Math.hypot(p.x - L.door.x, p.z - front) < 2.3) { open = true; break; }
    const target = open ? 1.45 : 0;
    doorAngle += (target - doorAngle) * (1 - Math.exp(-7 * dt));
    door.rotation.y = doorAngle;
  }

  return {
    update,
    colliders,
    interactables: [
      { id: 'drums', x: drumX + 0.5, y: 0.8, z: drumZ, prompt: 'promptDrum', toast: 'toastDrum' },
    ],
    boards: {
      count: boardDefs.length,
      spot: (i) => ({ x: boardDefs[i].x, y: boardDefs[i].y, z: front + 0.1 }),
      isOn: (i) => boardOn[i],
      // Quita la tabla; al destapar las dos de la puerta se puede entrar
      remove(i) {
        boardOn[i] = false;
        falling.push({ i, t: 0.001 });
        doorBlock.off = !boardDefs.some((d, k) => d.door && boardOn[k]);
      },
    },
    setPower,
    setOpen,
    setNeon,
    insideMat,
    fakeShadows,
    front,
    redrawText: () => { art.draw(neon); drawOpen(isOpen); },
  };
}

// Manchas de aceite y llantas (una malla instanciada con textura de mancha suave)
function oilStains() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 8 + Math.random() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(cv);
  const spots = [];
  // Bajo el motor de los autos que cargan (paran con el frente hacia el oeste)
  spots.push([LAYOUT.pumps[0].x - 1.4, LAYOUT.lanes.north, 1.7], [LAYOUT.pumps[1].x - 1.4, LAYOUT.lanes.south, 1.7]);
  for (const x of LAYOUT.stalls) spots.push([x, LAYOUT.stallZ - 1.2, 1.5]);
  spots.push([LAYOUT.garage.x, LAYOUT.garage.z, 2.4], [LAYOUT.carwash.x, LAYOUT.carwash.z, 2.2]);
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({
    map: tex, color: 0x1a1418, transparent: true, opacity: 0.32, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
  }), spots.length);
  const o = new THREE.Object3D();
  spots.forEach(([x, z, s], i) => {
    o.position.set(x, 0.09, z); o.rotation.set(0, i * 1.3, 0); o.scale.set(s, 1, s * 0.7); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  return mesh;
}

// ¿Está el punto dentro de la tienda? (para que caja, teléfono y fusibles no se usen a través de la pared)
export function insideStore(p) {
  const b = LAYOUT.building;
  return Math.abs(p.x - b.x) < b.w / 2 - 0.2 && Math.abs(p.z - b.z) < b.d / 2 - 0.2;
}

// Líneas blancas de los cajones [from, to) del estacionamiento
export function stallLines(parts, from, to) {
  const L = LAYOUT;
  const WHITE = 0xece4d2;
  for (let i = from; i < to; i++) {
    const x = L.stalls[i];
    if (i === 0) parts.push(box(0.14, 0.02, 5.6, WHITE, x + 1.75, 0.08, L.stallZ));
    parts.push(box(0.14, 0.02, 5.6, WHITE, x - 1.75, 0.08, L.stallZ));
  }
}

// Piezas de una bomba (se usa también para la segunda, en world/upgrades3d.js)
export function pumpParts(parts, x, z, hex) {
  parts.push(box(0.72, 1.45, 0.5, hex, x, 0.26 + 0.725, z));
  parts.push(box(0.5, 0.42, 0.52, PAL.cream, x, 1.32, z));
  parts.push(box(0.3, 0.1, 0.54, PAL.dark, x, 1.3, z));
  parts.push(box(0.8, 0.08, 0.58, PAL.chrome, x, 1.75, z));
  const globe = new THREE.SphereGeometry(0.24, 8, 6);
  globe.translate(x, 2.03, z);
  parts.push(tint(globe, 0xf2e6c4));
  parts.push(box(0.08, 0.5, 0.08, PAL.dark, x + 0.42, 1.2, z));
}

function signTextures() {
  const mk = (w, h) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, ctx: cv.getContext('2d'), tex };
  };
  const s = mk(256, 256);
  const r = mk(512, 128);
  const tw = mk(96, 352);
  const slab = (px) => `${px}px "Alfa Slab One", Impact, serif`;

  function glow(c, text, x, y, font, color) {
    c.font = font; c.shadowColor = color; c.shadowBlur = 22;
    c.fillStyle = color; c.fillText(text, x, y);
    c.shadowBlur = 8; c.fillStyle = '#fff6e6'; c.globalAlpha = 0.55; c.fillText(text, x, y);
    c.globalAlpha = 1; c.shadowBlur = 0;
  }

  // neon = true: versión encendida (mejora "letrero de neón")
  function draw(neon = false) {
    let c = s.ctx;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (neon) {
      c.fillStyle = '#17122a'; c.fillRect(0, 0, 256, 256);
      glow(c, 'ROUTE', 128, 36, slab(38), '#ff5fa8');
      glow(c, '66', 128, 130, slab(128), '#ffd76a');
      glow(c, 'GAS', 128, 226, slab(42), '#4fe0d2');
      c.strokeStyle = '#ff5fa8'; c.lineWidth = 6; c.shadowColor = '#ff5fa8'; c.shadowBlur = 16;
      c.strokeRect(10, 10, 236, 236); c.shadowBlur = 0;
    } else {
      // Diseño propio: franja roja, 66 grande, franja turquesa
      c.fillStyle = '#e4d3ae'; c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#a8412f'; c.fillRect(0, 0, 256, 62);
      c.fillStyle = '#2a8a84'; c.fillRect(0, 196, 256, 60);
      c.fillStyle = '#f0e4c6'; c.font = slab(38); c.fillText('ROUTE', 128, 33);
      c.fillStyle = '#2a2430'; c.font = slab(128); c.fillText('66', 128, 132);
      c.fillStyle = '#f0e4c6'; c.font = slab(40); c.fillText('GAS', 128, 228);
      c.globalAlpha = 0.16;
      c.fillStyle = '#7a4a30';
      for (let i = 0; i < 26; i++) c.fillRect((i * 97) % 256, (i * 53) % 256, 6 + (i % 5) * 7, 3 + (i % 3) * 4);
      c.globalAlpha = 1;
      c.strokeStyle = '#2a2430'; c.lineWidth = 10; c.strokeRect(5, 5, 246, 246);
    }
    s.tex.needsUpdate = true;

    // Letrero del techo
    c = r.ctx;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (neon) {
      c.fillStyle = '#17122a'; c.fillRect(0, 0, 512, 128);
      glow(c, 'G A S', 256, 68, slab(86), '#ff6a5a');
      c.strokeStyle = '#4fe0d2'; c.lineWidth = 5; c.shadowColor = '#4fe0d2'; c.shadowBlur = 14;
      c.strokeRect(10, 10, 492, 108); c.shadowBlur = 0;
    } else {
      c.fillStyle = '#d8c59d'; c.fillRect(0, 0, 512, 128);
      c.strokeStyle = '#8f3a2a'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116);
      c.fillStyle = '#8f3a2a'; c.font = slab(86); c.fillText('G A S', 256, 68);
      c.globalAlpha = 0.2; c.fillStyle = '#d8c59d';
      for (let i = 0; i < 30; i++) c.fillRect((i * 71) % 512, (i * 37) % 128, 10 + (i % 4) * 9, 4);
      c.globalAlpha = 1;
    }
    r.tex.needsUpdate = true;

    // Torreón: letras verticales "MARKET"
    c = tw.ctx;
    c.fillStyle = '#a8412f'; c.fillRect(0, 0, 96, 352);
    c.fillStyle = '#f0e4c6';
    c.font = slab(50); c.textAlign = 'center'; c.textBaseline = 'middle';
    [...'MARKET'].forEach((ch, i) => c.fillText(ch, 48, 34 + i * 57));
    tw.tex.needsUpdate = true;
  }
  draw();
  return { shield: s.tex, roof: r.tex, tower: tw.tex, draw };
}
