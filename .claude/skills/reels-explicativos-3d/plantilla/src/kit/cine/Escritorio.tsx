// Decorado reutilizable del estilo cine: habitacion, escritorio y objetos low-poly.
// Escala en metros. La cubierta del escritorio esta en y = 0; la pared en z = -0.62.
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { azar } from "../tiempo";
import { Pieza, caja, cilindro, geo } from "./Piezas";
import { useModoCine } from "./EscenaCine";

type V3 = [number, number, number];

// ------------------------------------------------------------------ texturas generadas

const texCache = new Map<string, THREE.CanvasTexture>();
const textura = (clave: string, w: number, h: number, dibujar: (g: CanvasRenderingContext2D) => void, repetir?: [number, number]) => {
  if (texCache.has(clave)) return texCache.get(clave)!;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dibujar(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repetir);
  }
  texCache.set(clave, t);
  return t;
};

const madera = () =>
  textura("madera", 1024, 512, (g) => {
    g.fillStyle = "#6b4528";
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 160; i++) {
      const y = azar(i) * 512;
      g.strokeStyle = `rgba(${40 + azar(i + 1) * 40},${22 + azar(i + 2) * 20},10,${0.15 + azar(i + 3) * 0.25})`;
      g.lineWidth = 1 + azar(i + 4) * 3;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 140 + i) * 6 * azar(i + 5));
      g.stroke();
    }
  });

const pared = () =>
  textura("pared", 512, 512, (g) => {
    g.fillStyle = "#b9a58c";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(${azar(i) > 0.5 ? 255 : 60},${azar(i) > 0.5 ? 240 : 40},${azar(i) > 0.5 ? 220 : 30},0.05)`;
      g.fillRect(azar(i + 0.1) * 512, azar(i + 0.2) * 512, 2, 2);
    }
  }, [3, 3]);

// ------------------------------------------------------------------ habitacion

/** Escritorio de madera + pared + piso. `ancho` del escritorio en metros. */
export const Habitacion: React.FC<{ ancho?: number; fondo?: number }> = ({ ancho = 2.4, fondo = 1.1 }) => (
  <group>
    <Pieza geo={caja(ancho, 0.04, fondo)} posicion={[0, -0.02, -0.07]} color="#ffffff" mapa={madera()} rugosidad={0.55} />
    <Pieza geo={caja(ancho - 0.1, 0.7, 0.04)} posicion={[0, -0.39, 0.43]} color="#3a2616" rugosidad={0.8} />
    <Pieza geo={geo("pared", () => new THREE.PlaneGeometry(8, 5))} posicion={[0, 1.3, -0.62]} color="#ffffff" mapa={pared()} rugosidad={0.95} />
    <Pieza geo={geo("piso", () => new THREE.PlaneGeometry(8, 8))} posicion={[0, -0.75, 1]} rotacion={[-Math.PI / 2, 0, 0]} color="#2b1c12" rugosidad={0.9} />
  </group>
);

// ------------------------------------------------------------------ CRT con terminal

/** Texto que se escribe solo, como una terminal. `lineas` aparecen letra por letra. */
const usePantallaTerminal = (lineas: string[], velocidad: number, color: string) => {
  const frame = useCurrentFrame();
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 400;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: t };
  }, []);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#0b120c";
  g.fillRect(0, 0, 512, 400);
  g.font = "700 30px ReelMono, monospace";
  g.fillStyle = color;
  let restantes = Math.floor(frame * velocidad);
  let y = 60;
  for (const l of lineas) {
    const visible = l.slice(0, Math.max(0, restantes));
    g.fillText(visible, 28, y);
    restantes -= l.length + 4;
    if (restantes < 0) {
      if (Math.floor(frame / 8) % 2 === 0) g.fillRect(28 + g.measureText(visible).width + 4, y - 26, 16, 30); // cursor
      break;
    }
    y += 46;
  }
  // lineas de barrido del CRT
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let k = 0; k < 400; k += 4) g.fillRect(0, k, 512, 1);
  tex.needsUpdate = true;
  return tex;
};

/** Computadora CRT beige. `lineas` = lo que escribe la pantalla. Origen en la base. */
export const CRT: React.FC<{ posicion?: V3; rotacion?: V3; lineas?: string[]; velocidad?: number }> = ({
  posicion = [-0.28, 0, -0.32],
  rotacion = [0, 0.18, 0],
  lineas = ["> crea un escritorio 3D de cine", "  camera.orbit(35)"],
  velocidad = 1.2,
}) => {
  const modo = useModoCine();
  const tex = usePantallaTerminal(lineas, velocidad, "#8dffa6");
  const beige = "#d8cdb2";
  return (
    <group position={posicion} rotation={rotacion}>
      {/* base y cuerpo */}
      <Pieza geo={caja(0.34, 0.06, 0.32)} posicion={[0, 0.03, 0]} color={beige} rugosidad={0.5} />
      <Pieza geo={caja(0.4, 0.34, 0.3)} posicion={[0, 0.23, 0.02]} color={beige} rugosidad={0.45} />
      <Pieza geo={caja(0.32, 0.26, 0.16)} posicion={[0, 0.22, -0.2]} color="#cdbf9f" rugosidad={0.5} />
      {/* marco y vidrio */}
      <Pieza geo={caja(0.34, 0.27, 0.02)} posicion={[0, 0.24, 0.175]} color="#c9bc9e" rugosidad={0.5} />
      {modo === "final" ? (
        <mesh position={[0, 0.24, 0.187]}>
          <planeGeometry args={[0.29, 0.22]} />
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={1.3} roughness={0.15} metalness={0.1} />
        </mesh>
      ) : (
        <Pieza geo={caja(0.29, 0.22, 0.004)} posicion={[0, 0.24, 0.187]} />
      )}
      {/* boton de encendido */}
      <Pieza geo={cilindro(0.008, 0.008, 0.01, 12)} posicion={[0.14, 0.09, 0.18]} rotacion={[Math.PI / 2, 0, 0]} color="#ff6a2b" emisivo="#ff6a2b" intensidadEmisiva={2} />
    </group>
  );
};

/** Teclado: base + 87 teclas en filas. */
export const Teclado: React.FC<{ posicion?: V3; rotacion?: V3 }> = ({ posicion = [-0.22, 0, 0.12], rotacion = [0, 0.12, 0] }) => {
  const filas = [15, 15, 15, 14, 14, 14];
  return (
    <group position={posicion} rotation={rotacion}>
      <Pieza geo={caja(0.46, 0.025, 0.17)} posicion={[0, 0.0125, 0]} color="#d3c6a8" rugosidad={0.55} />
      {filas.map((n, f) =>
        Array.from({ length: n }, (_, k) => (
          <Pieza
            key={`${f}-${k}`}
            geo={caja(0.024, 0.012, 0.022)}
            posicion={[-0.2 + k * 0.0285 + (f % 2) * 0.008, 0.031, -0.065 + f * 0.026]}
            color={f === 0 ? "#b4a684" : "#e9e1cd"}
            rugosidad={0.6}
          />
        )),
      )}
    </group>
  );
};

/** Taza de ceramica con asa. */
export const Taza: React.FC<{ posicion?: V3; color?: string }> = ({ posicion = [0.36, 0, 0.02], color = "#e8e2d6" }) => {
  const cuerpo = geo("taza", () => {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.042, 0),
      new THREE.Vector2(0.045, 0.005),
      new THREE.Vector2(0.046, 0.1),
      new THREE.Vector2(0.041, 0.1),
      new THREE.Vector2(0.04, 0.012),
      new THREE.Vector2(0, 0.012),
    ];
    return new THREE.LatheGeometry(pts, 40);
  });
  const asa = geo("asa", () => new THREE.TorusGeometry(0.026, 0.007, 10, 24, Math.PI * 1.2));
  return (
    <group position={posicion}>
      <Pieza geo={cuerpo} color={color} rugosidad={0.25} />
      <Pieza geo={asa} posicion={[0.046, 0.05, 0]} rotacion={[0, 0, -Math.PI * 0.6]} color={color} rugosidad={0.25} />
      <Pieza geo={cilindro(0.04, 0.04, 0.002, 32)} posicion={[0, 0.085, 0]} color="#2a160b" rugosidad={0.1} />
    </group>
  );
};

/** Planta en maceta (hojas low-poly). */
export const Planta: React.FC<{ posicion?: V3 }> = ({ posicion = [0.62, 0, -0.42] }) => {
  const hoja = geo("hoja", () => {
    const g = new THREE.SphereGeometry(1, 8, 6);
    g.scale(0.035, 0.11, 0.012);
    g.translate(0, 0.1, 0);
    return g;
  });
  return (
    <group position={posicion}>
      <Pieza geo={cilindro(0.075, 0.058, 0.13, 20)} posicion={[0, 0.065, 0]} color="#b4532a" rugosidad={0.8} />
      <Pieza geo={cilindro(0.07, 0.07, 0.01, 20)} posicion={[0, 0.125, 0]} color="#2b1a10" rugosidad={1} />
      {Array.from({ length: 11 }, (_, i) => (
        <Pieza
          key={i}
          geo={hoja}
          posicion={[0, 0.12, 0]}
          rotacion={[0.35 + azar(i) * 0.5, (i / 11) * Math.PI * 2, 0]}
          escala={0.8 + azar(i + 3) * 0.6}
          color={i % 2 ? "#3f7a3a" : "#5c9a46"}
          rugosidad={0.6}
        />
      ))}
    </group>
  );
};

/** Hoja de papel con texto (ej. "# skill" y sus reglas). Recibe la luz rasante del sol. */
export const Hoja: React.FC<{ posicion?: V3; rotacionY?: number; lineas?: string[] }> = ({
  posicion = [0.18, 0.002, 0.22],
  rotacionY = -0.25,
  lineas = ["# skill", "lente 35 / 50 mm", "DOF fisico", "1 sola luz", "neblina + polvo", "ACES", "ease(.2,.8,.2,1)"],
}) => {
  const tex = textura(`hoja-${lineas.join("|")}`, 420, 594, (g) => {
    g.fillStyle = "#f3eee2";
    g.fillRect(0, 0, 420, 594);
    g.fillStyle = "#1e1b18";
    lineas.forEach((l, i) => {
      g.font = i === 0 ? "700 46px ReelMono, monospace" : "700 26px ReelMono, monospace";
      g.fillText(l, 34, i === 0 ? 80 : 130 + i * 48);
    });
  });
  return (
    <Pieza
      geo={geo("hoja-a4", () => new THREE.PlaneGeometry(0.21, 0.297))}
      posicion={posicion}
      rotacion={[-Math.PI / 2, 0, rotacionY]}
      color="#ffffff"
      mapa={tex}
      rugosidad={0.85}
    />
  );
};

/** Lente de camara (objetivo) apoyado en la mesa, con el vidrio hacia +z (rotalo con `rotacion`). */
export const LenteCamara: React.FC<{ posicion?: V3; rotacion?: V3 }> = ({ posicion = [0.48, 0, 0.2], rotacion = [0, 0.9, 0] }) => {
  const anillo = textura("lente-anillo", 512, 64, (g) => {
    g.fillStyle = "#141414";
    g.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 6) {
      g.fillStyle = "#262626";
      g.fillRect(x, 0, 3, 64); // estrias del anillo de enfoque
    }
  });
  return (
    <group position={posicion} rotation={rotacion}>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
        <Pieza geo={cilindro(0.036, 0.04, 0.03, 48)} posicion={[0, 0.03, 0]} color="#1a1a1a" rugosidad={0.35} metal={0.7} />
        <Pieza geo={cilindro(0.042, 0.042, 0.035, 48)} posicion={[0, -0.002, 0]} color="#ffffff" mapa={anillo} rugosidad={0.8} />
        <Pieza geo={cilindro(0.043, 0.043, 0.004, 48)} posicion={[0, -0.021, 0]} color="#c9c9c9" rugosidad={0.25} metal={0.9} />
        <Pieza geo={cilindro(0.04, 0.042, 0.014, 48)} posicion={[0, -0.03, 0]} color="#1a1a1a" rugosidad={0.35} metal={0.7} />
        {/* aro naranja fino y aro interior */}
        <Pieza geo={geo("lente-aro", () => new THREE.TorusGeometry(0.039, 0.0016, 8, 64))} posicion={[0, -0.0375, 0]} rotacion={[Math.PI / 2, 0, 0]} color="#ff6a2b" rugosidad={0.3} metal={0.4} />
        <Pieza geo={geo("lente-aro2", () => new THREE.TorusGeometry(0.031, 0.0022, 8, 64))} posicion={[0, -0.0372, 0]} rotacion={[Math.PI / 2, 0, 0]} color="#3a3a3a" rugosidad={0.3} metal={0.8} />
        {/* vidrio frontal: oscuro y muy pulido, refleja el cuarto */}
        <Pieza geo={cilindro(0.03, 0.03, 0.002, 48)} posicion={[0, -0.0362, 0]} color="#0c1628" rugosidad={0.02} metal={1} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ auto de rally

/** Autito de rally low-poly (escala juguete, ~0.2 m). `giroRuedas` en radianes. */
export const AutoRally: React.FC<{ posicion?: V3; rotacionY?: number; giroRuedas?: number; color?: string; numero?: string }> = ({
  posicion = [0.12, 0, -0.02],
  rotacionY = 0.6,
  giroRuedas = 0,
  color = "#f04e23",
  numero = "07",
}) => {
  const lateral = textura(`dorsal-${numero}`, 256, 128, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 50, 256, 16);
    g.beginPath();
    g.arc(128, 64, 40, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#111";
    g.font = "900 48px ReelFont, sans-serif";
    g.textAlign = "center";
    g.fillText(numero, 128, 82);
  });
  const rueda = cilindro(0.026, 0.026, 0.022, 14);
  const ruedas: V3[] = [
    [0.065, 0.026, 0.05],
    [0.065, 0.026, -0.05],
    [-0.062, 0.026, 0.05],
    [-0.062, 0.026, -0.05],
  ];
  return (
    <group position={posicion} rotation={[0, rotacionY, 0]}>
      <Pieza geo={caja(0.2, 0.045, 0.092)} posicion={[0, 0.048, 0]} color="#ffffff" mapa={lateral} rugosidad={0.3} metal={0.2} />
      <Pieza geo={caja(0.09, 0.04, 0.078)} posicion={[-0.012, 0.09, 0]} color="#1c1c1e" rugosidad={0.15} metal={0.4} />
      <Pieza geo={caja(0.03, 0.008, 0.1)} posicion={[-0.1, 0.098, 0]} color={color} rugosidad={0.35} />
      <Pieza geo={caja(0.006, 0.026, 0.006)} posicion={[-0.1, 0.082, 0.03]} color="#111" />
      <Pieza geo={caja(0.006, 0.026, 0.006)} posicion={[-0.1, 0.082, -0.03]} color="#111" />
      {/* faros */}
      <Pieza geo={caja(0.004, 0.012, 0.022)} posicion={[0.101, 0.055, 0.028]} color="#fff6d8" emisivo="#fff2c4" intensidadEmisiva={3} />
      <Pieza geo={caja(0.004, 0.012, 0.022)} posicion={[0.101, 0.055, -0.028]} color="#fff6d8" emisivo="#fff2c4" intensidadEmisiva={3} />
      {ruedas.map((p, i) => (
        <group key={i} position={p} rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, giroRuedas, 0]}>
            <Pieza geo={rueda} color="#151515" rugosidad={0.9} />
            <Pieza geo={cilindro(0.013, 0.013, 0.024, 6)} color="#c9c9c9" metal={0.8} rugosidad={0.3} />
          </group>
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ curva bezier visible

/** Curva cubica bezier sobre la mesa (y su helper para posicion/tangente). */
export const bezier = (p0: V3, p1: V3, p2: V3, p3: V3) => {
  const c = new THREE.CubicBezierCurve3(
    new THREE.Vector3(...p0),
    new THREE.Vector3(...p1),
    new THREE.Vector3(...p2),
    new THREE.Vector3(...p3),
  );
  return c;
};

/** Dibuja la curva como una linea punteada brillante + sus puntos de control. */
export const CurvaVisible: React.FC<{ curva: THREE.CubicBezierCurve3; progreso?: number; color?: string }> = ({
  curva,
  progreso = 1,
  color = "#ff8a4c",
}) => {
  const obj = useMemo(() => {
    const pts = curva.getPoints(120);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineDashedMaterial({ color, dashSize: 0.02, gapSize: 0.012, toneMapped: false, transparent: true });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    return l;
  }, [curva, color]);
  obj.geometry.setDrawRange(0, Math.floor(121 * Math.min(1, Math.max(0, progreso))));
  const ctrl = [curva.v0, curva.v1, curva.v2, curva.v3];
  return (
    <group>
      <primitive object={obj} />
      {ctrl.map((v, i) => (
        <mesh key={i} position={v} visible={progreso > i / 4}>
          <boxGeometry args={[0.014, 0.014, 0.014]} />
          <meshBasicMaterial color={i === 0 || i === 3 ? "#ffffff" : color} toneMapped={false} />
        </mesh>
      ))}
      <primitive
        object={useMemo(() => {
          const g = new THREE.BufferGeometry().setFromPoints([curva.v0, curva.v1, curva.v2, curva.v3]);
          return new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35 }));
        }, [curva])}
      />
    </group>
  );
};
