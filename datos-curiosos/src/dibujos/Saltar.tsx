import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { Etiqueta, PropsDibujo, aparecer, avance } from './comun';
import { FUENTE } from '../plantilla/fuente';
import type { Paleta } from '../plantilla/tipos';

const PERIODO_SALTO = 26; // cuadros por salto (todos a la vez)

/** Altura (0..1) y aplastado del salto en este cuadro. Todos saltan sincronizados. */
const salto = (frame: number) => {
  const fase = (frame % PERIODO_SALTO) / PERIODO_SALTO;
  const alto = Math.sin(fase * Math.PI);
  const aplasta = interpolate(fase, [0, 0.12, 0.88, 1], [0.72, 1, 1, 0.72]);
  return { alto, aplasta, fase };
};

const formatear = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const CONTINENTES = [
  'M 0.2 0.5 C 0.4 0.3 0.7 0.35 0.8 0.55 C 0.9 0.8 0.7 0.95 0.55 1.1 C 0.45 1.3 0.3 1.2 0.25 1 C 0.15 0.85 0.05 0.7 0.2 0.5 Z',
  'M 1.1 0.3 C 1.35 0.2 1.6 0.35 1.7 0.5 C 1.8 0.7 1.6 0.8 1.45 0.85 C 1.3 0.9 1.2 0.75 1.1 0.65 C 1 0.5 0.95 0.4 1.1 0.3 Z',
  'M 1.2 1.1 C 1.4 1 1.6 1.1 1.65 1.3 C 1.7 1.5 1.55 1.7 1.4 1.75 C 1.25 1.8 1.15 1.6 1.12 1.45 C 1.1 1.3 1.05 1.2 1.2 1.1 Z',
  'M 0.5 1.45 C 0.65 1.4 0.8 1.5 0.78 1.65 C 0.75 1.8 0.6 1.85 0.5 1.75 C 0.42 1.65 0.4 1.5 0.5 1.45 Z',
];

const Tierra: React.FC<{ cx: number; cy: number; r: number; frame: number; id: string }> = ({
  cx,
  cy,
  r,
  frame,
  id,
}) => {
  const desplazamiento = (frame * 1.2) % (2 * r);
  return (
    <g>
      <defs>
        <clipPath id={`recorte-${id}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id={`oceano-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#8f7dff" />
          <stop offset="1" stopColor="#3b2aa8" />
        </radialGradient>
        <radialGradient id={`sombra-${id}`} cx="0.3" cy="0.25" r="0.9">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 18} fill="none" stroke="#ffffff" strokeWidth={14} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#oceano-${id})`} />
      <g clipPath={`url(#recorte-${id})`}>
        {[0, -2 * r].map((extra) => (
          <g key={extra} transform={`translate(${cx - r + desplazamiento + extra} ${cy - r}) scale(${r})`}>
            {CONTINENTES.map((d, i) => (
              <path key={i} d={d} fill={i % 2 === 0 ? '#ff9f43' : '#ffb870'} />
            ))}
          </g>
        ))}
        <circle cx={cx} cy={cy} r={r} fill={`url(#sombra-${id})`} />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16052b" strokeWidth={7} />
    </g>
  );
};

/** Personitas (puntos) paradas sobre la parte de arriba de la Tierra, saltando juntas. */
const GenteEnLaTierra: React.FC<{ cx: number; cy: number; r: number; frame: number; paleta: Paleta }> = ({
  cx,
  cy,
  r,
  frame,
  paleta,
}) => {
  const { alto, aplasta } = salto(frame);
  return (
    <g>
      {new Array(13).fill(0).map((_, i) => {
        const angulo = ((-60 + i * 10) * Math.PI) / 180;
        const radio = r + 16 + alto * 46;
        const x = cx + Math.sin(angulo) * radio;
        const y = cy - Math.cos(angulo) * radio;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={15 / Math.sqrt(aplasta)}
            ry={15 * aplasta}
            transform={`rotate(${(angulo * 180) / Math.PI} ${x} ${y})`}
            fill={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? paleta.acento : paleta.acento2}
            stroke="#16052b"
            strokeWidth={4}
          />
        );
      })}
    </g>
  );
};

/** Fila de puntitos que saltan arriba durante todo el video. */
export const PuntitosArriba: React.FC<{ paleta: Paleta }> = ({ paleta }) => {
  const frame = useCurrentFrame();
  const { alto, aplasta } = salto(frame);
  const piso = 112;
  return (
    <g>
      <line x1={90} x2={990} y1={piso + 17} y2={piso + 17} stroke="#ffffff" strokeWidth={4} opacity={0.25} strokeLinecap="round" />
      {new Array(15).fill(0).map((_, i) => {
        const x = 120 + i * 60;
        const y = piso - alto * 44 + (1 - aplasta) * 8;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={15 / Math.sqrt(aplasta)}
            ry={15 * aplasta}
            fill={i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? paleta.acento : paleta.acento2}
            stroke="#16052b"
            strokeWidth={4}
          />
        );
      })}
    </g>
  );
};

export const Saltar: React.FC<PropsDibujo> = ({ escena, duracion, paleta, cuando }) => {
  const frame = useCurrentFrame();
  const entrada = aparecer(frame, escena === 0 ? -5 : 0, 12);

  if (escena === 0) {
    // Gancho: la Tierra con gente encima y el contador hasta 8 mil millones.
    const cuenta = interpolate(frame, [2, 40], [0, 8e9], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    return (
      <g>
        <g transform={`translate(540 500) scale(${entrada}) translate(-540 -500)`}>
          <Tierra cx={540} cy={500} r={195} frame={frame} id="t0" />
          <GenteEnLaTierra cx={540} cy={500} r={195} frame={frame} paleta={paleta} />
        </g>
        <Etiqueta x={540} y={215} texto={formatear(cuenta)} escala={aparecer(frame, 0, 8)} fondo={paleta.acento} color="#16052b" tam={58} />
      </g>
    );
  }

  if (escena === 1) {
    // Balanza: nosotros (casi nada) contra la Tierra.
    const giro = interpolate(frame, [10, 34], [0, 16], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(2.2)),
    });
    const rad = (giro * Math.PI) / 180;
    const pivote = { x: 540, y: 300 };
    const brazo = 285;
    const izq = { x: pivote.x - brazo * Math.cos(rad), y: pivote.y - brazo * Math.sin(rad) };
    const der = { x: pivote.x + brazo * Math.cos(rad), y: pivote.y + brazo * Math.sin(rad) };
    const colgado = 150;
    const plato = (p: { x: number; y: number }) => (
      <g>
        <line x1={p.x} y1={p.y} x2={p.x - 95} y2={p.y + colgado} stroke="#ffffff" strokeWidth={5} />
        <line x1={p.x} y1={p.y} x2={p.x + 95} y2={p.y + colgado} stroke="#ffffff" strokeWidth={5} />
        <path d={`M ${p.x - 120} ${p.y + colgado} Q ${p.x} ${p.y + colgado + 60} ${p.x + 120} ${p.y + colgado} Z`} fill={paleta.acento} stroke="#16052b" strokeWidth={6} />
      </g>
    );
    return (
      <g transform={`translate(540 430) scale(${entrada}) translate(-540 -430)`}>
        <rect x={528} y={300} width={24} height={385} rx={8} fill="#ffffff" opacity={0.9} />
        <path d="M 420 710 L 660 710 L 610 675 L 470 675 Z" fill="#ffffff" opacity={0.9} />
        <line x1={izq.x} y1={izq.y} x2={der.x} y2={der.y} stroke="#ffffff" strokeWidth={16} strokeLinecap="round" />
        <circle cx={pivote.x} cy={pivote.y} r={20} fill={paleta.acento2} stroke="#16052b" strokeWidth={5} />
        {plato(izq)}
        {plato(der)}
        {/* Toda la humanidad: un montoncito de puntos. */}
        {[[-12, 0], [0, 0], [12, 0], [-6, -11], [6, -11], [0, -22]].map(([dx, dy], i) => (
          <circle key={i} cx={izq.x + dx} cy={izq.y + colgado - 8 + dy} r={7} fill="#ffffff" stroke="#16052b" strokeWidth={2} />
        ))}
        <Tierra cx={der.x} cy={der.y + colgado - 88} r={88} frame={frame} id="t1" />
        <text x={izq.x} y={izq.y + colgado + 95} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={40} fill="#ffffff">
          NOSOTROS
        </text>
        <text x={der.x} y={der.y + colgado + 95} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={40} fill="#ffffff">
          LA TIERRA
        </text>
      </g>
    );
  }

  if (escena === 2) {
    // Casi nada se mueve: solo un temblorcito en el sismógrafo.
    const { fase } = salto(frame);
    const aterrizaje = fase < 0.1 ? 1 : 0;
    const temblor = aterrizaje * Math.sin(frame * 3) * 2;
    const enNotar = cuando('notar', 2.2);
    const dura = duracion;
    const avanceLinea = interpolate(frame, [0, dura], [0, 1], { extrapolateRight: 'clamp' });
    const puntos: string[] = [];
    for (let x = 170; x <= 170 + 740 * avanceLinea; x += 5) {
      const f = ((x - 170) / 740) * dura;
      const desde = f % PERIODO_SALTO;
      const onda = Math.sin(desde * 1.9) * Math.exp(-desde * 0.32) * 20;
      puntos.push(`${x} ${622 + onda + Math.sin(x * 0.7) * 1.5}`);
    }
    const cabeza = puntos[puntos.length - 1]?.split(' ').map(Number) ?? [170, 622];
    return (
      <g>
        <g transform={`translate(0 ${temblor}) translate(540 405) scale(${entrada}) translate(-540 -405)`}>
          <Tierra cx={540} cy={405} r={142} frame={frame} id="t2" />
          <GenteEnLaTierra cx={540} cy={405} r={142} frame={frame} paleta={paleta} />
        </g>
        <g opacity={aparecer(frame, 6, 10)}>
          <rect x={140} y={577} width={800} height={92} rx={24} fill="#16052b" stroke={paleta.acento2} strokeWidth={5} opacity={0.95} />
          <line x1={170} x2={910} y1={622} y2={622} stroke="#ffffff" strokeWidth={2} opacity={0.25} />
          <polyline points={puntos.join(' ')} fill="none" stroke={paleta.acento} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={cabeza[0]} cy={cabeza[1]} r={10} fill={paleta.acento2} />
        </g>
        <Etiqueta x={540} y={168} texto="SE MUEVE MENOS QUE UN ÁTOMO" escala={aparecer(frame, enNotar - 2, 10)} fondo={paleta.acento2} color="#16052b" tam={38} />
      </g>
    );
  }

  // Escena 3: haría falta pesar billones de veces más.
  const crece = avance(frame, 8, 100);
  const radioNosotros = interpolate(crece, [0, 1], [8, 170]);
  const veces = Math.pow(10, 13 * crece);
  const enQue = cuando('qué', 3.4);
  return (
    <g>
      <g transform={`translate(540 420) scale(${entrada}) translate(-540 -420)`}>
        <Tierra cx={790} cy={420} r={170} frame={frame} id="t3" />
        <circle cx={290} cy={420} r={radioNosotros} fill={paleta.acento} stroke="#16052b" strokeWidth={6} />
        {radioNosotros > 40
          ? new Array(9).fill(0).map((_, i) => (
              <circle
                key={i}
                cx={290 + Math.cos(i * 0.7 + frame * 0.03) * radioNosotros * 0.55 * ((i % 3) / 2 + 0.2)}
                cy={420 + Math.sin(i * 0.7 + frame * 0.03) * radioNosotros * 0.55 * ((i % 3) / 2 + 0.2)}
                r={radioNosotros * 0.09}
                fill="#ffffff"
                opacity={0.85}
              />
            ))
          : null}
      </g>
      <Etiqueta x={540} y={680} texto={`× ${formatear(veces)}`} escala={aparecer(frame, 6, 10)} fondo={paleta.acento} color="#16052b" tam={56} />
      <Etiqueta x={790} y={205} texto="#3 ?" escala={aparecer(frame, enQue - 2, 10)} fondo="#ffffff" color="#16052b" tam={60} />
    </g>
  );
};
