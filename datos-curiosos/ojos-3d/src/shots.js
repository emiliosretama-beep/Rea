import * as THREE from 'three';
import { makeHuman } from './human.js';
import { glowSprite, sparks, rippleOverlay, ojoGigante, hazLaser, gotero, gota, separador, espatula, equipoLaser, camilla } from './props.js';
import { materials } from './materials.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake } from './anim.js';

// Operación de ojos con láser (LASIK). Tiempos tomados de la voz real (M5 de VoiceStudio).
export const DURATION = 30.0;

// [inicio, texto, fin?] — 1 a 3 palabras, con los tiempos reales de cada palabra.
export const CAPTIONS = [
  [0.0, 'Si te operas'], [0.72, 'los ojos'], [1.18, 'con láser'],
  [2.18, 'esto le pasa'], [2.78, 'a tu ojo'],
  [3.88, 'Mucha gente cree'], [4.6, 'que el láser'], [5.14, 'lo quema'],
  [6.04, 'Pero ese láser'], [6.78, 'es frío'], [7.68, 'deshace el tejido'], [9.08, 'sin calentarlo'],
  [10.64, 'Primero'], [11.18, 'unas gotas duermen'], [12.0, 'el ojo'], [12.46, 'y un aparato'], [13.26, 'lo deja abierto'],
  [14.6, 'Otro láser corta'], [15.44, 'una tapa finísima'], [16.42, 'en la córnea'], [17.02, 'y el doctor'], [17.82, 'la levanta'],
  [19.9, 'El láser frío'], [20.68, 'le da'], [20.94, 'nueva forma'], [21.52, 'a la córnea'],
  [22.94, 'Si mueves'], [23.36, 'el ojo'], [24.14, 'te sigue'],
  [25.05, 'La tapa vuelve'], [25.66, 'a su lugar'], [26.1, 'y sirve como'], [26.76, 'su propia venda'],
  [27.62, '¿Te operarías?', 29.4],
];
// [inicioFundido, negroCompleto, finNegro, finFundido] — corte a negro en el "Pero".
export const FADES = [[5.84, 5.97, 6.01, 6.14]];

const VIOLETA = 0x9d8bff, CIAN = 0x7fe3ff, NARANJA = 0xff5a1f;

// ---------------- paciente en la camilla ----------------
const TENDIDO = {
  lSh: [0.02, 0, 0.1], rSh: [0.02, 0, -0.1], lEl: [-0.12, 0, 0], rEl: [-0.12, 0, 0],
  lHip: [0, 0, 0.04], rHip: [0, 0, -0.04], lAn: [0.3, 0, 0], rAn: [0.3, 0, 0],
};
function sala(makeStage) {
  const scene = makeStage({ shadowSize: 2.6 });
  const cama = camilla(); scene.add(cama);
  const p = makeHuman('bata');
  const bata = new THREE.MeshStandardMaterial({ color: 0x8fc3e8, roughness: 0.85 });
  const M = materials();
  p.root.traverse(c => { if (c.isMesh && c.material === M.cloth) c.material = bata; });
  p.root.rotation.x = -Math.PI / 2;
  p.root.position.set(0, 0.92, 0.98);
  p.setPose(TENDIDO);
  scene.add(p.root);
  scene.updateMatrixWorld(true);
  const ojoIzq = p.j.head.localToWorld(V(0.035, 0.11, 0.09));
  const cara = p.j.head.localToWorld(V(0, 0.09, 0.08));
  const eq = equipoLaser();
  eq.position.set(cara.x, cara.y + 0.62 - eq.lente.y, cara.z - eq.lente.z);
  scene.add(eq);
  return { scene, p, eq, ojoIzq, cara };
}

// ---------------- ojo gigante mirando hacia arriba ----------------
const CENTRO_OJO = V(0, 1.45, 0);
function escenaOjo(makeStage, opts = {}) {
  const scene = makeStage({ shadowSize: 2.6, sunDir: [-3, 7, 3] });
  const ojo = ojoGigante(opts);
  ojo.position.copy(CENTRO_OJO);
  ojo.rotation.x = -Math.PI / 2; // la pupila mira hacia +Y (como el paciente acostado)
  ojo.traverse(c => { if (c.isMesh && !c.material.transparent) { c.castShadow = true; } });
  scene.add(ojo);
  scene.updateMatrixWorld(true);
  return { scene, ojo };
}
const apice = (ojo) => ojo.localToWorld(V(0, 0, 1.084));
// Cámara que orbita alrededor de la córnea: az = giro horizontal, el = altura (radianes).
const T_OJO = V(0, 2.42, 0);
function orbita(c, az, el, dist, objetivo = T_OJO, s = [0, 0, 0]) {
  const q = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(objetivo);
  place(c, [q.x + s[0], q.y + s[1], q.z + s[2]], [objetivo.x, objetivo.y, objetivo.z]);
}
// Mirar con un "arriba" propio (para ver la cara del paciente acostado derecha).
const FRENTE = V(0, 0, -1);
function mirar(c, pos, look, up = FRENTE) { c.position.copy(pos); c.up.copy(up); c.lookAt(look); }
const enOjo = (ojo, x, y, z) => ojo.localToWorld(V(x, y, z));

// ================= TOMA 1: paciente bajo el láser =================
function toma1({ makeStage }) {
  const { scene, p, cara } = sala(makeStage);
  const c = cam(40);
  return {
    scene, camera: c,
    update(t) {
      p.setMouth(0);
      const k = easeInOut(range(t, 0, 2.15));
      const s = shake(t, 0.5);
      place(c, [lerp(1.15, 0.9, k) + s[0], lerp(1.95, 1.8, k) + s[1], lerp(1.45, 0.95, k)], [cara.x, lerp(1.08, 1.12, k), cara.z + 0.2]);
      return { dof: { focus: c.position.distanceTo(cara), aperture: 0.002, maxblur: 0.006 }, bloom: 0.5 };
    },
  };
}

// ================= TOMA 2: empuje hasta el ojo =================
function toma2({ makeStage }) {
  const { scene, p, ojoIzq } = sala(makeStage);
  const c = cam(34);
  return {
    scene, camera: c,
    update(t) {
      p.setMouth(0);
      const k = easeIn(range(t, 0, 1.7));
      const desde = V(ojoIzq.x + 0.12, ojoIzq.y + 0.75, ojoIzq.z + 0.32);
      const hasta = V(ojoIzq.x + 0.01, ojoIzq.y + 0.12, ojoIzq.z + 0.035);
      const pos = desde.clone().lerp(hasta, k);
      c.fov = lerp(34, 24, k);
      mirar(c, pos, ojoIzq);
      return { dof: { focus: c.position.distanceTo(ojoIzq), aperture: 0.004, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ================= TOMA 3: la creencia (láser que quema) =================
function toma3({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const haz = hazLaser(NARANJA); scene.add(haz);
  const fuego = sparks(160, { speed: 0.9, spread: 0.9, gravity: 1.2, life: 0.8, size: 0.05, dir: V(0, 1, 0), seed: 5, color: [1, 0.45, 0.1] });
  fuego.position.copy(A); scene.add(fuego);
  const humo = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), new THREE.MeshStandardMaterial({ color: 0x55585e, transparent: true, opacity: 0, roughness: 1, depthWrite: false }));
    scene.add(m); humo.push(m);
  }
  const onda = rippleOverlay(ojo.userData.cornea);
  const luz = new THREE.PointLight(0xff6a2a, 0, 4); luz.position.copy(A).add(V(0, 0.3, 0.3)); scene.add(luz);
  const c = cam(32);
  return {
    scene, camera: c,
    update(t) {
      const on = range(t, 0.15, 0.35);
      haz.set(A.clone().add(V(0, 2.6, 0)), A, 0.05, on);
      fuego.update(((t - 0.3) % 0.8 + 0.8) % 0.8 + (t < 0.3 ? -1 : 0));
      humo.forEach((m, i) => {
        const f = ((t - 0.4 - i * 0.18) % 1.6 + 1.6) % 1.6;
        const vivo = t > 0.4 + i * 0.18;
        m.position.copy(A).add(V(Math.sin(i * 2.1) * 0.15 + f * 0.1, 0.15 + f * 0.9, Math.cos(i * 1.7) * 0.12));
        m.scale.setScalar(0.5 + f * 1.4);
        m.material.opacity = vivo ? 0.55 * (1 - f / 1.6) : 0;
      });
      const u = onda.material.uniforms, it = t - 0.35;
      u.uCenter.value.set(0, 0, 0.606);
      u.uAmp.value = it > 0 ? Math.min(1, it * 4) : 0;
      u.uRadius.value = it > 0 ? 0.05 + easeOut(range(it, 0, 1.2)) * 0.5 : 0;
      u.uSpot.value = 0.08; u.uRings.value = 60; u.uTime.value = t;
      luz.intensity = 3 * on * (0.8 + 0.2 * Math.sin(t * 40));
      const k = easeInOut(range(t, 0, 2.1)), s = shake(t, 2.2);
      orbita(c, lerp(0.55, 0.75, k), 0.72, lerp(5.4, 4.7, k), V(0, 2.55, 0), s);
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.003, maxblur: 0.008 }, bloom: 0.9, exposure: 1.05 };
    },
  };
}

// ================= TOMA 4: "Pero ese láser es frío" =================
function toma4({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const haz = hazLaser(VIOLETA); scene.add(haz);
  const escarcha = sparks(220, { speed: 0.35, spread: 1.6, gravity: -0.15, life: 1.6, size: 0.03, dir: V(0, 1, 0), seed: 12, color: [0.6, 0.85, 1] });
  escarcha.position.copy(A); scene.add(escarcha);
  const luz = new THREE.PointLight(0x8a7dff, 0, 4); luz.position.copy(A).add(V(0, 0.4, 0.3)); scene.add(luz);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      const pulso = 0.75 + 0.25 * Math.sin(t * 30);
      haz.set(A.clone().add(V(0, 2.6, 0)), A, 0.03, pulso);
      escarcha.update(t);
      luz.intensity = 2.2 * pulso;
      // órbita lenta (sensación de cámara lenta)
      const a = lerp(0.8, 1.3, easeInOut(range(t, 0, 1.65)));
      orbita(c, a, 0.66, 4.6, V(0, 2.6, 0));
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.004, maxblur: 0.01 }, bloom: 1.0, exposure: 0.98 };
    },
  };
}

// ================= TOMA 5: deshace el tejido sin calentarlo =================
function toma5({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.5 });
  const N = 16, capas = 2, sep = 0.075;
  const geo = new THREE.SphereGeometry(0.034, 16, 10);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf1b8b0, roughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color(0xffe0e0), clearcoat: 0.3 });
  const tejido = new THREE.InstancedMesh(geo, mat, N * N * capas);
  tejido.castShadow = true; tejido.receiveShadow = true;
  scene.add(tejido);
  const base = [];
  for (let l = 0; l < capas; l++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i - (N - 1) / 2) * sep + (l ? sep / 2 : 0), z = (j - (N - 1) / 2) * sep + (l ? sep / 2 : 0);
    const y = 1.2 - (x * x + z * z) * 0.8 - l * 0.055;
    base.push({ x, y, z, capa: l, azar: Math.sin(i * 12.9898 + j * 78.233) * 0.5 + 0.5 });
  }
  const dummy = new THREE.Object3D();
  const haz = hazLaser(VIOLETA); scene.add(haz);
  // chispitas frías donde el láser va pasando
  const nubes = [];
  for (let k = 0; k < 7; k++) {
    const sp = sparks(120, { speed: 0.22, spread: 2.2, gravity: 0.05, life: 0.9, size: 0.03, dir: V(0, 1, 0), seed: 30 + k, color: [0.55, 0.8, 1] });
    scene.add(sp); nubes.push(sp);
  }
  const c = cam(30);
  const pasada = (t) => lerp(-0.55, 0.55, easeInOut(range(t, 0.25, 2.6)));
  // momento exacto en que el láser pasa por cada nube de chispas
  const xNube = nubes.map((_, k) => lerp(-0.5, 0.5, k / 6));
  const tNube = xNube.map((x) => { let t = 0.25; while (t < 2.6 && pasada(t) < x) t += 0.005; return t; });
  return {
    scene, camera: c,
    update(t) {
      const xs = pasada(t);
      base.forEach((b, i) => {
        // la capa de arriba se deshace cuando el láser pasa por encima (sin fuego, sin calor)
        const hit = b.capa === 0 && Math.abs(b.z) < 0.42 ? range(xs - b.x, -0.02 + b.azar * 0.03, 0.14 + b.azar * 0.05) : 0;
        const s = 1 - easeIn(hit);
        dummy.position.set(b.x, b.y + hit * 0.05, b.z);
        dummy.scale.setScalar(Math.max(0.0001, s));
        dummy.updateMatrix(); tejido.setMatrixAt(i, dummy.matrix);
      });
      tejido.instanceMatrix.needsUpdate = true;
      const P = V(xs, 1.2 - xs * xs * 0.8 + 0.02, 0);
      haz.set(P.clone().add(V(0, 1.6, 0)), P, 0.022, 0.8 + 0.2 * Math.sin(t * 34));
      nubes.forEach((sp, k) => {
        sp.position.set(xNube[k], 1.2 - xNube[k] * xNube[k] * 0.8 + 0.03, 0);
        sp.update(t - tNube[k]);
      });
      const k = easeInOut(range(t, 0, 2.9));
      place(c, [lerp(-0.3, 0.3, k), lerp(1.78, 1.7, k), lerp(1.7, 1.5, k)], [lerp(-0.15, 0.15, k), 1.1, 0]);
      return { dof: { focus: c.position.distanceTo(V(xs * 0.5, 1.15, 0)), aperture: 0.012, maxblur: 0.012 }, bloom: 0.9 };
    },
  };
}

// ================= TOMA 6: gotas para dormir el ojo =================
function toma6({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage, { parpados: true });
  const A = apice(ojo);
  const gt = gotero(); gt.position.copy(A).add(V(0.05, 1.05, 0)); scene.add(gt);
  const gotas = [gota(), gota(), gota()]; gotas.forEach(g => scene.add(g));
  const salpicadura = gotas.map((_, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0xcff0ff, transparent: true, opacity: 0, roughness: 0.05 }));
    r.rotation.x = Math.PI / 2; r.position.copy(A).add(V(0, 0.01, 0)); scene.add(r); return r;
  });
  const c = cam(32);
  const T0 = [0.35, 0.95, 1.5];
  return {
    scene, camera: c,
    update(t) {
      ojo.userData.parpados(1);
      gt.position.y = A.y + 1.05 + Math.sin(t * 2) * 0.01;
      gotas.forEach((g, i) => {
        const f = t - T0[i];
        const caida = 0.95 * Math.min(1, (f * f * 4.9) / 0.95);
        g.visible = f > 0 && f * f * 4.9 < 0.95 + 0.02;
        g.position.copy(A).add(V(0.05, 1.0 - caida, 0));
        const tImp = Math.sqrt(0.95 / 4.9), d = f - tImp;
        salpicadura[i].material.opacity = d > 0 ? Math.max(0, 0.7 - d * 1.4) : 0;
        salpicadura[i].scale.setScalar(d > 0 ? 0.5 + d * 3.5 : 0.01);
      });
      const k = easeInOut(range(t, 0, 1.9)), s = shake(t, 0.6);
      orbita(c, 0.12, 0.78, lerp(5.6, 5.0, k), V(0, 2.75, 0), s);
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ================= TOMA 7: el separador deja el ojo abierto =================
function toma7({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage, { parpados: true });
  const A = apice(ojo);
  const sep = separador(); sep.position.set(0, 0, 0.98); ojo.add(sep);
  const c = cam(34);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0.35, 1.25));
      sep.userData.abrir(k);
      ojo.userData.parpados(lerp(1, 1.6, k));
      const s = shake(t, 0.5);
      const a = lerp(-0.12, 0.18, easeInOut(range(t, 0, 2.1)));
      orbita(c, a, 0.86, 5.0, V(0, 2.45, 0), s);
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.002, maxblur: 0.006 }, bloom: 0.5 };
    },
  };
}

// ================= TOMA 8: otro láser corta la tapa =================
function toma8({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const haz = hazLaser(CIAN); scene.add(haz);
  const chispas = sparks(90, { speed: 0.25, spread: 1.4, gravity: -0.2, life: 0.5, size: 0.02, dir: V(0, 1, 0), seed: 41, color: [0.6, 0.95, 1] });
  scene.add(chispas);
  const c = cam(28);
  const R = 0.606 * Math.sin(0.55) + 0.004, Z = 0.474 + 0.61 * Math.cos(0.55);
  return {
    scene, camera: c,
    update(t) {
      const k = easeInOut(range(t, 0.25, 2.3));
      ojo.userData.dibujarCorte(k, 1);
      ojo.userData.tapa.material.opacity = 0.32 * range(t, 1.2, 2.5);
      const ang = Math.PI / 2 + k * Math.PI * 2;
      const P = enOjo(ojo, Math.cos(ang) * R, Math.sin(ang) * R, Z);
      const activo = t > 0.25 && k < 0.999 ? 1 : 0;
      haz.set(P.clone().add(V(0, 2.4, 0)), P, 0.018, activo * (0.8 + 0.2 * Math.sin(t * 40)));
      chispas.position.copy(P); chispas.update(activo ? (t * 3) % 0.5 : -1);
      const s = shake(t, 0.4);
      orbita(c, lerp(0.45, 0.6, range(t, 0, 2.75)), 0.95, 3.5, V(0, 2.48, 0), s);
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.003, maxblur: 0.008 }, bloom: 0.9 };
    },
  };
}

// ================= TOMA 9: el doctor levanta la tapa =================
function toma9({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const esp = espatula(); scene.add(esp);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      ojo.userData.dibujarCorte(1, 0.6);
      const lev = easeInOut(range(t, 0.7, 2.2));
      ojo.userData.levantar(lev);
      ojo.userData.tapa.material.opacity = 0.45;
      ojo.userData.lecho.material.opacity = 0.95;
      // la espátula entra por delante y empuja la tapa hacia la bisagra
      const entra = easeOut(range(t, 0, 0.7));
      const borde = enOjo(ojo, 0, -0.33 + lev * 0.45, 1.02 + lev * 0.35);
      esp.position.copy(borde).add(V(0.0, 0.05 + (1 - entra) * 0.6, (1 - entra) * 0.8));
      esp.rotation.set(-0.9, 0, 0);
      const k = easeInOut(range(t, 0, 2.55));
      orbita(c, lerp(0.95, 0.75, k), 0.68, lerp(4.2, 3.8, k), V(0, 2.6, -0.15));
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

// ================= TOMA 10: el láser frío da nueva forma (la más larga) =================
function toma10({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const haz = hazLaser(VIOLETA); scene.add(haz);
  const vapor = sparks(240, { speed: 0.2, spread: 1.8, gravity: 0.1, life: 1.2, size: 0.016, dir: V(0, 1, 0), seed: 55, color: [0.6, 0.75, 1] });
  scene.add(vapor);
  const luz = new THREE.PointLight(0x8a7dff, 0, 3); scene.add(luz);
  const c = cam(26);
  return {
    scene, camera: c,
    update(t) {
      ojo.userData.dibujarCorte(1, 0.5);
      ojo.userData.levantar(1);
      ojo.userData.tapa.material.opacity = 0.45;
      ojo.userData.lecho.material.opacity = 0.95;
      const forma = easeInOut(range(t, 0.2, 2.9));
      ojo.userData.remodelar(forma);
      // pulsos en espiral sobre el lecho (cámara lenta)
      const a = t * 9, r = 0.22 * (0.5 + 0.5 * Math.sin(t * 2.3));
      const P = enOjo(ojo, Math.cos(a) * r, Math.sin(a) * r, 1.07 + 0.055 * forma);
      const pulso = 0.6 + 0.4 * Math.max(0, Math.sin(t * 22));
      haz.set(P.clone().add(V(0, 2.2, 0)), P, 0.02, pulso);
      vapor.position.copy(enOjo(ojo, 0, 0, 1.08)); vapor.update(t % 1.2);
      luz.position.copy(P).add(V(0, 0.25, 0)); luz.intensity = 2.5 * pulso;
      const k = easeInOut(range(t, 0, 3.05)), s = shake(t, 0.3);
      orbita(c, lerp(0.7, 0.45, k), 0.82, lerp(3.4, 2.9, k), V(0, 2.55, -0.05), s);
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.005, maxblur: 0.01 }, bloom: 1.0 };
    },
  };
}

// ================= TOMA 11: si mueves el ojo, el láser te sigue =================
function toma11({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const haz = hazLaser(VIOLETA); scene.add(haz);
  const verde = new THREE.MeshBasicMaterial({ color: 0x5dff8a, transparent: true, opacity: 0.9, toneMapped: false, depthTest: false });
  const mira = new THREE.Group();
  mira.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 8, 64), verde));
  for (const r of [0, Math.PI / 2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.008, 0.008), verde); l.rotation.z = r; mira.add(l); }
  mira.renderOrder = 10; mira.traverse(m => { m.renderOrder = 10; });
  scene.add(mira);
  const emisor = V(0, 4.3, 0);
  const c = cam(34);
  return {
    scene, camera: c,
    update(t) {
      ojo.userData.dibujarCorte(1, 0.5);
      ojo.userData.levantar(1);
      ojo.userData.tapa.material.opacity = 0.45;
      ojo.userData.lecho.material.opacity = 0.95;
      ojo.userData.remodelar(1);
      // el ojo se mueve de lado a lado
      const mov = easeInOut(range(t, 0.2, 0.7)) - easeInOut(range(t, 0.95, 1.5)) * 1.6 + easeInOut(range(t, 1.6, 2.0)) * 0.6;
      ojo.rotation.set(-Math.PI / 2, 0, 0);
      ojo.rotateY(mov * 0.32);
      scene.updateMatrixWorld(true);
      const P = enOjo(ojo, 0, 0, 1.13);
      haz.set(emisor, P, 0.022, 0.85 + 0.15 * Math.sin(t * 30));
      mira.position.copy(P).add(V(0, 0.01, 0));
      mira.lookAt(P.clone().add(V(0, 1, 0)));
      orbita(c, 0.02, 0.7, 5.2, V(0, 2.55, 0));
      return { dof: { focus: c.position.distanceTo(P), aperture: 0.002, maxblur: 0.006 }, bloom: 0.8 };
    },
  };
}

// ================= TOMA 12: la tapa vuelve y sirve de venda =================
function toma12({ makeStage }) {
  const { scene, ojo } = escenaOjo(makeStage);
  const A = apice(ojo);
  const brillo = glowSprite(0xbfeaff, 0.8); brillo.position.copy(A); scene.add(brillo);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t) {
      ojo.userData.remodelar(1);
      const baja = easeInOut(range(t, 0.15, 1.3));
      ojo.userData.levantar(1 - baja);
      ojo.userData.tapa.material.opacity = lerp(0.45, 0.22, range(t, 1.3, 2.4));
      ojo.userData.lecho.material.opacity = 0.95;
      ojo.userData.dibujarCorte(1, lerp(0.5, 0, range(t, 1.3, 2.4)));
      const b = range(t, 1.25, 1.55) * (1 - range(t, 1.7, 2.5));
      brillo.material.opacity = b * 0.8; brillo.scale.setScalar(0.6 + b * 0.8);
      const k = easeInOut(range(t, 0, 2.6));
      orbita(c, lerp(0.7, 0.95, k), 0.72, lerp(3.9, 4.6, k), V(0, 2.5, 0));
      return { dof: { focus: c.position.distanceTo(A), aperture: 0.002, maxblur: 0.006 }, bloom: 0.7 };
    },
  };
}

// ================= TOMA 13: ¿Te operarías? =================
function toma13({ makeStage }) {
  const { scene, p, eq, cara } = sala(makeStage);
  const y0 = eq.position.y;
  const c = cam(32);
  return {
    scene, camera: c,
    update(t) {
      eq.position.y = y0 + easeInOut(range(t, 0, 1.2)) * 0.35;
      p.setMouth(0.04 * easeOut(range(t, 0.4, 1.0)));
      const k = easeOut(range(t, 0, 2.45));
      mirar(c, V(cara.x + lerp(0.08, 0.2, k), cara.y + lerp(0.5, 0.95, k), cara.z + lerp(0.12, 0.35, k)), V(cara.x, cara.y, cara.z + 0.08));
      return { dof: { focus: c.position.distanceTo(cara), aperture: 0.003, maxblur: 0.008 }, bloom: 0.5 };
    },
  };
}

export const SHOTS = [
  { start: 0.0, end: 2.15, build: toma1 },
  { start: 2.15, end: 3.85, build: toma2 },
  { start: 3.85, end: 5.98, build: toma3 },
  { start: 5.98, end: 7.62, build: toma4 },
  { start: 7.62, end: 10.55, build: toma5 },
  { start: 10.55, end: 12.4, build: toma6 },
  { start: 12.4, end: 14.5, build: toma7 },
  { start: 14.5, end: 17.25, build: toma8 },
  { start: 17.25, end: 19.8, build: toma9 },
  { start: 19.8, end: 22.85, build: toma10 },
  { start: 22.85, end: 24.95, build: toma11 },
  { start: 24.95, end: 27.55, build: toma12 },
  { start: 27.55, end: DURATION + 1, build: toma13 },
];
