import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random, Easing} from 'remotion';
import {Cantante} from './Character';

// Cámara que siempre empuja hacia adelante (estilo explicativo 3D) con "punch-in" al entrar.
export const Camara: React.FC<{dur: number; children: React.ReactNode; origen?: string}> = ({dur, children, origen = '50% 50%'}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 10, dur], [1.32, 1.04, 1.16], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{scale: String(s), transformOrigin: origen}}>{children}</AbsoluteFill>;
};

const Cielo: React.FC<{arriba: string; abajo: string}> = ({arriba, abajo}) => (
  <AbsoluteFill style={{background: `linear-gradient(${arriba}, ${abajo})`}} />
);

const Nube: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <svg viewBox="0 0 200 90" style={{position: 'absolute', left: x, top: y, width: 200 * s}}>
    <g fill="rgba(255,255,255,0.92)">
      <ellipse cx="60" cy="60" rx="55" ry="28" /><ellipse cx="110" cy="45" rx="50" ry="38" /><ellipse cx="150" cy="62" rx="45" ry="24" />
    </g>
  </svg>
);

// Fachada del Coliseo estilizada
const ColiseoFachada: React.FC<{style?: React.CSSProperties}> = ({style}) => {
  const fila = (y: number, h: number, n: number, ancho: number, x0: number) =>
    Array.from({length: n}).map((_, i) => {
      const w = ancho / n;
      return <path key={`${y}-${i}`} d={`M${x0 + i * w + w * 0.18} ${y + h} v-${h * 0.6} a${w * 0.32} ${w * 0.32} 0 0 1 ${w * 0.64} 0 v${h * 0.6} z`} fill="#6b3f22" />;
    });
  return (
    <svg viewBox="0 0 1000 560" style={style}>
      <path d="M40 560 L60 120 Q500 60 940 120 L960 560 Z" fill="#e0a868" />
      <path d="M700 108 Q820 112 940 120 L948 300 L880 260 L840 200 L760 170 Z" fill="#cf9455" />
      <path d="M60 120 Q500 60 760 100 L700 60 Q400 30 62 90 Z" fill="#c98b4c" />
      {fila(150, 110, 12, 880, 60)}
      {fila(280, 120, 12, 890, 55)}
      {fila(420, 130, 12, 900, 50)}
      <rect x="40" y="265" width="920" height="12" fill="#c98b4c" />
      <rect x="40" y="400" width="920" height="12" fill="#c98b4c" />
    </svg>
  );
};

const Avion: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <svg viewBox="0 0 420 160" style={style}>
    <path d="M20 90 Q40 60 120 62 L360 62 Q410 66 412 90 Q410 112 360 116 L120 116 Q40 116 20 90 Z" fill="#f4f4f4" />
    <path d="M200 62 L260 0 L290 0 L260 62 Z M200 116 L260 160 L290 160 L260 116 Z" fill="#f04e23" />
    <path d="M340 62 L380 18 L400 18 L392 66 Z" fill="#f04e23" />
    <circle cx="80" cy="84" r="20" fill="#9fd3ff" stroke="#2c3e66" strokeWidth="5" />
    {/* el cantante en la ventana */}
    <circle cx="80" cy="90" r="11" fill="#c98a5a" />
    <ellipse cx="80" cy="78" rx="18" ry="5" fill="#d9b26f" /><rect x="72" y="66" width="16" height="12" rx="4" fill="#e6c27e" />
    {[140, 180, 220, 300].map((x) => <circle key={x} cx={x} cy="84" r="9" fill="#9fd3ff" />)}
  </svg>
);

export const EscenaGancho: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const avionX = interpolate(f, [0, dur], [1150, -150]);
  const avionY = interpolate(f, [0, dur], [380, 720]);
  const coliseoY = interpolate(f, [0, dur], [1250, 980]);
  const coliseoS = interpolate(f, [0, dur], [0.9, 1.25]);
  return (
    <Camara dur={dur}>
      <Cielo arriba="#ffb36b" abajo="#ffe6b8" />
      <div style={{position: 'absolute', left: 640, top: 300, width: 260, height: 260, borderRadius: '50%', background: '#fff3c4', boxShadow: '0 0 160px 60px rgba(255,220,140,0.8)'}} />
      <Nube x={interpolate(f, [0, dur], [-100, 40])} y={250} s={1.6} />
      <Nube x={interpolate(f, [0, dur], [700, 820])} y={560} s={1.2} />
      <ColiseoFachada style={{position: 'absolute', left: 40, top: coliseoY, width: 1000, scale: String(coliseoS)}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, background: '#7a8f3a'}} />
      <Avion style={{position: 'absolute', left: avionX, top: avionY, width: 520, rotate: '-8deg'}} />
    </Camara>
  );
};

// Interior de la arena
const Arena: React.FC = () => (
  <>
    <Cielo arriba="#7cc3ff" abajo="#d8efff" />
    <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M-100 ${520 + i * 150} Q540 ${420 + i * 150} 1180 ${520 + i * 150} L1180 ${670 + i * 150} Q540 ${570 + i * 150} -100 ${670 + i * 150} Z`} fill={['#d9a066', '#cf9355', '#c48748', '#b87b3d'][i]} />
      ))}
      {[0, 1, 2].map((r) => Array.from({length: 11}).map((_, i) => (
        <rect key={`${r}-${i}`} x={i * 105 - 10} y={560 + r * 150 - Math.abs(i - 5) * -6} width="50" height="70" rx="25" fill="#6b3f22" opacity="0.75" />
      )))}
      <path d="M-100 1150 Q540 1070 1180 1150 L1180 1920 L-100 1920 Z" fill="#f0d9a8" />
      <path d="M-100 1150 Q540 1070 1180 1150 L1180 1180 Q540 1100 -100 1180 Z" fill="#d9bd85" />
    </svg>
  </>
);

const Gladiador: React.FC<{caida: number; bailar?: number; espejo?: boolean; style?: React.CSSProperties}> = ({caida, bailar = 0, espejo, style}) => (
  <svg viewBox="0 0 200 380" style={{overflow: 'visible', scale: espejo ? '-1 1' : undefined, ...style}}>
    <g style={{translate: `0px ${-bailar}px`, rotate: `${bailar * 0.3}deg`, transformOrigin: '100px 370px'}}>
      <ellipse cx="100" cy="372" rx="55" ry="9" fill="rgba(0,0,0,0.25)" />
      <rect x="72" y="250" width="22" height="110" rx="9" fill="#c98a5a" />
      <rect x="106" y="250" width="22" height="110" rx="9" fill="#c98a5a" />
      <path d="M66 340 h34 v28 h-38z M102 340 h34 v28 h-38z" fill="#6b3f22" />
      <path d="M62 200 h76 l8 70 h-92 z" fill="#b3241c" />
      <rect x="62" y="120" width="76" height="90" rx="14" fill="#c9a24a" />
      <ellipse cx="100" cy="80" rx="34" ry="38" fill="#c98a5a" />
      <path d="M62 78 Q62 30 100 30 Q138 30 138 78 L132 96 L118 70 L82 70 L68 96 Z" fill="#a8a8b0" />
      <path d="M70 30 Q100 -20 130 30 Q100 10 70 30 Z" fill="#d62828" />
      <path d="M86 96 q14 6 28 0" stroke="#2a1a10" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="82" r="4" fill="#2a1a10" /><circle cx="112" cy="82" r="4" fill="#2a1a10" />
      {/* escudo */}
      <rect x="10" y="140" width="56" height="130" rx="12" fill="#b3241c" stroke="#e8c15a" strokeWidth="6" />
      {/* espada que cae */}
      <g style={{translate: `${caida * 30}px ${caida * 190}px`, rotate: `${caida * 100}deg`, transformOrigin: '160px 200px'}}>
        <rect x="155" y="60" width="12" height="130" fill="#dfe6ee" />
        <rect x="140" y="188" width="42" height="10" fill="#e8c15a" />
        <rect x="155" y="198" width="12" height="30" fill="#5a3418" />
      </g>
      <circle cx="160" cy="200" r="14" fill="#c98a5a" style={{translate: `0px ${caida * 40}px`}} />
    </g>
  </svg>
);

export const EscenaColiseo: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const x = interpolate(f, [0, 55], [-300, 330], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const caminando = f < 55 ? Math.sin(f / 3) : 0;
  const caida = spring({frame: f - 70, fps, config: {damping: 12}});
  const sorpresa = interpolate(f, [65, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Camara dur={dur}>
      <Arena />
      <Gladiador caida={caida} style={{position: 'absolute', left: -10, top: 980, width: 330}} />
      <Gladiador caida={caida} espejo style={{position: 'absolute', left: 760, top: 980, width: 330}} />
      <Cantante step={caminando} wave={f > 60 ? 140 + Math.sin(f / 4) * 20 : 0} bounce={Math.abs(caminando) * 8} style={{position: 'absolute', left: x, top: 920, width: 420}} />
      {['!', '!'].map((t, i) => (
        <div key={i} style={{position: 'absolute', top: 900, left: i ? 880 : 110, fontSize: 150, fontWeight: 900, color: '#f04e23', opacity: sorpresa, scale: String(sorpresa), fontFamily: 'Arial Black, sans-serif', WebkitTextStroke: '6px #fff', paintOrder: 'stroke'}}>{t}</div>
      ))}
    </Camara>
  );
};

const Tuba: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <svg viewBox="0 0 160 200" style={style}>
    <path d="M60 190 Q20 190 20 140 L20 70 Q20 40 50 40 L70 40" stroke="#e8b830" strokeWidth="18" fill="none" />
    <path d="M60 40 Q100 30 120 0 L160 0 Q150 70 90 70" fill="#f4cb4a" />
    <ellipse cx="140" cy="10" rx="24" ry="12" fill="#b88a14" />
  </svg>
);

export const EscenaBaile: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const b = (fase: number) => Math.abs(Math.sin((f + fase) / 5)) * 40;
  return (
    <Camara dur={dur}>
      <Arena />
      {Array.from({length: 60}).map((_, i) => {
        const x = random(`cx${i}`) * 1080;
        const y = ((random(`cy${i}`) * 1920 + f * (6 + random(`v${i}`) * 6)) % 2000) - 80;
        return <div key={i} style={{position: 'absolute', left: x + Math.sin(f / 8 + i) * 30, top: y, width: 18, height: 30, background: ['#f04e23', '#2bb673', '#ffffff', '#ffd23f', '#3a86ff'][i % 5], rotate: `${f * 8 + i * 30}deg`}} />;
      })}
      <Gladiador caida={1} bailar={b(0)} style={{position: 'absolute', left: 0, top: 1000, width: 290}} />
      <Gladiador caida={1} bailar={b(7)} espejo style={{position: 'absolute', left: 790, top: 1000, width: 290}} />
      <div style={{position: 'absolute', left: 140, top: 1180, width: 180, translate: `0px ${-b(3) * 0.4}px`}}><Tuba style={{width: 180}} /></div>
      <div style={{position: 'absolute', left: 760, top: 1180, width: 180, scale: '-1 1', translate: `0px ${-b(10) * 0.4}px`}}><Tuba style={{width: 180}} /></div>
      <Cantante wave={120 + Math.sin(f / 3) * 40} bounce={b(2) * 0.6} step={Math.sin(f / 5) * 0.4} style={{position: 'absolute', left: 330, top: 880, width: 420}} />
    </Camara>
  );
};

export const EscenaTrevi: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  return (
    <Camara dur={dur} origen="50% 60%">
      <Cielo arriba="#ffcf8a" abajo="#ffeed2" />
      <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <rect x="0" y="380" width="1080" height="900" fill="#efe3c8" />
        <rect x="0" y="340" width="1080" height="60" fill="#e0d0ac" />
        {[90, 270, 810, 990].map((x) => <rect key={x} x={x - 30} y="420" width="60" height="760" fill="#e4d6b6" stroke="#cdbb92" strokeWidth="4" />)}
        <path d="M400 1180 V620 a140 140 0 0 1 280 0 V1180 Z" fill="#cdbb92" />
        {/* estatua estilizada */}
        <circle cx="540" cy="720" r="40" fill="#f7f2e6" />
        <path d="M480 1100 Q470 860 540 770 Q610 860 600 1100 Z" fill="#f7f2e6" />
        <path d="M200 1180 Q300 1100 400 1170 M680 1170 Q780 1100 880 1180" stroke="#d9cba7" strokeWidth="40" fill="none" />
        {[150, 300, 450, 600, 750, 900].map((x, i) => <rect key={x} x={x} y={470 + (i % 2) * 330} width="70" height="110" rx="6" fill="#8a7a5a" opacity="0.6" />)}
        {/* agua */}
        <rect x="0" y="1260" width="1080" height="660" fill="#33b5c9" />
        {Array.from({length: 14}).map((_, i) => (
          <path key={i} d={`M${((i * 160 + f * 3) % 1300) - 150} ${1320 + (i % 5) * 110} q40 -18 80 0 q40 18 80 0`} stroke="rgba(255,255,255,0.7)" strokeWidth="7" fill="none" />
        ))}
        <rect x="0" y="1230" width="1080" height="50" fill="#d9cba7" />
      </svg>
      <Cantante wave={140 + Math.sin(f / 4) * 25} style={{position: 'absolute', left: 340, top: 880, width: 400}} />
      {/* monedas en parábola */}
      {Array.from({length: 18}).map((_, i) => {
        const inicio = i * 7;
        const t = (f - inicio) / 30;
        if (t < 0 || t > 1) return null;
        const x0 = random(`mx${i}`) > 0.5 ? 1100 : -40;
        const x = interpolate(t, [0, 1], [x0, 300 + random(`mt${i}`) * 480]);
        const y = 1700 - Math.sin(t * Math.PI) * 650 - t * 200;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: 50, height: 50, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #fff4b0, #e8b830 60%, #a8790c)', boxShadow: '0 0 20px rgba(255,220,80,0.9)'}} />;
      })}
      {/* turistas */}
      <svg viewBox="0 0 1080 300" style={{position: 'absolute', left: 0, bottom: 0, width: 1080}}>
        {Array.from({length: 9}).map((_, i) => (
          <g key={i} fill={['#2c3e66', '#5a3418', '#3d6aa8', '#7a2a1a'][i % 4]} style={{translate: `0px ${Math.sin(f / 4 + i) * 6}px`}}>
            <circle cx={60 + i * 120} cy="120" r="36" />
            <rect x={20 + i * 120} y="160" width="80" height="160" rx="30" />
          </g>
        ))}
      </svg>
    </Camara>
  );
};

const Vespa: React.FC<{style?: React.CSSProperties; rueda: number}> = ({style, rueda}) => (
  <svg viewBox="0 0 500 300" style={style}>
    {[100, 400].map((cx) => (
      <g key={cx} style={{rotate: `${rueda}deg`, transformOrigin: `${cx}px 240px`}}>
        <circle cx={cx} cy="240" r="52" fill="#222" /><circle cx={cx} cy="240" r="24" fill="#bbb" />
        <rect x={cx - 3} y="190" width="6" height="100" fill="#888" />
      </g>
    ))}
    <path d="M40 220 Q50 140 150 140 L300 150 Q340 150 350 200 L440 200 L420 120 L440 110 L470 220 Q470 250 440 250 L60 250 Z" fill="#d62828" />
    <path d="M120 140 Q130 110 200 110 L280 116 Q300 120 300 150 Z" fill="#3b2412" />
    <rect x="420" y="60" width="16" height="60" fill="#999" />
    <rect x="400" y="54" width="70" height="12" rx="6" fill="#444" />
    <circle cx="470" cy="150" r="16" fill="#fff3c4" />
  </svg>
);

export const EscenaVespa: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const edificios = ['#e8a35a', '#d9774a', '#f0c27a', '#c9633e', '#e6b36a'];
  return (
    <Camara dur={dur}>
      <Cielo arriba="#8fd0ff" abajo="#e2f4ff" />
      {/* edificios con paralaje */}
      <div style={{position: 'absolute', left: -((f * 14) % 1800), top: 300, display: 'flex', width: 3600}}>
        {Array.from({length: 10}).map((_, i) => (
          <div key={i} style={{width: 360, height: 1150, background: edificios[i % 5], borderRight: '8px solid rgba(0,0,0,0.08)', position: 'relative', marginTop: (i % 3) * 60}}>
            {Array.from({length: 8}).map((__, j) => (
              <div key={j} style={{position: 'absolute', left: 50 + (j % 2) * 150, top: 80 + Math.floor(j / 2) * 230, width: 100, height: 150, background: '#3a5a6a', border: '10px solid #f4ead2', borderRadius: '50px 50px 0 0'}}>
                {j % 3 === 0 && <div style={{position: 'absolute', left: -30, right: -30, bottom: -26, height: 18, background: '#5a3418'}} />}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* calle empedrada */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1420, bottom: 0, background: '#9a8a78'}} />
      {Array.from({length: 40}).map((_, i) => (
        <div key={i} style={{position: 'absolute', left: ((i * 110 - f * 22) % 1200 + 1200) % 1200 - 60, top: 1460 + (i % 4) * 110, width: 90, height: 50, borderRadius: 20, background: '#857563'}} />
      ))}
      {/* ¡ajúa! que aparece en los balcones */}
      {[20, 55, 95, 130].map((ini, i) => {
        const s = spring({frame: f - ini, fps, config: {damping: 9}});
        const fuera = interpolate(f - ini, [30, 40], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div key={i} style={{position: 'absolute', left: [80, 600, 180, 560][i], top: [420, 560, 760, 380][i], scale: String(s * fuera), rotate: `${i % 2 ? 8 : -8}deg`, background: '#fff', borderRadius: 40, padding: '18px 34px', fontSize: 80, fontWeight: 900, color: '#f04e23', fontFamily: 'Arial Black, sans-serif', boxShadow: '0 12px 0 rgba(0,0,0,0.15)'}}>¡AJÚA!</div>
        );
      })}
      <div style={{position: 'absolute', left: 200, top: 1000, width: 680, translate: `0px ${Math.sin(f / 2) * 4}px`}}>
        <Cantante wave={130 + Math.sin(f / 4) * 20} sentado style={{position: 'absolute', left: 120, top: -95, width: 300}} />
        <Vespa rueda={f * 20} style={{position: 'absolute', left: 0, top: 120, width: 680}} />
      </div>
    </Camara>
  );
};

export const EscenaGelato: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cono = spring({frame: f - 10, fps, config: {damping: 11}});
  const gota = interpolate(f, [40, 120], [0, 90], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sabores = ['#f7c6d0', '#c8e6a0', '#fff1b8', '#8a5a3c', '#ffd1a1', '#b5d8f7'];
  return (
    <Camara dur={dur} origen="50% 45%">
      <AbsoluteFill style={{background: 'linear-gradient(#fff6e8, #ffe2c4)'}} />
      {/* toldo */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 260, height: 180, background: 'repeating-linear-gradient(90deg, #2bb673 0 120px, #ffffff 120px 240px, #d62828 240px 360px)', borderRadius: '0 0 60px 60px'}} />
      <div style={{position: 'absolute', left: 90, right: 90, top: 470, height: 120, background: '#3b2412', borderRadius: 20, color: '#ffe2a0', fontSize: 84, fontWeight: 900, textAlign: 'center', lineHeight: '120px', fontFamily: 'Georgia, serif'}}>GELATERIA</div>
      <Cantante wave={0} style={{position: 'absolute', left: 300, top: 720, width: 480}} />
      {/* cono con chamoy */}
      <div style={{position: 'absolute', left: 640, top: 900, width: 200, scale: String(cono), rotate: '12deg'}}>
        <svg viewBox="0 0 200 320" style={{overflow: 'visible'}}>
          <path d="M40 120 L100 310 L160 120 Z" fill="#d9a35a" />
          <path d="M55 150 L145 150 M65 185 L135 185 M75 220 L125 220" stroke="#b9823a" strokeWidth="6" />
          <circle cx="100" cy="95" r="70" fill="#fff1b8" />
          <path d="M30 95 Q60 40 100 30 Q150 30 170 90 Q150 70 130 100 Q110 80 90 105 Q70 85 30 95 Z" fill="#c4161c" />
          <rect x="128" y="96" width="12" height={gota} rx="6" fill="#c4161c" />
          {Array.from({length: 14}).map((_, i) => <circle key={i} cx={50 + random(`c${i}`) * 100} cy={40 + random(`d${i}`) * 50} r="5" fill="#7a0d0d" />)}
        </svg>
      </div>
      {/* mostrador */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1300, bottom: 0, background: '#cfd8dc'}} />
      <div style={{position: 'absolute', left: 60, right: 60, top: 1340, display: 'flex', gap: 20}}>
        {sabores.map((c) => <div key={c} style={{flex: 1, height: 200, background: c, borderRadius: '50% 50% 10px 10px', border: '8px solid #9aa8ae'}} />)}
      </div>
    </Camara>
  );
};
