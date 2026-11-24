import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Palabra } from "../tipos";
import { progreso, rebote } from "./tiempo";

export const FUENTE = "ReelFont, 'Inter', 'Helvetica Neue', Arial, sans-serif";

// Zona segura 9:16: Instagram tapa ~250 px arriba y ~420 px abajo (botones, descripcion).
export const ZONA = { arriba: 260, abajo: 430, lados: 70 };

const contorno = (px: number, color = "#000") =>
  [
    `0 ${px * 0.06}px 0 ${color}`,
    `0 0 ${px * 0.05}px ${color}`,
    `0 ${px * 0.08}px ${px * 0.25}px rgba(0,0,0,0.55)`,
  ].join(", ");

type Grupo = { palabras: Palabra[]; desde: number; hasta: number };

/** Junta palabras en grupos cortos (max 3 palabras / 16 letras, corta en pausas y puntuacion). */
export const agrupar = (palabras: Palabra[], maxPalabras = 3, maxLetras = 16): Grupo[] => {
  const grupos: Grupo[] = [];
  let actual: Palabra[] = [];
  const cerrar = () => {
    if (!actual.length) return;
    grupos.push({ palabras: actual, desde: actual[0].desde, hasta: actual[actual.length - 1].hasta });
    actual = [];
  };
  palabras.forEach((p, i) => {
    const letras = actual.reduce((n, w) => n + w.texto.length + 1, 0) + p.texto.length;
    if (actual.length && (actual.length >= maxPalabras || letras > maxLetras)) cerrar();
    actual.push(p);
    const sig = palabras[i + 1];
    if (/[.,;:!?…]$/.test(p.texto) || (sig && sig.desde - p.hasta > 6)) cerrar();
  });
  cerrar();
  // cada grupo se queda en pantalla hasta que empieza el siguiente (si la pausa es corta)
  grupos.forEach((g, i) => {
    const sig = grupos[i + 1];
    g.hasta = sig ? Math.min(sig.desde, g.hasta + 12) : g.hasta + 15;
  });
  return grupos;
};

/** Subtitulos grandes palabra por palabra, centrados en la zona segura. */
export const Subtitulos: React.FC<{
  palabras: Palabra[];
  color?: string;
  acento?: string;
  tamano?: number;
  centroY?: number; // posicion vertical del centro (px desde arriba)
}> = ({ palabras, color = "#ffffff", acento = "#ffcc33", tamano = 104, centroY = 1290 }) => {
  const frame = useCurrentFrame();
  const grupos = React.useMemo(() => agrupar(palabras), [palabras]);
  const g = grupos.find((x) => frame >= x.desde && frame < x.hasta);
  if (!g) return null;
  const entrada = rebote(frame, g.desde, 8);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: ZONA.lados,
          right: ZONA.lados,
          top: centroY,
          transform: `translateY(-50%) scale(${0.85 + 0.15 * entrada})`,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `0 ${tamano * 0.28}px`,
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: 1.08,
          textTransform: "uppercase",
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        {g.palabras.map((p, i) => {
          const dicha = frame >= p.desde;
          const activa = frame >= p.desde && frame < p.hasta;
          const pop = rebote(frame, p.desde, 7);
          return (
            <span
              key={i}
              style={{
                color: activa ? acento : color,
                opacity: dicha ? 1 : 0,
                display: "inline-block",
                transform: `scale(${dicha ? 0.8 + 0.2 * pop : 0.8})`,
                textShadow: contorno(tamano),
                WebkitTextStroke: `${tamano * 0.035}px #000`,
                paintOrder: "stroke fill",
              }}
            >
              {p.texto}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Titular grande que entra con golpe (para el gancho o datos clave). */
export const Titular: React.FC<{
  texto: string;
  desde?: number;
  y?: number;
  tamano?: number;
  color?: string;
  fondo?: string;
  rotacion?: number;
}> = ({ texto, desde = 0, y = 380, tamano = 120, color = "#ffffff", fondo, rotacion = -2 }) => {
  const frame = useCurrentFrame();
  const s = rebote(frame, desde, 12);
  if (frame < desde || s <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: ZONA.lados,
        right: ZONA.lados,
        top: y,
        display: "flex",
        justifyContent: "center",
        transform: `scale(${s}) rotate(${rotacion}deg)`,
      }}
    >
      <div
        style={{
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: tamano,
          lineHeight: 1.02,
          color,
          textAlign: "center",
          textTransform: "uppercase",
          padding: fondo ? `${tamano * 0.12}px ${tamano * 0.3}px` : 0,
          background: fondo,
          borderRadius: tamano * 0.2,
          textShadow: fondo ? "none" : contorno(tamano),
          WebkitTextStroke: fondo ? undefined : `${tamano * 0.03}px #000`,
          paintOrder: "stroke fill",
        }}
      >
        {texto}
      </div>
    </div>
  );
};

/** Etiqueta 2D en una posicion de pantalla (px). Aparece con fundido y sube un poco. */
export const Etiqueta2D: React.FC<{
  texto: string;
  x: number;
  y: number;
  desde?: number;
  color?: string;
  fondo?: string;
  tamano?: number;
}> = ({ texto, x, y, desde = 0, color = "#fff", fondo = "rgba(8,10,20,0.75)", tamano = 54 }) => {
  const frame = useCurrentFrame();
  const t = progreso(frame, desde, 12);
  if (t <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, ${interpolate(t, [0, 1], [20, 0])}px) translateY(-50%)`,
        opacity: t,
        fontFamily: FUENTE,
        fontWeight: 900,
        fontSize: tamano,
        color,
        background: fondo,
        padding: `${tamano * 0.22}px ${tamano * 0.45}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
        border: "3px solid rgba(255,255,255,0.18)",
      }}
    >
      {texto}
    </div>
  );
};

/** Barra fina de progreso abajo + @usuario: ayuda a la retencion. */
export const Marca: React.FC<{ total: number; usuario?: string; color?: string }> = ({
  total,
  usuario,
  color = "#ffcc33",
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {usuario ? (
        <div
          style={{
            position: "absolute",
            top: 190,
            width: "100%",
            textAlign: "center",
            fontFamily: FUENTE,
            fontWeight: 900,
            fontSize: 38,
            color: "rgba(255,255,255,0.8)",
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          {usuario}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, top: 0, height: 10, width: `${(frame / total) * 100}%`, background: color }} />
    </AbsoluteFill>
  );
};
