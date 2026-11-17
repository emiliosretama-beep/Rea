import type { DatoProps } from './plantilla/tipos';

// Los 3 videos. Para hacer uno nuevo basta con copiar un bloque y cambiar
// el texto, las duraciones y la paleta. Los dibujos se eligen con `tema`.
//
// Textos verificados en fuentes (ver README.md). Donde el guion original no
// se sostenía se cambió lo mínimo; el original queda comentado al lado.

export const VIDEOS: { id: string; props: DatoProps }[] = [
  {
    id: 'Pulpo',
    props: {
      etiqueta: 'DATO CURIOSO #1',
      tema: 'pulpo',
      paleta: {
        fondoA: '#030b1f',
        fondoB: '#0a2350',
        fondoC: '#0f3a78',
        acento: '#3fd0ff',
        acento2: '#ff7a90',
        resaltado: '#ffd23f',
        texto: '#ffffff',
        borde: '#020818',
      },
      escenas: [
        { texto: 'Este animal tiene 3 corazones y sangre azul', duracion: 2 },
        {
          texto:
            'Dos corazones mandan la sangre a las branquias. El tercero la manda al resto del cuerpo',
          duracion: 6,
        },
        { texto: 'Su sangre es azul porque usa cobre en vez de hierro', duracion: 7 },
        {
          texto:
            'Cuando nada, el corazón principal se detiene. Por eso prefiere caminar. Sigue para el dato #2',
          duracion: 5,
        },
      ],
    },
  },
  {
    id: 'Saltar',
    props: {
      etiqueta: 'DATO CURIOSO #2',
      tema: 'saltar',
      paleta: {
        fondoA: '#1c0638',
        fondoB: '#4a1580',
        fondoC: '#7a2bb0',
        acento: '#ff8a1f',
        acento2: '#ffc06b',
        resaltado: '#ffb02e',
        texto: '#ffffff',
        borde: '#16052b',
      },
      escenas: [
        { texto: '¿Y si los 8 mil millones de personas saltáramos a la vez?', duracion: 2 },
        { texto: 'Todos juntos pesamos muchísimo menos que la Tierra', duracion: 6 },
        {
          texto:
            'Por eso no se movería nada que se pueda notar. Solo habría pequeñas vibraciones',
          duracion: 7,
        },
        {
          // Original: "Para mover el planeta necesitaríamos pesar millones de veces más."
          // La Tierra pesa unas 10 billones (10^13) de veces más que toda la humanidad.
          texto:
            'Para moverlo de forma notable tendríamos que pesar billones de veces más. ¿Qué pasa en el #3?',
          duracion: 5,
        },
      ],
    },
  },
  {
    id: 'Boligrafo',
    props: {
      etiqueta: 'DATO CURIOSO #3',
      tema: 'boligrafo',
      paleta: {
        fondoA: '#04261b',
        fondoB: '#0b4d35',
        fondoC: '#14774f',
        acento: '#ffe14d',
        acento2: '#b8f56a',
        resaltado: '#ffe14d',
        texto: '#ffffff',
        borde: '#03190f',
      },
      escenas: [
        {
          // Original: "Todos los bolígrafos tienen este agujero." No todos lo tienen.
          texto: 'Muchas tapas de bolígrafo tienen este agujero. ¿Para qué es?',
          duracion: 2,
        },
        {
          // Original: "...deja pasar el aire y evita que se ahogue". Reduce el riesgo, no lo elimina.
          texto:
            'Si alguien se traga la tapa, el agujero deja pasar aire y reduce el riesgo de asfixia',
          duracion: 6,
        },
        {
          // Original: "También iguala la presión para que la tinta no se seque ni se salga".
          // Eso lo hace OTRO agujero, el del tubo, y no evita que la tinta se seque.
          texto: 'El agujerito del tubo es otro: iguala la presión para que la tinta fluya y no se salga',
          duracion: 7,
        },
        { texto: 'No es un adorno, es una norma de seguridad. ¿Qué investigo después?', duracion: 5 },
      ],
    },
  },
];
