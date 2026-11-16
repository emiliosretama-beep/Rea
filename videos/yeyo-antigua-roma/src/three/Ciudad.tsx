import React, {useMemo, useRef, useLayoutEffect} from 'react';
import * as THREE from 'three';
import {random} from 'remotion';
import {usePBR} from './Materiales';
import {A, B} from './Coliseo';

const InstColor: React.FC<{items: {p: [number, number, number]; s: [number, number, number]; r?: number; c?: string}[]; geo: THREE.BufferGeometry; mat: THREE.Material}> = ({items, geo, mat}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p); o.scale.set(...it.s); o.rotation.set(0, it.r ?? 0, 0); o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      if (it.c) ref.current!.setColorAt(i, new THREE.Color(it.c));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow />;
};

export const Templo: React.FC<{p: [number, number, number]; r?: number; s?: number}> = ({p, r = 0, s = 1}) => {
  const marmol = usePBR('marble_01', 2, 2);
  const cols = [];
  for (let i = 0; i < 6; i++) cols.push([-5 + i * 2, 0], [-5 + i * 2, -14]);
  for (let j = 1; j < 7; j++) cols.push([-5, -j * 2], [5, -j * 2]);
  return (
    <group position={p} rotation={[0, r, 0]} scale={s}>
      <mesh material={marmol} position={[0, 0.75, -7]} castShadow receiveShadow><boxGeometry args={[13, 1.5, 17]} /></mesh>
      {cols.map(([x, z], i) => <mesh key={i} material={marmol} position={[x, 5.5, z]} castShadow><cylinderGeometry args={[0.45, 0.52, 8, 20]} /></mesh>)}
      <mesh material={marmol} position={[0, 9.9, -7]} castShadow><boxGeometry args={[12, 0.9, 15.5]} /></mesh>
      <mesh position={[0, 11.3, -7]} rotation={[0, 0, 0]} castShadow scale={[1, 1, 1]}>
        <cylinderGeometry args={[0, 7.2, 2.0, 4, 1]} />
        <meshStandardMaterial color="#b0582e" roughness={0.8} />
      </mesh>
      <mesh material={marmol} position={[0, 4, -9]} castShadow><boxGeometry args={[8, 8, 9]} /></mesh>
    </group>
  );
};

export const Ciudad: React.FC = () => {
  const suelo = usePBR('aerial_grass_rock', 40, 40, '#cfc29a');
  const plaza = usePBR('cobblestone_floor_08', 30, 30);
  const techo = usePBR('roof_tiles_14', 3, 3, '#d98a62');
  const muro = useMemo(() => new THREE.MeshStandardMaterial({roughness: 0.9}), []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const piram = useMemo(() => { const g = new THREE.CylinderGeometry(0, 0.75, 1, 4, 1); g.rotateY(Math.PI / 4); return g; }, []);
  const casas = useMemo(() => {
    const out: {p: [number, number, number]; s: [number, number, number]; r?: number; c?: string}[] = [];
    const roofs: typeof out = [];
    const tonos = ['#e9d3b0', '#e0b98a', '#d9a477', '#efe2c8', '#c98d62', '#e6c79c'];
    let i = 0;
    for (let gx = -14; gx <= 14; gx++) for (let gz = -14; gz <= 14; gz++) {
      const x = gx * 14 + (random(`x${gx}${gz}`) - 0.5) * 5, z = gz * 14 + (random(`z${gx}${gz}`) - 0.5) * 5;
      if ((x / (A + 22)) ** 2 + (z / (B + 22)) ** 2 < 1) continue; // plaza alrededor del Coliseo
      if (Math.abs(z - 40) < 9 && x > 60) continue; // avenida
      const w = 7 + random(`w${i}`) * 6, d = 7 + random(`d${i}`) * 6, h = 4 + random(`h${i}`) * (Math.hypot(x, z) < 120 ? 10 : 6);
      const r = Math.round(random(`r${i}`)) * 0.05;
      out.push({p: [x, h / 2, z], s: [w, h, d], r, c: tonos[i % tonos.length]});
      roofs.push({p: [x, h + 1.1, z], s: [w * 1.4, 2.2, d * 1.4], r});
      i++;
    }
    return {out, roofs};
  }, []);
  const acueducto = useMemo(() => Array.from({length: 60}).map((_, i) => ({p: [-220 + i * 6, 9, -150 + i * 1.2] as [number, number, number], s: [1.6, 18, 2] as [number, number, number], r: -0.2, c: '#cfae84'})), []);
  return (
    <group>
      <mesh material={suelo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow><planeGeometry args={[1400, 1400]} /></mesh>
      <mesh material={plaza} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow><circleGeometry args={[A + 20, 96]} /></mesh>
      <InstColor items={casas.out} geo={box} mat={muro} />
      <InstColor items={casas.roofs} geo={piram} mat={techo} />
      <InstColor items={acueducto} geo={box} mat={muro} />
      <mesh position={[-40, 18.5, -156]} rotation={[0, -0.2, 0]} castShadow><boxGeometry args={[365, 2, 2.4]} /><meshStandardMaterial color="#d9b98e" roughness={0.9} /></mesh>
      <Templo p={[95, 0, 40]} r={-Math.PI / 2} s={1.3} />
      <Templo p={[-30, 0, 110]} r={Math.PI} s={1.2} />
      <Templo p={[-110, 0, -20]} r={Math.PI / 2} s={1.5} />
      {/* colinas */}
      {[[-380, -300, 160], [300, -420, 200], [-500, 200, 180], [480, 260, 150]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.7, z]} scale={[1, 0.55, 1]} receiveShadow><sphereGeometry args={[r, 48, 24]} /><meshStandardMaterial color="#7d8a4a" roughness={1} /></mesh>
      ))}
      {/* río Tíber */}
      <mesh rotation={[-Math.PI / 2, 0, 0.4]} position={[260, 0.05, 0]}><planeGeometry args={[40, 1400]} /><meshStandardMaterial color="#4a7a7a" roughness={0.15} metalness={0.3} /></mesh>
    </group>
  );
};

export const Calle: React.FC<{z: number}> = ({z}) => {
  const piedra = usePBR('cobblestone_floor_08', 4, 120);
  const marmol = usePBR('marble_01', 1, 2);
  const fachada = usePBR('sandstone_blocks_08', 3, 2, '#f0d8b8');
  const largo = 480;
  return (
    <group position={[0, 0, -z]}>
      <mesh material={piedra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, largo / 2 - 60]} receiveShadow><planeGeometry args={[16, largo]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, largo / 2 - 60]} receiveShadow><planeGeometry args={[200, largo]} /><meshStandardMaterial color="#cdb894" roughness={1} /></mesh>
      {Array.from({length: 60}).map((_, i) => (
        <React.Fragment key={i}>
          {[-1, 1].map((l) => (
            <group key={l} position={[l * 8.5, 0, -60 + i * 8]}>
              <mesh material={marmol} position={[0, 3.2, 0]} castShadow receiveShadow><cylinderGeometry args={[0.35, 0.42, 6.4, 16]} /></mesh>
              <mesh material={marmol} position={[0, 6.6, 0]} castShadow><boxGeometry args={[1.1, 0.4, 1.1]} /></mesh>
              <mesh material={fachada} position={[l * 4.5, 5.5, 0]} castShadow receiveShadow><boxGeometry args={[6, 11 + (i % 3) * 2, 8]} /></mesh>
            </group>
          ))}
        </React.Fragment>
      ))}
      {[-1, 1].map((l) => <mesh key={l} material={marmol} position={[l * 8.5, 7.1, largo / 2 - 60]} castShadow><boxGeometry args={[1.4, 0.6, largo]} /></mesh>)}
      <Templo p={[0, 0, 420]} r={Math.PI} s={1.6} />
    </group>
  );
};

export const Salon: React.FC = () => {
  const marmol = usePBR('marble_01', 6, 6);
  const col = usePBR('marble_01', 1, 3);
  return (
    <group>
      <mesh material={marmol} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /></mesh>
      {/* paredes rojo pompeyano con franjas */}
      {[[0, -8, 0], [-10, 0, Math.PI / 2], [10, 0, -Math.PI / 2]].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 4, 0]} receiveShadow><planeGeometry args={[30, 8]} /><meshStandardMaterial color="#8e2a1e" roughness={0.9} /></mesh>
          <mesh position={[0, 0.6, 0.02]}><planeGeometry args={[30, 1.2]} /><meshStandardMaterial color="#1e1410" roughness={0.9} /></mesh>
          <mesh position={[0, 6.4, 0.02]}><planeGeometry args={[30, 0.3]} /><meshStandardMaterial color="#d8b04a" roughness={0.5} metalness={0.5} /></mesh>
        </group>
      ))}
      {[-7, -3, 3, 7].map((x) => <mesh key={x} material={col} position={[x, 4, -7]} castShadow><cylinderGeometry args={[0.38, 0.45, 8, 20]} /></mesh>)}
      {/* mesa con comida */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow><cylinderGeometry args={[0.95, 0.95, 0.1, 40]} /><meshStandardMaterial color="#5a3418" roughness={0.4} /></mesh>
      <mesh position={[0, 0.27, 0]} castShadow><cylinderGeometry args={[0.15, 0.25, 0.55, 16]} /><meshStandardMaterial color="#d8b04a" roughness={0.3} metalness={0.8} /></mesh>
      <mesh position={[0, 0.66, 0]} castShadow><cylinderGeometry args={[0.45, 0.35, 0.12, 32]} /><meshStandardMaterial color="#d8b04a" roughness={0.25} metalness={0.9} /></mesh>
      {Array.from({length: 26}).map((_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 0.35 * (i % 3 / 3 + 0.3), 0.76 + (i % 4) * 0.04, Math.sin(i * 2.4) * 0.35 * (i % 3 / 3 + 0.3)]}><sphereGeometry args={[0.07, 14, 10]} /><meshStandardMaterial color={i % 3 ? '#4a1a5a' : '#8aa83a'} roughness={0.25} /></mesh>)}
      {[[0.6, 0.35], [-0.55, 0.45]].map(([x, z], i) => (
        <group key={i} position={[x, 0.6, z]}>
          <mesh castShadow position={[0, 0.12, 0]}><cylinderGeometry args={[0.1, 0.05, 0.16, 20]} /><meshStandardMaterial color="#d8b04a" roughness={0.2} metalness={0.9} /></mesh>
          <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.085, 0.085, 0.01, 20]} /><meshStandardMaterial color="#4a0a14" roughness={0.1} /></mesh>
        </group>
      ))}
      {/* divanes */}
      {[[-1.9, 0.4, 0.5], [1.9, 0.4, -0.5]].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}><boxGeometry args={[1.4, 0.5, 2.6]} /><meshStandardMaterial color="#4a2a14" roughness={0.5} /></mesh>
          <mesh castShadow position={[0, 0.72, 0]}><boxGeometry args={[1.3, 0.18, 2.5]} /><meshStandardMaterial color="#8a1a2a" roughness={0.95} /></mesh>
        </group>
      ))}
      {/* antorchas */}
      {[[-6, -6.5], [6, -6.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.08, 0.12, 2, 10]} /><meshStandardMaterial color="#3a2a1a" /></mesh>
          <mesh position={[0, 2.15, 0]}><coneGeometry args={[0.2, 0.5, 12]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>
          <pointLight position={[0, 2.4, 0.5]} color="#ff9a40" intensity={25} distance={14} decay={1.6} />
        </group>
      ))}
    </group>
  );
};
