import React from 'react';
import {AbsoluteFill, Sequence, Audio, staticFile, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {EscenaAerea, EscenaArena, EscenaCuadriga, EscenaBanquete} from './Escenas';

const NARANJA = '#f04e23';
export const TOTAL = 1410;

// Diálogo: frame de inicio, duración en frames (de los .wav), quién habla y texto.
// Las palabras con *asterisco* se resaltan.
export const DIALOGO = [
  {id: '01', from: 6, dur: 76, quien: '', t: '¿Qué pasaría si *Yeyo* llegara a la *antigua* *Roma*?'},
  {id: '02', from: 93, dur: 160, quien: '', t: 'Año 80 después de Cristo. Inauguran el *Coliseo*… y de la nada, *aparece* *él*.'},
  {id: '03', from: 262, dur: 94, quien: 'GLADIADOR', t: '¡Por *Júpiter*! ¿Quién eres tú, *extranjero*?'},
  {id: '04', from: 362, dur: 122, quien: 'YEYO', t: 'Tranquilos, compas. No vengo a pelear. Vengo a *cantar*.'},
  {id: '05', from: 495, dur: 99, quien: '', t: 'Y en vez de pelear… los gladiadores terminan *bailando*.'},
  {id: '06', from: 649, dur: 110, quien: 'EMPERADOR', t: '¡Este hombre es un *dios*! ¡Denle una *corona* *de* *laurel*!'},
  {id: '07', from: 770, dur: 72, quien: 'YEYO', t: '*¡Ajúa!* Muchas gracias, jefe.'},
  {id: '08', from: 876, dur: 116, quien: '', t: 'Recorre Roma en *cuadriga*, y toda la ciudad aprende a gritar…'},
  {id: '09', from: 996, dur: 41, quien: 'ROMANOS', t: '*¡AJÚA!*'},
  {id: '10', from: 1056, dur: 107, quien: '', t: 'En el banquete del emperador, le sirven *uvas* *y* *vino*.'},
  {id: '11', from: 1172, dur: 49, quien: 'YEYO', t: '¿Y el *chamoy*, apá?'},
  {id: '12', from: 1250, dur: 139, quien: '', t: 'Roma *nunca* volvió a ser la misma.'},
];

const Subtitulos: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const l = DIALOGO.find((d) => f >= d.from - 2 && f < d.from + d.dur + 6);
  if (!l || (l.id === '12' && f > 1320)) return null;
  const palabras = l.t.split(' ');
  // tiempo de cada palabra proporcional a su largo
  const pesos = palabras.map((p) => p.replace(/[*…¡!¿?,.]/g, '').length + 2);
  const total = pesos.reduce((a, b) => a + b, 0);
  const inicios: number[] = [];
  let acc = 0;
  pesos.forEach((p) => { inicios.push(l.from + (acc / total) * l.dur * 0.95); acc += p; });
  // se muestran en bloques de hasta 4 palabras, como en Shorts
  const actual = Math.max(0, inicios.filter((i) => i <= f).length - 1);
  const bloque = Math.floor(actual / 4);
  const vis = palabras.map((p, i) => ({p, i})).filter(({i}) => Math.floor(i / 4) === bloque);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1180, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {l.quien && (
        <div style={{background: l.quien === 'YEYO' ? NARANJA : '#1d2440', color: '#fff', fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: 40, padding: '8px 22px', borderRadius: 14, marginBottom: 18, letterSpacing: 2}}>{l.quien}</div>
      )}
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 24px'}}>
        {vis.map(({p, i}) => {
          if (f < inicios[i]) return null;
          const pop = spring({frame: f - inicios[i], fps, config: {damping: 10, stiffness: 220}});
          const clave = p.includes('*');
          return (
            <span key={i} style={{fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: clave ? 100 : 88, lineHeight: 1.15,
              color: clave ? NARANJA : '#fff', WebkitTextStroke: '14px #111', paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,0.35)',
              scale: String(interpolate(pop, [0, 1], [0.4, i === actual ? 1.08 : 1])), display: 'inline-block', textTransform: 'uppercase'}}>{p.replace(/\*/g, '')}</span>
          );
        })}
      </div>
    </div>
  );
};

const CORTES = [90, 870, 1050, 1245];
const Destellos: React.FC = () => {
  const f = useCurrentFrame();
  const o = Math.max(0, ...CORTES.map((c) => interpolate(f - c, [-2, 0, 7], [0, 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  return <AbsoluteFill style={{background: '#fff', opacity: o}} />;
};

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{background: `rgba(15,20,45,${interpolate(f, [0, 10], [0, 0.6], {extrapolateRight: 'clamp'})})`, alignItems: 'center', justifyContent: 'center', padding: 80}}>
      <div style={{scale: String(s), textAlign: 'center', fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, color: '#fff', fontSize: 98, lineHeight: 1.12, textTransform: 'uppercase', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill'}}>
        ¿A qué <span style={{color: NARANJA}}>época</span><br />lo mandamos<br />después?
      </div>
      <svg viewBox="0 0 100 100" style={{width: 150, marginTop: 50, translate: `0px ${Math.sin(f / 4) * 18}px`}}>
        <path d="M50 90 L10 45 H35 V10 H65 V45 H90 Z" fill={NARANJA} stroke="#fff" strokeWidth="5" />
      </svg>
      <div style={{position: 'absolute', bottom: 330, color: 'rgba(255,255,255,0.8)', fontFamily: 'Arial, sans-serif', fontSize: 40, fontWeight: 700}}>Video de fan · parodia</div>
    </AbsoluteFill>
  );
};

const SFX: React.FC<{src: string; at: number[]; vol?: number; dur?: number}> = ({src, at, vol = 0.6, dur = 40}) => (
  <>{at.map((a) => <Sequence key={a} from={a} durationInFrames={dur}><Audio src={staticFile(`sfx/${src}.wav`)} volume={vol} /></Sequence>)}</>
);

export const YeyoAntiguaRoma: React.FC<{conMusica?: boolean}> = ({conMusica = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Sequence from={0} durationInFrames={90}><EscenaAerea dur={90} /></Sequence>
    <Sequence from={90} durationInFrames={780}><EscenaArena /></Sequence>
    <Sequence from={870} durationInFrames={180}><EscenaCuadriga dur={180} gritan={126} /></Sequence>
    <Sequence from={1050} durationInFrames={195}><EscenaBanquete dur={195} yeyoHabla={122} narra={6} /></Sequence>
    <Sequence from={1245} durationInFrames={165}><EscenaAerea dur={165} atardecer /></Sequence>
    {/* viñeta cinematográfica */}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)'}} />
    <Destellos />
    <Subtitulos />
    <Sequence from={1320}><Cierre /></Sequence>

    <Pista conMusica={conMusica} />
  </AbsoluteFill>
);

// Toda la pista de audio (voces, música y efectos). Se usa sola para exportar el audio sin música.
export const Pista: React.FC<{conMusica?: boolean}> = ({conMusica = true}) => (
  <>
    {/* voces */}
    {DIALOGO.map((d) => <Sequence key={d.id} from={d.from} durationInFrames={d.dur + 10}><Audio src={staticFile(`voz/${d.id}.wav`)} volume={1} /></Sequence>)}
    {/* música (baja cuando hay voz) y ambiente */}
    {conMusica && <Audio src={staticFile('sfx/musica.wav')} volume={(f) => interpolate(f, [0, 480, 492, 600, 615, 1380, 1410], [0.09, 0.09, 0.32, 0.32, 0.1, 0.1, 0], {extrapolateRight: 'clamp'})} />}
    <Sequence from={90} durationInFrames={780}><Audio src={staticFile('sfx/multitud.wav')} volume={(f) => interpolate(f, [0, 20, 130, 140, 400, 410, 560, 690, 700, 780], [0, 0.5, 0.5, 0.12, 0.12, 0.55, 0.2, 0.2, 0.6, 0.3], {extrapolateRight: 'clamp'})} /></Sequence>
    <SFX src="whoosh" at={[0, 86, 866, 1046, 1241]} vol={0.5} />
    <SFX src="espada" at={[100, 112, 124, 136, 148, 160, 172, 184, 196, 208, 220]} vol={0.35} dur={15} />
    <SFX src="boom" at={[223]} vol={0.9} dur={60} />
    <SFX src="campana" at={[765, 787]} vol={0.5} dur={45} />
    <Sequence from={870} durationInFrames={180}><Audio src={staticFile('sfx/galope.wav')} volume={0.45} /></Sequence>
    <SFX src="pop" at={[1320]} vol={0.7} dur={20} />
  </>
);
