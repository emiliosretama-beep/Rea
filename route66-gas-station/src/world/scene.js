// Renderer, cámara, cielo de atardecer, luces y terreno.
import * as THREE from 'three';
import { CFG, PAL } from '../config.js';
import { rng } from './geo.js';

// Dirección hacia el sol: bajo, al oeste (−X), al fondo de la carretera
export const SUN_DIR = new THREE.Vector3(-1, 0.17, 0.2).normalize();

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe79a6b, 70, 380);

  const camera = new THREE.PerspectiveCamera(CFG.fov, 1, 0.15, 700);
  camera.rotation.order = 'YXZ';

  // Luces: sin sombras en tiempo real (se usan sombras falsas en el suelo)
  scene.add(new THREE.HemisphereLight(0xffd2a8, 0x8a5a48, 1.5));
  const sun = new THREE.DirectionalLight(0xffb070, 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(sun);

  const sky = buildSky();
  scene.add(sky);

  // Suelo del desierto
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: PAL.sand }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  scene.add(buildMesas());

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? CFG.fovPortrait : CFG.fov;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer, scene, camera,
    // El cielo sigue a la cámara para que nunca se alcance
    update() { sky.position.copy(camera.position); },
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
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  dome.renderOrder = -2;
  group.add(dome);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false, depthWrite: false }),
  );
  disc.position.copy(SUN_DIR).multiplyScalar(580);
  disc.lookAt(0, 0, 0);
  disc.renderOrder = -1;
  group.add(disc);
  return group;
}

// Mesetas lejanas: una sola malla instanciada
function buildMesas() {
  const rand = rng(66);
  const count = 26;
  const geo = new THREE.CylinderGeometry(0.72, 1, 1, 7);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: PAL.mesa, flatShading: true }), count);
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
