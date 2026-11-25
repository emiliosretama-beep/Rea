import React, { useMemo } from "react";
import * as THREE from "three";
import { Particulas, texturaHalo } from "../Objetos";
import { PALETA_CINE, useModoCine } from "./EscenaCine";

type V3 = [number, number, number];

/**
 * Sol de atardecer por defecto: el parche de rayas cae en la pared, centrado detras del
 * escritorio (x ≈ 0, y ≈ 0.65), y alcanza el fondo de la mesa. Para moverlo, cambia
 * `objetivo` (donde cae el centro) y manten la misma direccion para sol y ventana.
 */
export const SOL_POR_DEFECTO = {
  sol: [-3.45, 2.5, 0.98] as V3,
  objetivo: [-0.05, 0.65, -0.62] as V3,
  ventana: [-2.0, 1.72, 0.32] as V3,
};

/**
 * UNA luz motivada: sol de atardecer entrando por una persiana. Las rayas de luz son
 * sombras reales: la persiana (listones fuera de cuadro) bloquea el sol.
 * `ventana` = centro de la persiana; `objetivo` = hacia donde apunta el sol.
 */
export const SolDePersiana: React.FC<{
  sol?: V3; // posicion del sol (lejos, detras de la persiana)
  objetivo?: V3;
  ventana?: V3;
  separacion?: number; // metros entre listones
  abertura?: number; // 0..1 cuanto dejan pasar
  intensidad?: number;
  color?: string;
  rebote?: number; // luz de relleno muy suave (el rebote de la habitacion)
  ventanaAncho?: number; // tamano del hueco de la ventana: la luz entra solo por ahi
  ventanaAlto?: number;
}> = ({
  sol = SOL_POR_DEFECTO.sol,
  objetivo = SOL_POR_DEFECTO.objetivo,
  ventana = SOL_POR_DEFECTO.ventana,
  separacion = 0.05,
  abertura = 0.5,
  intensidad = 5.5,
  color = PALETA_CINE.sol,
  rebote = 0.4,
  ventanaAncho = 1.0,
  ventanaAlto = 0.95,
}) => {
  const modo = useModoCine();
  const luz = useMemo(() => {
    const l = new THREE.DirectionalLight(color, intensidad);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    const c = l.shadow.camera;
    c.left = -1.6;
    c.right = 1.6;
    c.top = 1.6;
    c.bottom = -1.6;
    c.near = 0.5;
    c.far = 9;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.015;
    l.shadow.radius = 3;
    return l;
  }, [color, intensidad]);
  luz.position.set(...sol);
  luz.target.position.set(...objetivo);
  luz.target.updateMatrixWorld();
  // orientacion de la persiana: perpendicular a la direccion del sol
  const dir = new THREE.Vector3(...objetivo).sub(new THREE.Vector3(...sol)).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const alto = separacion * (1 - abertura);
  const listones = Math.round(ventanaAlto / separacion);
  if (modo === "wire") {
    return (
      <>
        <ambientLight intensity={1} />
      </>
    );
  }
  return (
    <>
      <primitive object={luz} />
      <primitive object={luz.target} />
      <hemisphereLight args={[PALETA_CINE.rebote, "#2a160c", rebote]} />
      <group position={ventana} quaternion={quat}>
        {/* listones de la persiana */}
        {Array.from({ length: listones }, (_, i) => (
          <mesh key={i} position={[0, (i - (listones - 1) / 2) * separacion, 0]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[ventanaAncho, alto, 0.01]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        ))}
        {/* muro alrededor de la ventana: tapa el sol fuera del hueco */}
        {(
          [
            [0, ventanaAlto / 2 + 1.5, 6, 3],
            [0, -ventanaAlto / 2 - 1.5, 6, 3],
            [ventanaAncho / 2 + 1.5, 0, 3, ventanaAlto],
            [-ventanaAncho / 2 - 1.5, 0, 3, ventanaAlto],
          ] as const
        ).map(([x, y, w, h], i) => (
          <mesh key={"m" + i} position={[x, y, 0]} castShadow>
            <boxGeometry args={[w, h, 0.02]} />
            <meshBasicMaterial colorWrite={false} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </>
  );
};

const texturaHaz = () => {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
let texHaz: THREE.Texture | null = null;

/**
 * Haces de luz en la neblina ("god rays" falsos): laminas aditivas en la direccion del sol.
 * Baratos y convincentes con niebla + bloom.
 */
export const HacesDeLuz: React.FC<{
  sol?: V3;
  objetivo?: V3;
  cantidad?: number;
  opacidad?: number;
  color?: string;
  ancho?: number;
}> = ({ sol = SOL_POR_DEFECTO.sol, objetivo = SOL_POR_DEFECTO.objetivo, cantidad = 7, opacidad = 0.035, color = PALETA_CINE.sol, ancho = 1.4 }) => {
  const modo = useModoCine();
  if (!texHaz) texHaz = texturaHaz();
  if (modo === "wire") return null;
  const a = new THREE.Vector3(...sol);
  const b = new THREE.Vector3(...objetivo);
  const dir = b.clone().sub(a);
  const largo = dir.length();
  dir.normalize();
  const centro = a.clone().add(b).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group position={centro} quaternion={quat}>
      {Array.from({ length: cantidad }, (_, i) => (
        <mesh key={i} position={[0, 0, (i - cantidad / 2) * 0.09]} rotation={[0, (i * 0.7) % 1.2, 0]}>
          <planeGeometry args={[ancho, largo]} />
          <meshBasicMaterial
            map={texHaz}
            color={color}
            transparent
            opacity={opacidad}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/** Polvo flotando en el aire: motas calidas que brillan al cruzar la luz. */
export const Polvo: React.FC<{ centro?: V3; zona?: V3; cantidad?: number }> = ({
  centro = [0, 0.6, 0],
  zona = [1.6, 1.2, 1.2],
  cantidad = 110,
}) => {
  const modo = useModoCine();
  texturaHalo();
  if (modo === "wire") return null;
  return (
    <Particulas
      cantidad={cantidad}
      radio={0.0028}
      zona={zona}
      centro={centro}
      colores={["#ffd9a8", "#fff1dc", "#ffb877"]}
      brillo={1.6}
      opacidad={0.85}
      posicion={(i, f, r) => [
        (r(1) - 0.5) * zona[0] + Math.sin(f * 0.011 + r(4) * 6) * 0.04,
        (r(2) - 0.5) * zona[1] + Math.sin(f * 0.008 + r(5) * 6) * 0.05 + f * 0.0006 * (r(6) - 0.3),
        (r(3) - 0.5) * zona[2] + Math.cos(f * 0.009 + r(7) * 6) * 0.04,
      ]}
    />
  );
};
