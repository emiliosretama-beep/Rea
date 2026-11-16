import React, {useMemo, useRef, useLayoutEffect} from 'react';
import * as THREE from 'three';
import {useCurrentFrame, random} from 'remotion';
import {usePBR} from './Materiales';

// Medidas reales del Coliseo (188 x 156 m, 48 m de alto) a escala 0.55
export const A = 52, B = 43, ALTO = 26;
export const A0 = 23.6, B0 = 14.8; // arena
const PISO = 6.4; // alto de cada piso de arcos

const anillo = (a1: number, b1: number, a2: number, b2: number, h: number) => {
  const s = new THREE.Shape();
  s.absellipse(0, 0, a1, b1, 0, Math.PI * 2, false, 0);
  const hoyo = new THREE.Path();
  hoyo.absellipse(0, 0, a2, b2, 0, Math.PI * 2, true, 0);
  s.holes.push(hoyo);
  const g = new THREE.ExtrudeGeometry(s, {depth: h, bevelEnabled: false, curveSegments: 160});
  g.rotateX(-Math.PI / 2);
  return g;
};

const elipse = (a: number, b: number, th: number) => {
  const x = a * Math.cos(th), z = b * Math.sin(th);
  const nx = Math.cos(th) / a, nz = Math.sin(th) / b;
  return {x, z, rot: Math.atan2(nx, nz)};
};

// Gradas (cavea) con escalones
const geoGradas = () => {
  const perfil: [number, number][] = [];
  const escalones = 34;
  for (let i = 0; i <= escalones; i++) {
    const t = 0.05 + (i / escalones) * 0.88;
    const y = 4.2 + (i / escalones) * (ALTO - 6);
    perfil.push([t, y]);
    if (i < escalones) perfil.push([t + 0.88 / escalones, y]);
  }
  const seg = 200;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  perfil.forEach(([t, y], j) => {
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      const a = A0 + 1 + t * (A - 2 - A0), b = B0 + 1 + t * (B - 2 - B0);
      pos.push(a * Math.cos(th), y, b * Math.sin(th));
      uv.push((i / seg) * 60, j * 0.5);
    }
  });
  for (let j = 0; j < perfil.length - 1; j++)
    for (let i = 0; i < seg; i++) {
      const p = j * (seg + 1) + i, q = p + seg + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

export const posGradas = (t: number, th: number) => {
  const escalones = 34;
  const i = Math.floor(t * escalones);
  const tt = 0.05 + (i / escalones) * 0.88 + 0.44 / escalones;
  const y = 4.2 + (i / escalones) * (ALTO - 6);
  const a = A0 + 1 + tt * (A - 2 - A0), b = B0 + 1 + tt * (B - 2 - B0);
  return new THREE.Vector3(a * Math.cos(th), y, b * Math.sin(th));
};

const Inst: React.FC<{count: number; geo: THREE.BufferGeometry; mat: THREE.Material; set: (i: number, m: THREE.Object3D) => void; sombra?: boolean}> = ({count, geo, mat, set, sombra = true}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) { o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); set(i, o); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix); }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count, set]);
  return <instancedMesh ref={ref} args={[geo, mat, count]} castShadow={sombra} receiveShadow />;
};

export const Coliseo: React.FC<{gente?: boolean; animo?: number}> = ({gente = true, animo = 0}) => {
  const piedra = usePBR('sandstone_blocks_08', 1, 1, '#f3dcc0');
  const piedraLarga = usePBR('sandstone_blocks_08', 40, 1.2, '#f3dcc0');
  const marmol = usePBR('marble_01', 30, 2);
  const gradasMat = usePBR('sandstone_blocks_08', 1, 1, '#e8d2b4');
  const arena = usePBR('coast_sand_01', 6, 4);
  const N = 80;
  const pilar = useMemo(() => new THREE.BoxGeometry(1.5, PISO - 1.2, 2.6), []);
  const arco = useMemo(() => new THREE.TorusGeometry(1.15, 0.38, 6, 12, Math.PI), []);
  const geos = useMemo(() => ({
    cornisas: [0, 1, 2].map((k) => anillo(A + 0.3, B + 0.3, A - 2.6, B - 2.6, 1.2)),
    atico: anillo(A + 0.1, B + 0.1, A - 1.2, B - 1.2, PISO),
    muroInt: anillo(A - 2.6, B - 2.6, A - 3.4, B - 3.4, ALTO - 2),
    podio: anillo(A0 + 1.2, B0 + 1.2, A0, B0, 4.2),
    gradas: geoGradas(),
  }), []);
  const pisoArena = useMemo(() => { const s = new THREE.Shape(); s.absellipse(0, 0, A0, B0, 0, Math.PI * 2, false, 0); const g = new THREE.ShapeGeometry(s, 96); g.rotateX(-Math.PI / 2); return g; }, []);
  return (
    <group>
      {/* pilares y arcos de los 3 pisos */}
      {[0, 1, 2].map((k) => (
        <React.Fragment key={k}>
          <Inst count={N} geo={pilar} mat={piedra} set={(i, o) => { const e = elipse(A - 1.3, B - 1.3, (i / N) * Math.PI * 2); o.position.set(e.x, k * PISO + (PISO - 1.2) / 2, e.z); o.rotation.y = e.rot; }} />
          <Inst count={N} geo={arco} mat={piedra} set={(i, o) => { const e = elipse(A - 1.3, B - 1.3, ((i + 0.5) / N) * Math.PI * 2); o.position.set(e.x, k * PISO + PISO - 2.75, e.z); o.rotation.y = e.rot; }} />
          <mesh geometry={geos.cornisas[k]} material={piedraLarga} position={[0, k * PISO + PISO - 1.2, 0]} castShadow receiveShadow />
        </React.Fragment>
      ))}
      <mesh geometry={geos.atico} material={piedraLarga} position={[0, 3 * PISO, 0]} castShadow receiveShadow />
      <mesh geometry={geos.muroInt} material={piedraLarga} receiveShadow />
      <mesh geometry={geos.gradas} material={gradasMat} receiveShadow castShadow />
      <mesh geometry={geos.podio} material={marmol} receiveShadow castShadow />
      <mesh geometry={pisoArena} material={arena} position={[0, 0.02, 0]} receiveShadow />
      {gente && <Publico animo={animo} />}
      <Palco />
    </group>
  );
};

// ~3000 romanos en las gradas
const COLORES = ['#f2efe6', '#e9e2d0', '#b3241c', '#c9a24a', '#3d5a8a', '#7a5a3a', '#efe8d8', '#8a2a4a'];
export const Publico: React.FC<{animo: number}> = ({animo}) => {
  const f = useCurrentFrame();
  const n = 3200;
  const cuerpo = useRef<THREE.InstancedMesh>(null);
  const cabeza = useRef<THREE.InstancedMesh>(null);
  const geoC = useMemo(() => new THREE.CapsuleGeometry(0.22, 0.45, 3, 8), []);
  const geoH = useMemo(() => new THREE.SphereGeometry(0.15, 10, 8), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({roughness: 0.85}), []);
  const matH = useMemo(() => new THREE.MeshStandardMaterial({roughness: 0.6}), []);
  const datos = useMemo(() => Array.from({length: n}).map((_, i) => {
    let th = random(`th${i}`) * Math.PI * 2;
    if (Math.abs(th - Math.PI / 2) < 0.12) th += 0.3; // hueco del palco
    return {p: posGradas(random(`t${i}`), th), fase: random(`f${i}`) * 6, c: COLORES[Math.floor(random(`c${i}`) * COLORES.length)], piel: ['#c68a5e', '#a86b44', '#e0b08a', '#8a5a3a'][i % 4]};
  }), []);
  useLayoutEffect(() => {
    datos.forEach((d, i) => { cuerpo.current!.setColorAt(i, new THREE.Color(d.c)); cabeza.current!.setColorAt(i, new THREE.Color(d.piel)); });
    cuerpo.current!.instanceColor!.needsUpdate = true; cabeza.current!.instanceColor!.needsUpdate = true;
  }, [datos]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    datos.forEach((d, i) => {
      const salto = Math.max(0, Math.sin(f / 4 + d.fase)) * 0.35 * animo;
      o.position.set(d.p.x, d.p.y + 0.45 + salto, d.p.z); o.rotation.set(0, 0, 0); o.updateMatrix();
      cuerpo.current!.setMatrixAt(i, o.matrix);
      o.position.y += 0.52; o.updateMatrix();
      cabeza.current!.setMatrixAt(i, o.matrix);
    });
    cuerpo.current!.instanceMatrix.needsUpdate = true; cabeza.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={cuerpo} args={[geoC, mat, n]} castShadow receiveShadow />
      <instancedMesh ref={cabeza} args={[geoH, matH, n]} castShadow />
    </>
  );
};

// Palco del emperador (pulvinar), en el eje corto del lado sur
export const PALCO = new THREE.Vector3(0, 4.2, B0 + 3.2);
const Palco: React.FC = () => {
  const marmol = usePBR('marble_01', 1, 2);
  return (
    <group position={PALCO.toArray()}>
      <mesh material={marmol} position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[7, 0.6, 4]} /></mesh>
      {[-3, -1, 1, 3].map((x) => (
        <mesh key={x} material={marmol} position={[x, 2.4, 1.6]} castShadow><cylinderGeometry args={[0.22, 0.26, 3.6, 16]} /></mesh>
      ))}
      <mesh material={marmol} position={[0, 4.4, 0.5]} castShadow><boxGeometry args={[7.4, 0.5, 3.4]} /></mesh>
      {/* telas rojas */}
      <mesh position={[0, 0.95, -1.95]} castShadow><boxGeometry args={[7, 0.7, 0.08]} /><meshStandardMaterial color="#8e1414" roughness={0.9} /></mesh>
      <mesh position={[-2, 3.6, 1.7]} rotation={[0, 0, 0.1]}><boxGeometry args={[1.2, 1.4, 0.05]} /><meshStandardMaterial color="#6a1a6a" roughness={0.9} /></mesh>
      <mesh position={[2, 3.6, 1.7]} rotation={[0, 0, -0.1]}><boxGeometry args={[1.2, 1.4, 0.05]} /><meshStandardMaterial color="#6a1a6a" roughness={0.9} /></mesh>
      <mesh position={[0, 1.0, 1.0]} castShadow><boxGeometry args={[1.4, 0.8, 0.8]} /><meshStandardMaterial color="#d8c08a" metalness={0.6} roughness={0.35} /></mesh>
    </group>
  );
};
