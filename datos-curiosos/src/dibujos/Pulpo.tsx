import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { Corazon, Etiqueta, Flecha, PropsDibujo, aparecer, avance, latido, mezclar } from './comun';
import { FUENTE } from '../plantilla/fuente';

const CORAL = '#ff7a90';
const CORAL_OSCURO = '#d94d6c';
const CORAL_CLARO = '#ffb3c0';
const AZUL_SANGRE = '#2f86ff';

// Postura de los tentáculos: abiertos flotando, juntos nadando o apoyados caminando.
type Postura = { abertura: number; rizo: number; amp: number; vel: number; paso: number };
const FLOTAR: Postura = { abertura: 1.15, rizo: 1.0, amp: 0.32, vel: 0.09, paso: 0 };
const NADAR: Postura = { abertura: 0.2, rizo: 0.1, amp: 0.25, vel: 0.34, paso: 0 };
const CAMINAR: Postura = { abertura: 0.95, rizo: -0.75, amp: 0.1, vel: 0.22, paso: 1 };

const mezclarPostura = (a: Postura, b: Postura, k: number): Postura => ({
  abertura: mezclar(a.abertura, b.abertura, k),
  rizo: mezclar(a.rizo, b.rizo, k),
  amp: mezclar(a.amp, b.amp, k),
  vel: mezclar(a.vel, b.vel, k),
  paso: mezclar(a.paso, b.paso, k),
});

// Un tentáculo es un polígono que se adelgaza hacia la punta. Se construye
// avanzando paso a paso y girando un poco en cada paso (por eso se curva).
const tentaculo = (k: number, frame: number, p: Postura) => {
  const N = 18;
  const largo = 300;
  const grosor = 46;
  const lado = k < 4 ? -1 : 1;
  const base = { x: (k - 3.5) * 34, y: 14 };
  const anguloBase = Math.PI / 2 + ((3.5 - k) / 3.5) * p.abertura;
  const fase = frame * p.vel + k * 0.85;
  const pisada = p.paso * Math.max(0, Math.sin(frame * 0.22 + k * Math.PI)) * 0.5;

  const puntos: { x: number; y: number; a: number; w: number }[] = [];
  let x = base.x;
  let y = base.y;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const a =
      anguloBase +
      -lado * p.rizo * s * s * 1.6 +
      Math.sin(fase + s * 4) * p.amp * s -
      lado * pisada * s;
    puntos.push({ x, y, a, w: grosor * (1 - 0.86 * s) });
    x += Math.cos(a) * (largo / N);
    y += Math.sin(a) * (largo / N);
  }
  const izq = puntos.map((q) => `${q.x - Math.sin(q.a) * q.w * 0.5} ${q.y + Math.cos(q.a) * q.w * 0.5}`);
  const der = puntos.map((q) => `${q.x + Math.sin(q.a) * q.w * 0.5} ${q.y - Math.cos(q.a) * q.w * 0.5}`);
  const d = `M ${izq.join(' L ')} L ${der.reverse().join(' L ')} Z`;
  const ventosas = [0.3, 0.45, 0.6, 0.75].map((s) => {
    const q = puntos[Math.round(s * N)];
    return {
      x: q.x + Math.sin(q.a) * q.w * 0.18 * lado,
      y: q.y - Math.cos(q.a) * q.w * 0.18 * lado,
      r: q.w * 0.2,
    };
  });
  return { d, ventosas };
};

const Cuerpo: React.FC<{
  frame: number;
  postura: Postura;
  latidoPrincipal: number;
  latidoBranquial: number;
  brilloPrincipal?: number;
  brilloBranquial?: number;
  branquias?: number;
  corazonesVisibles?: number[];
  principalDetenido?: number;
}> = ({
  frame,
  postura,
  latidoPrincipal,
  latidoBranquial,
  brilloPrincipal = 1,
  brilloBranquial = 1,
  branquias = 0,
  corazonesVisibles = [1, 1, 1],
  principalDetenido = 0,
}) => {
  const respira = 1 + Math.sin(frame * 0.12) * 0.025;
  const colorPrincipal = principalDetenido > 0.5 ? '#7d8aa6' : AZUL_SANGRE;
  return (
    <g>
      {new Array(8).fill(0).map((_, k) => {
        const t = tentaculo(k, frame, postura);
        return (
          <g key={k}>
            <path d={t.d} fill={k % 2 === 0 ? CORAL : CORAL_OSCURO} stroke="#7a1f3a" strokeWidth={4} strokeLinejoin="round" />
            {t.ventosas.map((v, i) => (
              <circle key={i} cx={v.x} cy={v.y} r={v.r} fill={CORAL_CLARO} opacity={0.9} />
            ))}
          </g>
        );
      })}
      <g transform={`scale(${1 / respira} ${respira})`}>
        <path
          d="M -150 18 C -178 -120 -132 -332 0 -332 C 132 -332 178 -120 150 18 C 100 48 -100 48 -150 18 Z"
          fill={CORAL}
          stroke="#7a1f3a"
          strokeWidth={6}
        />
        <ellipse cx={-55} cy={-250} rx={34} ry={22} fill="#ffffff" opacity={0.35} />
        <circle cx={70} cy={-230} r={14} fill={CORAL_OSCURO} opacity={0.6} />
        <circle cx={-90} cy={-170} r={10} fill={CORAL_OSCURO} opacity={0.6} />
        {/* Branquias (solo en el diagrama). */}
        {[-1, 1].map((lado) => (
          <g key={lado} transform={`translate(${lado * 112} -150) rotate(${lado * 14})`} opacity={branquias}>
            <ellipse rx={30} ry={66} fill="#ffd6de" stroke="#7a1f3a" strokeWidth={4} />
            {[-40, -20, 0, 20, 40].map((yy) => (
              <line key={yy} x1={-22} x2={22} y1={yy} y2={yy - 6} stroke={CORAL_OSCURO} strokeWidth={5} strokeLinecap="round" />
            ))}
          </g>
        ))}
        {/* Los 3 corazones. */}
        <Corazon x={-80} y={-118} tam={58} color={AZUL_SANGRE} borde="#0b1d4d" escala={latidoBranquial * corazonesVisibles[0]} opacidad={brilloBranquial} />
        <Corazon x={80} y={-118} tam={58} color={AZUL_SANGRE} borde="#0b1d4d" escala={latidoBranquial * corazonesVisibles[1]} opacidad={brilloBranquial} />
        <Corazon x={0} y={-200} tam={96} color={colorPrincipal} borde="#0b1d4d" escala={latidoPrincipal * corazonesVisibles[2]} opacidad={brilloPrincipal} />
        {/* Ojos con pupila horizontal, como los de un pulpo real. */}
        {[-62, 62].map((ox) => (
          <g key={ox} transform={`translate(${ox} -34)`}>
            <circle r={32} fill="#ffffff" stroke="#7a1f3a" strokeWidth={5} />
            <ellipse cx={0} cy={2 + Math.sin(frame * 0.05) * 3} rx={19} ry={13} fill="#14102a" />
            <circle cx={-7} cy={-3 + Math.sin(frame * 0.05) * 3} r={5} fill="#ffffff" />
          </g>
        ))}
      </g>
    </g>
  );
};

export const Pulpo: React.FC<PropsDibujo> = ({ escena, paleta, cuando }) => {
  const frame = useCurrentFrame();
  const entrada = aparecer(frame, escena === 0 ? -5 : 0, 12);

  if (escena === 0) {
    // Gancho: el pulpo entra y aparecen sus 3 corazones, uno por uno.
    const c1 = aparecer(frame, 8, 8);
    const c2 = aparecer(frame, 14, 8);
    const c3 = aparecer(frame, 20, 8);
    return (
      <g>
        <g transform={`translate(540 ${interpolate(entrada, [0, 1], [720, 510])}) scale(${1.0 * entrada})`}>
          <Cuerpo frame={frame} postura={FLOTAR} latidoPrincipal={latido(frame)} latidoBranquial={latido(frame + 4)} corazonesVisibles={[c1, c2, c3]} />
        </g>
        <Etiqueta x={230} y={190} texto="x3" escala={aparecer(frame, 26, 10)} fondo={paleta.resaltado} color="#020818" tam={70} />
      </g>
    );
  }

  if (escena === 1) {
    // Diagrama: 2 corazones -> branquias; luego el tercero -> cuerpo.
    const segunda = cuando('tercero', 3.2);
    const etapa = avance(frame, segunda - 4, 10);
    const zoom = interpolate(entrada, [0, 1], [0.9, 1.22]);
    return (
      <g>
        <g transform={`translate(540 545) scale(${zoom})`}>
          <Cuerpo
            frame={frame}
            postura={FLOTAR}
            latidoPrincipal={latido(frame, 0.32, mezclar(0.03, 0.16, etapa))}
            latidoBranquial={latido(frame, 0.32, mezclar(0.18, 0.04, etapa))}
            brilloPrincipal={mezclar(0.45, 1, etapa)}
            brilloBranquial={mezclar(1, 0.45, etapa)}
            branquias={aparecer(frame, 6, 10)}
          />
          <Flecha idPunta="p-b1" d="M -96 -112 C -130 -112 -140 -130 -128 -165" color={paleta.resaltado} frame={frame} grosor={9} opacidad={1 - etapa} />
          <Flecha idPunta="p-b2" d="M 96 -112 C 130 -112 140 -130 128 -165" color={paleta.resaltado} frame={frame} grosor={9} opacidad={1 - etapa} />
          <Flecha idPunta="p-c1" d="M -30 -170 C -90 -60 -150 20 -200 120" color={paleta.resaltado} frame={frame} opacidad={etapa} />
          <Flecha idPunta="p-c2" d="M 0 -150 C 0 -60 0 40 0 160" color={paleta.resaltado} frame={frame} opacidad={etapa} />
          <Flecha idPunta="p-c3" d="M 30 -170 C 90 -60 150 20 200 120" color={paleta.resaltado} frame={frame} opacidad={etapa} />
        </g>
        <Etiqueta
          x={540}
          y={70}
          texto={etapa < 0.5 ? 'x2' : 'x1'}
          flecha
          despues={etapa < 0.5 ? 'BRANQUIAS' : 'CUERPO'}
          escala={aparecer(frame, 10, 10) * (etapa < 0.5 ? 1 : aparecer(frame, segunda - 4, 10))}
          fondo={paleta.acento}
          color="#020818"
          tam={48}
        />
      </g>
    );
  }

  if (escena === 2) {
    // Sangre azul: gota grande, cobre (Cu) sí, hierro (Fe) no.
    const enCobre = cuando('cobre', 3.2);
    const enHierro = cuando('hierro', 5);
    const tambaleo = Math.sin(frame * 0.15) * 4;
    const cu = aparecer(frame, enCobre - 3, 10);
    const fe = aparecer(frame, enHierro - 3, 10);
    const tachado = avance(frame, enHierro + 4, 8);
    const giro = frame * 3;
    return (
      <g>
        <g transform={`translate(330 ${410 + tambaleo}) scale(${230 * entrada})`}>
          <defs>
            <linearGradient id="gota" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7cc4ff" />
              <stop offset="1" stopColor="#1546c9" />
            </linearGradient>
          </defs>
          <path d="M 0 -1 C 0.35 -0.45 0.72 -0.1 0.72 0.32 C 0.72 0.72 0.4 1 0 1 C -0.4 1 -0.72 0.72 -0.72 0.32 C -0.72 -0.1 -0.35 -0.45 0 -1 Z" fill="url(#gota)" stroke="#020818" strokeWidth={0.04} />
          <ellipse cx={-0.3} cy={0.1} rx={0.12} ry={0.24} fill="#ffffff" opacity={0.5} transform="rotate(20)" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={Math.sin(frame * 0.07 + i * 1.6) * 0.38} cy={0.35 + Math.cos(frame * 0.05 + i * 2) * 0.3} r={0.07} fill="#d9874a" opacity={cu} />
          ))}
        </g>
        <g transform={`translate(790 230) scale(${cu})`}>
          <ellipse rx={120} ry={44} fill="none" stroke={paleta.acento} strokeWidth={5} transform={`rotate(${giro})`} />
          <ellipse rx={120} ry={44} fill="none" stroke={paleta.acento} strokeWidth={5} transform={`rotate(${giro + 90})`} />
          <circle r={84} fill="#d9874a" stroke="#020818" strokeWidth={7} />
          <text y={30} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={84} fill="#2a1406">
            Cu
          </text>
          <circle cx={120 * Math.cos((giro * Math.PI) / 180)} cy={120 * Math.sin((giro * Math.PI) / 180) * 0.37} r={13} fill={paleta.resaltado} />
        </g>
        <g transform={`translate(790 560) scale(${fe * 0.85})`}>
          <circle r={84} fill="#a8443b" stroke="#020818" strokeWidth={7} opacity={mezclar(1, 0.6, tachado)} />
          <text y={30} textAnchor="middle" fontFamily={FUENTE} fontWeight={900} fontSize={84} fill="#ffffff" opacity={mezclar(1, 0.6, tachado)}>
            Fe
          </text>
          <line x1={-95} y1={-95} x2={-95 + 190 * tachado} y2={-95 + 190 * tachado} stroke="#ff4d6d" strokeWidth={22} strokeLinecap="round" />
          <line x1={95} y1={-95} x2={95 - 190 * tachado} y2={-95 + 190 * tachado} stroke="#ff4d6d" strokeWidth={22} strokeLinecap="round" />
        </g>
        <Flecha idPunta="p-cu" d="M 680 300 C 600 330 560 360 520 400" color={paleta.resaltado} frame={frame} opacidad={cu} />
      </g>
    );
  }

  // Escena 3: nada (corazón detenido) y luego camina.
  const enCaminar = cuando('caminar', 2.4);
  const enSigue = cuando('sigue', 3.6);
  const camina = avance(frame, enCaminar - 4, 10);
  const postura = mezclarPostura(NADAR, CAMINAR, camina);
  const xNado = 540 + Math.sin(frame * 0.18) * 30;
  const yNado = interpolate(frame, [0, enCaminar], [540, 400], { extrapolateRight: 'clamp' });
  const xPaso = interpolate(frame, [enCaminar, enCaminar + 90], [440, 620], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = mezclar(xNado, xPaso, camina);
  const y = mezclar(yNado, 410 + Math.abs(Math.sin(frame * 0.22)) * -10, camina);
  const giroNado = Math.sin(frame * 0.18) * 6 * (1 - camina);
  const piso = aparecer(frame, enCaminar - 6, 10);
  const sigue = aparecer(frame, enSigue - 2, 10);
  return (
    <g>
      {/* Burbujas del chorro al nadar. */}
      {new Array(7).fill(0).map((_, i) => {
        const ciclo = ((frame * 4 + i * 37) % 220) / 220;
        return (
          <circle key={i} cx={x + Math.sin(i * 2.1) * 50} cy={y + 340 - ciclo * 120 + 120} r={10 + i * 2} fill="none" stroke={paleta.acento} strokeWidth={4} opacity={(1 - ciclo) * (1 - camina)} />
        );
      })}
      {/* Piso marino. */}
      <g opacity={piso}>
        <path d="M 0 640 C 200 620 400 655 600 635 C 800 618 950 645 1080 630 L 1080 780 L 0 780 Z" fill="#e9c98a" opacity={0.9} />
        <circle cx={180} cy={640} r={20} fill="#b9975c" />
        <circle cx={880} cy={634} r={28} fill="#b9975c" />
      </g>
      <g transform={`translate(${x} ${y}) rotate(${giroNado}) scale(${0.72 * entrada})`}>
        <Cuerpo frame={frame} postura={postura} latidoPrincipal={camina > 0.5 ? latido(frame) : 1} latidoBranquial={latido(frame + 4)} principalDetenido={1 - camina} />
      </g>
      {/* Monitor del corazón principal: línea plana y pausa al nadar. */}
      <g transform={`translate(800 140) scale(${0.82 * aparecer(frame, 4, 10)})`}>
        <rect x={-150} y={-62} width={300} height={124} rx={28} fill="#06122e" stroke={camina > 0.5 ? paleta.acento : '#ff4d6d'} strokeWidth={6} />
        {camina > 0.5 ? (
          <path
            d="M -130 0 L -60 0 L -40 -36 L -20 36 L 0 0 L 130 0"
            fill="none"
            stroke={paleta.acento}
            strokeWidth={7}
            strokeLinejoin="round"
            strokeDasharray="300 300"
            strokeDashoffset={300 - ((frame * 12) % 600)}
          />
        ) : (
          <g>
            <path d="M -130 0 L 40 0" fill="none" stroke="#ff4d6d" strokeWidth={7} strokeLinecap="round" />
            {/* Símbolo de pausa: el corazón principal se detiene. */}
            <rect x={66} y={-26} width={18} height={52} rx={5} fill="#ff4d6d" />
            <rect x={96} y={-26} width={18} height={52} rx={5} fill="#ff4d6d" />
          </g>
        )}
      </g>
      <Etiqueta x={250} y={140} texto="#2" flecha escala={sigue} fondo={paleta.resaltado} color="#020818" tam={60} />
    </g>
  );
};
