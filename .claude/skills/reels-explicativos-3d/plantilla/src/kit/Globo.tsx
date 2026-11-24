import React, { useMemo } from "react";
import * as THREE from "three";
import { azar } from "./tiempo";

type V3 = [number, number, number];

const cacheTex = new Map<string, THREE.CanvasTexture>();

/** Textura de planeta hecha con codigo (manchas de continentes). Sin descargar mapas. */
const texturaPlaneta = (oceano: string, tierra: string[], semilla: number) => {
  const clave = `${oceano}-${tierra.join()}-${semilla}`;
  if (cacheTex.has(clave)) return cacheTex.get(clave)!;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = oceano;
  g.fillRect(0, 0, c.width, c.height);
  g.filter = "blur(6px)";
  for (let i = 0; i < 70; i++) {
    const r = (k: number) => azar(semilla * 97 + i * 3.7 + k);
    const x = r(1) * c.width;
    const y = c.height * (0.18 + r(2) * 0.64);
    g.fillStyle = tierra[i % tierra.length];
    g.beginPath();
    g.ellipse(x, y, 20 + r(3) * 90, 12 + r(4) * 55, r(5) * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // casquetes polares
  g.fillStyle = "#e9f2ff";
  g.fillRect(0, 0, c.width, 26);
  g.fillRect(0, c.height - 26, c.width, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cacheTex.set(clave, t);
  return t;
};

/**
 * Halo de atmosfera: brilla justo en el borde del objeto y se desvanece hacia afuera.
 * Truco clasico: esfera un poco mas grande, caras traseras (BackSide) y mezcla aditiva.
 * Tambien sirve para burbujas, campos de fuerza o el resplandor de un planeta.
 */
export const Atmosfera: React.FC<{
  radio: number; // radio exterior del halo
  radioInterior?: number; // radio del objeto que envuelve (por defecto radio / 1.12)
  color?: string;
  fuerza?: number;
  posicion?: V3;
}> = ({ radio, radioInterior, color = "#58a8ff", fuerza = 1.2, posicion = [0, 0, 0] }) => {
  const interior = radioInterior ?? radio / 1.12;
  // valor de dot(normal, vista) en el borde del objeto: sirve para normalizar el degradado
  const borde = Math.sqrt(Math.max(0.0001, 1 - (interior / radio) ** 2));
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uFuerza: { value: fuerza }, uBorde: { value: borde } },
        vertexShader: `
          varying vec3 vN; varying vec3 vV;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uFuerza; uniform float uBorde;
          varying vec3 vN; varying vec3 vV;
          void main(){
            // caras traseras: -dot vale 0 en el borde exterior y uBorde junto al objeto
            float f = pow(clamp(-dot(vN, vV) / uBorde, 0.0, 1.0), 2.2);
            gl_FragColor = vec4(uColor * uFuerza * f, f);
          }`,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color, fuerza, borde],
  );
  return (
    <mesh position={posicion} material={mat}>
      <sphereGeometry args={[radio, 64, 64]} />
    </mesh>
  );
};

/** Planeta con textura procedural y atmosfera opcional. `giro` en radianes. */
export const Globo: React.FC<{
  radio?: number;
  posicion?: V3;
  giro?: number;
  oceano?: string;
  tierra?: string[];
  atmosfera?: string | null;
  grosorAtmosfera?: number;
  semilla?: number;
}> = ({
  radio = 1.5,
  posicion = [0, 0, 0],
  giro = 0,
  oceano = "#1b4f9c",
  tierra = ["#3f8f4a", "#5c9a3d", "#8a7a4a"],
  atmosfera = "#58a8ff",
  grosorAtmosfera = 0.12,
  semilla = 3,
}) => {
  const tex = texturaPlaneta(oceano, tierra, semilla);
  return (
    <group position={posicion}>
      <mesh rotation={[0.35, giro, 0]}>
        <sphereGeometry args={[radio, 96, 96]} />
        <meshStandardMaterial map={tex} roughness={0.75} metalness={0.05} />
      </mesh>
      {atmosfera ? <Atmosfera radio={radio * (1 + grosorAtmosfera)} radioInterior={radio} color={atmosfera} /> : null}
    </group>
  );
};
