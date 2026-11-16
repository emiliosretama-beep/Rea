import React from 'react';
import * as THREE from 'three';
import {random} from 'remotion';

// Personajes 3D hechos con formas (estilo plastilina). Nadie es la cara real de una persona.
type Pose = {
  paso?: number;      // fase de caminata/galope (radianes)
  brazoD?: number;    // levantar brazo derecho (0..1)
  brazoI?: number;    // levantar brazo izquierdo (0..1)
  baile?: number;     // intensidad de baile 0..1
  t?: number;         // frame para animaciones
  sentado?: boolean;
  boca?: number;      // 0..1 boca abierta (hablando)
};

const M = (color: string, rough = 0.6, metal = 0) => <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;
const Cap: React.FC<{r: number; l: number; c: string; p?: [number, number, number]; s?: [number, number, number]; rough?: number}> = ({r, l, c, p = [0, 0, 0], s = [1, 1, 1], rough}) => (
  <mesh position={p} scale={s} castShadow receiveShadow><capsuleGeometry args={[r, l, 6, 16]} />{M(c, rough)}</mesh>
);

const Lentes: React.FC = () => (
  <group position={[0, 0.03, 0]}>
    <mesh scale={[1.04, 1, 1]}><cylinderGeometry args={[0.152, 0.148, 0.055, 40, 1, true, -1.45, 2.9]} /><meshStandardMaterial color="#050505" metalness={0.7} roughness={0.06} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.028, 0]} scale={[1.04, 1, 1]}><cylinderGeometry args={[0.154, 0.154, 0.008, 40, 1, true, -1.45, 2.9]} /><meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} side={THREE.DoubleSide} /></mesh>
  </group>
);

const Rizos: React.FC<{color: string}> = ({color}) => (
  <group>
    <mesh position={[0, 0.02, -0.01]} scale={[1.1, 1.0, 1.08]}><sphereGeometry args={[0.138, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />{M(color, 0.95)}</mesh>
    {Array.from({length: 46}).map((_, i) => {
      const a = i * 2.39996, h = 0.35 + (i / 46) * 0.62;
      const r = Math.sqrt(1 - h * h);
      return <mesh key={i} position={[Math.cos(a) * r * 0.15, 0.03 + h * 0.13, Math.sin(a) * r * 0.15 - 0.005]}><sphereGeometry args={[0.032, 8, 6]} />{M(color, 0.95)}</mesh>;
    })}
  </group>
);

const Cabeza: React.FC<{piel: string; pelo: string; boca: number; bigote?: boolean; lentes?: boolean; rizos?: boolean; cachetes?: boolean}> = ({piel, pelo, boca, bigote, lentes, rizos, cachetes}) => (
  <group>
    <mesh castShadow scale={cachetes ? [1.14, 1.1, 1.06] : [1, 1.12, 1.02]}><sphereGeometry args={[0.13, 32, 24]} />{M(piel, 0.5)}</mesh>
    {cachetes && <mesh position={[0, -0.075, 0.03]} scale={[1.25, 0.6, 1]}><sphereGeometry args={[0.1, 20, 14]} />{M(piel, 0.5)}</mesh>}
    {lentes && <Lentes />}
    {/* orejas */}
    <mesh position={[0.128, 0, 0]} scale={[0.4, 1, 0.7]}><sphereGeometry args={[0.04, 12, 10]} />{M(piel, 0.5)}</mesh>
    <mesh position={[-0.128, 0, 0]} scale={[0.4, 1, 0.7]}><sphereGeometry args={[0.04, 12, 10]} />{M(piel, 0.5)}</mesh>
    {/* nariz */}
    <mesh position={[0, -0.01, 0.13]} scale={[0.8, 1, 1]}><sphereGeometry args={[0.028, 12, 10]} />{M(piel, 0.45)}</mesh>
    {/* ojos */}
    {!lentes && [-0.045, 0.045].map((x) => (
      <group key={x} position={[x, 0.03, 0.112]}>
        <mesh scale={[1, 1, 0.5]}><sphereGeometry args={[0.022, 14, 10]} />{M('#ffffff', 0.2)}</mesh>
        <mesh position={[0, 0, 0.01]}><sphereGeometry args={[0.012, 12, 10]} />{M('#1a120c', 0.1)}</mesh>
      </group>
    ))}
    {/* cejas */}
    {!lentes && [-0.045, 0.045].map((x) => <mesh key={x} position={[x, 0.07, 0.118]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}><boxGeometry args={[0.05, 0.012, 0.012]} />{M(pelo, 0.8)}</mesh>)}
    {/* boca */}
    <mesh position={[0, -0.065, 0.112]} scale={[1, 0.25 + boca * 0.9, 0.5]}><sphereGeometry args={[0.03, 14, 10]} />{M('#4a1414', 0.5)}</mesh>
    {bigote && <mesh position={[0, -0.04, 0.122]} scale={[1.6, 0.35, 0.6]}><sphereGeometry args={[0.028, 12, 8]} />{M(pelo, 0.9)}</mesh>}
    {/* pelo */}
    {rizos ? <Rizos color={pelo} /> : <mesh position={[0, 0.03, -0.015]} scale={[1.05, 1.0, 1.05]}><sphereGeometry args={[0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />{M(pelo, 0.9)}</mesh>}
  </group>
);

// Esqueleto común: piernas, torso, brazos, cabeza. "ropa" define colores.
const Cuerpo: React.FC<{pose: Pose; piel: string; torso: string; piernas: string; botas: string; mangas?: string; children?: React.ReactNode; cabeza?: React.ReactNode; manoD?: React.ReactNode; manoI?: React.ReactNode; falda?: React.ReactNode; ancho?: number; torsoMat?: THREE.Material; mangaCorta?: boolean; shorts?: boolean}> = ({pose, piel, torso, piernas, botas, mangas, children, cabeza, manoD, manoI, falda, ancho = 1, torsoMat, mangaCorta, shorts}) => {
  const {paso = 0, brazoD = 0, brazoI = 0, baile = 0, t = 0, sentado} = pose;
  const sw = Math.sin(paso) * 0.6;
  const rebote = baile * Math.abs(Math.sin(t / 5)) * 0.08;
  const giro = baile * Math.sin(t / 10) * 0.35;
  const piernaR = (s: number) => (sentado ? -1.45 : s);
  return (
    <group position={[0, rebote + (sentado ? -0.45 : 0), 0]} rotation={[0, giro, baile * Math.sin(t / 5) * 0.06]}>
      {/* piernas */}
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * 0.09 * ancho, 0.95, 0]} rotation={[piernaR(lado * sw), 0, 0]}>
          {shorts ? <>
            <Cap r={0.105} l={0.28} c={piernas} p={[0, -0.2, 0]} rough={0.9} />
            <Cap r={0.072} l={0.5} c={piel} p={[0, -0.58, 0]} rough={0.5} />
          </> : <Cap r={0.075} l={0.72} c={piernas} p={[0, -0.43, 0]} rough={0.9} />}
          <group position={[0, -0.86, sentado ? 0 : 0.04]} rotation={[sentado ? 1.45 : 0, 0, 0]}>
            <mesh castShadow position={[0, -0.03, 0.04]}><boxGeometry args={[0.13, 0.09, 0.28]} />{M(botas, 0.5)}</mesh>
          </group>
        </group>
      ))}
      {falda}
      {/* torso */}
      <mesh position={[0, 1.26, 0]} scale={[1.18 * ancho, 1, 0.78 * ancho]} castShadow receiveShadow material={torsoMat}><capsuleGeometry args={[0.17, 0.36, 6, 16]} />{!torsoMat && M(torso, 0.85)}</mesh>
      {children}
      {/* brazos */}
      {[-1, 1].map((lado) => {
        const sube = lado > 0 ? brazoD : brazoI;
        const rx = -lado * sw * 0.8 * (1 - sube) - sube * 2.6 + baile * Math.sin(t / 5 + lado) * 0.5;
        const rz = lado * (0.12 + sube * 0.35);
        return (
          <group key={lado} position={[lado * (0.25 + (ancho - 1) * 0.2), 1.48, 0]} rotation={[rx, 0, rz]}>
            <Cap r={0.062 * (ancho > 1 ? 1.25 : 1)} l={0.5} c={mangaCorta ? piel : mangas ?? torso} p={[0, -0.3, 0]} rough={mangaCorta ? 0.5 : 0.85} />
            {mangaCorta && <mesh position={[0, -0.1, 0]} castShadow material={torsoMat}><capsuleGeometry args={[0.092, 0.14, 4, 14]} />{!torsoMat && M(torso, 0.85)}</mesh>}
            <mesh position={[0, -0.62, 0]} castShadow><sphereGeometry args={[0.065, 16, 12]} />{M(piel, 0.5)}</mesh>
            <group position={[0, -0.66, 0.02]}>{lado > 0 ? manoD : manoI}</group>
          </group>
        );
      })}
      {/* cuello y cabeza */}
      <mesh position={[0, 1.6, 0]} castShadow><cylinderGeometry args={[0.055 * ancho, 0.065 * ancho, 0.12, 14]} />{M(piel, 0.5)}</mesh>
      <group position={[0, 1.76, 0]} rotation={[0, giro * 0.5, 0]}>{cabeza}</group>
    </group>
  );
};

export const Tejana: React.FC<{laurel?: number}> = ({laurel = 0}) => (
  <group position={[0, 0.11, 0]} rotation={[-0.08, 0, 0]}>
    <mesh castShadow scale={[1, 0.18, 1.12]}><sphereGeometry args={[0.33, 40, 12, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16]} /><meshStandardMaterial color="#d8b47a" roughness={0.75} side={THREE.DoubleSide} /></mesh>
    <mesh castShadow position={[0, 0.0, 0]} scale={[1, 1, 1.1]}><cylinderGeometry args={[0.3, 0.3, 0.012, 40]} />{M('#d8b47a', 0.75)}</mesh>
    <mesh castShadow position={[0, 0.09, 0]} scale={[1, 1, 1.15]}><cylinderGeometry args={[0.11, 0.14, 0.18, 32]} />{M('#e2c08a', 0.7)}</mesh>
    <mesh position={[0, 0.18, 0]} scale={[1, 0.35, 1.15]}><sphereGeometry args={[0.11, 24, 12]} />{M('#e2c08a', 0.7)}</mesh>
    <mesh position={[0, 0.025, 0]} scale={[1, 1, 1.15]}><cylinderGeometry args={[0.142, 0.142, 0.04, 32]} />{M('#4a2a14', 0.6)}</mesh>
    {laurel > 0 && <Laurel y={0.2} s={laurel} />}
  </group>
);

export const Laurel: React.FC<{y?: number; s?: number}> = ({y = 0.1, s = 1}) => (
  <group position={[0, y, 0]} scale={s}>
    {Array.from({length: 22}).map((_, i) => {
      const a = (i / 22) * Math.PI * 2;
      if (Math.abs(a - Math.PI * 0.5) < 0.35) return null;
      return <mesh key={i} position={[Math.cos(a) * 0.14, 0, Math.sin(a) * 0.15]} rotation={[0.4, -a, 0.6]} scale={[1, 0.35, 0.5]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color={i % 2 ? '#3f7a2a' : '#56962f'} roughness={0.5} metalness={0.1} /></mesh>;
    })}
  </group>
);

export const Guitarra: React.FC = () => (
  <group rotation={[0.2, 0.3, 1.2]} position={[0.05, 0.05, 0.25]}>
    <mesh castShadow scale={[1, 1, 0.35]}><sphereGeometry args={[0.16, 24, 16]} />{M('#a8682e', 0.35)}</mesh>
    <mesh castShadow position={[0, 0.17, 0]} scale={[1, 1, 0.35]}><sphereGeometry args={[0.12, 24, 16]} />{M('#a8682e', 0.35)}</mesh>
    <mesh position={[0, 0.06, 0.06]}><cylinderGeometry args={[0.04, 0.04, 0.01, 20]} />{M('#1a0f08', 0.6)}</mesh>
    <mesh castShadow position={[0, 0.48, 0]}><boxGeometry args={[0.05, 0.42, 0.03]} />{M('#4a2a14', 0.5)}</mesh>
  </group>
);

// Tela de camuflaje rosa/rojo dibujada por código (sin logos de marcas)
const useCamo = () => React.useMemo(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f7eef0'; g.fillRect(0, 0, 512, 512);
  const cols = ['#f4b3c2', '#e8667e', '#d6303f', '#f9d3dc', '#ee8a9c'];
  for (let i = 0; i < 90; i++) {
    g.fillStyle = cols[i % cols.length];
    const x = random(`cx${i}`) * 512, y = random(`cy${i}`) * 512;
    for (let k = 0; k < 4; k++) {
      const r = 14 + random(`r${i}-${k}`) * 26;
      const dx = (random(`dx${i}-${k}`) - 0.5) * 50, dy = (random(`dy${i}-${k}`) - 0.5) * 36;
      for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
        g.beginPath(); g.ellipse(x + dx + ox, y + dy + oy, r * 1.3, r, random(`a${i}`) * 3, 0, Math.PI * 2); g.fill();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.6);
  return new THREE.MeshStandardMaterial({map: t, roughness: 0.85});
}, []);

export const Yeyo: React.FC<{pose: Pose; laurel?: number; guitarra?: boolean; uvas?: boolean}> = ({pose, laurel = 0, guitarra, uvas}) => {
  const camo = useCamo();
  return (
    <Cuerpo pose={pose} piel="#d9a77f" torso="#f4b3c2" piernas="#141414" botas="#f2f2f2" ancho={1.38} torsoMat={camo} mangaCorta shorts
      cabeza={<><Cabeza piel="#d9a77f" pelo="#120c08" boca={pose.boca ?? 0} lentes rizos cachetes />{laurel > 0 && <Laurel y={0.09} s={1.2 * laurel} />}</>}
      manoI={uvas ? <Uvas /> : undefined}>
      {/* panza */}
      <mesh position={[0, 1.13, 0.07]} scale={[1.5, 1.05, 1.12]} castShadow material={camo}><sphereGeometry args={[0.17, 28, 20]} /></mesh>
      {/* cuello blanco del polo */}
      <mesh position={[0, 1.555, 0.005]} rotation={[Math.PI / 2 - 0.15, 0, 0]}><torusGeometry args={[0.085, 0.028, 10, 28]} />{M('#ffffff', 0.7)}</mesh>
      <mesh position={[0, 1.47, 0.155]} rotation={[0.25, 0, 0]}><boxGeometry args={[0.05, 0.13, 0.012]} />{M('#ffffff', 0.7)}</mesh>
      {/* shorts negros */}
      <mesh position={[0, 0.96, 0]} scale={[1.45, 1, 1.02]} castShadow><cylinderGeometry args={[0.19, 0.2, 0.16, 28]} />{M('#141414', 0.9)}</mesh>
      {guitarra && <group position={[0, 1.15, 0.2]}><Guitarra /></group>}
    </Cuerpo>
  );
};

export const Uvas: React.FC = () => (
  <group position={[0, -0.05, 0.05]}>
    {Array.from({length: 16}).map((_, i) => {
      const fila = Math.floor(Math.sqrt(i * 2));
      const a = i * 2.4;
      return <mesh key={i} position={[Math.cos(a) * 0.04 * (4 - fila) * 0.5, -fila * 0.035, Math.sin(a) * 0.04 * (4 - fila) * 0.5]}><sphereGeometry args={[0.025, 12, 10]} /><meshStandardMaterial color="#4a1a5a" roughness={0.25} /></mesh>;
    })}
  </group>
);

export const Gladiador: React.FC<{pose: Pose; espada?: number; color?: string}> = ({pose, espada = 0, color = '#9e1c16'}) => (
  <Cuerpo pose={pose} piel="#b97a4c" torso="#b97a4c" piernas="#b97a4c" botas="#5a3418"
    cabeza={<><Cabeza piel="#b97a4c" pelo="#2a1a10" boca={pose.boca ?? 0} />
      <group position={[0, 0.1, -0.01]}>
        <mesh castShadow scale={[1.1, 1.05, 1.1]}><sphereGeometry args={[0.15, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />{M('#b08a3a', 0.3, 0.9)}</mesh>
        <mesh castShadow position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.165, 0.018, 8, 32]} />{M('#b08a3a', 0.3, 0.9)}</mesh>
        <mesh castShadow position={[0, 0.17, -0.02]} scale={[0.25, 1, 1.6]}><sphereGeometry args={[0.1, 16, 12]} />{M(color, 0.8)}</mesh>
      </group></>}
    manoD={<group rotation={[1.5 - espada * 1.5, 0, 0]}>
      <mesh castShadow position={[0, 0, 0.3]}><boxGeometry args={[0.04, 0.008, 0.5]} />{M('#d8dde4', 0.2, 1)}</mesh>
      <mesh position={[0, 0, 0.04]}><boxGeometry args={[0.14, 0.03, 0.03]} />{M('#b08a3a', 0.3, 0.9)}</mesh>
    </group>}
    manoI={<mesh castShadow position={[-0.06, 0.15, 0.12]} rotation={[0, 0.3, 0]}><cylinderGeometry args={[0.36, 0.36, 0.95, 24, 1, true, -0.7, 1.4]} /><meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} /></mesh>}
    falda={<mesh position={[0, 0.88, 0]} castShadow><cylinderGeometry args={[0.2, 0.28, 0.32, 24]} />{M(color, 0.85)}</mesh>}>
    {/* cinturón de cuero y armadura en un brazo */}
    <mesh position={[0, 1.05, 0]} scale={[1.2, 1, 0.82]}><cylinderGeometry args={[0.19, 0.19, 0.12, 24]} />{M('#5a3418', 0.5)}</mesh>
    <mesh position={[0.25, 1.4, 0]} castShadow><sphereGeometry args={[0.1, 16, 12]} />{M('#b08a3a', 0.3, 0.9)}</mesh>
  </Cuerpo>
);

export const Romano: React.FC<{pose: Pose; toga?: string; banda?: string; laurel?: boolean; piel?: string}> = ({pose, toga = '#f1ece0', banda = '#b3241c', laurel, piel = '#c99a72'}) => (
  <Cuerpo pose={pose} piel={piel} torso={toga} piernas={piel} botas="#7a5a3a" mangas={toga}
    cabeza={<><Cabeza piel={piel} pelo="#3a2a1a" boca={pose.boca ?? 0} />{laurel && <Laurel y={0.08} s={1.05} />}</>}
    falda={pose.sentado ? undefined : <mesh position={[0, 0.62, 0]} castShadow><cylinderGeometry args={[0.2, 0.3, 0.85, 24]} />{M(toga, 0.9)}</mesh>}>
    <mesh position={[0, 1.25, 0.02]} rotation={[0, 0, 0.75]} castShadow><boxGeometry args={[0.1, 0.62, 0.32]} />{M(banda, 0.85)}</mesh>
  </Cuerpo>
);

export const Caballo: React.FC<{t: number; color?: string}> = ({t, color = '#5a3a22'}) => {
  const g = (o: number) => Math.sin(t / 2.2 + o) * 0.7;
  return (
    <group position={[0, Math.abs(Math.sin(t / 2.2)) * 0.08, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 1.35, 0]} scale={[1, 1, 0.85]}><capsuleGeometry args={[0.32, 0.9, 6, 16]} />{M(color, 0.5)}</mesh>
      <mesh castShadow position={[0, 1.75, 0.75]} rotation={[0.7, 0, 0]}><capsuleGeometry args={[0.15, 0.55, 6, 12]} />{M(color, 0.5)}</mesh>
      <mesh castShadow position={[0, 2.0, 1.12]} rotation={[1.6, 0, 0]}><capsuleGeometry args={[0.12, 0.38, 6, 12]} />{M(color, 0.5)}</mesh>
      <mesh position={[0, 1.95, 0.7]} rotation={[0.7, 0, 0]} scale={[0.4, 1, 1]}><boxGeometry args={[0.1, 0.6, 0.12]} />{M('#1e120a', 0.9)}</mesh>
      <mesh position={[0, 1.4, -0.95]} rotation={[-0.6 + Math.sin(t / 3) * 0.2, 0, 0]}><capsuleGeometry args={[0.06, 0.5, 4, 8]} />{M('#1e120a', 0.9)}</mesh>
      {[[0.18, 0.55, 0], [-0.18, 0.55, Math.PI], [0.18, -0.5, Math.PI * 0.5], [-0.18, -0.5, Math.PI * 1.5]].map(([x, z, o], i) => (
        <group key={i} position={[x, 1.15, z]} rotation={[g(o), 0, 0]}>
          <mesh castShadow position={[0, -0.5, 0]}><capsuleGeometry args={[0.07, 0.8, 4, 10]} />{M(color, 0.5)}</mesh>
          <mesh position={[0, -1.02, 0]}><cylinderGeometry args={[0.08, 0.09, 0.1, 12]} />{M('#1e120a', 0.6)}</mesh>
        </group>
      ))}
    </group>
  );
};
