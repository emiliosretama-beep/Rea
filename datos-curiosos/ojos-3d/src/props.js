import * as THREE from 'three';
import { materials } from './materials.js';
import { glowTexture, rng } from './textures.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const box = (w, h, d, mat, p = [0, 0, 0], r = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(...p); m.rotation.set(...r); return m;
};

// ---------- pistol (barrel along +x, muzzle at .muzzle) ----------
export function pistol() {
  const M = materials();
  const g = new THREE.Group();
  g.add(box(0.19, 0.036, 0.03, M.gun, [0, 0.03, 0]));
  for (let i = 0; i < 7; i++) g.add(box(0.003, 0.03, 0.031, M.gunDark, [-0.085 + i * 0.007, 0.032, 0]));
  g.add(box(0.05, 0.012, 0.031, M.gunDark, [0.02, 0.03, 0])); // ejection port
  g.add(box(0.17, 0.022, 0.026, M.gunDark, [0.005, 0.003, 0]));
  const grip = box(0.04, 0.115, 0.03, M.gunDark, [-0.065, -0.052, 0], [0, 0, 0.22]); g.add(grip);
  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 8, 20, Math.PI), M.gunDark);
  tg.rotation.z = Math.PI; tg.position.set(-0.012, -0.008, 0); g.add(tg);
  g.add(box(0.004, 0.018, 0.006, M.gunDark, [-0.014, -0.015, 0], [0, 0, 0.3]));
  g.add(box(0.008, 0.008, 0.006, M.gunDark, [0.088, 0.052, 0]));
  g.add(box(0.012, 0.008, 0.02, M.gunDark, [-0.088, 0.052, 0]));
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 16), M.mouth);
  bore.rotation.z = Math.PI / 2; bore.position.set(0.0955, 0.03, 0); g.add(bore);
  g.muzzle = new THREE.Vector3(0.1, 0.03, 0);
  return shadow(g);
}

// first person arm holding the pistol (pistol frame = arm frame)
export function gunArm() {
  const M = materials();
  const g = new THREE.Group();
  const gun = pistol(); g.add(gun);
  const hand = new THREE.Group(); g.add(hand);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 24), M.skin);
  palm.scale.set(0.95, 1.1, 0.8); palm.position.set(-0.075, -0.06, 0); hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.035, 4, 10), M.skin);
    f.rotation.x = Math.PI / 2; f.position.set(-0.045 - i * 0.004, -0.03 - i * 0.022, 0.026); hand.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.05, 4, 10), M.skin);
  th.rotation.set(0, 0, -1.2); th.position.set(-0.04, 0.0, -0.022); hand.add(th);
  const fa = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.45, 8, 20), M.skin);
  fa.rotation.z = 1.05; fa.position.set(-0.29, -0.2, 0); hand.add(fa);
  g.muzzle = gun.muzzle;
  return shadow(g);
}

// ---------- bullet (nose along +y) with mushroom morph ----------
export function bullet(scale = 1) {
  const M = materials();
  const A = [[0, 0], [0.0052, 0], [0.0057, 0.0015], [0.0057, 0.006], [0.0057, 0.0105], [0.0052, 0.0135], [0.0042, 0.016], [0.0026, 0.0178], [0, 0.0186]];
  const B = [[0, 0.001], [0.0052, 0.001], [0.006, 0.0025], [0.0068, 0.006], [0.0095, 0.0085], [0.0125, 0.0098], [0.0118, 0.0108], [0.006, 0.0112], [0, 0.0112]];
  const smoothP = (P) => { const c = new THREE.SplineCurve(P.map(([r, y]) => new THREE.Vector2(r, y))); return c.getPoints(28); };
  const mk = (P) => new THREE.LatheGeometry(smoothP(P), 64);
  const ga = mk(A), gb = mk(B);
  // jagged splatter on the mushroom
  const p = gb.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const rad = Math.hypot(x, z);
    if (rad > 0.0065) { const a = Math.atan2(z, x); const k = 1 + (Math.sin(a * 6) * 0.09 + Math.sin(a * 11 + 1.3) * 0.05) * ((rad - 0.0065) / 0.006); p.setX(i, x * k); p.setZ(i, z * k); }
  }
  ga.morphAttributes.position = [gb.attributes.position];
  ga.computeVertexNormals();
  const m = new THREE.Mesh(ga, M.copper.clone());
  m.material.emissive = new THREE.Color(0x7a2408);
  m.scale.setScalar(scale);
  m.morphTargetInfluences = [0];
  m.castShadow = true;
  return m;
}

// ---------- sword (blade along +y, origin at grip) ----------
export function sword() {
  const M = materials();
  const g = new THREE.Group();
  const bg = new THREE.BoxGeometry(0.05, 0.85, 0.008, 1, 16, 1);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.425, t = y / 0.85;
    const w = t > 0.88 ? (1 - t) / 0.12 : 1 - t * 0.25;
    p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * (Math.abs(p.getX(i)) > 0.015 ? 0.35 : 1));
  }
  bg.translate(0, 0.425 + 0.09, 0); bg.computeVertexNormals();
  g.add(new THREE.Mesh(bg, M.steelBright));
  g.add(box(0.008, 0.6, 0.0095, M.steelDark, [0, 0.4, 0]));
  g.add(box(0.2, 0.022, 0.03, M.steelDark, [0, 0.08, 0]));
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12), M.leather); g.add(gr);
  const pm = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), M.steelDark); pm.position.y = -0.08; g.add(pm);
  g.tip = new THREE.Vector3(0, 0.94, 0);
  return shadow(g);
}

// ---------- heater shield (front +z) ----------
export function shield() {
  const M = materials();
  const s = new THREE.Shape();
  s.moveTo(-0.27, 0.32); s.lineTo(0.27, 0.32);
  s.bezierCurveTo(0.29, 0.0, 0.2, -0.25, 0, -0.42);
  s.bezierCurveTo(-0.2, -0.25, -0.29, 0.0, -0.27, 0.32);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 3, curveSegments: 32 });
  // curve it a bit
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) - x * x * 0.5); }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, M.steel));
  const pts = s.getSpacedPoints(26);
  for (const q of pts) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.steelDark); r.position.set(q.x * 0.9, q.y * 0.9, 0.034 - q.x * q.x * 0.45); g.add(r); }
  return shadow(g);
}

// ---------- spiked mace (handle along +y, origin at grip) ----------
export function mace() {
  const M = materials();
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.62, 16), M.steelDark); h.position.y = 0.2; g.add(h);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 16), M.leather); g.add(wrap);
  const head = new THREE.Group(); head.position.y = 0.53; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 24), M.steel));
  const N = 22;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 12), M.steelBright);
    c.position.copy(dir.clone().multiplyScalar(0.085));
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.add(c);
  }
  g.head = head;
  return shadow(g);
}

// ---------- arrow (points +z, tip at origin) ----------
export function arrow() {
  const M = materials();
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.74, 10), M.wood);
  sh.rotation.x = Math.PI / 2; sh.position.z = -0.42; g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.055, 4), M.steelDark);
  hd.rotation.x = Math.PI / 2; hd.position.z = -0.027; g.add(hd);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.1), M.feather);
    const a = i * Math.PI * 2 / 3;
    f.rotation.set(0, 0, a); f.rotateX(Math.PI / 2); f.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, -0.72);
    g.add(f);
  }
  return shadow(g);
}

// ---------- bow (vertical, faces +z, grip at origin), dynamic draw ----------
export function bow() {
  const M = materials();
  const g = new THREE.Group();
  const L = 0.72;
  const limbMesh = new THREE.Mesh(new THREE.BufferGeometry(), M.woodDark); g.add(limbMesh);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12), M.leather); g.add(grip);
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 6), M.string);
  const s2 = s1.clone(); g.add(s1, s2);
  const tmp = new THREE.Vector3();
  function seg(m, a, b) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    tmp.subVectors(b, a); m.scale.set(1, tmp.length(), 1);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
  }
  g.nock = new THREE.Vector3();
  g.update = (draw) => {
    const k = 0.1 + 0.16 * draw;
    const ys = L * (1 - 0.06 * draw);
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * 2 - 1;
      pts.push(new THREE.Vector3(0, t * ys, -k * t * t - 0.02 * Math.abs(t) ** 4 * (1 - draw)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    limbMesh.geometry.dispose();
    limbMesh.geometry = new THREE.TubeGeometry(curve, 48, 0.011, 8, false);
    const top = pts[24], bot = pts[0];
    g.nock.set(0, 0.035, -k - 0.02 - 0.58 * draw);
    seg(s1, top, g.nock); seg(s2, bot, g.nock);
  };
  g.update(0);
  return shadow(g);
}

// ---------- wooden armor stand ----------
export function stand() {
  const M = materials();
  const g = new THREE.Group();
  g.add(box(0.075, 1.5, 0.075, M.wood, [0, 0.75, 0]));
  g.add(box(0.4, 0.06, 0.07, M.wood, [0, 1.38, 0]));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5;
    const leg = box(0.06, 0.55, 0.06, M.wood);
    leg.position.set(Math.cos(a) * 0.2, 0.2, Math.sin(a) * 0.2);
    leg.lookAt(Math.cos(a) * 2, 0.2, Math.sin(a) * 2); leg.rotateX(Math.PI / 2 - 0.65);
    g.add(leg);
    g.add(box(0.12, 0.05, 0.09, M.wood, [Math.cos(a) * 0.38, 0.025, Math.sin(a) * 0.38], [0, -a, 0]));
  }
  return shadow(g);
}

// ---------- effects ----------
let _glow;
export function glowSprite(color = 0xffffff, size = 1) {
  _glow = _glow || glowTexture();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glow, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

// deterministic spark burst: update(dt since burst)
export function sparks(count = 60, { speed = 2.5, spread = 1, gravity = -6, life = 0.6, color = [1, 0.75, 0.3], size = 0.02, seed = 9, dir = new THREE.Vector3(0, 0, 1) } = {}) {
  const r = rng(seed);
  _glow = _glow || glowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: _glow, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  const V = [], Lf = [];
  const d = dir.clone().normalize();
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(spread).add(d).normalize().multiplyScalar(speed * (0.3 + r() * 0.9));
    V.push(v); Lf.push(life * (0.4 + r() * 0.8));
  }
  pts.update = (t) => {
    for (let i = 0; i < count; i++) {
      const tt = Math.max(0, t), v = V[i];
      pos[i * 3] = v.x * tt; pos[i * 3 + 1] = v.y * tt + 0.5 * gravity * tt * tt; pos[i * 3 + 2] = v.z * tt;
      const a = t < 0 ? 0 : Math.max(0, 1 - tt / Lf[i]);
      col[i * 3] = color[0] * a * 3; col[i * 3 + 1] = color[1] * a * 3; col[i * 3 + 2] = color[2] * a * 3;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  };
  pts.update(-1);
  return pts;
}

// glowing tracer streak between two points
export function streak(color = 0xfff2dd) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const tmp = new THREE.Vector3();
  m.set = (a, b, r = 0.003, op = 0.7) => {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    tmp.subVectors(b, a); const L = tmp.length();
    m.scale.set(r, Math.max(L, 1e-4), r);
    if (L > 1e-5) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
    m.material.opacity = op; m.visible = op > 0.001 && L > 1e-4;
  };
  return m;
}

// ---------- red impact ripple overlay ----------
const NOISE = `
float h3(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;
export function rippleOverlay(target) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCenter: { value: new THREE.Vector3() }, uRadius: { value: 0 }, uAmp: { value: 0 },
      uTime: { value: 0 }, uRings: { value: 160 }, uSpot: { value: 0.04 }, uBlot: { value: 0 }, uSpotAmp: { value: 1 },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: NOISE + `
      uniform vec3 uCenter; uniform float uRadius,uAmp,uTime,uRings,uSpot,uBlot,uSpotAmp; varying vec3 vPos;
      void main(){
        float d = distance(vPos,uCenter);
        float front = 1.0 - smoothstep(uRadius*0.75, uRadius, d);
        float wob = n3(vPos*30.0)*0.012;
        float rings = pow(0.5+0.5*sin((d+wob*0.4)*uRings - uTime*9.0), 7.0);
        float fall = mix(1.0, 0.45, clamp(d/max(uRadius,1e-3),0.,1.));
        float bl = smoothstep(0.55, 0.8, n3(vPos*22.0 + vec3(0.,uTime*0.3,0.))*0.7 + n3(vPos*60.0)*0.3);
        float core = exp(-d*d/(uSpot*uSpot));
        float a = (rings*0.85*fall)*front*uAmp + bl*uBlot*front + core*uSpotAmp*uAmp;
        a = clamp(a,0.,1.);
        vec3 c = mix(vec3(0.9,0.05,0.06), vec3(1.0,0.45,0.42), core*0.6 + rings*0.25);
        gl_FragColor = vec4(c*(1.0+core*0.8), a*0.88);
      }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.FrontSide,
  });
  const m = new THREE.Mesh(target.geometry, mat);
  m.renderOrder = 5;
  target.add(m);
  return m;
}

// =====================================================================
// Operación de ojos con láser (LASIK). Escala: el globo ocular mide 1 de radio
// y mira hacia +Z. Todo es procedural (sin imágenes externas).
// =====================================================================
function lienzo(w, h, dibujar, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Blanco del ojo con venitas rojas suaves.
function texturaEsclerotica() {
  return lienzo(1024, 512, (g, w, h) => {
    g.fillStyle = '#ece2d8'; g.fillRect(0, 0, w, h);
    const r = rng(4);
    for (let i = 0; i < 46; i++) {
      let x = r() * w, y = h * (0.62 + r() * 0.36);
      g.strokeStyle = `rgba(${170 + r() * 50},${30 + r() * 30},${40 + r() * 20},${0.18 + r() * 0.28})`;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        const nx = x + (r() - 0.5) * 60, ny = y - 18 - r() * 30;
        g.quadraticCurveTo(x + (r() - 0.5) * 40, (y + ny) / 2, nx, ny);
        x = nx; y = ny;
      }
      g.stroke();
    }
  });
}

// Iris café con fibras y pupila negra (se pinta sobre un disco).
function texturaIris() {
  return lienzo(512, 512, (g, w) => {
    const c = w / 2, r = rng(8);
    const gr = g.createRadialGradient(c, c, w * 0.08, c, c, w * 0.5);
    gr.addColorStop(0, '#3a2414'); gr.addColorStop(0.45, '#6b4423'); gr.addColorStop(0.85, '#4a2e17'); gr.addColorStop(1, '#22140a');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, w / 2, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, r0 = w * (0.17 + r() * 0.05), r1 = w * (0.36 + r() * 0.13);
      g.strokeStyle = r() < 0.5 ? `rgba(196,140,80,${0.25 + r() * 0.3})` : `rgba(40,22,10,${0.2 + r() * 0.3})`;
      g.lineWidth = 1 + r() * 2.2;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a + (r() - 0.5) * 0.1) * r1, c + Math.sin(a + (r() - 0.5) * 0.1) * r1); g.stroke();
    }
    g.fillStyle = '#050403'; g.beginPath(); g.arc(c, c, w * 0.17, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(c - w * 0.06, c - w * 0.07, w * 0.035, 0, Math.PI * 2); g.fill();
  });
}

const CORNEA_R = 0.606, CORNEA_Z = 0.474;   // esfera de la córnea (ver cálculo en el README)
const TAPA_ANG = 0.55;                          // tamaño de la tapa (ángulo sobre la esfera de la córnea)
const capZ = (r, ang) => CORNEA_Z + r * Math.cos(ang);
const capR = (r, ang) => r * Math.sin(ang);

/** Ojo gigante. Devuelve el grupo con: tapaPivote (gira para levantar la tapa),
 *  lecho (córnea expuesta, se aplana con .remodelar(0..1)), parpados(apertura), corneaMesh. */
export function ojoGigante({ parpados = false } = {}) {
  const M = materials();
  const g = new THREE.Group();
  // Esclerótica: esfera con un hueco al frente donde va el iris.
  const escG = new THREE.SphereGeometry(1, 96, 64, 0, Math.PI * 2, 0.44, Math.PI - 0.44); escG.rotateX(Math.PI / 2);
  const esc = new THREE.Mesh(escG, new THREE.MeshPhysicalMaterial({ map: texturaEsclerotica(), roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25 }));
  g.add(esc);
  // Iris + pupila (disco en el borde del hueco).
  const iris = new THREE.Mesh(new THREE.CircleGeometry(0.427, 96), new THREE.MeshStandardMaterial({ map: texturaIris(), roughness: 0.45 }));
  iris.position.z = 0.905; g.add(iris);
  // Córnea: cúpula transparente.
  const corG = new THREE.SphereGeometry(CORNEA_R, 96, 48, 0, Math.PI * 2, 0, 0.78); corG.rotateX(Math.PI / 2);
  const cornea = new THREE.Mesh(corG, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }));
  cornea.position.z = CORNEA_Z; g.add(cornea);
  // Lecho de la córnea (lo que queda al levantar la tapa). Se aplana al remodelar.
  const lechoG = new THREE.SphereGeometry(CORNEA_R - 0.012, 72, 32, 0, Math.PI * 2, 0, TAPA_ANG); lechoG.rotateX(Math.PI / 2);
  const lecho = new THREE.Mesh(lechoG, new THREE.MeshPhysicalMaterial({ color: 0xf0d2cc, roughness: 0.55, transparent: true, opacity: 0.0, sheen: 0.5, sheenColor: new THREE.Color(0xffe0dd) }));
  lecho.position.z = CORNEA_Z; g.add(lecho);
  // Tapa: casquete delgado con bisagra arriba.
  const yB = capR(CORNEA_R + 0.004, TAPA_ANG), zB = capZ(CORNEA_R + 0.004, TAPA_ANG);
  const tapaPivote = new THREE.Group(); tapaPivote.position.set(0, yB, zB); g.add(tapaPivote);
  const tapaG = new THREE.SphereGeometry(CORNEA_R + 0.004, 72, 32, 0, Math.PI * 2, 0, TAPA_ANG); tapaG.rotateX(Math.PI / 2);
  const tapa = new THREE.Mesh(tapaG, new THREE.MeshPhysicalMaterial({ color: 0xe9f6ff, transparent: true, opacity: 0.0, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  tapa.position.set(0, -yB, CORNEA_Z - zB); tapaPivote.add(tapa);
  // Línea del corte (anillo) en el borde de la tapa.
  const corte = new THREE.Mesh(new THREE.TorusGeometry(capR(CORNEA_R + 0.004, TAPA_ANG), 0.013, 8, 160, 0), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0, toneMapped: false }));
  corte.position.z = capZ(CORNEA_R + 0.004, TAPA_ANG); g.add(corte);
  g.userData = { esc, iris, cornea, lecho, tapa, tapaPivote, corte };
  /** cuánto del anillo de corte se dibuja (0..1) */
  g.userData.dibujarCorte = (k, brillo = 1) => {
    corte.geometry.dispose();
    corte.geometry = new THREE.TorusGeometry(capR(CORNEA_R + 0.004, TAPA_ANG), 0.013, 8, 160, Math.max(0.0001, k * Math.PI * 2));
    corte.rotation.z = Math.PI / 2; // empieza arriba (en la bisagra)
    corte.material.opacity = k > 0 ? brillo : 0;
  };
  /** 0 = tapa en su lugar, 1 = levantada */
  g.userData.levantar = (k) => { tapaPivote.rotation.x = -2.1 * k; };
  /** 0 = córnea original, 1 = remodelada (más plana) */
  g.userData.remodelar = (k) => { lecho.scale.set(1, 1, 1 - 0.1 * k); lecho.position.z = CORNEA_Z + 0.055 * k; };
  if (parpados) {
    const piel = M.skin;
    // piel de la cara: plano con un hueco por donde asoma el ojo
    const cara = new THREE.Mesh(new THREE.RingGeometry(0.85, 4.5, 128), piel);
    cara.position.z = 0.52; cara.receiveShadow = true; g.add(cara);
    const mk = (ang, signo) => {
      const pg = new THREE.Group(); g.add(pg);
      const sg = new THREE.SphereGeometry(1.035, 96, 48, 0, Math.PI * 2, 0, ang);
      if (signo < 0) sg.rotateX(Math.PI);
      const m = new THREE.Mesh(sg, piel); pg.add(m);
      const borde = new THREE.Mesh(new THREE.TorusGeometry(1.035 * Math.sin(ang), 0.022, 12, 120), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 }));
      borde.rotation.x = Math.PI / 2; borde.position.y = signo * 1.035 * Math.cos(ang); pg.add(borde);
      return pg;
    };
    const sup = mk(1.25, 1), inf = mk(1.15, -1);
    g.userData.parpados = (abierto) => {
      // abierto: 0 = cerrado, 1 = normal, 1.6 = muy abierto (con separador)
      sup.rotation.x = 0.5 - abierto * 0.55;
      inf.rotation.x = -0.4 + abierto * 0.45;
    };
    g.userData.parpados(1);
    g.userData.sup = sup; g.userData.inf = inf;
  }
  return g;
}

/** Haz de láser: cilindro brillante entre dos puntos, con resplandor en la punta. */
export function hazLaser(color = 0x9d8bff) {
  const g = new THREE.Group();
  const nucleo = streak(0xffffff); const halo = streak(color);
  const punta = glowSprite(color, 0.2), origen = glowSprite(color, 0.15);
  g.add(halo, nucleo, punta, origen);
  g.set = (a, b, ancho = 0.02, op = 1) => {
    nucleo.set(a, b, ancho * 0.35, op); halo.set(a, b, ancho, op * 0.55);
    punta.position.copy(b); punta.scale.setScalar(ancho * 9); punta.material.opacity = op;
    origen.position.copy(a); origen.scale.setScalar(ancho * 6); origen.material.opacity = op * 0.8;
  };
  return g;
}

/** Gotero: tubo de vidrio con goma roja. La punta queda en (0,0,0) apuntando hacia -Y. */
export function gotero() {
  const g = new THREE.Group();
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1, depthWrite: false });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 32), vidrio); t.position.y = 0.62; g.add(t);
  const liquido = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.45, 32), new THREE.MeshPhysicalMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.55, roughness: 0.1 }));
  liquido.position.y = 0.42; g.add(liquido);
  const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.02, 0.18, 32), vidrio); punta.position.y = 0.09; g.add(punta);
  const goma = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 16), new THREE.MeshStandardMaterial({ color: 0xc8322f, roughness: 0.45 }));
  goma.scale.set(1, 1.4, 1); goma.position.y = 1.18; g.add(goma);
  return shadow(g);
}

/** Gota transparente. */
export function gota() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.75, roughness: 0.02, clearcoat: 1 }));
  m.scale.set(1, 1.25, 1);
  return m;
}

/** Separador de párpados: dos ganchos de alambre unidos por varillas. */
export function separador() {
  const acero = materials().steelBright;
  const g = new THREE.Group();
  // Cada gancho es medio aro que se apoya en un párpado; de sus puntas suben varillas.
  const gancho = (signo) => {
    const k = new THREE.Group();
    const arco = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.028, 12, 48, Math.PI), acero);
    if (signo < 0) arco.rotation.z = Math.PI;
    k.add(arco);
    for (const s of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.45, 12), acero);
      v.rotation.x = Math.PI / 2; v.position.set(s * 0.5, 0, 0.225); k.add(v);
    }
    g.add(k);
    return k;
  };
  g.userData.sup = gancho(1); g.userData.inf = gancho(-1);
  // Barras laterales que unen los dos ganchos (se estiran al abrir).
  const barras = [-1, 1].map((s) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 12), acero);
    b.position.set(s * 0.5, 0, 0.45); g.add(b); return b;
  });
  g.userData.abrir = (k) => {
    const ys = 0.3 + 0.32 * k, yi = -0.28 - 0.28 * k;
    g.userData.sup.position.y = ys; g.userData.inf.position.y = yi;
    for (const b of barras) { b.scale.y = ys - yi; b.position.y = (ys + yi) / 2; }
  };
  g.userData.abrir(0);
  return shadow(g);
}

/** Espátula del doctor: varilla de acero con punta plana. La punta está en (0,0,0) apuntando hacia -Y. */
export function espatula() {
  const acero = materials().steelBright;
  const g = new THREE.Group();
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.6, 16), acero); v.position.y = 0.85; g.add(v);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.012), acero); p.position.y = 0.04; g.add(p);
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: 0.5 }));
  mango.position.y = 1.7; g.add(mango);
  return shadow(g);
}

/** Equipo de láser: columna, brazo y cabezal con lente. .lente = posición local de la lente. */
export function equipoLaser() {
  const blanco = new THREE.MeshPhysicalMaterial({ color: 0xf3f5f8, roughness: 0.35, clearcoat: 0.6 });
  const gris = new THREE.MeshStandardMaterial({ color: 0x5b6573, roughness: 0.4, metalness: 0.3 });
  const g = new THREE.Group();
  g.add(box(0.7, 1.7, 0.7, blanco, [0, 0.85, 0]));
  g.add(box(0.72, 0.08, 0.72, gris, [0, 1.72, 0]));
  g.add(box(0.36, 0.3, 1.25, blanco, [0, 1.95, 0.55]));
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.32, 40), blanco); cab.position.set(0, 1.78, 1.05); g.add(cab);
  const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x6b5cff, emissiveIntensity: 1.2, roughness: 0.1 }));
  lente.position.set(0, 1.6, 1.05); g.add(lente);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: 0x9d8bff, toneMapped: false }));
  aro.rotation.x = Math.PI / 2; aro.position.set(0, 1.61, 1.05); g.add(aro);
  // pantalla
  const pant = box(0.5, 0.32, 0.03, new THREE.MeshStandardMaterial({ color: 0x0d1b2e, emissive: 0x1e5fb8, emissiveIntensity: 0.6 }), [0.0, 1.35, 0.37], [-0.2, 0, 0]);
  g.add(pant);
  g.lente = new THREE.Vector3(0, 1.58, 1.05);
  return shadow(g);
}

/** Camilla: base y colchón. Superficie a y = 0.78. */
export function camilla() {
  const g = new THREE.Group();
  g.add(box(0.75, 0.6, 2.1, new THREE.MeshStandardMaterial({ color: 0x8c96a5, roughness: 0.5, metalness: 0.2 }), [0, 0.3, 0]));
  const colchon = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 2.2), new THREE.MeshStandardMaterial({ color: 0x3d7dd8, roughness: 0.8 }));
  colchon.position.y = 0.7; g.add(colchon);
  const almohada = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  almohada.rotation.z = Math.PI / 2; almohada.position.set(0, 0.84, -0.9); almohada.scale.set(1, 1, 0.6); g.add(almohada);
  return shadow(g);
}
