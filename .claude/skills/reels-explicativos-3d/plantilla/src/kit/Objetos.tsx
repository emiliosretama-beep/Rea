import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { azar } from "./tiempo";
import { CAPA_TEXTO } from "./Escena3D";

type V3 = [number, number, number];

// ---------------------------------------------------------------- texturas utiles

const texturaCache = new Map<string, THREE.Texture>();

/** Mancha radial suave (para halos, brillos y particulas bonitas). */
export const texturaHalo = () => {
  const clave = "halo";
  if (texturaCache.has(clave)) return texturaCache.get(clave)!;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  texturaCache.set(clave, tex);
  return tex;
};

// ---------------------------------------------------------------- Brillo

/** Halo luminoso (sprite aditivo). Ideal alrededor de soles, focos y particulas. */
export const Brillo: React.FC<{ posicion?: V3; color?: string; tamano?: number; opacidad?: number }> = ({
  posicion = [0, 0, 0],
  color = "#ffffff",
  tamano = 3,
  opacidad = 1,
}) => (
  <sprite position={posicion} scale={[tamano, tamano, 1]}>
    <spriteMaterial
      map={texturaHalo()}
      color={color}
      transparent
      opacity={opacidad}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      toneMapped={false}
    />
  </sprite>
);

// ---------------------------------------------------------------- Flecha

/** Flecha 3D de `desde` a `hasta`. `progreso` 0..1 la hace crecer. */
export const Flecha: React.FC<{
  desde: V3;
  hasta: V3;
  color?: string;
  grosor?: number;
  progreso?: number;
  brillo?: number; // >1 hace que brille con el bloom
}> = ({ desde, hasta, color = "#ffd23f", grosor = 0.08, progreso = 1, brillo = 1.6 }) => {
  const a = new THREE.Vector3(...desde);
  const b = new THREE.Vector3(...hasta);
  const dir = b.clone().sub(a);
  const largoTotal = dir.length();
  const largo = Math.max(0.0001, largoTotal * progreso);
  dir.normalize();
  const punta = Math.min(grosor * 4.5, largo * 0.45);
  const cuerpo = Math.max(0.0001, largo - punta);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const centroCuerpo = a.clone().add(dir.clone().multiplyScalar(cuerpo / 2));
  const centroPunta = a.clone().add(dir.clone().multiplyScalar(cuerpo + punta / 2));
  if (progreso <= 0.001) return null;
  const mat = (
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={brillo} roughness={0.35} metalness={0.1} />
  );
  return (
    <group>
      <mesh position={centroCuerpo} quaternion={quat}>
        <cylinderGeometry args={[grosor, grosor, cuerpo, 20]} />
        {mat}
      </mesh>
      <mesh position={centroPunta} quaternion={quat}>
        <coneGeometry args={[grosor * 2.6, punta, 28]} />
        {mat}
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Rayo

/** Haz de luz recto con nucleo brillante y halo. `progreso` lo hace avanzar. */
export const Rayo: React.FC<{
  desde: V3;
  hasta: V3;
  color?: string;
  grosor?: number;
  progreso?: number;
  intensidad?: number;
}> = ({ desde, hasta, color = "#ffffff", grosor = 0.08, progreso = 1, intensidad = 1.6 }) => {
  if (progreso <= 0.001) return null;
  const a = new THREE.Vector3(...desde);
  const b = a.clone().lerp(new THREE.Vector3(...hasta), progreso);
  const dir = b.clone().sub(a);
  const largo = Math.max(0.0001, dir.length());
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const centro = a.clone().add(b).multiplyScalar(0.5);
  return (
    <group position={centro} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[grosor, grosor, largo, 16, 1, true]} />
        <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(0.6 + intensidad * 0.25)} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[grosor * 3.5, grosor * 3.5, largo, 16, 1, true]} />
        <meshBasicMaterial
          color={new THREE.Color(color).multiplyScalar(intensidad * 0.12)}
          toneMapped={false}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- Onda

/**
 * Onda senoidal 3D (tubo). Sirve para explicar longitudes de onda, sonido, senales...
 * `longitud` = distancia entre crestas. `fase` avanza sola con el fotograma.
 */
export const Onda: React.FC<{
  desde: V3;
  hasta: V3;
  longitud?: number;
  amplitud?: number;
  color?: string;
  grosor?: number;
  progreso?: number;
  velocidad?: number;
  brillo?: number;
}> = ({ desde, hasta, longitud = 1, amplitud = 0.3, color = "#4aa8ff", grosor = 0.05, progreso = 1, velocidad = 1, brillo = 1.8 }) => {
  const frame = useCurrentFrame();
  const geo = useMemo(() => {
    const a = new THREE.Vector3(...desde);
    const b = new THREE.Vector3(...hasta);
    const dir = b.clone().sub(a);
    const total = dir.length() * Math.max(0.001, progreso);
    dir.normalize();
    // perpendicular "hacia arriba" para la oscilacion
    const arriba = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const perp = arriba.clone().sub(dir.clone().multiplyScalar(arriba.dot(dir))).normalize();
    const pasos = Math.max(24, Math.ceil((total / longitud) * 24));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= pasos; i++) {
      const d = (i / pasos) * total;
      const y = Math.sin((d / longitud) * Math.PI * 2 - frame * 0.12 * velocidad) * amplitud;
      pts.push(a.clone().add(dir.clone().multiplyScalar(d)).add(perp.clone().multiplyScalar(y)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pasos * 2, grosor, 10, false);
  }, [desde, hasta, longitud, amplitud, grosor, progreso, velocidad, frame]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  if (progreso <= 0.001) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={brillo} roughness={0.4} />
    </mesh>
  );
};

// ---------------------------------------------------------------- Particulas

export type ModoParticulas = "flotar" | "explotar" | "caer" | "orbitar";

/**
 * Muchas esferas pequenas (instanced: rapido). Posicion 100 % determinista.
 * `posicion` personalizada: (i, frame, azar) => [x,y,z] para movimientos propios.
 */
export const Particulas: React.FC<{
  cantidad?: number;
  radio?: number; // tamano de cada particula
  zona?: V3; // caja donde viven (ancho, alto, fondo)
  centro?: V3;
  colores?: string[];
  modo?: ModoParticulas;
  velocidad?: number;
  brillo?: number;
  opacidad?: number;
  semilla?: number;
  posicion?: (i: number, frame: number, r: (k: number) => number) => V3;
}> = ({
  cantidad = 120,
  radio = 0.05,
  zona = [8, 12, 4],
  centro = [0, 0, 0],
  colores = ["#ffffff"],
  modo = "flotar",
  velocidad = 1,
  brillo = 1, // >1 hace que brillen con el bloom (1.3-2 queda bien)
  opacidad = 1,
  semilla = 1,
  posicion,
}) => {
  const frame = useCurrentFrame();
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Se actualiza dentro de useFrame: corre justo antes de dibujar cada fotograma.
  const frameRef = useRef(frame);
  frameRef.current = frame;
  useFrame(() => {
    const frame = frameRef.current;
    const m = ref.current;
    if (!m) return;
    const color = new THREE.Color();
    for (let i = 0; i < cantidad; i++) {
      const r = (k: number) => azar(semilla * 1000 + i * 7.13 + k);
      let p: V3;
      if (posicion) {
        p = posicion(i, frame, r);
      } else {
        const base: V3 = [(r(1) - 0.5) * zona[0], (r(2) - 0.5) * zona[1], (r(3) - 0.5) * zona[2]];
        const f = frame * velocidad;
        if (modo === "flotar") {
          p = [base[0] + Math.sin(f * 0.02 + r(4) * 6) * 0.3, base[1] + Math.sin(f * 0.015 + r(5) * 6) * 0.4, base[2]];
        } else if (modo === "caer") {
          const y = ((base[1] / zona[1] + 0.5 - f * 0.004 * (0.5 + r(6))) % 1 + 1) % 1;
          p = [base[0], (y - 0.5) * zona[1], base[2]];
        } else if (modo === "orbitar") {
          const ang = r(7) * Math.PI * 2 + f * 0.01 * (0.5 + r(8));
          const rad = 1 + r(9) * zona[0] * 0.5;
          p = [Math.cos(ang) * rad, base[1] * 0.2, Math.sin(ang) * rad];
        } else {
          // explotar: salen del centro hacia afuera
          const dir = new THREE.Vector3(r(1) - 0.5, r(2) - 0.5, r(3) - 0.5).normalize();
          const d = Math.min(1, f / 40) ** 0.6 * (0.6 + r(4)) * zona[0] * 0.5;
          p = [dir.x * d, dir.y * d, dir.z * d];
        }
      }
      dummy.position.set(centro[0] + p[0], centro[1] + p[1], centro[2] + p[2]);
      const s = 0.6 + r(10) * 0.8;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(colores[Math.floor(r(11) * colores.length) % colores.length]).multiplyScalar(brillo));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cantidad]} frustumCulled={false}>
      <sphereGeometry args={[radio, 12, 12]} />
      <meshBasicMaterial toneMapped={false} transparent={opacidad < 1} opacity={opacidad} />
    </instancedMesh>
  );
};

// ---------------------------------------------------------------- Etiqueta 3D

/** Texto plano que mira a camara (sprite). Usa la fuente del reel. */
export const Etiqueta3D: React.FC<{
  texto: string;
  posicion?: V3;
  alto?: number; // alto del texto en unidades 3D
  color?: string;
  fondo?: string | null; // pastilla detras del texto
  opacidad?: number;
}> = ({ texto, posicion = [0, 0, 0], alto = 0.6, color = "#ffffff", fondo = "rgba(10,12,24,0.72)", opacidad = 1 }) => {
  const { tex, aspecto } = useMemo(() => {
    const px = 140;
    const c = document.createElement("canvas");
    const g = c.getContext("2d")!;
    g.font = `900 ${px}px ReelFont, sans-serif`;
    const w = Math.ceil(g.measureText(texto).width) + px;
    c.width = w;
    c.height = Math.ceil(px * 1.6);
    const g2 = c.getContext("2d")!;
    if (fondo) {
      g2.fillStyle = fondo;
      const r = c.height / 2;
      g2.beginPath();
      g2.roundRect(0, 0, c.width, c.height, r);
      g2.fill();
    }
    g2.font = `900 ${px}px ReelFont, sans-serif`;
    g2.fillStyle = color;
    g2.textAlign = "center";
    g2.textBaseline = "middle";
    g2.fillText(texto, c.width / 2, c.height / 2 + px * 0.06);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { tex: t, aspecto: c.width / c.height };
  }, [texto, color, fondo]);
  useLayoutEffect(() => () => tex.dispose(), [tex]);
  return (
    <sprite
      position={posicion}
      scale={[alto * aspecto, alto, 1]}
      renderOrder={10}
      ref={(s) => {
        if (s) s.layers.set(CAPA_TEXTO);
      }}
    >
      <spriteMaterial map={tex} transparent opacity={opacidad} depthTest={false} toneMapped={false} />
    </sprite>
  );
};
