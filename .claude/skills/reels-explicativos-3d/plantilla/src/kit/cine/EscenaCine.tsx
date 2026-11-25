// ESTILO "ESCRITORIO CINEMATOGRAFICO"
// Reglas de cine (aplicadas aqui por defecto):
//  - lente de 35 o 50 mm (nunca gran angular deformado)
//  - profundidad de campo fisica (BokehPass) enfocada en el sujeto
//  - UNA sola luz motivada (el sol por la ventana) + un rebote muy suave
//  - neblina en el aire, polvo flotando, halation/bloom calido y grano de pelicula
//  - tone mapping ACES (THREE.ACESFilmicToneMapping) para el "look" de cine
//  - camara nunca fija: siempre una deriva leve (ver CamaraCine)
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CAPA_TEXTO } from "../Escena3D";
import { entraYSale } from "../tiempo";

export type ModoCine = "final" | "wire";

/** "final" = render terminado; "wire" = maqueta de lineas blancas sobre fondo claro. */
const ModoContexto = createContext<ModoCine>("final");
export const useModoCine = () => useContext(ModoContexto);

/** Campo de vision vertical para una lente de `mm` en un cuadro vertical (sensor 36 mm de alto). */
export const fovDeLente = (mm: number) => (2 * Math.atan(18 / mm) * 180) / Math.PI;

export const PALETA_CINE = {
  sol: "#ffab5e",
  sombra: "#1a110c",
  niebla: "#3b2417",
  rebote: "#6f7fa6",
  wireFondo: "#d8d4cb",
  wireLinea: "#ffffff",
  wireRelleno: "#c8c3b8",
  acento: "#ff6a2b",
};

// Grano + vineta + un toque de "halation" (rojo-naranja que sangra en las luces altas).
const PeliculaShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSemilla: { value: 0 },
    uGrano: { value: 0.06 },
    uVineta: { value: 0.9 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uSemilla; uniform float uGrano; uniform float uVineta;
    varying vec2 vUv;
    float azar(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uSemilla) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb += vec3(0.08,0.025,0.0) * smoothstep(0.7, 1.4, lum);           // halation calida
      vec2 d = vUv - 0.5; d.x *= 0.75;
      c.rgb *= mix(1.0, smoothstep(0.85, 0.2, length(d)), uVineta * 0.55);  // vineta
      c.rgb += (azar(vUv * 1000.0) - 0.5) * uGrano;                          // grano estable por fotograma
      gl_FragColor = c;
    }`,
};

const Posproceso: React.FC<{
  enfoque: number;
  apertura: number;
  desenfoqueMax: number;
  bloom: number;
  grano: number;
  modo: ModoCine;
}> = ({ enfoque, apertura, desenfoqueMax, bloom, grano, modo }) => {
  const { gl, scene, camera, size } = useThree();
  const frame = useCurrentFrame();
  const { composer, bokeh, pelicula } = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    const b = new BokehPass(scene, camera, { focus: enfoque, aperture: apertura, maxblur: desenfoqueMax });
    if (modo === "final") c.addPass(b);
    if (modo === "final" && bloom > 0) c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), bloom, 0.6, 0.85));
    const p = new ShaderPass(PeliculaShader);
    if (modo === "final") c.addPass(p);
    c.addPass(new OutputPass());
    return { composer: c, bokeh: b, pelicula: p };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, modo, bloom]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.width, size.height]);
  useEffect(() => () => composer.dispose(), [composer]);
  // valores que cambian por fotograma (enfoque animable, grano distinto en cada cuadro)
  const u = bokeh.uniforms as unknown as Record<string, { value: number }>;
  u.focus.value = enfoque;
  u.aperture.value = apertura;
  u.maxblur.value = desenfoqueMax;
  pelicula.uniforms.uSemilla.value = (frame % 97) * 1.37;
  pelicula.uniforms.uGrano.value = grano;
  useFrame(() => {
    camera.layers.set(0);
    composer.render();
    // textos/etiquetas encima, nitidos (sin desenfoque ni bloom)
    const fondo = scene.background;
    const niebla = scene.fog;
    scene.background = null;
    scene.fog = null;
    camera.layers.set(CAPA_TEXTO);
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(null);
    gl.clearDepth();
    gl.render(scene, camera);
    gl.autoClear = autoClear;
    scene.background = fondo;
    scene.fog = niebla;
    camera.layers.enableAll();
  }, 1);
  return null;
};

/** Fondo y neblina de la habitacion (o fondo claro de maqueta en modo wire). */
const Atmosfera: React.FC<{ modo: ModoCine; fondo: string; niebla: number }> = ({ modo, fondo, niebla }) => {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const color = modo === "wire" ? PALETA_CINE.wireFondo : fondo;
  if (!(scene.background instanceof THREE.Color) || scene.background.getHexString() !== new THREE.Color(color).getHexString()) {
    scene.background = new THREE.Color(color);
  }
  if (modo === "final" && niebla > 0) {
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(PALETA_CINE.niebla, niebla);
    (scene.fog as THREE.FogExp2).density = niebla;
  } else {
    scene.fog = null;
  }
  gl.toneMapping = modo === "wire" ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.95;
  // reflejos muy suaves (rebote de la habitacion) para que metal y vidrio no se vean negros
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  scene.environment = modo === "final" ? env : null;
  scene.environmentIntensity = 0.22;
  return null;
};

type Props = {
  children: React.ReactNode;
  frames: number;
  modo?: ModoCine;
  mm?: number; // lente: 35 (plano general) o 50 (detalle)
  enfoque?: number; // distancia de enfoque en metros desde la camara
  apertura?: number; // mas grande = menos profundidad de campo (0.002-0.02)
  desenfoqueMax?: number;
  bloom?: number;
  grano?: number;
  niebla?: number; // densidad FogExp2 (0.08-0.3)
  fondo?: string;
  fundido?: boolean;
  frente?: React.ReactNode;
};

/** Lienzo del estilo cine: sombras, ACES, neblina, DOF, bloom calido y grano. */
export const EscenaCine: React.FC<Props> = ({
  children,
  frames,
  modo = "final",
  mm = 35,
  enfoque = 2,
  apertura = 0.006,
  desenfoqueMax = 0.012,
  bloom = 0.55,
  grano = 0.05,
  niebla = 0.12,
  fondo = PALETA_CINE.sombra,
  fundido = true,
  frente,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacidad = fundido ? entraYSale(frame, frames, 6, 6) : 1;
  return (
    <AbsoluteFill style={{ opacity: opacidad, background: modo === "wire" ? PALETA_CINE.wireFondo : "#000" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: fovDeLente(mm), position: [0, 0.6, 2], near: 0.05, far: 40 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <ModoContexto.Provider value={modo}>
          <Atmosfera modo={modo} fondo={fondo} niebla={niebla} />
          {children}
          <Posproceso enfoque={enfoque} apertura={apertura} desenfoqueMax={desenfoqueMax} bloom={bloom} grano={grano} modo={modo} />
        </ModoContexto.Provider>
      </ThreeCanvas>
      {frente}
    </AbsoluteFill>
  );
};

/**
 * Pantalla partida: la misma escena en "wire" (izquierda) y "final" (derecha).
 * `corte` 0..1 = donde esta la division (0 = todo wire, 1 = todo final).
 * Renderiza dos lienzos solo mientras hace falta; fuera de 0 < corte < 1 dibuja uno.
 */
export const PantallaPartida: React.FC<{
  corte: number;
  escena: (modo: ModoCine) => React.ReactNode;
  linea?: boolean;
}> = ({ corte, escena, linea = true }) => {
  const c = Math.min(1, Math.max(0, corte));
  if (c >= 0.999) return <>{escena("final")}</>;
  if (c <= 0.001) return <>{escena("wire")}</>;
  const x = (1 - c) * 100; // el final ocupa la parte derecha
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>{escena("wire")}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x}%)` }}>{escena("final")}</AbsoluteFill>
      {linea ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${x}%`,
            width: 4,
            marginLeft: -2,
            background: "#fff",
            boxShadow: "0 0 24px rgba(255,255,255,0.9)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
