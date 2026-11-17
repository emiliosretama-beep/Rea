// Genera la narración de cada video con VoiceStudio y saca el tiempo real
// de cada palabra para sincronizar subtítulos y dibujos.
//
// Requiere el backend de VoiceStudio corriendo (por defecto en
// http://127.0.0.1:3900) con el motor Supertonic-3 activo (licencia
// OpenRAIL-M aceptada) y un modelo Whisper para transcribir.
//
// Uso:  node scripts/generar-voz.mjs [Pulpo|Saltar|Boligrafo ...]
//
// Por video escribe:
//   public/voz/<id>.wav   la pista de voz
//   src/voz/<id>.json     tiempos por palabra y duración de cada escena

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = process.env.VOICESTUDIO_URL ?? 'http://127.0.0.1:3900';
const VOZ = 'M5'; // voz masculina incluida en Supertonic-3 (no es una voz clonada)
const IDIOMA = 'es';
const DURACION_VIDEO = 20; // segundos
const OBJETIVO_VOZ = 18; // segundos de narración buscados
const VELOCIDAD_MIN = 1.0;
const VELOCIDAD_MAX = 1.3;
const ANTES_DE_FRASE = 0.12; // la escena empieza un poco antes que su primera palabra

// Cómo se dice en voz alta lo que en pantalla va con números o símbolos.
const LECTURA = {
  '3': 'tres',
  '8': 'ocho',
  '30': 'treinta',
  '5500': 'cinco mil quinientos',
  '#1': 'número uno',
  '#2': 'número dos',
  '#3': 'número tres',
  '#4': 'número cuatro',
  '#5': 'número cinco',
};

const NUMEROS = { 0: 'cero', 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez' };

/** Minúsculas, sin acentos ni signos; los dígitos se pasan a palabras. */
const normalizar = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ0-9#\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (/^\d+$/.test(w) && NUMEROS[w] ? [NUMEROS[w]] : [w.replace('#', '')]))
    .filter(Boolean);

const silabas = (w) => Math.max(1, (w.match(/[aeiou]+/g) ?? []).length);

/** Lee los datos de los videos desde src/datos.ts (solo el bloque de escenas). */
const cargarVideos = async () => {
  const fuente = await readFile(path.join(RAIZ, 'src/datos.ts'), 'utf8');
  const videos = [];
  const bloques = fuente.split(/\n {2}\{\n {4}id: '/).slice(1);
  for (const bloque of bloques) {
    const id = bloque.slice(0, bloque.indexOf("'"));
    // Solo los textos de escena (van seguidos de `duracion`), no el color `texto` de la paleta.
    const escenas = [...bloque.matchAll(/texto:\s*'([^']+)',\s*duracion:/g)].map((m) => m[1]);
    if (escenas.length < 2) throw new Error(`${id}: no pude leer sus escenas en src/datos.ts`);
    videos.push({ id, escenas });
  }
  return videos;
};

/** Tokens hablados con referencia a su palabra de pantalla y su escena. */
const tokensDelGuion = (escenas) => {
  const tokens = [];
  const pantalla = [];
  const textoHablado = escenas.map((texto, escena) => {
    const palabras = texto.trim().split(/\s+/);
    const dichas = palabras.map((p) => {
      const limpia = p.replace(/[¿?¡!.,:;]/g, '');
      const lectura = LECTURA[limpia];
      const indice = pantalla.length;
      pantalla.push({ texto: p, escena });
      const hablado = lectura ? p.replace(limpia, lectura) : p;
      for (const t of normalizar(lectura ?? limpia)) tokens.push({ t, indice, escena });
      return hablado;
    });
    let frase = dichas.join(' ');
    if (!/[.?!]$/.test(frase)) frase += '.';
    return frase;
  });
  return { tokens, pantalla, textoHablado: textoHablado.join(' ') };
};

const sintetizar = async (texto, velocidad, salida) => {
  const r = await fetch(`${BACKEND}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'supertonic3', voice: VOZ, input: texto, response_format: 'wav', language: IDIOMA, speed: velocidad, seed: 7 }),
  });
  const cuerpo = Buffer.from(await r.arrayBuffer());
  if (!r.ok) throw new Error(`VoiceStudio respondió ${r.status}: ${cuerpo.toString('utf8').slice(0, 300)}`);
  if (cuerpo.subarray(0, 4).toString('ascii') !== 'RIFF') throw new Error('La respuesta no es un WAV');
  const crudo = salida.replace(/\.wav$/, '.crudo.wav');
  await writeFile(crudo, cuerpo);
  // Volumen de redes sociales: -14 LUFS, pico real máximo -1.5 dB.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', crudo, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '1', salida]);
  await rm(crudo);
  return duracionDe(salida);
};

/** Pausas reales del audio: [inicio, fin] en segundos (más de 0,15 s bajo -35 dB). */
const silenciosDe = (archivo) => {
  // silencedetect escribe en stderr, por eso spawnSync y no execFileSync.
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', archivo, '-af', 'silencedetect=noise=-35dB:d=0.15', '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`silencedetect falló: ${r.stderr.slice(-300)}`);
  const inicios = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const fines = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return inicios.map((a, i) => [a, fines[i] ?? Infinity]);
};

const duracionDe = (archivo) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]).toString().trim());

const transcribir = async (archivo) => {
  const form = new FormData();
  form.append('file', new Blob([await readFile(archivo)], { type: 'audio/wav' }), path.basename(archivo));
  form.append('model', 'whisper-1');
  form.append('language', IDIOMA);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  // Sin 'prompt': si la guía es igual al audio, Whisper a veces se salta el inicio.
  const r = await fetch(`${BACKEND}/v1/audio/transcriptions`, { method: 'POST', body: form });
  const json = await r.json();
  if (!r.ok) throw new Error(`Transcripción falló ${r.status}: ${JSON.stringify(json).slice(0, 300)}`);
  const palabras = json.words ?? (json.segments ?? []).flatMap((s) => s.words ?? []);
  if (!palabras.length) throw new Error('La transcripción no trajo tiempos por palabra');
  return { texto: json.text, palabras: palabras.map((w) => ({ w: w.word, inicio: w.start, fin: w.end })) };
};

/** Alinea guion y transcripción (programación dinámica tipo LCS). */
const alinear = (tokens, transcritas) => {
  const hip = [];
  transcritas.forEach((p, i) => normalizar(p.w).forEach((t) => hip.push({ t, i })));
  const n = tokens.length;
  const m = hip.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let a = n - 1; a >= 0; a--)
    for (let b = m - 1; b >= 0; b--)
      dp[a][b] = tokens[a].t === hip[b].t ? dp[a + 1][b + 1] + 1 : Math.max(dp[a + 1][b], dp[a][b + 1]);
  const pareja = new Array(n).fill(-1);
  for (let a = 0, b = 0; a < n && b < m; ) {
    if (tokens[a].t === hip[b].t) pareja[a++] = hip[b++].i;
    else if (dp[a + 1][b] >= dp[a][b + 1]) a++;
    else b++;
  }
  return pareja;
};

const procesar = async ({ id, escenas }) => {
  const { tokens, pantalla, textoHablado } = tokensDelGuion(escenas);
  await mkdir(path.join(RAIZ, 'public/voz'), { recursive: true });
  await mkdir(path.join(RAIZ, 'src/voz'), { recursive: true });
  const wav = path.join(RAIZ, 'public/voz', `${id}.wav`);

  let velocidad;
  let duracion;
  if (REUSAR) {
    // --reusar-voz: no genera voz nueva, solo vuelve a medir los tiempos.
    const previo = JSON.parse(await readFile(path.join(RAIZ, 'src/voz', `${id}.json`), 'utf8'));
    velocidad = previo.velocidad;
    duracion = duracionDe(wav);
  } else {
    // 1) Voz a velocidad normal para medir; 2) ajuste para acercarse a ~18 s.
    const base = await sintetizar(textoHablado, 1.0, wav);
    velocidad = Math.min(VELOCIDAD_MAX, Math.max(VELOCIDAD_MIN, +(base / OBJETIVO_VOZ).toFixed(2)));
    duracion = velocidad === 1.0 ? base : await sintetizar(textoHablado, velocidad, wav);
  }

  // 3) Tiempos reales por palabra.
  const { texto: transcripcion, palabras: transcritas } = await transcribir(wav);
  const pareja = alinear(tokens, transcritas);
  const emparejados = pareja.filter((x) => x >= 0).length;

  // Tokens sin pareja: se interpolan entre los vecinos por sílabas.
  const t0 = tokens.map((tok, k) => (pareja[k] >= 0 ? transcritas[pareja[k]].inicio : null));
  const t1 = tokens.map((tok, k) => (pareja[k] >= 0 ? transcritas[pareja[k]].fin : null));
  for (let k = 0; k < tokens.length; k++) {
    if (t0[k] !== null) continue;
    let a = k - 1;
    while (a >= 0 && t1[a] === null) a--;
    let b = k;
    while (b < tokens.length && t0[b] === null) b++;
    const desde = a >= 0 ? t1[a] : 0.05;
    const hasta = b < tokens.length ? t0[b] : duracion;
    const grupo = tokens.slice(a + 1, b);
    const total = grupo.reduce((s, g) => s + silabas(g.t), 0);
    let cursor = desde;
    grupo.forEach((g, j) => {
      const d = ((hasta - desde) * silabas(g.t)) / total;
      t0[a + 1 + j] = cursor;
      t1[a + 1 + j] = cursor + d;
      cursor += d;
    });
    k = b - 1;
  }

  // Whisper a veces marca el inicio de una palabra dentro de la pausa anterior.
  // Si un inicio cae en un silencio real del audio, se mueve al final del silencio.
  const silencios = silenciosDe(wav);
  let ajustadas = 0;
  const alFinalDelSilencio = (t) => {
    const s = silencios.find(([a, b]) => t >= a && t < b);
    if (!s) return t;
    ajustadas++;
    return s[1];
  };

  // Palabra de pantalla = desde su primer token hablado hasta el último.
  const palabras = pantalla.map((p, i) => {
    const suyos = tokens.map((tok, k) => (tok.indice === i ? k : -1)).filter((k) => k >= 0);
    const inicio = alFinalDelSilencio(t0[suyos[0]]);
    const fin = Math.max(inicio + 0.05, t1[suyos[suyos.length - 1]]);
    return { texto: p.texto, inicio: +inicio.toFixed(3), fin: +fin.toFixed(3), escena: p.escena };
  });

  // Cada escena empieza justo antes de su primera palabra; la última llega a 20 s.
  const inicios = escenas.map((_, e) =>
    e === 0 ? 0 : Math.max(0, palabras.find((p) => p.escena === e).inicio - ANTES_DE_FRASE),
  );
  const duraciones = inicios.map((ini, e) =>
    +((e + 1 < inicios.length ? inicios[e + 1] : DURACION_VIDEO) - ini).toFixed(3),
  );
  if (duracion > DURACION_VIDEO - 0.5) throw new Error(`${id}: la voz dura ${duracion}s, no cabe en ${DURACION_VIDEO}s`);

  const salida = {
    voz: VOZ,
    motor: 'supertonic3 (VoiceStudio)',
    velocidad,
    duracionVoz: +duracion.toFixed(3),
    audio: `voz/${id}.wav`,
    duraciones,
    textoHablado,
    transcripcion,
    tokensEmparejados: `${emparejados}/${tokens.length}`,
    palabras,
  };
  await writeFile(path.join(RAIZ, 'src/voz', `${id}.json`), JSON.stringify(salida, null, 2) + '\n');
  console.log(
    `${id}: voz ${duracion.toFixed(2)} s a x${velocidad} | escenas ${duraciones.join(' + ')} s | palabras alineadas ${emparejados}/${tokens.length} | inicios ajustados a silencio: ${ajustadas}`,
  );
};

const REUSAR = process.argv.includes('--reusar-voz');
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const videos = (await cargarVideos()).filter((v) => !pedidos.length || pedidos.includes(v.id));
if (!videos.length) throw new Error('No encontré videos en src/datos.ts');
for (const video of videos) await procesar(video);
