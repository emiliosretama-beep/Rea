// Renderer, cámara, cielo de atardecer, luces y terreno.
import * as THREE from 'three';
import { CFG, PAL } from '../config.js';
import { rng, addGrain } from './geo.js';
import { LEVELS } from '../core/quality.js';

// Dirección hacia el sol: bajo, al oeste (−X), al fondo de la carretera
export const SUN_DIR = new THREE.Vector3(-1, 0.17, 0.2).normalize();
// La luz que proyecta sombras viene un poco más alta que el disco del sol: sombras largas pero legibles
const LIGHT_DIR = new THREE.Vector3(-1, 0.58, 0.32).normalize();
const SHADOW_CENTER = new THREE.Vector3(0, 0, -21); // centro de la estación

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe79a6b, 70, 380);

  const camera = new THREE.PerspectiveCamera(CFG.fov, 1, 0.15, 700);
  camera.rotation.order = 'YXZ';

  // Luces: cielo cálido + sol de atardecer. Las sombras solo cubren la estación (donde se juega).
  scene.add(new THREE.HemisphereLight(0xffd6b0, 0x7a4e44, 1.55));
  const sun = new THREE.DirectionalLight(0xffb27a, 2.9);
  sun.position.copy(SHADOW_CENTER).addScaledVector(LIGHT_DIR, 90);
  sun.target.position.copy(SHADOW_CENTER);
  scene.add(sun, sun.target);
  const sc = sun.shadow.camera;
  sc.left = -48; sc.right = 48; sc.top = 36; sc.bottom = -36; sc.near = 20; sc.far = 190;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 2.5;

  const sky = buildSky();
  scene.add(sky);

  // Suelo del desierto
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    addGrain(new THREE.MeshLambertMaterial({ color: PAL.sand }), 0.06, 0.32),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.noCast = true;
  scene.add(ground);

  const dust = buildDust();
  scene.add(dust.points);

  const mesas = buildMesas();
  mesas.userData.noCast = true; // muy lejos: no hace falta que proyecten sombra
  scene.add(mesas);

  let maxRatio = CFG.maxPixelRatio;
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? CFG.fovPortrait : CFG.fov;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Cambia sombras y resolución según la calidad elegida
  function setQuality(level) {
    const L = LEVELS[level];
    maxRatio = Math.min(CFG.maxPixelRatio, L.pixelRatio);
    const on = L.shadow > 0;
    if (renderer.shadowMap.enabled !== on) {
      renderer.shadowMap.enabled = on;
      // Los materiales deben recompilarse al encender o apagar las sombras
      scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    }
    sun.castShadow = on;
    if (on && sun.shadow.mapSize.x !== L.shadow) {
      sun.shadow.mapSize.set(L.shadow, L.shadow);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    resize();
    return on;
  }

  return {
    renderer, scene, camera, setQuality,
    // El cielo y el polvo siguen a la cámara
    update(dt) {
      sky.position.copy(camera.position);
      dust.update(dt, camera.position);
    },
  };
}

function buildSky() {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(600, 24, 14);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const horizon = new THREE.Color(0xffb35c);
  const glow = new THREE.Color(0xffe2a0);
  const mid = new THREE.Color(0xe0607a);
  const top = new THREE.Color(0x3b2f6b);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const h = Math.max(0, v.y);
    if (h < 0.22) c.copy(horizon).lerp(mid, h / 0.22);
    else c.copy(mid).lerp(top, Math.min(1, (h - 0.22) / 0.55));
    // Resplandor alrededor del sol
    const near = Math.max(0, v.dot(SUN_DIR));
    c.lerp(glow, Math.pow(near, 6) * 0.85);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false,
  }));
  dome.renderOrder = -2;
  group.add(dome);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false, depthWrite: false, toneMapped: false }),
  );
  disc.position.copy(SUN_DIR).multiplyScalar(580);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -1;
  group.add(disc);

  // Nubes alargadas del atardecer: planos con una textura suave, iluminados por el sol desde abajo
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const x = 30 + r() * 196, y = 22 + r() * 22, rad = 12 + r() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const cloudTex = new THREE.CanvasTexture(cv);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  const cloudColors = [0xffb48a, 0xff9a8e, 0xf3a0b4, 0xffcf9a];
  for (let i = 0; i < 9; i++) {
    const ang = -0.9 + r() * 4.2 + Math.PI * 0.5;
    const dist = 470 + r() * 60;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(260 + r() * 160, 40 + r() * 26),
      new THREE.MeshBasicMaterial({ map: cloudTex, color: cloudColors[i % 4], transparent: true, opacity: 0.55 + r() * 0.3, fog: false, depthWrite: false, toneMapped: false }),
    );
    m.position.set(Math.cos(ang) * dist, 70 + r() * 110, Math.sin(ang) * dist);
    m.lookAt(0, m.position.y * 0.6, 0);
    m.renderOrder = -1;
    group.add(m);
  }
  return group;
}

// Polvo dorado que flota en el aire alrededor del jugador
function buildDust() {
  const N = 160, R = 16;
  const pos = new Float32Array(N * 3);
  const r = rng(9);
  for (let i = 0; i < N; i++) { pos[i * 3] = (r() * 2 - 1) * R; pos[i * 3 + 1] = r() * 4; pos[i * 3 + 2] = (r() * 2 - 1) * R; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffe2b0, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true,
  }));
  points.frustumCulled = false;
  let t = 0;
  return {
    points,
    update(dt, cam) {
      t += dt;
      // El grupo sigue a la cámara en saltos de una celda para que el polvo no "viaje" con ella
      points.position.set(Math.round(cam.x / R) * R, 0, Math.round(cam.z / R) * R);
      points.rotation.y = Math.sin(t * 0.05) * 0.2;
      points.position.y = Math.sin(t * 0.3) * 0.15;
    },
  };
}

// Mesetas lejanas: una sola malla instanciada
function buildMesas() {
  const rand = rng(66);
  const count = 26;
  const geo = new THREE.CylinderGeometry(0.72, 1, 1, 7);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, addGrain(new THREE.MeshLambertMaterial({ color: PAL.mesa, flatShading: true }), 0.02, 0.35), count);
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand() * 0.2;
    const dist = 250 + rand() * 120;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    // Dejar libre el corredor de la carretera
    if (Math.abs(z) < 60) { o.position.set(x, -200, z); }
    else o.position.set(x, 0, z);
    o.scale.set(30 + rand() * 60, 18 + rand() * 38, 30 + rand() * 50);
    o.rotation.y = rand() * Math.PI;
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
