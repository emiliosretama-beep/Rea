import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Escena, Paleta } from './tipos';
import { inicioDeEscenas } from './tiempos';
import { FUENTE } from './fuente';

// Etiqueta "DATO CURIOSO #N" y barra de progreso por escenas (tipo historias).
export const Encabezado: React.FC<{
  etiqueta: string;
  paleta: Paleta;
  escenas: Escena[];
}> = ({ etiqueta, paleta, escenas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrada = interpolate(frame, [0, 4, 9], [0.5, 1.1, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  // Pequeño latido en cada corte de 2 s.
  const latido = interpolate(frame % (2 * fps), [0, 6], [1.06, 1], {
    extrapolateRight: 'clamp',
  });

  const inicios = inicioDeEscenas(escenas);
  const anchoTotal = 600;
  const hueco = 12;
  const total = escenas.reduce((a, e) => a + e.duracion, 0);

  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          top: 222,
          padding: '14px 36px 12px',
          borderRadius: 999,
          background: paleta.acento,
          color: paleta.borde,
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: 1,
          boxShadow: `0 8px 0 ${paleta.borde}, 0 0 40px ${paleta.acento}66`,
          scale: String(entrada * latido),
        }}
      >
        {etiqueta}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 318,
          width: anchoTotal,
          height: 10,
          display: 'flex',
          gap: hueco,
        }}
      >
        {escenas.map((e, i) => {
          const ancho = ((anchoTotal - hueco * (escenas.length - 1)) * e.duracion) / total;
          const lleno = interpolate(t, [inicios[i], inicios[i] + e.duracion], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                width: ancho,
                height: 10,
                borderRadius: 5,
                background: 'rgba(255,255,255,0.22)',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: `${lleno * 100}%`, height: '100%', background: '#ffffff' }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Destello corto al cambiar de escena (refuerza el corte).
export const Destello: React.FC<{ escenas: Escena[] }> = ({ escenas }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inicios = inicioDeEscenas(escenas).slice(1).map((s) => Math.round(s * fps));
  let opacidad = 0;
  for (const inicio of inicios) {
    opacidad = Math.max(
      opacidad,
      interpolate(frame - inicio, [0, 1, 7], [0, 0.32, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    );
  }
  if (opacidad <= 0) return null;
  return <AbsoluteFill style={{ background: '#ffffff', opacity: opacidad }} />;
};
