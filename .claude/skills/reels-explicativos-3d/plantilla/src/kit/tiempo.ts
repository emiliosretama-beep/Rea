import { Easing, interpolate } from "remotion";

// Todas las animaciones salen del numero de fotograma: nunca uses Date, setTimeout ni
// Math.random(), porque Remotion renderiza los fotogramas en paralelo y desordenados.

/** 0 -> 1 entre `inicio` y `inicio + dur` (en fotogramas), con curva suave. */
export const progreso = (
  frame: number,
  inicio: number,
  dur: number,
  curva: (t: number) => number = Easing.bezier(0.22, 1, 0.36, 1),
) =>
  interpolate(frame, [inicio, inicio + Math.max(1, dur)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: curva,
  });

/** Entra, se queda y sale: 0 -> 1 -> 0. */
export const entraYSale = (frame: number, total: number, entrada = 12, salida = 10) =>
  Math.min(progreso(frame, 0, entrada), 1 - progreso(frame, total - salida, salida, Easing.in(Easing.quad)));

/** Rebote tipo "pop" (sube un poco de 1 y vuelve). */
export const rebote = (frame: number, inicio: number, dur = 14) =>
  interpolate(frame, [inicio, inicio + dur * 0.6, inicio + dur], [0, 1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

/** Numero pseudoaleatorio estable entre 0 y 1 a partir de una semilla. */
export const azar = (semilla: number) => {
  const x = Math.sin(semilla * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Oscilacion suave para que nada quede totalmente quieto. */
export const respira = (frame: number, periodo = 90, amplitud = 1) =>
  Math.sin((frame / periodo) * Math.PI * 2) * amplitud;

export const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
