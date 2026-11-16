import React from 'react';
import {Composition} from 'remotion';
import {YeyoAntiguaRoma, TOTAL, Pista} from './Video';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="YeyoAntiguaRoma" component={YeyoAntiguaRoma} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="AudioSinMusica" component={Pista} defaultProps={{conMusica: false}} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
  </>
);
