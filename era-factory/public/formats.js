// Formatos de video por canal. Una sola fuente para agentes, montaje e
// interfaz. Shorts: guía de la skill videos-verticales-ia (9:16, 1080×1920,
// gancho en 2 s, un cambio cada 2-4 s, subtítulos siempre, texto al centro).

export const FORMATS = {
  short: {
    label: "Shorts verticales 9:16 (15–60 s)",
    width: 1080,
    height: 1920,
    minSeconds: 15,
    maxSeconds: 60,
    defaultSeconds: 30,
    beatEvery: "2 a 4",
    minSections: 2,
    maxHookWords: 15,
    burnSubtitles: true, // mucha gente ve los Shorts sin sonido
    subtitleWords: 3, // subtítulos de pocas palabras: retienen más en vertical
  },
  long: {
    label: "Videos horizontales 16:9",
    width: 1920,
    height: 1080,
    minSeconds: 60,
    maxSeconds: 3600,
    defaultSeconds: 480,
    beatEvery: "4 a 10",
    minSections: 3,
    maxHookWords: 70,
    burnSubtitles: false, // en YouTube es mejor subir el .srt
    subtitleWords: null, // frases completas, 2 líneas de 42 caracteres
  },
};

// Canales creados antes de existir el campo eran horizontales.
export const formatId = (channel) => (FORMATS[channel?.format] ? channel.format : "long");
export const formatOf = (channel) => FORMATS[formatId(channel)];

// Duración objetivo en segundos (decisiones antiguas venían en minutos).
export const targetSecondsOf = (decision) =>
  decision?.targetLengthSeconds ?? (decision?.targetLengthMinutes ? decision.targetLengthMinutes * 60 : null);

export const durationLabel = (seconds) =>
  seconds < 90 ? `${Math.round(seconds)} s` : `${Math.round(seconds / 60)} min`;
