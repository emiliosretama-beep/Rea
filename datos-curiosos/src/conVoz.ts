import type { DatoProps, PalabraConTiempo } from './plantilla/tipos';
import pulpo from './voz/Pulpo.json';
import saltar from './voz/Saltar.json';
import boligrafo from './voz/Boligrafo.json';
import rayo from './voz/Rayo.json';

// Une cada video con su narración (generada con `npm run voz`):
// audio, tiempos reales por palabra y duración de cada escena según la voz.
type Voz = {
  audio: string;
  duraciones: number[];
  palabras: PalabraConTiempo[];
};

const VOCES: Record<string, Voz> = { Pulpo: pulpo, Saltar: saltar, Boligrafo: boligrafo, Rayo: rayo };

export const conVoz = (id: string, props: DatoProps): DatoProps => {
  const voz = VOCES[id];
  if (!voz || voz.duraciones.length !== props.escenas.length) return props;
  return {
    ...props,
    audio: voz.audio,
    palabras: voz.palabras,
    escenas: props.escenas.map((escena, i) => ({ ...escena, duracion: voz.duraciones[i] })),
  };
};
