// Ayudantes para construir geometría low-poly con color por vértice.
// Varias piezas se fusionan en una sola malla = una sola llamada de dibujo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

export function tint(geo, hex) {
  _c.set(hex);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

export function box(w, h, d, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return tint(g, hex);
}

export function cyl(rTop, rBottom, h, seg, hex, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Rueda: cilindro con el eje a lo ancho del auto (eje Z)
export function wheel(r, w, hex, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, w, 12);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Perfil lateral (x, y) extruido a lo ancho (z): da siluetas con curvas baratas, como la de un auto
export function extrude(shape, depth, hex) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 });
  g.translate(0, 0, -depth / 2);
  return tint(g, hex);
}

export function shapeOf(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

// Lámina delgada apoyada sobre una pendiente del perfil (parabrisas, medallón)
export function slopePanel(x1, y1, x2, y2, width, hex, trim = 0.07) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const g = new THREE.BoxGeometry(len - trim * 2, 0.04, width);
  g.rotateZ(Math.atan2(dy, dx));
  let nx = dy / len, ny = -dx / len; // normal hacia afuera = la que apunta hacia arriba
  if (ny < 0) { nx = -nx; ny = -ny; }
  g.translate((x1 + x2) / 2 + nx * 0.012, (y1 + y2) / 2 + ny * 0.012, 0);
  return tint(g, hex);
}

// Cilindro con el eje a lo largo del auto (faros)
export function cylX(r, len, seg, hex, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return tint(g, hex);
}

export function merge(list) {
  // Las extrusiones no traen índices: se igualan todas para poder fusionarlas
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = mergeGeometries(flat, false);
  list.forEach((x) => x.dispose());
  flat.forEach((x) => x.dispose());
  return out;
}

// Material único para todo lo que usa color por vértice
export const vertexMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

// Aleatorio determinista: el mundo queda igual en cada carga
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Grano de material ----------
// Una textura de ruido que se repite sin costura, proyectada en coordenadas del mundo según hacia dónde mira
// cada cara. Le da textura a concreto, paredes, tierra y asfalto sin UVs ni imágenes pesadas.
let grainTex = null;
function grainTexture() {
  if (grainTex) return grainTex;
  const N = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(N, N);
  const rand = rng(1966);
  // Ruido de valor con varias octavas; cada rejilla se repite para que el borde empate
  const octaves = [[4, 0.45], [8, 0.27], [16, 0.16], [64, 0.12]].map(([cells, amp]) => {
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    return { cells, amp, g };
  });
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = 0;
      for (const o of octaves) {
        const fx = (x / N) * o.cells, fy = (y / N) * o.cells;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = smooth(fx - x0), ty = smooth(fy - y0);
        const at = (i, j) => o.g[((j % o.cells) * o.cells) + (i % o.cells)];
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        v += (a + (b - a) * ty) * o.amp;
      }
      const c = Math.max(0, Math.min(255, Math.round(v * 255)));
      const k = (y * N + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = c;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  grainTex = new THREE.CanvasTexture(cv);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.colorSpace = THREE.NoColorSpace;
  return grainTex;
}

// scale: repeticiones por metro · strength: cuánto oscurece/aclara (0 a 1)
export function addGrain(mat, scale = 0.35, strength = 0.16) {
  const tex = grainTexture();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.grainMap = { value: tex };
    shader.uniforms.grainParams = { value: new THREE.Vector2(scale, strength) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 grainP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          grainP = instanceMatrix * grainP;
        #endif
        vGrainPos = (modelMatrix * grainP).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos;\nuniform sampler2D grainMap;\nuniform vec2 grainParams;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 gn = abs(normalize(cross(dFdx(vGrainPos), dFdy(vGrainPos))));
          vec2 guv = gn.y > 0.6 ? vGrainPos.xz : (gn.x > gn.z ? vGrainPos.zy : vGrainPos.xy);
          float g = texture2D(grainMap, guv * grainParams.x).r * 0.6 + texture2D(grainMap, guv * grainParams.x * 5.3).r * 0.4;
          diffuseColor.rgb *= 1.0 + (g - 0.5) * grainParams.y * 2.0;
        }`);
  };
  mat.customProgramCacheKey = () => 'grain';
  return mat;
}

addGrain(vertexMat, 0.4, 0.14);

// ---------- Formas redondeadas (para que los objetos se reconozcan) ----------
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Caja con esquinas redondeadas
export function rbox(w, h, d, r, hex, x = 0, y = 0, z = 0, seg = 1) {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
  g.translate(x, y, z);
  return tint(g, hex);
}

// Cápsula vertical (extremidades, botellas)
export function capsule(r, len, hex, x = 0, y = 0, z = 0, seg = 6) {
  const g = new THREE.CapsuleGeometry(r, len, 2, seg);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Pieza de torno: perfil [[radio, altura], ...] girado alrededor del eje vertical
export function lathe(profile, hex, x = 0, y = 0, z = 0, seg = 12) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  g.translate(x, y, z);
  return tint(g, hex);
}

// Tubo que sigue una curva (mangueras)
export function tube(points, r, hex, seg = 16) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return tint(new THREE.TubeGeometry(curve, seg, r, 6, false), hex);
}
