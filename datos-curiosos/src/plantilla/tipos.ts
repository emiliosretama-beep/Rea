// Tipos compartidos por la plantilla de "datos curiosos".
// Una sola plantilla; cada video solo cambia estos datos (props).

export type Escena = {
  /** Frase que se lee (y que se narraría) en esta escena. */
  texto: string;
  /** Duración de la escena en segundos. */
  duracion: number;
};

export type Paleta = {
  /** Degradado del fondo, de oscuro a claro. */
  fondoA: string;
  fondoB: string;
  fondoC: string;
  /** Color principal de los dibujos y la etiqueta superior. */
  acento: string;
  /** Color secundario de los dibujos. */
  acento2: string;
  /** Color de la palabra que se está diciendo. */
  resaltado: string;
  /** Color del resto de los subtítulos. */
  texto: string;
  /** Contorno oscuro del texto (contraste sobre cualquier fondo). */
  borde: string;
};

/** Tiempo real de una palabra, por ejemplo sacado del audio de la voz. */
export type PalabraConTiempo = {
  texto: string;
  /** Segundos desde el inicio del video. */
  inicio: number;
  fin: number;
  /** Escena a la que pertenece (si no se indica, se deduce por el tiempo). */
  escena?: number;
};

export type Tema = 'pulpo' | 'saltar' | 'boligrafo';

export type DatoProps = {
  /** Texto de la etiqueta superior, por ejemplo "DATO CURIOSO #1". */
  etiqueta: string;
  /** Qué dibujos usa el video. */
  tema: Tema;
  paleta: Paleta;
  escenas: Escena[];
  /** Opcional: archivo de voz dentro de public/, por ejemplo "voz/pulpo.wav". */
  audio?: string;
  /**
   * Opcional: tiempos reales de cada palabra (en el mismo orden que el guion).
   * Si no se pasan, los subtítulos se reparten con el tiempo del guion.
   */
  palabras?: PalabraConTiempo[];
};
