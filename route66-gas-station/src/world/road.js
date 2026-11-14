// La Ruta 66: asfalto, líneas, postes de teléfono y el "66" pintado.
import * as THREE from 'three';
import { CFG, PAL } from '../config.js';
import { cyl, box, merge, addGrain } from './geo.js';

export function createRoad(scene) {
  const { width, length } = CFG.road;
  const flat = (w, d) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return g; };
  // polygonOffset evita parpadeos entre capas pegadas al suelo
  const layer = (color, n, gs, gk) => addGrain(new THREE.MeshLambertMaterial({
    color, polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n,
  }), gs, gk);

  const shoulder = new THREE.Mesh(flat(length, width + 5), layer(PAL.sandDark, 1, 0.5, 0.3));
  shoulder.position.y = 0.01;
  const asphalt = new THREE.Mesh(flat(length, width), layer(PAL.asphalt, 2, 0.9, 0.3));
  shoulder.receiveShadow = asphalt.receiveShadow = true;
  asphalt.position.y = 0.02;
  scene.add(shoulder, asphalt);

  // Marcas oscuras donde pisan las llantas (dos por carril)
  const trackMat = new THREE.MeshBasicMaterial({
    color: 0x14121a, transparent: true, opacity: 0.22, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2.5, polygonOffsetUnits: -2.5,
  });
  const tracks = [];
  for (const lane of [CFG.road.laneZ, -CFG.road.laneZ]) {
    for (const s of [-0.8, 0.8]) { const g = flat(length, 0.55); g.translate(0, 0.025, lane + s); tracks.push(g); }
  }
  scene.add(new THREE.Mesh(merge(tracks), trackMat));

  // Líneas de orilla (2) y línea central discontinua (instanciada)
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xe9dcc0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  for (const z of [-width / 2 + 0.35, width / 2 - 0.35]) {
    const edge = new THREE.Mesh(flat(length, 0.16), lineMat);
    edge.position.set(0, 0.03, z);
    scene.add(edge);
  }
  const step = 9;
  const n = Math.floor(length / step);
  const dashMat = new THREE.MeshBasicMaterial({
    color: 0xe8b23a, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const dashes = new THREE.InstancedMesh(flat(3.2, 0.2), dashMat, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    o.position.set(-length / 2 + i * step + step / 2, 0.03, 0);
    o.updateMatrix();
    dashes.setMatrixAt(i, o.matrix);
  }
  scene.add(dashes);

  // Postes de teléfono del otro lado de la carretera
  const poleGeo = merge([
    cyl(0.11, 0.15, 8, 6, PAL.wood, 0, 4, 0),
    box(0.14, 0.14, 2.4, PAL.wood, 0, 7.3, 0),
    box(0.12, 0.12, 1.6, PAL.wood, 0, 6.6, 0),
  ]);
  const poleStep = 46;
  const poleCount = Math.floor(length / poleStep);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), poleCount);
  for (let i = 0; i < poleCount; i++) {
    o.position.set(-length / 2 + i * poleStep + 11, 0, width / 2 + 4.5);
    o.updateMatrix();
    poles.setMatrixAt(i, o.matrix);
  }
  scene.add(poles);

  // "ROUTE 66" pintado en el asfalto, legible desde la estación
  const paint = paintTexture();
  const g = new THREE.PlaneGeometry(7, 7);
  g.rotateX(-Math.PI / 2);
  g.rotateY(Math.PI);
  const mark = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    map: paint.texture, transparent: true, opacity: 0.82, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  mark.position.set(-13, 0.035, 0);
  scene.add(mark);

  return { redrawText: paint.draw };
}

function paintTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  function draw() {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#efe6d2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '44px "Alfa Slab One", Impact, serif';
    ctx.fillText('ROUTE', 128, 62);
    ctx.font = '150px "Alfa Slab One", Impact, serif';
    ctx.fillText('66', 128, 168);
    texture.needsUpdate = true;
  }
  draw();
  return { texture, draw };
}
