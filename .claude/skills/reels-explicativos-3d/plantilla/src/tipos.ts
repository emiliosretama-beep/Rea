// Datos que genera scripts/hacer_reel.py y que Remotion recibe como props.
// Todos los tiempos estan en FOTOGRAMAS (30 fps) para que el render sea exacto.

export type Palabra = { texto: string; desde: number; hasta: number };

export type EscenaDatos = {
  id: string;
  visual: string; // nombre del componente en src/escenas/<reel>.tsx
  desde: number;
  frames: number;
  narracion: string;
  extra?: Record<string, unknown>; // parametros libres para el visual
};

export type SonidoDatos = { archivo: string; desde: number; volumen: number };

export type ReelDatos = {
  id: string;
  fps: number;
  ancho: number;
  alto: number;
  duracionFrames: number;
  escenas: EscenaDatos[];
  voces: SonidoDatos[];
  sonidos: SonidoDatos[];
  musica?: { archivo: string; volumen: number } | null;
  palabras: Palabra[];
  portada: { escena: string; frame: number; titulo: string; subtitulo?: string };
  marca?: string; // @usuario que se ve abajo, opcional
};

// Lo que recibe cada componente de escena.
export type PropsEscena = {
  frames: number; // duracion de la escena
  extra: Record<string, unknown>;
};
