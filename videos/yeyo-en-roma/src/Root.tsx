import React from 'react';
import {Composition} from 'remotion';
import {YeyoEnRoma, DURACION_TOTAL} from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="YeyoEnRoma"
    component={YeyoEnRoma}
    durationInFrames={DURACION_TOTAL}
    fps={30}
    width={1080}
    height={1920}
  />
);
