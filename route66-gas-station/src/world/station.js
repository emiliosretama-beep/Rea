// Estación abandonada (estado inicial). Devuelve colisionadores y puntos de interacción.
// Las mejoras de la Etapa 4 agregarán piezas alrededor sin mover lo esencial.
import * as THREE from 'three';
import { PAL } from '../config.js';
import { box, cyl, merge, tint, vertexMat } from './geo.js';

// Posiciones clave (las usarán también los autos y la caja en la Etapa 2)
export const LAYOUT = {
  lot: { x: 0, z: -22, w: 48, d: 32 },
  pump: { x: 0, z: -15 },
  island: { w: 5.2, d: 1.5 },
  building: { x: 0, z: -31, w: 16, d: 8, h: 4 },
  door: { x: -3, z: -27 },
  sign: { x: 18, z: -8.6 },
  register: { x: 4.5, z: -17.9 },
  laneZ: -12.9, // carril donde se detienen los autos, entre la carretera y la bomba
};

export function createStation(scene) {
  const L = LAYOUT;
  const parts = [];
  const colliders = [];
  const aabb = (x, z, w, d) => colliders.push({ type: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const circle = (x, z, r) => colliders.push({ type: 'circle', x, z, r });

  // Losa del patio
  parts.push(box(L.lot.w, 0.06, L.lot.d, PAL.concrete, L.lot.x, 0.03, L.lot.z));
  // Parches viejos de concreto, para que no se vea liso
  parts.push(box(9, 0.07, 6, 0x9a958d, -12, 0.035, -18));
  parts.push(box(7, 0.07, 9, 0xb7b2a9, 13, 0.035, -24));

  // Accesos desde la carretera (entrada al este, salida al oeste)
  for (const sx of [1, -1]) parts.push(box(26, 0.05, 7, PAL.concrete, sx * 25, 0.025, -7.6));

  // Mostrador con la caja registradora, a unos pasos de la bomba
  const rx = L.register.x, rz = L.register.z;
  parts.push(box(1.4, 1.0, 0.75, PAL.wood, rx, 0.56, rz));
  parts.push(box(1.5, 0.08, 0.85, 0x80583c, rx, 1.1, rz));
  parts.push(box(0.55, 0.3, 0.42, PAL.dark, rx, 1.29, rz));
  parts.push(box(0.5, 0.26, 0.3, PAL.red, rx, 1.55, rz - 0.05));
  parts.push(box(0.4, 0.12, 0.05, PAL.cream, rx, 1.57, rz + 0.11));
  parts.push(box(0.5, 0.05, 0.2, PAL.chrome, rx, 1.14, rz + 0.3));
  aabb(rx, rz, 1.5, 0.85);

  // Isla y bomba
  const px = L.pump.x, pz = L.pump.z;
  parts.push(box(L.island.w, 0.2, L.island.d, 0xc9c4ba, px, 0.16, pz));
  parts.push(box(0.72, 1.45, 0.5, PAL.red, px, 0.26 + 0.725, pz));
  parts.push(box(0.5, 0.42, 0.52, PAL.cream, px, 1.32, pz)); // carátula
  parts.push(box(0.3, 0.1, 0.54, PAL.dark, px, 1.3, pz)); // contador
  parts.push(box(0.8, 0.08, 0.58, PAL.chrome, px, 1.75, pz));
  const globe = new THREE.SphereGeometry(0.24, 8, 6);
  globe.translate(px, 2.03, pz);
  parts.push(tint(globe, 0xf2e6c4));
  parts.push(box(0.08, 0.5, 0.08, PAL.dark, px + 0.42, 1.2, pz)); // manguera colgada
  aabb(px, pz, L.island.w, L.island.d);

  // Techo de las bombas (marquesina)
  parts.push(box(12, 0.35, 7, PAL.cream, px, 4.3, pz));
  parts.push(box(12.12, 0.14, 7.12, PAL.teal, px, 4.16, pz));
  for (const sx of [-2.25, 2.25]) parts.push(box(0.32, 4.0, 0.32, PAL.cream, px + sx, 2.15, pz));

  // Edificio
  const b = L.building;
  const front = b.z + b.d / 2;
  parts.push(box(b.w, b.h, b.d, PAL.cream, b.x, b.h / 2, b.z));
  parts.push(box(b.w + 0.08, 0.42, b.d + 0.08, PAL.red, b.x, 3.25, b.z));
  parts.push(box(b.w + 0.08, 0.5, b.d + 0.08, 0x8f7f69, b.x, 0.25, b.z)); // zócalo
  parts.push(box(b.w + 1.2, 0.28, b.d + 1.4, 0x6b5a4e, b.x, b.h + 0.14, b.z)); // losa del techo
  // Puerta
  parts.push(box(1.3, 2.35, 0.1, PAL.wood, L.door.x, 1.2, front + 0.03));
  parts.push(box(0.1, 0.1, 0.08, PAL.chrome, L.door.x + 0.45, 1.15, front + 0.1));
  // Ventanas tapiadas
  for (const wx of [2.2, 5.8]) {
    parts.push(box(3.0, 1.6, 0.08, PAL.glass, wx, 1.9, front + 0.02));
    parts.push(box(3.3, 0.24, 0.07, PAL.wood, wx, 2.25, front + 0.08));
    parts.push(box(3.3, 0.24, 0.07, 0x80583c, wx + 0.06, 1.62, front + 0.08));
  }
  // Soportes del letrero del techo
  for (const sx of [-2.4, 2.4]) parts.push(box(0.12, 0.7, 0.12, PAL.dark, b.x + sx, b.h + 0.6, front - 0.6));
  aabb(b.x, b.z, b.w, b.d);

  // Cosas abandonadas junto a la fachada
  const drumX = -7.2, drumZ = front + 0.75;
  parts.push(cyl(0.3, 0.3, 0.9, 8, PAL.teal, drumX, 0.51, drumZ));
  parts.push(cyl(0.3, 0.3, 0.9, 8, 0x8a4b33, drumX + 0.7, 0.51, drumZ + 0.15));
  parts.push(box(0.8, 0.8, 0.8, PAL.wood, drumX + 1.6, 0.46, drumZ - 0.05));
  circle(drumX + 0.35, drumZ + 0.05, 0.75);
  circle(drumX + 1.6, drumZ, 0.6);
  for (let i = 0; i < 3; i++) parts.push(cyl(0.4, 0.4, 0.24, 9, PAL.dark, 8.9, 0.18 + i * 0.25, front + 0.8));
  circle(8.9, front + 0.8, 0.55);

  // Poste del letrero de carretera
  parts.push(cyl(0.13, 0.16, 4.9, 6, PAL.dark, L.sign.x, 2.45, L.sign.z));
  parts.push(box(0.16, 3.3, 3.3, PAL.dark, L.sign.x, 6.5, L.sign.z));
  circle(L.sign.x, L.sign.z, 0.3);

  const mesh = new THREE.Mesh(merge(parts), vertexMat);
  scene.add(mesh);

  // Letreros con textura de canvas
  const art = signTextures();
  const signMat = new THREE.MeshBasicMaterial({ map: art.shield });
  for (const dir of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), signMat);
    p.position.set(L.sign.x + dir * 0.09, 6.5, L.sign.z);
    p.rotation.y = dir * Math.PI / 2;
    scene.add(p);
  }
  const roofSign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.5), new THREE.MeshBasicMaterial({ map: art.roof }));
  roofSign.position.set(b.x, b.h + 1.55, front - 0.55);
  scene.add(roofSign);

  // Sombras falsas (el sol está al oeste: caen hacia el este)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x1a1020, transparent: true, opacity: 0.26, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const flat = (w, d, x, z) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, 0.07, z); return g; };
  const shadows = new THREE.Mesh(merge([
    flat(13, 7, px + 4.5, pz),
    flat(7, b.d + 1, b.x + b.w / 2 + 3.5, b.z),
    flat(3.4, 3.2, L.sign.x + 5, L.sign.z),
  ]), shadowMat);
  scene.add(shadows);

  const interactables = [
    { id: 'door', x: L.door.x, y: 1.3, z: front, prompt: 'promptDoor', toast: 'toastDoor' },
    { id: 'sign', x: L.sign.x, y: 1.6, z: L.sign.z, prompt: 'promptSign', toast: 'toastSign' },
    { id: 'drums', x: drumX + 0.5, y: 0.8, z: drumZ, prompt: 'promptDrum', toast: 'toastDrum' },
  ];

  return { colliders, interactables, redrawText: art.draw };
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

  function draw() {
    // Letrero de carretera: diseño propio (franja roja, 66 grande, franja turquesa)
    let c = s.ctx;
    c.fillStyle = '#e4d3ae'; c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#a8412f'; c.fillRect(0, 0, 256, 62);
    c.fillStyle = '#2a8a84'; c.fillRect(0, 196, 256, 60);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f0e4c6'; c.font = slab(38); c.fillText('ROUTE', 128, 33);
    c.fillStyle = '#2a2430'; c.font = slab(128); c.fillText('66', 128, 132);
    c.fillStyle = '#f0e4c6'; c.font = slab(40); c.fillText('GAS', 128, 228);
    // Desgaste: manchas claras y óxido
    c.globalAlpha = 0.16;
    c.fillStyle = '#7a4a30';
    for (let i = 0; i < 26; i++) c.fillRect((i * 97) % 256, (i * 53) % 256, 6 + (i % 5) * 7, 3 + (i % 3) * 4);
    c.globalAlpha = 1;
    c.strokeStyle = '#2a2430'; c.lineWidth = 10; c.strokeRect(5, 5, 246, 246);
    s.tex.needsUpdate = true;

    // Letrero del techo
    c = r.ctx;
    c.fillStyle = '#d8c59d'; c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#8f3a2a'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#8f3a2a'; c.font = slab(86); c.fillText('G A S', 256, 68);
    c.globalAlpha = 0.2; c.fillStyle = '#d8c59d';
    for (let i = 0; i < 30; i++) c.fillRect((i * 71) % 512, (i * 37) % 128, 10 + (i % 4) * 9, 4);
    c.globalAlpha = 1;
    r.tex.needsUpdate = true;
  }
  draw();
  return { shield: s.tex, roof: r.tex, draw };
}
