import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Cada 2 segundos la "cámara" corta a otro encuadre y da un golpe de zoom.
// Es lo que da el ritmo rápido. Todo sale del número de cuadro.
const ENCUADRES = [
  { escala: 1.0, x: 0, y: 0, giro: 0 },
  { escala: 1.1, x: -34, y: 24, giro: -1.6 },
  { escala: 1.04, x: 36, y: -18, giro: 1.4 },
  { escala: 1.13, x: 0, y: 30, giro: 0 },
  { escala: 0.99, x: -22, y: -12, giro: 1 },
  { escala: 1.08, x: 28, y: 16, giro: -1.2 },
];

export const SEGUNDOS_POR_CORTE = 2;

export const Camara: React.FC<{
  children: React.ReactNode;
  /** 1 = movimiento completo; menos de 1 para capas de fondo (paralaje). */
  intensidad?: number;
  /** Punto desde el que se hace zoom (centro de la ilustración). */
  origen?: string;
}> = ({ children, intensidad = 1, origen = '50% 37%' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tramo = Math.round(SEGUNDOS_POR_CORTE * fps);
  const corte = Math.floor(frame / tramo);
  const f = frame - corte * tramo;
  const encuadre = ENCUADRES[corte % ENCUADRES.length];

  const golpe = interpolate(f, [0, 7], [1.09, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const empuje = interpolate(f, [0, tramo], [1, 1.035]);
  const escala = 1 + (encuadre.escala * golpe * empuje - 1) * intensidad;

  return (
    <AbsoluteFill
      style={{
        transformOrigin: origen,
        scale: String(escala),
        translate: `${encuadre.x * intensidad}px ${encuadre.y * intensidad}px`,
        rotate: `${encuadre.giro * intensidad}deg`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
