import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { AnilloResaltado, Etiqueta, Flecha, PropsDibujo, aparecer, avance, mezclar } from './comun';
import { FUENTE } from '../plantilla/fuente';
import type { Paleta } from '../plantilla/tipos';

const AMARILLO = '#ffd400';
const OSCURO = '#03190f';
const TINTA = '#1d4fd6';

// Posiciones en las coordenadas del bolígrafo (horizontal, punta a la izquierda).
const AGUJERO_TAPA = { x: -452, y: 0 };
const AGUJERO_TUBO = { x: 40, y: -22 };

/** Tapa del bolígrafo con su agujero en la punta cerrada. */
const Tapa: React.FC = () => (
  <g>
    <path d="M -190 -42 L -420 -38 Q -452 -36 -452 0 Q -452 36 -420 38 L -190 42 Z" fill={AMARILLO} stroke={OSCURO} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-330} y={-62} width={150} height={20} rx={8} fill="#e6bf00" stroke={OSCURO} strokeWidth={5} />
    <rect x={-200} y={-62} width={22} height={34} rx={6} fill="#e6bf00" stroke={OSCURO} strokeWidth={5} />
    <ellipse cx={-446} cy={0} rx={10} ry={30} fill="#ffe866" stroke={OSCURO} strokeWidth={4} />
    <circle cx={AGUJERO_TAPA.x + 6} cy={0} r={9} fill={OSCURO} />
    <rect x={-400} y={-30} width={170} height={10} rx={5} fill="#ffffff" opacity={0.45} />
  </g>
);

/** Cuerpo del bolígrafo: tubo transparente, cartucho de tinta y agujerito lateral. */
const Cuerpo: React.FC<{ frame: number; flujo: number }> = ({ frame, flujo }) => (
  <g>
    <polygon points="-432,0 -372,-15 -372,15" fill="#d9b25a" stroke={OSCURO} strokeWidth={4} strokeLinejoin="round" />
    <circle cx={-434} cy={0} r={6} fill="#9aa3ad" stroke={OSCURO} strokeWidth={2} />
    <polygon points="-372,-15 -300,-30 -300,30 -372,15" fill="#e8fff4" opacity={0.85} stroke={OSCURO} strokeWidth={4} strokeLinejoin="round" />
    <rect x={-300} y={-36} width={700} height={72} rx={10} fill="#ffffff" fillOpacity={0.22} stroke="#ffffff" strokeWidth={5} />
    <line x1={-290} x2={390} y1={-13} y2={-13} stroke="#ffffff" strokeWidth={2} opacity={0.35} />
    <line x1={-290} x2={390} y1={13} y2={13} stroke="#ffffff" strokeWidth={2} opacity={0.35} />
    {/* Cartucho: tinta hasta la mitad, el resto vacío. */}
    <rect x={-380} y={-8} width={760} height={16} rx={8} fill="#ffffff" opacity={0.25} />
    <rect x={-380} y={-8} width={560} height={16} rx={8} fill={TINTA} />
    <line
      x1={170}
      x2={-372}
      y1={0}
      y2={0}
      stroke="#9fc0ff"
      strokeWidth={5}
      strokeDasharray="18 22"
      strokeDashoffset={-frame * 4}
      opacity={flujo}
    />
    <rect x={400} y={-27} width={34} height={54} rx={8} fill={AMARILLO} stroke={OSCURO} strokeWidth={5} />
    <circle cx={AGUJERO_TUBO.x} cy={AGUJERO_TUBO.y} r={9} fill={OSCURO} stroke="#ffffff" strokeWidth={3} />
  </g>
);

const Escudo: React.FC<{ x: number; y: number; escala: number; paleta: Paleta; f: number }> = ({ x, y, escala, paleta, f }) => {
  const check = avance(f, 0, 12);
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <path d="M 0 -110 L 95 -75 L 95 10 C 95 70 45 105 0 125 C -45 105 -95 70 -95 10 L -95 -75 Z" fill={paleta.acento} stroke={OSCURO} strokeWidth={8} strokeLinejoin="round" />
      <path
        d="M -45 5 L -12 40 L 50 -35"
        fill="none"
        stroke={OSCURO}
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={170}
        strokeDashoffset={170 * (1 - check)}
      />
      <text y={175} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={46} fill="#ffffff" stroke={OSCURO} strokeWidth={10} paintOrder="stroke">
        ISO 11540
      </text>
    </g>
  );
};

export const Boligrafo: React.FC<PropsDibujo> = ({ escena, paleta, cuando }) => {
  const frame = useCurrentFrame();
  const entrada = aparecer(frame, escena === 0 ? -5 : 0, 12);

  if (escena === 0) {
    // Gancho: bolígrafo con tapa y un círculo que se dibuja sobre el agujero.
    const x = interpolate(entrada, [0, 1], [800, 590]);
    const giro = -16 + Math.sin(frame * 0.12) * 2;
    return (
      <g>
        <g transform={`translate(${x} 420) rotate(${giro}) scale(${entrada})`}>
          <Cuerpo frame={frame} flujo={0} />
          <Tapa />
          <AnilloResaltado x={AGUJERO_TAPA.x + 4} y={0} r={54} f={frame} inicio={12} color={paleta.resaltado} borde={OSCURO} />
        </g>
        <Etiqueta x={250} y={190} texto="¿?" escala={aparecer(frame, 26, 10)} fondo={paleta.resaltado} color={OSCURO} tam={70} />
      </g>
    );
  }

  if (escena === 1) {
    // Primer plano de la tapa: el aire pasa por el agujero.
    const enRiesgo = cuando('riesgo', 4.2);
    const aire = aparecer(frame, 10, 10);
    return (
      <g>
        <g transform={`translate(${mezclar(1300, 1200, entrada)} 430) rotate(-8) scale(${1.9 * entrada})`}>
          <Tapa />
          <g opacity={aire}>
            <Flecha idPunta="b-a1" d="M -40 -14 L -175 -6" color="#ffffff" frame={frame} grosor={5} opacidad={0.8} />
            <Flecha idPunta="b-a2" d="M -40 16 L -175 8" color="#ffffff" frame={frame + 8} grosor={5} opacidad={0.8} />
            <Flecha idPunta="b-a3" d="M -470 0 C -510 -4 -545 -14 -580 -34" color={paleta.resaltado} frame={frame} grosor={6} />
          </g>
          <AnilloResaltado x={AGUJERO_TAPA.x + 4} y={0} r={36} f={frame} inicio={4} color={paleta.resaltado} borde={OSCURO} />
        </g>
        <Etiqueta x={300} y={190} texto="AIRE" escala={aparecer(frame, 14, 10)} fondo="#ffffff" color={OSCURO} tam={56} />
        <g transform={`translate(820 190) scale(${aparecer(frame, enRiesgo - 3, 10)})`}>
          <circle r={62} fill={paleta.acento2} stroke={OSCURO} strokeWidth={7} />
          <path d="M -28 2 L -8 24 L 30 -20" fill="none" stroke={OSCURO} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    );
  }

  if (escena === 2) {
    // Otro agujero: el del tubo. Iguala la presión y la tinta fluye.
    const enIguala = cuando('iguala', 2);
    const enFluya = cuando('fluya', 4.6);
    const tapaFuera = avance(frame, 0, 14);
    const flujo = avance(frame, enFluya - 4, 10);
    const pulso = Math.sin(frame * 0.25);
    const garabato = avance(frame, enFluya - 2, 40);
    const curva: string[] = [];
    for (let i = 0; i <= 60 * garabato; i++) {
      const x = 150 + i * 12;
      curva.push(`${x} ${568 + Math.sin(i * 0.55) * 20}`);
    }
    return (
      <g>
        <g transform={`translate(560 400) rotate(-14) scale(${entrada})`}>
          <g transform={`translate(${mezclar(0, 60, tapaFuera)} ${mezclar(0, -190, tapaFuera)}) rotate(${mezclar(0, -10, tapaFuera)})`} opacity={mezclar(1, 0.75, tapaFuera)}>
            <Tapa />
          </g>
          <Cuerpo frame={frame} flujo={flujo} />
          <AnilloResaltado x={AGUJERO_TUBO.x} y={AGUJERO_TUBO.y} r={42} f={frame} inicio={10} color={paleta.resaltado} borde={OSCURO} />
          {/* Flechas de presión: entra y sale lo mismo. */}
          <g opacity={aparecer(frame, enIguala - 2, 10)}>
            <path d={`M ${AGUJERO_TUBO.x - 20} ${-150 + pulso * 8} L ${AGUJERO_TUBO.x - 20} -84`} stroke="#ffffff" strokeWidth={12} strokeLinecap="round" />
            <path d={`M ${AGUJERO_TUBO.x - 42} -108 L ${AGUJERO_TUBO.x - 20} -80 L ${AGUJERO_TUBO.x + 2} -108`} fill="none" stroke="#ffffff" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${AGUJERO_TUBO.x + 24} -84 L ${AGUJERO_TUBO.x + 24} ${-150 - pulso * 8}`} stroke={paleta.resaltado} strokeWidth={12} strokeLinecap="round" />
            <path d={`M ${AGUJERO_TUBO.x + 2} ${-126 - pulso * 8} L ${AGUJERO_TUBO.x + 24} ${-154 - pulso * 8} L ${AGUJERO_TUBO.x + 46} ${-126 - pulso * 8}`} fill="none" stroke={paleta.resaltado} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
        <Etiqueta x={740} y={180} texto="PRESIÓN IGUAL" escala={aparecer(frame, enIguala - 2, 10)} fondo={paleta.acento} color={OSCURO} tam={46} />
        {curva.length > 1 ? (
          <polyline points={curva.join(' ')} fill="none" stroke={TINTA} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </g>
    );
  }

  // Escena 3: es una norma de seguridad (ISO 11540) y pregunta final.
  const enNorma = cuando('norma', 1.6);
  const enInvestigo = cuando('investigo', 3.5);
  return (
    <g>
      <g transform={`translate(480 540) rotate(-14) scale(${0.8 * entrada})`}>
        <Cuerpo frame={frame} flujo={0} />
        <Tapa />
        <AnilloResaltado x={AGUJERO_TAPA.x + 4} y={0} r={54} f={frame} inicio={6} color={paleta.resaltado} borde={OSCURO} />
      </g>
      <g opacity={aparecer(frame, enNorma - 3, 10)}>
        <Escudo x={830} y={200} escala={aparecer(frame, enNorma - 3, 10)} paleta={paleta} f={frame - enNorma + 3} />
      </g>
      <g transform={`translate(250 190) scale(${aparecer(frame, enInvestigo - 2, 10)})`}>
        <path d="M -110 -70 L 110 -70 Q 140 -70 140 -40 L 140 40 Q 140 70 110 70 L -20 70 L -70 115 L -60 70 L -110 70 Q -140 70 -140 40 L -140 -40 Q -140 -70 -110 -70 Z" fill="#ffffff" stroke={OSCURO} strokeWidth={7} strokeLinejoin="round" />
        <text y={34} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={96} fill={OSCURO}>
          ¿?
        </text>
      </g>
    </g>
  );
};
