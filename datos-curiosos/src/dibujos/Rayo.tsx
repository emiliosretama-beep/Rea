import React from 'react';
import { Easing, interpolate, random, useCurrentFrame } from 'remotion';
import { Etiqueta, PropsDibujo, aparecer, avance } from './comun';
import { FUENTE } from '../plantilla/fuente';
import type { Paleta } from '../plantilla/tipos';

const OSCURO = '#03050c';
const FRIO = '#9fb3d9';

const fijar = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const formatear = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Brillo del rayo: destella fuerte cada ~0,6 s y tiembla un poco entre destellos. */
const destello = (frame: number) => {
  const ciclo = frame % 18;
  if (ciclo < 3) return 1;
  return 0.72 + 0.12 * Math.sin(frame * 1.7);
};

/** Rayo en zigzag. (x, y) es la esquina superior izquierda. */
const Rayo: React.FC<{ x: number; y: number; ancho: number; alto: number; frame: number; paleta: Paleta }> = ({
  x,
  y,
  ancho,
  alto,
  frame,
  paleta,
}) => {
  const p = [
    [0.12, 0],
    [0.64, 0],
    [0.42, 0.38],
    [0.72, 0.38],
    [0.06, 1],
    [0.24, 0.52],
    [-0.06, 0.52],
  ]
    .map(([px, py]) => `${x + px * ancho},${y + py * alto}`)
    .join(' ');
  const brillo = destello(frame);
  return (
    <g>
      <polygon points={p} fill="none" stroke={paleta.acento} strokeWidth={40} strokeLinejoin="round" opacity={0.3 * brillo} />
      <polygon points={p} fill="none" stroke="#ffffff" strokeWidth={16} strokeLinejoin="round" opacity={0.55 * brillo} />
      <polygon points={p} fill={paleta.acento} stroke="#fffbe0" strokeWidth={6} strokeLinejoin="round" />
    </g>
  );
};

/** Nube de tormenta hecha con círculos. */
const Nube: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[
      [-130, 18, 70],
      [-55, -28, 92],
      [45, -42, 104],
      [130, 4, 78],
      [10, 30, 92],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="#5d6a8a" />
    ))}
    {[
      [-60, -48, 52],
      [35, -66, 60],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="#7d8aab" />
    ))}
    <rect x={-200} y={20} width={400} height={64} rx={32} fill="#4a5672" />
  </g>
);

/** Sol con rayos que giran. */
const Sol: React.FC<{ x: number; y: number; r: number; frame: number }> = ({ x, y, r, frame }) => (
  <g transform={`translate(${x} ${y})`}>
    <defs>
      <radialGradient id={`sol-${Math.round(x)}-${Math.round(y)}`} cx="0.4" cy="0.38" r="0.7">
        <stop offset="0" stopColor="#fff6b0" />
        <stop offset="0.55" stopColor="#ffb83d" />
        <stop offset="1" stopColor="#ff7a2e" />
      </radialGradient>
    </defs>
    <g transform={`rotate(${frame * 0.8})`}>
      {new Array(12).fill(0).map((_, i) => (
        <polygon
          key={i}
          points={`${-r * 0.16},${-r * 1.08} ${r * 0.16},${-r * 1.08} 0,${-r * 1.5}`}
          fill="#ffb83d"
          transform={`rotate(${i * 30})`}
        />
      ))}
    </g>
    <circle r={r} fill={`url(#sol-${Math.round(x)}-${Math.round(y)})`} stroke={OSCURO} strokeWidth={7} />
  </g>
);

/** Destello de toda la ilustración cuando cae el rayo. */
const Fogonazo: React.FC<{ frame: number }> = ({ frame }) => {
  const ciclo = frame % 18;
  const o = ciclo < 3 ? interpolate(ciclo, [0, 1, 3], [0.16, 0.1, 0]) : 0;
  if (o <= 0) return null;
  return <rect x={-300} y={-300} width={1680} height={1380} fill="#ffffff" opacity={o} />;
};

export const RayoDibujo: React.FC<PropsDibujo> = ({ escena, paleta, cuando }) => {
  const frame = useCurrentFrame();
  const entrada = aparecer(frame, escena === 0 ? -5 : 0, 12);

  if (escena === 0) {
    // Gancho: rayo > Sol.
    const enCaliente = cuando('caliente', 1.2);
    const mayor = aparecer(frame, enCaliente - 2, 10);
    return (
      <g>
        <Fogonazo frame={frame} />
        <g transform={`translate(335 380) scale(${0.9 * entrada}) translate(-335 -380)`}>
          <Nube x={335} y={150} s={0.95} />
          <Rayo x={235} y={200} ancho={230} alto={440} frame={frame} paleta={paleta} />
        </g>
        <g transform={`translate(580 390) scale(${mayor})`}>
          <path d="M -38 -64 L 42 0 L -38 64" fill="none" stroke={OSCURO} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -38 -64 L 42 0 L -38 64" fill="none" stroke={paleta.acento} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g transform={`translate(805 390) scale(${entrada})`}>
          <Sol x={0} y={0} r={112} frame={frame} />
        </g>
      </g>
    );
  }

  if (escena === 1) {
    // En una fracción de segundo el aire llega a ~30 000 °C.
    const t0 = cuando('calienta', 1.6);
    const t1 = cuando('grados', 3.4);
    const calor = interpolate(frame, [t0 - 4, t1], [0, 1], { ...fijar, easing: Easing.out(Easing.cubic) });
    const temperatura = interpolate(frame, [t0 - 4, t1], [20, 30000], { ...fijar, easing: Easing.out(Easing.cubic) });
    const nivel = calor;
    return (
      <g>
        <Fogonazo frame={frame} />
        <g transform={`translate(470 400) scale(${entrada}) translate(-470 -400)`}>
          <Nube x={470} y={140} s={0.85} />
          <Rayo x={385} y={182} ancho={200} alto={440} frame={frame} paleta={paleta} />
          {/* Moléculas de aire: se agitan y se ponen naranjas con el calor. */}
          {new Array(26).fill(0).map((_, i) => {
            const bx = 250 + random(`ax-${i}`) * 440;
            const by = 200 + random(`ay-${i}`) * 420;
            const amp = 2 + calor * 16;
            const x = bx + Math.sin(frame * (0.6 + calor) + i * 2.3) * amp;
            const y = by + Math.cos(frame * (0.7 + calor) + i * 1.7) * amp;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={11} fill={FRIO} opacity={1 - calor} />
                <circle cx={x} cy={y} r={11 + calor * 3} fill={paleta.acento2} opacity={calor} />
              </g>
            );
          })}
        </g>
        {/* Termómetro que se llena. */}
        <g transform={`translate(905 0) scale(${entrada})`}>
          <rect x={-30} y={160} width={60} height={400} rx={30} fill="#0d1324" stroke="#cfd8ee" strokeWidth={6} />
          <rect x={-15} y={170 + (1 - nivel) * 380} width={30} height={380 * nivel + 20} rx={15} fill={paleta.acento2} />
          <circle cx={0} cy={600} r={48} fill={paleta.acento2} stroke="#cfd8ee" strokeWidth={6} />
          {[0.25, 0.5, 0.75].map((k) => (
            <line key={k} x1={30} x2={52} y1={170 + 380 * (1 - k)} y2={170 + 380 * (1 - k)} stroke="#cfd8ee" strokeWidth={5} strokeLinecap="round" />
          ))}
        </g>
        <Etiqueta x={280} y={640} texto={`${formatear(temperatura)} °C`} escala={aparecer(frame, t0 - 6, 10)} fondo={paleta.acento} color={OSCURO} tam={46} />
      </g>
    );
  }

  if (escena === 2) {
    // Comparación: Sol ~5500 °C contra rayo ~30 000 °C (unas 5 veces más).
    const enSol = cuando('superficie', 0.3);
    const enRayo = cuando('rayo', 2.6);
    const enCinco = cuando('cinco', 3.4);
    const largo = 680;
    const sol = avance(frame, enSol, 18) * (5500 / 30000) * largo;
    const rayo = avance(frame, enRayo - 2, 22) * largo;
    const marcas = aparecer(frame, enCinco - 2, 10);
    return (
      <g transform={`translate(540 380) scale(${entrada}) translate(-540 -380)`}>
        {/* Fila del Sol. */}
        <Sol x={140} y={230} r={52} frame={frame} />
        <rect x={230} y={196} width={largo} height={68} rx={34} fill="#ffffff" opacity={0.1} />
        <rect x={230} y={196} width={Math.max(68, sol)} height={68} rx={34} fill={paleta.acento2} opacity={sol > 1 ? 1 : 0} />
        <text x={230 + Math.max(68, sol) + 22} y={247} fontFamily={FUENTE} fontWeight={900} fontSize={46} fill="#ffffff" opacity={avance(frame, enSol + 6, 8)}>
          5500 °C
        </text>
        {/* Fila del rayo. */}
        <Rayo x={100} y={380} ancho={80} alto={150} frame={frame} paleta={paleta} />
        <rect x={230} y={420} width={largo} height={68} rx={34} fill="#ffffff" opacity={0.1} />
        <rect x={230} y={420} width={Math.max(68, rayo)} height={68} rx={34} fill={paleta.acento} opacity={rayo > 1 ? 1 : 0} />
        <text x={230 + largo} y={395} textAnchor="end" fontFamily={FUENTE} fontWeight={900} fontSize={46} fill="#ffffff" opacity={avance(frame, enRayo + 12, 8)}>
          30 000 °C
        </text>
        {/* Marcas: cuántos "soles" caben en el rayo. */}
        <g opacity={marcas}>
          {[1, 2, 3, 4, 5].map((k) => (
            <line
              key={k}
              x1={230 + k * (5500 / 30000) * largo}
              x2={230 + k * (5500 / 30000) * largo}
              y1={412}
              y2={496}
              stroke={OSCURO}
              strokeWidth={6}
              strokeDasharray="10 8"
            />
          ))}
        </g>
        <Etiqueta x={540} y={610} texto="×5" escala={marcas} fondo={paleta.acento} color={OSCURO} tam={72} />
      </g>
    );
  }

  // Escena 3: el aire se expande de golpe y eso es el trueno.
  const enExpande = cuando('expande', 0.8);
  const enTrueno = cuando('trueno', 2.2);
  const enQuieres = cuando('quieres', 3.6);
  return (
    <g>
      <Fogonazo frame={frame} />
      {/* Ondas de choque que salen del rayo. */}
      {new Array(8).fill(0).map((_, k) => {
        const f = frame - (enExpande - 4) - k * 9;
        if (f < 0) return null;
        const r = interpolate(f, [0, 42], [30, 560], fijar);
        const o = interpolate(f, [0, 42], [0.85, 0], fijar);
        return <circle key={k} cx={480} cy={420} r={r} fill="none" stroke={paleta.acento} strokeWidth={interpolate(f, [0, 42], [12, 3], fijar)} opacity={o} />;
      })}
      <g transform={`translate(480 400) scale(${entrada}) translate(-480 -400)`}>
        <Nube x={480} y={140} s={0.85} />
        <Rayo x={395} y={182} ancho={200} alto={440} frame={frame} paleta={paleta} />
      </g>
      <Etiqueta x={830} y={250} texto="¡BUM!" escala={aparecer(frame, enTrueno - 2, 10)} fondo={paleta.acento} color={OSCURO} tam={62} />
      <Etiqueta x={830} y={560} texto="#5 ?" escala={aparecer(frame, enQuieres - 2, 10)} fondo="#ffffff" color={OSCURO} tam={60} />
    </g>
  );
};
