// Capas 2D del estilo cine: titulos monoespaciados, etiqueta de pasada y contador.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { progreso } from "../tiempo";

const MONO = "ReelMono, 'JetBrains Mono', monospace";

/** Titulo de concepto: "CÁMARA", "LUZ"... en mono rojo-naranja con un indice. */
export const TituloMono: React.FC<{ texto: string; indice?: string; desde?: number; y?: number; color?: string }> = ({
  texto,
  indice,
  desde = 0,
  y = 300,
  color = "#ff6a2b",
}) => {
  const frame = useCurrentFrame();
  const t = progreso(frame, desde, 10);
  // efecto "se escribe": aparecen las letras de una en una
  const letras = Math.floor(interpolate(frame - desde, [0, texto.length * 1.5], [0, texto.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  if (t <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 80, top: y, opacity: t, fontFamily: MONO, fontWeight: 700 }}>
      {indice ? <div style={{ color: "rgba(255,240,225,0.75)", fontSize: 30, letterSpacing: 4, marginBottom: 6 }}>{indice}</div> : null}
      <div style={{ color, fontSize: 92, letterSpacing: 6, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        {texto.slice(0, letras)}
        <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0 }}>_</span>
      </div>
    </div>
  );
};

/** Etiqueta roja pequena tipo "FRAME 0001 · PASS: WIRE". */
export const EtiquetaPasada: React.FC<{ texto: string; x?: number; y?: number }> = ({ texto, x = 70, y = 250 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      background: "#e0321c",
      color: "#fff",
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 26,
      padding: "8px 14px",
      letterSpacing: 2,
    }}
  >
    {texto}
  </div>
);

/** Contador de fotogramas (abajo a la derecha, dentro de la zona segura). */
export const ContadorFrames: React.FC<{ inicio?: number; y?: number }> = ({ inicio = 0, y = 1470 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          right: 70,
          top: y,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 28,
          color: "rgba(255,255,255,0.85)",
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          letterSpacing: 2,
        }}
      >
        {String(inicio + frame + 1).padStart(4, "0")} / 30fps
      </div>
    </AbsoluteFill>
  );
};
