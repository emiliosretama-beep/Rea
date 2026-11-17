import React from 'react';
import { CalculateMetadataFunction, Composition } from 'remotion';
import { DatoCurioso } from './plantilla/DatoCurioso';
import type { DatoProps } from './plantilla/tipos';
import { FPS, duracionTotal } from './plantilla/tiempos';
import { VIDEOS } from './datos';

// La duración sale de la suma de las escenas: si cambias un texto o una
// duración en Studio, el video se ajusta solo.
const calcularDuracion: CalculateMetadataFunction<DatoProps> = ({ props }) => ({
  durationInFrames: Math.round(duracionTotal(props.escenas) * FPS),
});

export const RemotionRoot: React.FC = () => (
  <>
    {VIDEOS.map((video) => (
      <Composition
        key={video.id}
        id={video.id}
        component={DatoCurioso}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={Math.round(duracionTotal(video.props.escenas) * FPS)}
        defaultProps={video.props}
        calculateMetadata={calcularDuracion}
      />
    ))}
  </>
);
