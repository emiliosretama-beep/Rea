import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {Environment} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {delayRender, continueRender} from 'remotion';
import {useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Easing, random} from 'remotion';
import {Coliseo, PALCO, A, B} from './three/Coliseo';
import {Ciudad, Calle, Salon} from './three/Ciudad';
import {Yeyo, Gladiador, Romano, Caballo, Laurel} from './three/Personajes';

type V3 = [number, number, number];
type Toma = {desde: number; hasta: number; pos: [V3, V3]; mira: [V3, V3]; fov?: number};

// Cámara por tomas: dentro de cada toma se mueve suave; entre tomas, corte seco.
const Camara: React.FC<{tomas: Toma[]}> = ({tomas}) => {
  const f = useCurrentFrame();
  const {camera} = useThree();
  const t = tomas.find((x) => f >= x.desde && f < x.hasta) ?? tomas[tomas.length - 1];
  const k = interpolate(f, [t.desde, t.hasta], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  const lerp = (a: V3, b: V3) => a.map((v, i) => v + (b[i] - v) * k) as V3;
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...lerp(...t.pos));
  cam.fov = t.fov ?? 38; cam.near = 0.05; cam.far = 3000; cam.updateProjectionMatrix();
  cam.lookAt(...lerp(...t.mira));
  return null;
};

const Lienzo: React.FC<{children: React.ReactNode; exposicion?: number}> = ({children, exposicion = 1}) => {
  const {width, height} = useVideoConfig();
  // Espera a que carguen texturas y cielo antes de capturar el cuadro
  const [handle] = React.useState(() => delayRender('Cargando escena 3D', {timeoutInMilliseconds: 120000}));
  return (
    <ThreeCanvas width={width} height={height} shadows camera={{fov: 38}}
      gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposicion, preserveDrawingBuffer: true}}>
      <React.Suspense fallback={null}>
        {children}
        <Listo handle={handle} />
      </React.Suspense>
    </ThreeCanvas>
  );
};

const Listo: React.FC<{handle: number}> = ({handle}) => {
  const {advance} = useThree();
  React.useEffect(() => {
    advance(performance.now());
    requestAnimationFrame(() => continueRender(handle));
  }, [advance, handle]);
  return null;
};

const Sol: React.FC<{pos?: V3; color?: string; intensidad?: number; area?: number; objetivo?: V3}> = ({pos = [60, 90, 70], color = '#fff1d6', intensidad = 3.2, area = 40, objetivo = [0, 0, 0]}) => {
  const target = React.useMemo(() => new THREE.Object3D(), []);
  target.position.set(...objetivo);
  return (
    <>
      <primitive object={target} />
      <directionalLight position={[pos[0] + objetivo[0], pos[1], pos[2] + objetivo[2]]} target={target} color={color} intensity={intensidad} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004} shadow-normalBias={0.04}
        shadow-camera-left={-area} shadow-camera-right={area} shadow-camera-top={area} shadow-camera-bottom={-area} shadow-camera-near={1} shadow-camera-far={400} />
    </>
  );
};

const Cielo: React.FC<{intensidad?: number}> = ({intensidad = 1}) => (
  <Environment files={staticFile('tex/cielo.hdr')} background environmentIntensity={intensidad} backgroundIntensity={intensidad} />
);

// ---------- 1 y 7: vista aérea de la Roma antigua ----------
export const EscenaAerea: React.FC<{dur: number; atardecer?: boolean}> = ({dur, atardecer}) => (
  <Lienzo exposicion={atardecer ? 0.85 : 1}>
    <Cielo intensidad={atardecer ? 0.55 : 0.9} />
    <fog attach="fog" args={[atardecer ? '#e8a070' : '#cfe0ee', 120, 900]} />
    <Sol pos={atardecer ? [-160, 45, 60] : [80, 110, 90]} color={atardecer ? '#ffb070' : '#fff1d6'} intensidad={atardecer ? 3.5 : 3.2} area={90} />
    <hemisphereLight args={['#bcd8ff', '#8a7a5a', 0.4]} />
    <Coliseo animo={atardecer ? 0.6 : 0.2} />
    <Ciudad />
    <Camara tomas={atardecer
      ? [{desde: 0, hasta: dur, pos: [[0, 14, 6], [-70, 150, 190]], mira: [[0, 2, 0], [0, 0, 0]], fov: 40}]
      : [{desde: 0, hasta: dur, pos: [[140, 170, 330], [55, 48, 105]], mira: [[0, 0, 0], [0, 6, 0]], fov: 40}]} />
  </Lienzo>
);

// ---------- 2, 3 y 4: dentro del Coliseo ----------
// frames locales (la escena empieza en el global 90)
export const T = {aparece: 135, gladHabla: 172, yeyoHabla: 272, baile: 400, emperador: 555, laurel: 675, fin: 780};

const Destello: React.FC<{f: number}> = ({f}) => {
  const k = f - T.aparece;
  if (k < -4 || k > 30) return null;
  const s = interpolate(k, [-4, 0, 30], [0.1, 1.2, 4]);
  const o = interpolate(k, [-4, 0, 30], [0.4, 1, 0], {extrapolateRight: 'clamp'});
  return (
    <group position={[0, 1, 1.6]}>
      <mesh scale={s}><sphereGeometry args={[0.6, 24, 16]} /><meshBasicMaterial color="#fff6d8" transparent opacity={o * 0.8} toneMapped={false} /></mesh>
      <pointLight intensity={o * 200} distance={20} color="#fff0c0" />
      {Array.from({length: 26}).map((_, i) => {
        const a = (i / 26) * Math.PI * 2;
        const r = 0.5 + k * 0.12;
        return <mesh key={i} position={[Math.cos(a) * r, -0.8 + random(`p${i}`) * 0.4 + k * 0.01, Math.sin(a) * r]} scale={0.25 + k * 0.03}><sphereGeometry args={[0.5, 10, 8]} /><meshStandardMaterial color="#e6d3ae" transparent opacity={o * 0.6} roughness={1} /></mesh>;
      })}
    </group>
  );
};

const Petalos: React.FC<{f: number; desde: number}> = ({f, desde}) => {
  if (f < desde) return null;
  return (
    <group>
      {Array.from({length: 140}).map((_, i) => {
        const x = (random(`px${i}`) - 0.5) * 18, z = (random(`pz${i}`) - 0.5) * 14;
        const y = 12 - (((f - desde) * (0.05 + random(`pv${i}`) * 0.05) + random(`py${i}`) * 12) % 12);
        return <mesh key={i} position={[x + Math.sin(f / 10 + i) * 0.4, y, z]} rotation={[f / 8 + i, f / 11 + i, 0]}><planeGeometry args={[0.09, 0.07]} /><meshStandardMaterial color={i % 3 ? '#c4161c' : '#e85a6a'} side={THREE.DoubleSide} roughness={0.7} /></mesh>;
      })}
    </group>
  );
};

const boca = (f: number, ini: number, fin: number) => (f >= ini && f < fin ? Math.abs(Math.sin(f * 0.9)) * 0.8 : 0);

export const EscenaArena: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pelea = f < T.aparece;
  const apar = spring({frame: f - T.aparece, fps, config: {damping: 12}});
  const giro = interpolate(f, [T.aparece + 5, T.aparece + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bailando = f >= T.baile && f < T.emperador;
  const haciaPalco = interpolate(f, [T.emperador - 10, T.emperador + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const gol = (o: number) => (pelea ? Math.sin(f / 4 + o) * 0.5 + 0.5 : 0);
  const laurelY = interpolate(spring({frame: f - T.laurel, fps, config: {damping: 14, mass: 1.4}}), [0, 1], [9, 2.07]);
  const animo = bailando ? 1 : f > T.laurel + 20 ? 1 : f > T.aparece ? 0.15 : 0.6;
  const yeyoRot = Math.PI * haciaPalco * 0; // ya mira al palco (+z)
  return (
    <Lienzo>
      <Cielo intensidad={0.9} />
      <fog attach="fog" args={['#d8e6f0', 60, 400]} />
      <Sol pos={[40, 70, -30]} area={30} />
      <hemisphereLight args={['#bcd8ff', '#c8a878', 0.35]} />
      <Coliseo animo={animo} />
      {/* gladiadores */}
      <group position={[-1.3 + gol(0) * 0.15, 0, 0]} rotation={[0, interpolate(giro, [0, 1], [Math.PI / 2, 0.68]) + haciaPalco * 0.2, 0]}>
        <Gladiador pose={{paso: bailando ? 0 : f / 3, t: f, baile: bailando ? 1 : 0, brazoD: bailando ? 0.7 : 0, boca: 0}} espada={bailando ? 1 : pelea ? gol(0) : interpolate(f, [T.aparece, T.aparece + 15], [0, 1], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'})} color="#1e3f8a" />
      </group>
      <group position={[1.3 - gol(2) * 0.15, 0, 0]} rotation={[0, interpolate(giro, [0, 1], [-Math.PI / 2, -0.68]), 0]}>
        <Gladiador pose={{paso: bailando ? 0 : f / 3 + 1, t: f + 7, baile: bailando ? 1 : 0, brazoI: bailando ? 0.7 : 0, boca: boca(f, T.gladHabla, T.gladHabla + 90)}} espada={bailando ? 1 : pelea ? gol(2) : f > T.gladHabla && f < T.yeyoHabla ? 0.3 : 0} />
      </group>
      {/* Yeyo */}
      {f >= T.aparece - 2 && (
        <group position={[0, 0, 1.6]} scale={apar} rotation={[0, yeyoRot, 0]}>
          <Yeyo pose={{t: f, baile: bailando ? 0.8 : 0, boca: boca(f, T.yeyoHabla, T.yeyoHabla + 118) + boca(f, T.laurel + 5, T.laurel + 75),
            brazoD: f >= T.yeyoHabla && f < T.yeyoHabla + 120 ? 0.45 : f > T.laurel + 10 ? 0.95 : 0,
            brazoI: f >= T.yeyoHabla && f < T.yeyoHabla + 120 ? 0.45 : 0}}
            guitarra={bailando} laurel={f > T.laurel + 22 ? 1 : 0} />
        </group>
      )}
      {f >= T.laurel && f <= T.laurel + 22 && <group position={[0, laurelY + 0.11, 1.6 - 0.02]} rotation={[0, f / 4, 0]}><Laurel s={1.4} /></group>}
      {/* emperador en el palco */}
      <group position={[PALCO.x, PALCO.y + 0.6, PALCO.z - 0.4]} rotation={[0, Math.PI, 0]}>
        <Romano pose={{brazoD: f >= T.emperador && f < T.laurel + 10 ? 0.8 : 0, boca: boca(f, T.emperador + 4, T.emperador + 112), t: f}} toga="#f4efe4" banda="#5a1a6a" laurel />
      </group>
      {[-2.4, 2.4].map((x) => <group key={x} position={[PALCO.x + x, PALCO.y + 0.6, PALCO.z - 0.2]} rotation={[0, Math.PI, 0]}><Romano pose={{t: f}} toga="#e8e0cc" banda="#b3241c" /></group>)}
      <Destello f={f} />
      <Petalos f={f} desde={T.baile} />
      <Camara tomas={[
        {desde: 0, hasta: T.aparece + 37, pos: [[2.5, 1.2, 12], [0.6, 1.5, 7.5]], mira: [[0, 1.3, 0], [0, 1.3, 0.8]], fov: 40},
        {desde: T.aparece + 37, hasta: T.yeyoHabla, pos: [[0.95, 1.72, 2.7], [0.8, 1.7, 2.25]], mira: [[1.3, 1.6, 0], [1.3, 1.62, 0]], fov: 36},
        {desde: T.yeyoHabla, hasta: T.baile, pos: [[0.5, 1.75, 5.0], [0.25, 1.75, 4.0]], mira: [[0, 1.6, 1.6], [0, 1.68, 1.6]], fov: 34},
        {desde: T.baile, hasta: T.emperador, pos: [[-7, 2.4, 7], [7, 3.2, 6.5]], mira: [[0, 1.2, 0.8], [0, 1.3, 0.8]], fov: 42},
        {desde: T.emperador, hasta: T.laurel, pos: [[1.4, 5.7, 12.8], [0.6, 6.0, 14.3]], mira: [[0, 6.1, 17.4], [0, 6.25, 17.4]], fov: 36},
        {desde: T.laurel, hasta: T.fin + 10, pos: [[0, 2.0, 5.2], [0, 1.95, 4.2]], mira: [[0, 1.85, 1.6], [0, 1.85, 1.6]], fov: 36},
      ]} />
    </Lienzo>
  );
};

// ---------- 5: cuadriga por la ciudad ----------
export const EscenaCuadriga: React.FC<{dur: number; gritan: number}> = ({dur, gritan}) => {
  const f = useCurrentFrame();
  const z = f * 0.45;
  const grito = f >= gritan && f < gritan + 45;
  return (
    <Lienzo>
      <Cielo intensidad={0.9} />
      <fog attach="fog" args={['#e8dcc8', 40, 260]} />
      <Sol pos={[50, 80, 30]} area={25} objetivo={[0, 0, 4]} />
      <hemisphereLight args={['#bcd8ff', '#c8a878', 0.35]} />
      <Calle z={z} />
      {/* romanos a los lados, se mueven con la calle */}
      <group position={[0, 0, -z]}>
        {Array.from({length: 26}).map((_, i) => {
          const lado = i % 2 ? 1 : -1;
          const zz = Math.floor(i / 2) * 5 + 4;
          return (
            <group key={i} position={[lado * (5.6 + (i % 3) * 0.6), 0, zz]} rotation={[0, -lado * Math.PI / 2 + 0.3 * lado, 0]}>
              <Romano pose={{t: f + i * 3, baile: grito ? 0.5 : 0.1, brazoD: grito ? 1 : 0.2 * (i % 2), brazoI: grito ? 1 : 0, boca: grito ? 0.8 : 0}} toga={['#f1ece0', '#c9a24a', '#b3241c', '#3d5a8a', '#e6dcc4'][i % 5]} banda={['#b3241c', '#3d5a8a', '#f1ece0', '#c9a24a'][i % 4]} piel={['#c99a72', '#b07a50', '#e0b08a'][i % 3]} />
            </group>
          );
        })}
      </group>
      {/* cuadriga */}
      <group position={[0, 0, Math.sin(f / 7) * 0.05]}>
        {[-1.5, -0.5, 0.5, 1.5].map((x, i) => <group key={x} position={[x * 0.9, 0, 3.6 + (i % 2) * 0.15]}><Caballo t={f + i * 3} color={['#4a2e1a', '#6a4426', '#3a2414', '#5a3a22'][i]} /></group>)}
        <mesh position={[0, 1.2, 2.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 2.6, 8]} /><meshStandardMaterial color="#5a3418" /></mesh>
        <group position={[0, 0, 0.3]}>
          <mesh castShadow position={[0, 0.9, 0.3]} scale={[1, 1, 0.6]}><cylinderGeometry args={[0.75, 0.75, 1.0, 32, 1, true, -Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.3} side={THREE.DoubleSide} /></mesh>
          <mesh castShadow position={[0, 0.42, 0]}><boxGeometry args={[1.5, 0.08, 0.9]} /><meshStandardMaterial color="#5a3418" /></mesh>
          {[-0.85, 0.85].map((x) => (
            <group key={x} position={[x, 0.55, 0]} rotation={[f * 0.18, 0, 0]}>
              <mesh castShadow rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.55, 0.05, 10, 40]} /><meshStandardMaterial color="#3a2414" /></mesh>
              {[0, 1, 2, 3].map((s) => <mesh key={s} rotation={[s * Math.PI / 4, 0, 0]}><boxGeometry args={[0.04, 1.08, 0.04]} /><meshStandardMaterial color="#5a3418" /></mesh>)}
            </group>
          ))}
          <group position={[0, 0.46, -0.05]}>
            <Yeyo pose={{t: f, brazoD: 1, brazoI: grito ? 1 : 0.3, boca: grito ? 0.8 : 0}} laurel={1} />
          </group>
        </group>
      </group>
      <Camara tomas={[
        {desde: 0, hasta: Math.round(dur * 0.55), pos: [[3.6, 1.9, 9.5], [3.0, 2.0, 7.5]], mira: [[0, 1.6, 1.5], [0, 1.7, 1.0]], fov: 40},
        {desde: Math.round(dur * 0.55), hasta: dur, pos: [[-2.6, 2.3, 2.6], [-2.1, 2.2, 2.1]], mira: [[0, 1.95, 0.3], [0, 1.95, 0.3]], fov: 42},
      ]} />
    </Lienzo>
  );
};

// ---------- 6: banquete ----------
export const EscenaBanquete: React.FC<{dur: number; yeyoHabla: number; narra: number}> = ({dur, yeyoHabla}) => {
  const f = useCurrentFrame();
  return (
    <Lienzo exposicion={1.05}>
      <Cielo intensidad={0.35} />
      <Sol pos={[8, 20, 14]} color="#ffd8a8" intensidad={1.6} area={10} />
      <hemisphereLight args={['#ffe2c0', '#5a2a1a', 0.3]} />
      <Salon />
      {/* emperador recostado */}
      <group position={[1.9, 0.35, -0.5]} rotation={[0, -Math.PI / 2 - 0.4, 0]}>
        <Romano pose={{sentado: true, t: f, brazoD: 0.35}} toga="#f4efe4" banda="#5a1a6a" laurel />
      </group>
      {/* sirviente */}
      <group position={[0.6, 0, -2.0]} rotation={[0, -0.3, 0]}><Romano pose={{t: f, brazoD: 0.4}} toga="#d8cfb8" banda="#7a5a3a" piel="#a86b44" /></group>
      {/* Yeyo sentado con uvas */}
      <group position={[-1.9, 0.35, 0.5]} rotation={[0, Math.PI / 2 - 0.5, 0]}>
        <Yeyo pose={{sentado: true, t: f, brazoI: f > yeyoHabla - 20 ? 0.75 : 0.35, boca: boca(f, yeyoHabla, yeyoHabla + 48)}} laurel={1} uvas />
      </group>
      <Camara tomas={[
        {desde: 0, hasta: yeyoHabla - 6, pos: [[0, 2.6, 9.2], [0, 2.3, 8.0]], mira: [[0, 1.0, 0], [0, 1.05, 0]], fov: 50},
        {desde: yeyoHabla - 6, hasta: dur, pos: [[0.1, 1.6, 2.6], [-0.2, 1.55, 2.0]], mira: [[-1.7, 1.45, 0.6], [-1.75, 1.45, 0.6]], fov: 36},
      ]} />
    </Lienzo>
  );
};
