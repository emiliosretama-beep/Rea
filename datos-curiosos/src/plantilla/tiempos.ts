import type { Escena, PalabraConTiempo } from './tipos';

export const FPS = 30;

export type Palabra = {
  texto: string;
  /** Segundos desde el inicio del video. */
  inicio: number;
  fin: number;
  /** Índice de la escena a la que pertenece. */
  escena: number;
};

export type Linea = Palabra[];

export type Grupo = {
  palabras: Palabra[];
  lineas: Linea[];
  /** Tamaño de letra en px para que la línea más larga quepa. */
  tamano: number;
  /** Segundos: desde cuándo y hasta cuándo se ve el grupo. */
  inicio: number;
  fin: number;
};

export const inicioDeEscenas = (escenas: Escena[]): number[] => {
  const inicios: number[] = [];
  let t = 0;
  for (const e of escenas) {
    inicios.push(t);
    t += e.duracion;
  }
  return inicios;
};

export const duracionTotal = (escenas: Escena[]) =>
  escenas.reduce((total, e) => total + e.duracion, 0);

// ---------------------------------------------------------------------------
// Reparto de palabras con el tiempo del guion (cuando no hay audio).
// Cada palabra dura según sus sílabas, y los puntos y comas meten una pausa.
// ---------------------------------------------------------------------------

const LECTURA: Record<string, string> = {
  '3': 'tres',
  '8': 'ocho',
  '#1': 'numero uno',
  '#2': 'numero dos',
  '#3': 'numero tres',
};

const limpiar = (palabra: string) => palabra.toLowerCase().replace(/[¿?¡!.,:;]/g, '');

const silabas = (palabra: string): number => {
  const limpia = limpiar(palabra);
  const leida = LECTURA[limpia] ?? limpia;
  const grupos = leida.match(/[aeiouáéíóúü]+/g);
  return Math.max(1, grupos ? grupos.length : 1);
};

const finDeFrase = (palabra: string) => /[.?!]$/.test(palabra);
const finDeTramo = (palabra: string) => /[,:]$/.test(palabra);

export const tiemposDelGuion = (escenas: Escena[]): Palabra[] => {
  const inicios = inicioDeEscenas(escenas);
  const salida: Palabra[] = [];
  escenas.forEach((escena, i) => {
    const palabras = escena.texto.trim().split(/\s+/);
    const pesos = palabras.map((p) => silabas(p) + 0.35);
    const pausas = palabras.map((p, j) =>
      j === palabras.length - 1 ? 0 : finDeFrase(p) ? 1.1 : finDeTramo(p) ? 0.5 : 0,
    );
    const margenInicio = 0.1;
    const margenFinal = escena.duracion <= 2 ? 0.15 : 0.35;
    const unidades = [...pesos, ...pausas].reduce((a, b) => a + b, 0);
    const unidad = (escena.duracion - margenInicio - margenFinal) / unidades;
    let cursor = inicios[i] + margenInicio;
    palabras.forEach((texto, j) => {
      const dura = pesos[j] * unidad;
      salida.push({ texto, inicio: cursor, fin: cursor + dura, escena: i });
      cursor += dura + pausas[j] * unidad;
    });
  });
  return salida;
};

/** Usa los tiempos reales del audio y les asigna su escena. */
export const tiemposDelAudio = (
  palabras: PalabraConTiempo[],
  escenas: Escena[],
): Palabra[] => {
  const inicios = inicioDeEscenas(escenas);
  return palabras.map((p) => {
    let escena = 0;
    inicios.forEach((inicio, i) => {
      if (p.inicio >= inicio) escena = i;
    });
    return { ...p, escena };
  });
};

// ---------------------------------------------------------------------------
// Medida del texto. Anchos reales de Montserrat Black (900) en mayúsculas,
// medidos en Chromium, en "em" (multiplica por el tamaño de letra).
// ---------------------------------------------------------------------------

const ANCHOS: Record<string, number> = {
  '0': 0.692, '1': 0.418, '2': 0.608, '3': 0.614, '4': 0.712, '5': 0.619, '6': 0.661,
  '7': 0.645, '8': 0.678, '9': 0.661, A: 0.806, B: 0.773, C: 0.737, D: 0.826, E: 0.673,
  F: 0.644, G: 0.769, H: 0.804, I: 0.35, J: 0.574, K: 0.765, L: 0.617, M: 0.954, N: 0.804,
  O: 0.848, P: 0.743, Q: 0.848, R: 0.745, S: 0.657, T: 0.654, U: 0.784, V: 0.786, W: 1.206,
  X: 0.762, Y: 0.71, Z: 0.687, Á: 0.806, É: 0.673, Í: 0.35, Ó: 0.848, Ú: 0.784, Ñ: 0.804,
  Ü: 0.784, '¿': 0.606, '?': 0.606, '¡': 0.314, '!': 0.314, '.': 0.304, ',': 0.304,
  '#': 0.74, ':': 0.304, ' ': 0.3, '-': 0.39,
};

export const anchoEnEm = (texto: string) =>
  [...texto.toUpperCase()].reduce((total, letra) => total + (ANCHOS[letra] ?? 0.85), 0);

// Zona de subtítulos: 1080 de ancho menos margen lateral (y el contorno del texto).
export const ANCHO_MAXIMO = 840;
export const TAMANO_MAXIMO = 124;
export const TAMANO_MINIMO = 78;
const TAMANO_UNA_LINEA = 100;
const MAX_PALABRAS = 3;
const MAX_LINEAS = 2;

const anchoLinea = (linea: string[], tamano: number) =>
  anchoEnEm(linea.join(' ')) * tamano;

const repartirEnLineas = (palabras: string[], tamano: number): string[][] => {
  const lineas: string[][] = [];
  for (const p of palabras) {
    const actual = lineas[lineas.length - 1];
    if (actual && anchoLinea([...actual, p], tamano) <= ANCHO_MAXIMO) {
      actual.push(p);
    } else {
      lineas.push([p]);
    }
  }
  return lineas;
};

/**
 * Primero intenta una sola línea (se lee de un vistazo) si cabe a buen tamaño;
 * si no, busca el tamaño más grande con el que el grupo cabe en 2 líneas.
 */
const acomodar = (palabras: string[]) => {
  for (let tamano = TAMANO_MAXIMO; tamano >= TAMANO_UNA_LINEA; tamano -= 2) {
    if (anchoLinea(palabras, tamano) <= ANCHO_MAXIMO) return { lineas: [palabras], tamano };
  }
  for (let tamano = TAMANO_MAXIMO; tamano >= TAMANO_MINIMO; tamano -= 2) {
    const lineas = repartirEnLineas(palabras, tamano);
    const caben = lineas.every((l) => anchoLinea(l, tamano) <= ANCHO_MAXIMO);
    if (lineas.length <= MAX_LINEAS && caben) return { lineas, tamano };
  }
  return { lineas: repartirEnLineas(palabras, TAMANO_MINIMO), tamano: TAMANO_MINIMO };
};

/**
 * Junta las palabras en grupos cortos (máximo 3) que se ven de uno en uno.
 * Un grupo nunca cruza una escena ni el final de una frase.
 */
export const armarGrupos = (palabras: Palabra[], escenas: Escena[]): Grupo[] => {
  const inicios = inicioDeEscenas(escenas);
  const crudos: Palabra[][] = [];
  palabras.forEach((p, i) => {
    const actual = crudos[crudos.length - 1];
    const anterior = palabras[i - 1];
    const cabe =
      actual &&
      anterior &&
      anterior.escena === p.escena &&
      actual.length < MAX_PALABRAS &&
      !finDeFrase(anterior.texto) &&
      !finDeTramo(anterior.texto) &&
      anchoEnEm(actual.map((x) => x.texto).join(' ') + ' ' + p.texto) <= 15.5;
    if (cabe) actual.push(p);
    else crudos.push([p]);
  });

  return crudos.map((grupo, i) => {
    const siguiente = crudos[i + 1];
    const escena = grupo[0].escena;
    const finEscena = inicios[escena] + escenas[escena].duracion;
    const fin =
      siguiente && siguiente[0].escena === escena ? siguiente[0].inicio : finEscena;
    const { lineas, tamano } = acomodar(grupo.map((p) => p.texto));
    let k = 0;
    const lineasConTiempo = lineas.map((l) => l.map(() => grupo[k++]));
    return {
      palabras: grupo,
      lineas: lineasConTiempo,
      tamano,
      // Empieza justo con su primera palabra: así no queda ningún cuadro sin texto
      // entre un grupo y el siguiente.
      inicio: grupo[0].inicio,
      fin,
    };
  });
};
