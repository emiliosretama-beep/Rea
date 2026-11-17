import React, { useCallback, useMemo } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import type { DatoProps, Tema } from './tipos';
import { armarGrupos, inicioDeEscenas, tiemposDelAudio, tiemposDelGuion } from './tiempos';
import { Camara } from './Camara';
import { Fondo } from './Fondo';
import { Destello, Encabezado } from './Encabezado';
import { Subtitulos } from './Subtitulos';
import { FUENTE } from './fuente';
import {
  ILUSTRACION_ALTO,
  ILUSTRACION_ANCHO,
  ILUSTRACION_ARRIBA,
  type PropsDibujo,
} from '../dibujos/comun';
import { Pulpo } from '../dibujos/Pulpo';
import { PuntitosArriba, Saltar } from '../dibujos/Saltar';
import { Boligrafo } from '../dibujos/Boligrafo';
import { RayoDibujo } from '../dibujos/Rayo';

const DIBUJOS: Record<Tema, React.FC<PropsDibujo>> = {
  pulpo: Pulpo,
  saltar: Saltar,
  boligrafo: Boligrafo,
  rayo: RayoDibujo,
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,:;]/g, '');

/** Lienzo SVG de la ilustración, con el borde de abajo desvanecido. */
const Lienzo: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <svg
    width={ILUSTRACION_ANCHO}
    height={ILUSTRACION_ALTO}
    viewBox={`0 0 ${ILUSTRACION_ANCHO} ${ILUSTRACION_ALTO}`}
    style={{ position: 'absolute', top: ILUSTRACION_ARRIBA, left: 0, overflow: 'visible' }}
  >
    <defs>
      <linearGradient id={`des-${id}`} gradientUnits="userSpaceOnUse" x1={0} y1={690} x2={0} y2={780}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#000000" />
      </linearGradient>
      <mask id={`mascara-${id}`} maskUnits="userSpaceOnUse" x={-400} y={-400} width={1880} height={1180}>
        <rect x={-400} y={-400} width={1880} height={1180} fill={`url(#des-${id})`} />
      </mask>
    </defs>
    <g mask={`url(#mascara-${id})`}>{children}</g>
  </svg>
);

export const DatoCurioso: React.FC<DatoProps> = ({
  etiqueta,
  tema,
  paleta,
  escenas,
  audio,
  palabras,
}) => {
  const { fps } = useVideoConfig();

  const tiempos = useMemo(
    () =>
      palabras && palabras.length > 0
        ? tiemposDelAudio(palabras, escenas)
        : tiemposDelGuion(escenas),
    [palabras, escenas],
  );
  const grupos = useMemo(() => armarGrupos(tiempos, escenas), [tiempos, escenas]);
  const inicios = inicioDeEscenas(escenas);
  const Dibujo = DIBUJOS[tema];

  // Devuelve el cuadro (local a la escena) en que empieza una palabra clave.
  const cuandoEn = useCallback(
    (escena: number) => (clave: string, respaldo: number) => {
      const buscada = normalizar(clave);
      const palabra = tiempos.find(
        (p) => p.escena === escena && normalizar(p.texto).startsWith(buscada),
      );
      const segundos = palabra ? palabra.inicio - inicios[escena] : respaldo;
      return Math.round(segundos * fps);
    },
    [tiempos, inicios, fps],
  );

  const centroIlustracion = ((ILUSTRACION_ARRIBA + ILUSTRACION_ALTO / 2) / 1920) * 100;

  return (
    <AbsoluteFill style={{ backgroundColor: paleta.fondoA }}>
      <Camara intensidad={0.35} origen="50% 50%">
        <Fondo paleta={paleta} tema={tema} />
      </Camara>

      <Camara origen={`50% ${centroIlustracion}%`}>
        {tema === 'saltar' ? (
          <Lienzo id="arriba">
            <PuntitosArriba paleta={paleta} />
          </Lienzo>
        ) : null}
        {escenas.map((escena, i) => {
          // Redondear inicio y fin (no la duración) evita huecos de 1 cuadro entre escenas.
          const desde = Math.round(inicios[i] * fps);
          const hasta = Math.round((inicios[i] + escena.duracion) * fps);
          return (
            <Sequence key={i} from={desde} durationInFrames={hasta - desde} name={`Escena ${i + 1}`}>
              <Lienzo id={`e${i}`}>
                <Dibujo escena={i} duracion={hasta - desde} paleta={paleta} cuando={cuandoEn(i)} />
              </Lienzo>
            </Sequence>
          );
        })}
      </Camara>

      <Destello escenas={escenas} />
      <Encabezado etiqueta={etiqueta} paleta={paleta} escenas={escenas} />
      <Subtitulos grupos={grupos} paleta={paleta} />
      {audio ? (
        <>
          <Html5Audio src={staticFile(audio)} />
          {/* La licencia del modelo de voz (OpenRAIL-M) pide avisar que es IA. */}
          <AbsoluteFill style={{ top: 1480, height: 40, alignItems: 'center' }}>
            <div
              style={{
                fontFamily: FUENTE,
                fontWeight: 900,
                fontSize: 30,
                letterSpacing: 3,
                color: 'rgba(255,255,255,0.88)',
                WebkitTextStroke: `6px ${paleta.borde}`,
                paintOrder: 'stroke fill',
              }}
            >
              VOZ CREADA CON IA
            </div>
          </AbsoluteFill>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
