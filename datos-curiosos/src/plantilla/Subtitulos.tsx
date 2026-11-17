import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Grupo, Palabra } from './tiempos';
import type { Paleta } from './tipos';
import { FUENTE } from './fuente';

// Zona segura: lejos de la barra de arriba de TikTok/Reels y de la descripción
// y los botones de abajo. El bloque queda centrado en x y en esta franja en y.
export const SUBTITULOS_ARRIBA = 1120;
export const SUBTITULOS_ALTO = 330;

const PalabraAnimada: React.FC<{
  palabra: Palabra;
  siguiente: Palabra | undefined;
  finGrupo: number;
  tamano: number;
  paleta: Paleta;
}> = ({ palabra, siguiente, finGrupo, tamano, paleta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // Cuadros desde que empieza la palabra (negativo = todavía no se dice).
  const f = (t - palabra.inicio) * fps;
  const visible = f >= 0;
  const finActiva = siguiente ? siguiente.inicio : Math.min(finGrupo, palabra.fin + 0.3);
  const activa = visible && t < finActiva;

  // La palabra ya se ve en su primer cuadro (opacidad 0.6): nunca hay un cuadro vacío.
  const escala = interpolate(f, [0, 3, 6], [0.7, 1.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subida = interpolate(f, [0, 5], [22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const opacidad = interpolate(f, [0, 2], [0.6, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <span
      style={{
        display: 'inline-block',
        margin: `0 ${tamano * 0.13}px`,
        color: activa ? paleta.resaltado : paleta.texto,
        opacity: visible ? opacidad : 0,
        scale: String(escala * (activa ? 1.06 : 1)),
        translate: `0px ${subida}px`,
        WebkitTextStroke: `${tamano * 0.12}px ${paleta.borde}`,
        paintOrder: 'stroke fill',
        textShadow: `0 ${tamano * 0.07}px 0 ${paleta.borde}, 0 0 ${tamano * 0.35}px rgba(0,0,0,0.55)`,
      }}
    >
      {palabra.texto.toUpperCase()}
    </span>
  );
};

export const Subtitulos: React.FC<{ grupos: Grupo[]; paleta: Paleta }> = ({
  grupos,
  paleta,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // El grupo activo es el último que ya empezó y no ha terminado.
  let grupo: Grupo | undefined;
  for (const g of grupos) {
    if (g.inicio <= t && t < g.fin) grupo = g;
  }
  if (!grupo) return null;

  const f = (t - grupo.inicio) * fps;
  const entrada = interpolate(f, [0, 4], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        top: SUBTITULOS_ARRIBA,
        height: SUBTITULOS_ALTO,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FUENTE,
          fontWeight: 900,
          fontSize: grupo.tamano,
          lineHeight: 1.08,
          textAlign: 'center',
          scale: String(entrada),
        }}
      >
        {grupo.lineas.map((linea, i) => (
          <div key={i} style={{ whiteSpace: 'nowrap' }}>
            {linea.map((palabra) => {
              const indice = grupo.palabras.indexOf(palabra);
              return (
                <PalabraAnimada
                  key={`${palabra.inicio}-${palabra.texto}`}
                  palabra={palabra}
                  siguiente={grupo.palabras[indice + 1]}
                  finGrupo={grupo.fin}
                  tamano={grupo.tamano}
                  paleta={paleta}
                />
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
