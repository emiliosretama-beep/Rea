// La estación: patio, barda, bomba, caja y la tienda (con interior).
// Empieza abandonada: tablas en puerta y ventanas, sin luz y con el letrero apagado.
// Las mejoras de la Etapa 4 agregarán piezas alrededor sin mover lo esencial.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge, tint, vertexMat, addGrain } from './geo.js';

// Posiciones clave
export const LAYOUT = {
  lot: { x: 0, z: -22, w: 48, d: 32 },
  yard: { minX: -39, maxX: 39, minZ: -40.5, maxZ: -6.2 }, // terreno cercado por la barda
  island: { x: 0, z: -15, w: 5.2, d: 1.5 },
  pumps: [{ x: -1.2, z: -15 }, { x: 1.2, z: -15 }], // la segunda es una mejora
  // Carriles donde paran los autos: norte y sur de la isla, y uno de servicios más al sur
  lanes: { north: -12.9, south: -17.1, service: -21.2 },
  garage: { x: 9.5, ctrlZ: -23.7 },
  carwash: { x: -9.5, ctrlZ: -23.5 },
  building: { x: 0, z: -31, w: 16, d: 8, h: 4 },
  door: { x: -3, w: 1.3, h: 2.35 },
  windows: [{ x: 2.2, w: 3.0 }, { x: 5.8, w: 3.0 }],
  winY: [1.1, 2.7],
  fuse: { x: -6.3, z: -34.6 },
  sign: { x: 18, z: -8.6 },
  // Dentro de la tienda: caja junto a la puerta, refrigerador y estantes al fondo
  counter: { x: -0.3, z: -29.3, w: 2.8, d: 0.8 },
  register: { x: -1.0, z: -29.3 },
  fridge: { x: -3.4, w: 2.0 },
  shelves: [{ x: 0.2, w: 2.4 }, { x: 3.2, w: 2.4 }],
  // Cajones de estacionamiento al oeste de la tienda (los autos entran por el norte y salen por el sur)
  stalls: [-17.5, -21, -24.5, -28],
  stallZ: -26.8,
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
  parts.push(box(16, 0.07, 9.4, 0x4b4753, -22.8, 0.035, L.stallZ - 0.4));
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
  parts.push(box(12, 0.35, 7, PAL.cream, ix, 4.3, iz));
  parts.push(box(12.12, 0.14, 7.12, PAL.teal, ix, 4.16, iz));
  for (const sx of [-2.25, 2.25]) {
    parts.push(box(0.32, 4.0, 0.32, PAL.cream, ix + sx, 2.15, iz));
    aabb(ix + sx, iz, 0.32, 0.32);
  }
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
  inside.push(box(iw, 0.04, id, 0x7d9a92, b.x, 0.08, b.z)); // piso
  inside.push(box(iw, 0.04, id, 0xd8ccb0, b.x, b.h - 0.02, b.z)); // techo
  inside.push(box(iw, b.h, 0.04, INNER, b.x, b.h / 2, back + T + 0.02));
  inside.push(box(0.04, b.h, id, INNER, x0 + T + 0.02, b.h / 2, b.z));
  inside.push(box(0.04, b.h, id, INNER, x1 - T - 0.02, b.h / 2, b.z));
  // Mostrador con la caja registradora, junto a la puerta
  const C = L.counter;
  inside.push(box(C.w, 1.0, C.d, PAL.wood, C.x, 0.6, C.z));
  inside.push(box(C.w + 0.14, 0.07, C.d + 0.14, 0x80583c, C.x, 1.13, C.z));
  inside.push(box(0.55, 0.3, 0.42, PAL.dark, L.register.x, 1.32, L.register.z));
  inside.push(box(0.5, 0.26, 0.3, PAL.red, L.register.x, 1.58, L.register.z + 0.05));
  inside.push(box(0.4, 0.12, 0.05, PAL.cream, L.register.x, 1.6, L.register.z - 0.11));
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
  const drumX = -7.2, drumZ = front + 0.75;
  const junk = [
    cyl(0.3, 0.3, 0.9, 8, PAL.teal, drumX, 0.51, drumZ),
    cyl(0.3, 0.3, 0.9, 8, 0x8a4b33, drumX + 0.7, 0.51, drumZ + 0.15),
    box(0.8, 0.8, 0.8, PAL.wood, drumX + 1.6, 0.46, drumZ - 0.05),
  ];
  for (let i = 0; i < 3; i++) junk.push(cyl(0.4, 0.4, 0.24, 9, PAL.dark, 8.9, 0.18 + i * 0.25, front + 0.8));
  // Poste del letrero de carretera
  junk.push(cyl(0.13, 0.16, 4.9, 6, PAL.dark, L.sign.x, 2.45, L.sign.z));
  junk.push(box(0.16, 3.3, 3.3, PAL.dark, L.sign.x, 6.5, L.sign.z));
  scene.add(new THREE.Mesh(merge(junk), vertexMat));
  circle(drumX + 0.35, drumZ + 0.05, 0.75);
  circle(drumX + 1.6, drumZ, 0.6);
  circle(8.9, front + 0.8, 0.55);
  circle(L.sign.x, L.sign.z, 0.3);

  // Letreros con textura de canvas (apagados hasta que haya luz / se abra)
  const art = signTextures();
  const signMat = new THREE.MeshBasicMaterial({ map: art.shield });
  for (const dir of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), signMat);
    p.position.set(L.sign.x + dir * 0.09, 6.5, L.sign.z);
    p.rotation.y = dir * Math.PI / 2;
    scene.add(p);
  }
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
    flat(3.4, 3.2, L.sign.x + 5, L.sign.z),
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
  }
  function setOpen(on) { signMat.color.set(on || neon ? 0xffffff : 0x8a8580); }

  // dt y lista de puntos {x, z} que abren la puerta (jugador y clientes)
  function update(dt, near) {
    for (let k = falling.length - 1; k >= 0; k--) {
      const f = falling[k];
      f.t += dt;
      if (f.t > 0.75) { falling.splice(k, 1); placeBoard(f.i, 0); } else placeBoard(f.i, f.t);
    }
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
    redrawText: () => art.draw(neon),
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
  spots.push([LAYOUT.garage.x, LAYOUT.lanes.service, 2.4]);
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
    parts.push(box(1.4, 0.02, 0.14, WHITE, x, 0.08, L.stallZ + 2.7)); // tope de entrada
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
  }
  draw();
  return { shield: s.tex, roof: r.tex, draw };
}
