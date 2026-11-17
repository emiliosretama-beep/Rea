import React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Paleta } from '../plantilla/tipos';
import { FUENTE } from '../plantilla/fuente';
import { anchoEnEm } from '../plantilla/tiempos';

// Área de la ilustración (coordenadas del SVG): 1080 x 780, colocada debajo
// del encabezado y encima de los subtítulos.
export const ILUSTRACION_ARRIBA = 340;
export const ILUSTRACION_ANCHO = 1080;
export const ILUSTRACION_ALTO = 780;

export type PropsDibujo = {
  /** Índice de la escena (0, 1, 2, 3). */
  escena: number;
  /** Duración de la escena en cuadros. */
  duracion: number;
  paleta: Paleta;
  /**
   * Cuadro (local a la escena) en el que empieza la palabra que comienza con
   * `clave`. Así el dibujo cambia justo cuando se lee o se dice esa palabra.
   */
  cuando: (clave: string, respaldoSegundos: number) => number;
};

const fijar = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 -> 1 con un pequeño rebote, empezando en `inicio` (cuadros). */
export const aparecer = (f: number, inicio = 0, dura = 10) =>
  interpolate(f, [inicio, inicio + dura], [0, 1], {
    ...fijar,
    easing: Easing.out(Easing.back(1.8)),
  });

/** 0 -> 1 suave. */
export const avance = (f: number, inicio: number, dura: number) =>
  interpolate(f, [inicio, inicio + dura], [0, 1], {
    ...fijar,
    easing: Easing.inOut(Easing.cubic),
  });

/** Latido: escala que pulsa con el cuadro. */
export const latido = (f: number, velocidad = 0.32, fuerza = 0.12) =>
  1 + fuerza * Math.pow(Math.max(0, Math.sin(f * velocidad)), 6);

export const mezclar = (a: number, b: number, k: number) => a + (b - a) * k;

// Corazón centrado en 0,0 con alto aproximado de 1.
export const CAMINO_CORAZON =
  'M 0 0.45 C -0.15 0.3 -0.5 0.05 -0.5 -0.18 C -0.5 -0.42 -0.3 -0.52 -0.18 -0.52 C -0.08 -0.52 0 -0.45 0 -0.35 C 0 -0.45 0.08 -0.52 0.18 -0.52 C 0.3 -0.52 0.5 -0.42 0.5 -0.18 C 0.5 0.05 0.15 0.3 0 0.45 Z';

export const Corazon: React.FC<{
  x: number;
  y: number;
  tam: number;
  color: string;
  borde: string;
  escala?: number;
  opacidad?: number;
}> = ({ x, y, tam, color, borde, escala = 1, opacidad = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${tam * escala})`} opacity={opacidad}>
    <path d={CAMINO_CORAZON} fill={color} stroke={borde} strokeWidth={0.08} />
    <ellipse cx={-0.2} cy={-0.28} rx={0.09} ry={0.06} fill="#ffffff" opacity={0.7} />
  </g>
);

/** Flecha con rayitas que avanzan (flujo). */
export const Flecha: React.FC<{
  d: string;
  color: string;
  frame: number;
  opacidad?: number;
  grosor?: number;
  idPunta: string;
}> = ({ d, color, frame, opacidad = 1, grosor = 10, idPunta }) => (
  <g opacity={opacidad}>
    <defs>
      <marker
        id={idPunta}
        viewBox="0 0 10 10"
        refX={5}
        refY={5}
        markerWidth={4}
        markerHeight={4}
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>
    </defs>
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeDasharray="22 16"
      strokeDashoffset={-frame * 3}
      markerEnd={`url(#${idPunta})`}
    />
  </g>
);

/** Anillo que se dibuja alrededor de algo para resaltarlo. */
export const AnilloResaltado: React.FC<{
  x: number;
  y: number;
  r: number;
  f: number;
  inicio: number;
  color: string;
  borde: string;
}> = ({ x, y, r, f, inicio, color, borde }) => {
  const largo = 2 * Math.PI * r;
  const dibujado = avance(f, inicio, 12);
  const pulso = 1 + 0.08 * Math.sin((f - inicio) * 0.3);
  if (f < inicio) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${pulso}) rotate(-90)`}>
      <circle r={r} fill="none" stroke={borde} strokeWidth={20} strokeDasharray={largo} strokeDashoffset={largo * (1 - dibujado)} strokeLinecap="round" opacity={0.6} />
      <circle r={r} fill="none" stroke={color} strokeWidth={11} strokeDasharray={largo} strokeDashoffset={largo * (1 - dibujado)} strokeLinecap="round" />
    </g>
  );
};

/** Pastilla con texto; `despues` agrega una flecha dibujada y otro texto. */
export const Etiqueta: React.FC<{
  x: number;
  y: number;
  texto: string;
  despues?: string;
  flecha?: boolean;
  escala: number;
  fondo: string;
  color: string;
  tam?: number;
}> = ({ x, y, texto, despues = '', flecha = false, escala, fondo, color, tam = 46 }) => {
  if (escala <= 0) return null;
  const a1 = anchoEnEm(texto) * tam;
  const af = flecha ? tam * 1.1 : 0;
  const a2 = despues ? anchoEnEm(despues) * tam + tam * 0.25 : 0;
  const total = a1 + af + a2;
  const relleno = tam * 0.55;
  const x0 = -total / 2;
  const xf = x0 + a1 + tam * 0.15;
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <rect x={x0 - relleno} y={-tam * 0.78} width={total + relleno * 2} height={tam * 1.4} rx={tam * 0.7} fill={fondo} stroke="#020818" strokeWidth={5} />
      <text x={x0} y={tam * 0.34} fontFamily={FUENTE} fontWeight={900} fontSize={tam} fill={color}>
        {texto}
      </text>
      {flecha ? (
        <path
          d={`M ${xf} 0 L ${xf + tam * 0.75} 0 M ${xf + tam * 0.45} ${-tam * 0.3} L ${xf + tam * 0.78} 0 L ${xf + tam * 0.45} ${tam * 0.3}`}
          fill="none"
          stroke={color}
          strokeWidth={tam * 0.16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {despues ? (
        <text x={x0 + a1 + af + tam * 0.25} y={tam * 0.34} fontFamily={FUENTE} fontWeight={900} fontSize={tam} fill={color}>
          {despues}
        </text>
      ) : null}
    </g>
  );
};
