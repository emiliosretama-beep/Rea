import React, { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { CAPA_TEXTO } from "../Escena3D";
import { Etiqueta3D } from "../Objetos";
import { respira } from "../tiempo";
import { PALETA_CINE, fovDeLente, useModoCine } from "./EscenaCine";

type V3 = [number, number, number];

// ------------------------------------------------------------------ Pieza (mesh o maqueta)

export type MaterialPieza = {
  color?: string;
  rugosidad?: number;
  metal?: number;
  emisivo?: string;
  intensidadEmisiva?: number;
  mapa?: THREE.Texture | null;
  transparente?: boolean;
  opacidad?: number;
};

const lineasCache = new WeakMap<THREE.BufferGeometry, LineSegmentsGeometry>();

/** Contorno en lineas gruesas (px reales) de una geometria. Para el modo "wire". */
const Contorno: React.FC<{ geo: THREE.BufferGeometry; color?: string; grosor?: number }> = ({
  geo,
  color = PALETA_CINE.wireLinea,
  grosor = 2.6,
}) => {
  const size = useThree((s) => s.size);
  const obj = useMemo(() => {
    let lg = lineasCache.get(geo);
    if (!lg) {
      lg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, 25));
      lineasCache.set(geo, lg);
    }
    const mat = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: grosor });
    return new LineSegments2(lg, mat);
  }, [geo, color, grosor]);
  (obj.material as LineMaterial).resolution.set(size.width, size.height);
  return <primitive object={obj} />;
};

/**
 * Una pieza del decorado. En modo "final" es un mesh con sombras; en modo "wire" es su
 * contorno blanco con un relleno plano (para que tape lo de atras como una maqueta).
 */
export const Pieza: React.FC<
  {
    geo: THREE.BufferGeometry;
    posicion?: V3;
    rotacion?: V3;
    escala?: number | V3;
    sombras?: boolean;
  } & MaterialPieza
> = ({
  geo,
  posicion,
  rotacion,
  escala,
  sombras = true,
  color = "#cccccc",
  rugosidad = 0.6,
  metal = 0,
  emisivo,
  intensidadEmisiva = 1,
  mapa = null,
  transparente = false,
  opacidad = 1,
}) => {
  const modo = useModoCine();
  const esc: V3 | undefined = typeof escala === "number" ? [escala, escala, escala] : escala;
  if (modo === "wire") {
    return (
      <group position={posicion} rotation={rotacion} scale={esc}>
        <mesh geometry={geo}>
          <meshBasicMaterial color={PALETA_CINE.wireRelleno} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
        </mesh>
        <Contorno geo={geo} />
      </group>
    );
  }
  return (
    <mesh geometry={geo} position={posicion} rotation={rotacion} scale={esc} castShadow={sombras} receiveShadow={sombras}>
      <meshStandardMaterial
        color={color}
        roughness={rugosidad}
        metalness={metal}
        emissive={emisivo ?? "#000000"}
        emissiveIntensity={emisivo ? intensidadEmisiva : 0}
        map={mapa}
        transparent={transparente}
        opacity={opacidad}
      />
    </mesh>
  );
};

// geometrias compartidas (crearlas una vez evita trabajo en cada fotograma)
const geoCache = new Map<string, THREE.BufferGeometry>();
export const geo = (clave: string, crear: () => THREE.BufferGeometry) => {
  if (!geoCache.has(clave)) geoCache.set(clave, crear());
  return geoCache.get(clave)!;
};
export const caja = (w: number, h: number, d: number) => geo(`caja-${w}-${h}-${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cilindro = (rArriba: number, rAbajo: number, h: number, lados = 32) =>
  geo(`cil-${rArriba}-${rAbajo}-${h}-${lados}`, () => new THREE.CylinderGeometry(rArriba, rAbajo, h, lados));

// ------------------------------------------------------------------ Texto 3D extruido

let fuente3D: Font | null = null;
let promesaFuente: Promise<Font> | null = null;

/** Se precarga en Reel.tsx antes de dibujar, para que el texto 3D salga desde el primer fotograma. */
export const cargarFuente3D = () => {
  if (!promesaFuente) {
    promesaFuente = fetch(staticFile("fuentes/inter-black.typeface.json"))
      .then((r) => r.json())
      .then((json) => {
        fuente3D = new FontLoader().parse(json);
        return fuente3D;
      })
      .catch((e) => {
        console.error("No se pudo cargar la fuente 3D", e);
        throw e;
      });
  }
  return promesaFuente;
};

const useFuente3D = () => {
  const [f, setF] = useState<Font | null>(fuente3D);
  const [handle] = useState(() => (fuente3D ? null : delayRender("Fuente 3D")));
  useEffect(() => {
    if (f) return;
    cargarFuente3D().then((x) => {
      setF(x);
      // espera a que React y three dibujen el texto antes de soltar la captura
      if (handle !== null) requestAnimationFrame(() => requestAnimationFrame(() => continueRender(handle)));
    });
  }, [f, handle]);
  return f;
};

/** Letras 3D gruesas (extruidas, con bisel). Reciben luz y sombras como un objeto real. */
export const Texto3D: React.FC<{
  texto: string;
  tamano?: number; // alto de las letras en metros
  fondo?: number; // profundidad de la extrusion
  posicion?: V3;
  rotacion?: V3;
  color?: string;
  rugosidad?: number;
  metal?: number;
  alineado?: "centro" | "izquierda";
}> = ({ texto, tamano = 0.12, fondo = 0.04, posicion, rotacion, color = "#f2efe8", rugosidad = 0.45, metal = 0, alineado = "centro" }) => {
  const f = useFuente3D();
  const g = useMemo(() => {
    if (!f) return null;
    const t = new TextGeometry(texto, {
      font: f,
      size: tamano,
      depth: fondo,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: fondo * 0.18,
      bevelSize: tamano * 0.025,
      bevelSegments: 3,
    });
    t.computeBoundingBox();
    const bb = t.boundingBox!;
    const dx = alineado === "centro" ? -(bb.max.x + bb.min.x) / 2 : -bb.min.x;
    t.translate(dx, 0, -fondo / 2);
    return t;
  }, [f, texto, tamano, fondo, alineado]);
  if (!g) return null;
  return <Pieza geo={g} posicion={posicion} rotacion={rotacion} color={color} rugosidad={rugosidad} metal={metal} />;
};

// ------------------------------------------------------------------ Etiqueta de codigo

/**
 * Etiqueta monoespaciada pegada a un objeto, con una linea fina hasta el punto `ancla`.
 * Ej.: <EtiquetaCodigo texto="crt.glass({ r: 0.011 })" ancla={[0,0.3,0]} posicion={[0.3,0.5,0]} />
 */
export const EtiquetaCodigo: React.FC<{
  texto: string;
  ancla: V3;
  posicion: V3;
  alto?: number;
  opacidad?: number;
  color?: string;
}> = ({ texto, ancla, posicion, alto = 0.035, opacidad = 1, color }) => {
  const modo = useModoCine();
  const tinta = color ?? (modo === "wire" ? "#1d1d1f" : "#fff4e6");
  const fondo = modo === "wire" ? "rgba(255,255,255,0.92)" : "rgba(14,10,8,0.78)";
  const lineaObj = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...ancla), new THREE.Vector3(...posicion)]);
    const m = new THREE.LineBasicMaterial({ color: modo === "wire" ? "#1d1d1f" : "#fff4e6", transparent: true, depthTest: false, toneMapped: false });
    const l = new THREE.Line(g, m);
    l.layers.set(CAPA_TEXTO);
    l.renderOrder = 9;
    return l;
  }, [ancla, posicion, modo]);
  (lineaObj.material as THREE.LineBasicMaterial).opacity = opacidad * 0.8;
  if (opacidad <= 0.01) return null;
  return (
    <group>
      <primitive object={lineaObj} />
      <mesh position={ancla} layers={undefined} ref={(m) => m?.layers.set(CAPA_TEXTO)} renderOrder={9}>
        <sphereGeometry args={[alto * 0.12, 10, 10]} />
        <meshBasicMaterial color={tinta} depthTest={false} transparent opacity={opacidad} toneMapped={false} />
      </mesh>
      <Etiqueta3D texto={texto} posicion={posicion} alto={alto} color={tinta} fondo={fondo} opacidad={opacidad} mono />
    </group>
  );
};

// ------------------------------------------------------------------ Camara de cine

type MovCine = {
  desde: V3;
  hasta?: V3;
  mira: V3;
  miraHasta?: V3;
  frames: number;
  mm?: number;
  deriva?: number; // amplitud de la "camara en mano" en metros (0.004-0.015)
  curva?: (t: number) => number;
};

const suave = (t: number) => t * t * (3 - 2 * t);

/** Camara que nunca esta quieta: va de `desde` a `hasta` con easing y una deriva organica. */
export const CamaraCine: React.FC<MovCine> = ({ desde, hasta, mira, miraHasta, frames, mm = 35, deriva = 0.008, curva = suave }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const t = curva(Math.min(1, Math.max(0, frame / Math.max(1, frames - 1))));
  const h = hasta ?? desde;
  const mh = miraHasta ?? mira;
  const p = desde.map((v, i) => v + (h[i] - v) * t);
  const m = mira.map((v, i) => v + (mh[i] - v) * t);
  camera.position.set(
    p[0] + respira(frame, 113, deriva) + respira(frame + 40, 47, deriva * 0.3),
    p[1] + respira(frame + 17, 131, deriva * 0.8),
    p[2] + respira(frame + 5, 157, deriva * 0.6),
  );
  camera.lookAt(m[0], m[1], m[2]);
  camera.rotateZ(respira(frame, 173, 0.004)); // leve balanceo (dutch) organico
  const fov = fovDeLente(mm);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  return null;
};
