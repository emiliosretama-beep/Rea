import React from 'react';
import {AbsoluteFill, Sequence, Audio, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {EscenaGancho, EscenaColiseo, EscenaBaile, EscenaTrevi, EscenaVespa, EscenaGelato} from './Scenes';

const NARANJA = '#f04e23';

// Escenas: [inicio, duración] en cuadros (30 fps)
const ESCENAS = [
  {C: EscenaGancho, from: 0, dur: 75},
  {C: EscenaColiseo, from: 75, dur: 150},
  {C: EscenaBaile, from: 225, dur: 150},
  {C: EscenaTrevi, from: 375, dur: 165},
  {C: EscenaVespa, from: 540, dur: 165},
  {C: EscenaGelato, from: 705, dur: 195},
];
export const DURACION_TOTAL = 900;

// Subtítulos: las palabras entre *asteriscos* se resaltan en naranja.
const SUBS = [
  {from: 4, to: 72, t: '¿Qué pasaría si *Yeyo* llegara a *Roma*?'},
  {from: 80, to: 148, t: 'Primero llega al *Coliseo*…'},
  {from: 150, to: 222, t: 'y los gladiadores *dejan* *de* *pelear.*'},
  {from: 230, to: 298, t: 'Porque en vez de pelear…'},
  {from: 300, to: 372, t: '¡empieza el *baile!*'},
  {from: 380, to: 455, t: 'En la *Fontana* *di* *Trevi* avientan monedas…'},
  {from: 457, to: 537, t: 'para pedir *otra* *canción.*'},
  {from: 545, to: 618, t: 'Recorre Roma en *Vespa*…'},
  {from: 620, to: 702, t: 'y los romanos aprenden a gritar *¡ajúa!*'},
  {from: 710, to: 772, t: 'Y pide su gelato…'},
  {from: 774, to: 836, t: '*con* *chamoy.*'},
];

const Subtitulos: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const linea = SUBS.find((s) => f >= s.from && f < s.to);
  if (!linea) return null;
  const palabras = linea.t.split(' ');
  const paso = Math.min(9, ((linea.to - linea.from) * 0.6) / palabras.length);
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1230, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px'}}>
      {palabras.map((p, i) => {
        const ini = linea.from + i * paso;
        if (f < ini) return null;
        const pop = spring({frame: f - ini, fps, config: {damping: 10, stiffness: 220}});
        const clave = p.startsWith('*');
        const actual = f < ini + paso + 4;
        return (
          <span key={i} style={{
            fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: clave ? 104 : 92, lineHeight: 1.15,
            color: clave ? NARANJA : '#ffffff', WebkitTextStroke: '14px #111', paintOrder: 'stroke fill',
            textShadow: '0 10px 0 rgba(0,0,0,0.35)', scale: String(interpolate(pop, [0, 1], [0.4, actual ? 1.08 : 1])),
            display: 'inline-block', textTransform: 'uppercase',
          }}>{p.replace(/\*/g, '')}</span>
        );
      })}
    </div>
  );
};

// Destello blanco corto en cada corte
const Destellos: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.max(0, ...ESCENAS.slice(1).map((e) => interpolate(f - e.from, [-2, 0, 6], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  return <AbsoluteFill style={{background: '#fff', opacity: o, pointerEvents: 'none'}} />;
};

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12}});
  const flecha = Math.sin(f / 4) * 18;
  return (
    <AbsoluteFill style={{background: `rgba(15,20,45,${interpolate(f, [0, 8], [0, 0.82], {extrapolateRight: 'clamp'})})`, alignItems: 'center', justifyContent: 'center', padding: 80}}>
      <div style={{scale: String(s), textAlign: 'center', fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, color: '#fff', fontSize: 100, lineHeight: 1.12, textTransform: 'uppercase', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>
        ¿A qué ciudad lo<br />mandamos <span style={{color: NARANJA}}>después</span>?
      </div>
      <svg viewBox="0 0 100 100" style={{width: 160, marginTop: 50, translate: `0px ${flecha}px`}}>
        <path d="M50 90 L10 45 H35 V10 H65 V45 H90 Z" fill={NARANJA} stroke="#fff" strokeWidth="5" />
      </svg>
      <div style={{position: 'absolute', bottom: 330, color: 'rgba(255,255,255,0.75)', fontFamily: 'Arial, sans-serif', fontSize: 40, fontWeight: 700}}>Video de fan · parodia</div>
    </AbsoluteFill>
  );
};

export const YeyoEnRoma: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {ESCENAS.map(({C, from, dur}) => (
        <Sequence key={from} from={from} durationInFrames={dur}><C dur={dur} /></Sequence>
      ))}
      <Destellos />
      <Subtitulos />
      <Sequence from={840}><Cierre /></Sequence>

      {/* Audio sintetizado (sin derechos de autor). La música sube cuando empieza el baile. */}
      <Audio src={staticFile('musica.wav')} volume={(fr) => interpolate(fr, [0, 220, 235, 880, 900], [0.18, 0.18, 0.55, 0.55, 0], {extrapolateRight: 'clamp'})} />
      {ESCENAS.map((e) => <Sequence key={`w${e.from}`} from={Math.max(0, e.from - 4)} durationInFrames={20}><Audio src={staticFile('whoosh.wav')} volume={0.7} /></Sequence>)}
      <Sequence from={75 + 70} durationInFrames={30}><Audio src={staticFile('clang.wav')} volume={0.8} /></Sequence>
      {Array.from({length: 18}).map((_, i) => <Sequence key={`c${i}`} from={375 + i * 7 + 28} durationInFrames={20}><Audio src={staticFile('ding.wav')} volume={0.35} /></Sequence>)}
      {[20, 55, 95, 130].map((d) => <Sequence key={`p${d}`} from={540 + d} durationInFrames={15}><Audio src={staticFile('pop.wav')} volume={0.7} /></Sequence>)}
      <Sequence from={774} durationInFrames={30}><Audio src={staticFile('clang.wav')} volume={0.6} /></Sequence>
      <Sequence from={840} durationInFrames={20}><Audio src={staticFile('pop.wav')} volume={0.8} /></Sequence>
    </AbsoluteFill>
  );
};
