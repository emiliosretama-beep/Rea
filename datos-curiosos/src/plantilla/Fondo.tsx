import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion';
import type { Paleta, Tema } from './tipos';

// Fondo animado hecho solo con formas: degradado que gira, manchas de luz
// que flotan y partículas según el tema (burbujas, estrellas o gotas de tinta).

const Manchas: React.FC<{ paleta: Paleta }> = ({ paleta }) => {
  const frame = useCurrentFrame();
  const manchas = [
    { x: 200, y: 420, r: 520, c: paleta.fondoC, vel: 0.021, fase: 0 },
    { x: 900, y: 1100, r: 620, c: paleta.acento, vel: 0.017, fase: 2 },
    { x: 300, y: 1650, r: 560, c: paleta.fondoC, vel: 0.013, fase: 4 },
  ];
  return (
    <>
      {manchas.map((m, i) => {
        const x = m.x + Math.sin(frame * m.vel + m.fase) * 120;
        const y = m.y + Math.cos(frame * m.vel * 0.8 + m.fase) * 90;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - m.r,
              top: y - m.r,
              width: m.r * 2,
              height: m.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${m.c} 0%, transparent 68%)`,
              opacity: i === 1 ? 0.22 : 0.55,
            }}
          />
        );
      })}
    </>
  );
};

const Particulas: React.FC<{ tema: Tema; paleta: Paleta }> = ({ tema, paleta }) => {
  const frame = useCurrentFrame();
  const total = tema === 'saltar' ? 46 : 34;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      {new Array(total).fill(0).map((_, i) => {
        const rx = random(`x-${tema}-${i}`);
        const ry = random(`y-${tema}-${i}`);
        const rv = random(`v-${tema}-${i}`);
        const tam = 4 + random(`t-${tema}-${i}`) * 14;
        if (tema === 'pulpo') {
          // Burbujas que suben y se mecen.
          const vel = 1.2 + rv * 2.6;
          const y = 1980 - ((ry * 1980 + frame * vel) % 2060);
          const x = rx * 1080 + Math.sin(frame * 0.05 + i) * 18;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={tam}
              fill="none"
              stroke={paleta.acento}
              strokeWidth={2.5}
              opacity={0.35}
            />
          );
        }
        if (tema === 'saltar') {
          // Estrellas que titilan.
          const brillo = interpolate(Math.sin(frame * (0.08 + rv * 0.12) + i * 1.7), [-1, 1], [0.1, 0.85]);
          return (
            <circle
              key={i}
              cx={rx * 1080}
              cy={ry * 1920}
              r={tam * 0.32}
              fill={i % 3 === 0 ? paleta.acento2 : '#ffffff'}
              opacity={brillo}
            />
          );
        }
        // Bolígrafo: gotitas de tinta que bajan en diagonal.
        const vel = 0.8 + rv * 1.6;
        const y = ((ry * 1980 + frame * vel) % 2060) - 70;
        const x = ((rx * 1180 + frame * vel * 0.45) % 1180) - 50;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={tam * 0.55}
            fill={i % 2 === 0 ? paleta.acento : paleta.acento2}
            opacity={0.22}
          />
        );
      })}
    </svg>
  );
};

export const Fondo: React.FC<{ paleta: Paleta; tema: Tema }> = ({ paleta, tema }) => {
  const frame = useCurrentFrame();
  const angulo = 160 + Math.sin(frame * 0.01) * 25;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angulo}deg, ${paleta.fondoA} 0%, ${paleta.fondoB} 55%, ${paleta.fondoC} 100%)`,
      }}
    >
      <Manchas paleta={paleta} />
      <Particulas tema={tema} paleta={paleta} />
      {/* Viñeta: oscurece los bordes para que el centro resalte. */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
