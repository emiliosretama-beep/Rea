import React, { useEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { entraYSale } from "./tiempo";

export type FondoTipo = { arriba: string; abajo: string; brillo?: string };

export const FONDOS = {
  noche: { arriba: "#0b1026", abajo: "#02030a", brillo: "#2a3a8a" },
  cielo: { arriba: "#1f6fe0", abajo: "#bfe3ff", brillo: "#ffffff" },
  atardecer: { arriba: "#2a1b4d", abajo: "#ff7a2e", brillo: "#ffd27a" },
  estudio: { arriba: "#1b1e2b", abajo: "#07080d", brillo: "#3b4a7a" },
  laboratorio: { arriba: "#06202a", abajo: "#010608", brillo: "#1d8a9a" },
} satisfies Record<string, FondoTipo>;

/** Fondo 2D degradado + vineta (para escenas sin 3D o capas 2D). */
export const Fondo: React.FC<{ fondo: FondoTipo }> = ({ fondo }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 70% at 50% 35%, ${fondo.brillo ?? fondo.arriba}55 0%, transparent 60%), linear-gradient(180deg, ${fondo.arriba} 0%, ${fondo.abajo} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{ background: "radial-gradient(130% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
    />
  </AbsoluteFill>
);

/**
 * El mismo degradado, pero dentro de la escena 3D (scene.background). Asi el bloom no
 * tapa el fondo con negro. Se redibuja solo cuando cambian los colores.
 */
const texFondoCache = new Map<string, THREE.CanvasTexture>();
export const FondoGL: React.FC<{ fondo: FondoTipo }> = ({ fondo }) => {
  const scene = useThree((s) => s.scene);
  const clave = `${fondo.arriba}|${fondo.abajo}|${fondo.brillo ?? ""}`;
  let tex = texFondoCache.get(clave);
  if (!tex) {
    const c = document.createElement("canvas");
    c.width = 270;
    c.height = 480;
    const g = c.getContext("2d")!;
    const lin = g.createLinearGradient(0, 0, 0, c.height);
    lin.addColorStop(0, fondo.arriba);
    lin.addColorStop(1, fondo.abajo);
    g.fillStyle = lin;
    g.fillRect(0, 0, c.width, c.height);
    const rad = g.createRadialGradient(135, 170, 0, 135, 170, 260);
    const b = new THREE.Color(fondo.brillo ?? fondo.arriba);
    rad.addColorStop(0, `rgba(${b.r * 255 | 0},${b.g * 255 | 0},${b.b * 255 | 0},0.33)`);
    rad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rad;
    g.fillRect(0, 0, c.width, c.height);
    const vin = g.createRadialGradient(135, 216, 150, 135, 216, 330);
    vin.addColorStop(0, "rgba(0,0,0,0)");
    vin.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = vin;
    g.fillRect(0, 0, c.width, c.height);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (texFondoCache.size > 400) texFondoCache.clear();
    texFondoCache.set(clave, tex);
  }
  scene.background = tex; // se asigna durante el render: el fotograma ya sale con su fondo
  return null;
};

/** Luces de estudio: llave calida, relleno frio, contraluz y reflejos de "softbox". */
export const LucesEstudio: React.FC<{ intensidad?: number; reflejos?: number }> = ({
  intensidad = 1,
  reflejos = 0.6,
}) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);
  useEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = reflejos;
    return () => {
      scene.environment = null;
    };
  }, [scene, env, reflejos]);
  return (
    <>
      <ambientLight intensity={0.25 * intensidad} />
      <directionalLight position={[4, 6, 5]} intensity={2.2 * intensidad} color="#fff1dc" />
      <directionalLight position={[-5, 2, 3]} intensity={0.8 * intensidad} color="#a9c8ff" />
      <directionalLight position={[0, 4, -6]} intensity={1.6 * intensidad} color="#ffffff" />
    </>
  );
};

/** Capa 3D reservada para textos: se dibuja DESPUES del bloom para que se lean nitidos. */
export const CAPA_TEXTO = 1;

/** Resplandor real (bloom) sobre lo que brilla. Sube `fuerza` para mas glow. */
const Bloom: React.FC<{ fuerza: number; radio: number; umbral: number }> = ({ fuerza, radio, umbral }) => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), fuerza, radio, umbral));
    c.addPass(new OutputPass());
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, fuerza, radio, umbral]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);
  useEffect(() => () => composer.dispose(), [composer]);
  // prioridad 1: r3f deja de renderizar solo y dibujamos nosotros.
  useFrame(() => {
    camera.layers.set(0);
    composer.render();
    // segunda pasada: solo los textos, encima y sin bloom
    const fondo = scene.background;
    scene.background = null;
    camera.layers.set(CAPA_TEXTO);
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(null);
    gl.clearDepth();
    gl.render(scene, camera);
    gl.autoClear = autoClear;
    scene.background = fondo;
    camera.layers.enableAll();
  }, 1);
  return null;
};

/** Sin bloom la camara debe ver tambien la capa de textos. */
const VerTodasLasCapas: React.FC = () => {
  const camera = useThree((s) => s.camera);
  camera.layers.enableAll();
  return null;
};

type Props = {
  children: React.ReactNode;
  frames: number;
  fondo?: FondoTipo;
  bloom?: number | false; // fuerza del resplandor, 0.6-1.4 recomendado
  fov?: number;
  fundido?: boolean; // entrada/salida suave de la escena
  luces?: boolean;
  frente?: React.ReactNode; // capas 2D encima del 3D (titulares, etiquetas 2D)
};

/**
 * Lienzo 3D listo para un reel 9:16: fondo, luces de estudio, bloom y fundido.
 * Dentro van los objetos y un <Camara/>.
 */
export const Escena3D: React.FC<Props> = ({
  children,
  frames,
  fondo = FONDOS.estudio,
  bloom = 0.8,
  fov = 40,
  fundido = true,
  luces = true,
  frente,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacidad = fundido ? entraYSale(frame, frames, 8, 8) : 1;
  return (
    <AbsoluteFill style={{ opacity: opacidad }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov, position: [0, 0, 10], near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          // Neutral respeta los colores de marca mejor que ACES (que apaga blancos y naranjas)
          gl.toneMapping = THREE.NeutralToneMapping;
        }}
      >
        <FondoGL fondo={fondo} />
        {luces ? <LucesEstudio /> : null}
        {children}
        {bloom ? <Bloom fuerza={bloom} radio={0.5} umbral={0.82} /> : <VerTodasLasCapas />}
      </ThreeCanvas>
      {frente}
    </AbsoluteFill>
  );
};
