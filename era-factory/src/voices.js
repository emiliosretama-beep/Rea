// Catálogo de voces de Kokoro v1.0 (archivo voices-v1.0.bin). La lista sale
// de Kokoro.get_voices() con ese archivo; si cambias de archivo de voces,
// actualízala. El prefijo de cada id dice idioma (1.ª letra) y género (2.ª).
// Sin nada de Node: lo usan el servidor, los agentes y la interfaz.

export const LANGUAGES = {
  es: { label: "Español", kokoro: "es", prefix: "e", defaultVoice: "em_alex" },
  "en-us": { label: "Inglés (EE. UU.)", kokoro: "en-us", prefix: "a", defaultVoice: "af_heart" },
  "en-gb": { label: "Inglés (Reino Unido)", kokoro: "en-gb", prefix: "b", defaultVoice: "bf_emma" },
  "pt-br": { label: "Portugués (Brasil)", kokoro: "pt-br", prefix: "p", defaultVoice: "pf_dora" },
  fr: { label: "Francés", kokoro: "fr-fr", prefix: "f", defaultVoice: "ff_siwis" },
  it: { label: "Italiano", kokoro: "it", prefix: "i", defaultVoice: "if_sara" },
  ja: { label: "Japonés", kokoro: "ja", prefix: "j", defaultVoice: "jf_alpha" },
  zh: { label: "Chino mandarín", kokoro: "cmn", prefix: "z", defaultVoice: "zf_xiaobei" },
  hi: { label: "Hindi", kokoro: "hi", prefix: "h", defaultVoice: "hf_alpha" },
};

const VOICE_IDS = [
  "af_alloy", "af_aoede", "af_bella", "af_heart", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river",
  "af_sarah", "af_sky", "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx",
  "am_puck", "am_santa", "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", "bm_george",
  "bm_lewis", "ef_dora", "em_alex", "em_santa", "ff_siwis", "hf_alpha", "hf_beta", "hm_omega", "hm_psi",
  "if_sara", "im_nicola", "jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro", "jm_kumo", "pf_dora",
  "pm_alex", "pm_santa", "zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", "zm_yunjian", "zm_yunxi",
  "zm_yunxia", "zm_yunyang",
];

const languageOfPrefix = Object.fromEntries(Object.entries(LANGUAGES).map(([code, l]) => [l.prefix, code]));

export const VOICES = VOICE_IDS.map((id) => {
  const name = id.split("_")[1];
  return {
    id,
    language: languageOfPrefix[id[0]],
    gender: id[1] === "f" ? "femenina" : "masculina",
    label: name.charAt(0).toUpperCase() + name.slice(1),
  };
});

export const voiceById = (id) => VOICES.find((v) => v.id === id) ?? null;
export const voicesFor = (language) => VOICES.filter((v) => v.language === language);

// Idioma del canal (texto libre) -> código del catálogo, o null si Kokoro no lo tiene.
const ALIASES = {
  español: "es", espanol: "es", spanish: "es", castellano: "es", es: "es",
  inglés: "en-us", ingles: "en-us", english: "en-us", en: "en-us", "en-us": "en-us",
  "inglés británico": "en-gb", "en-gb": "en-gb",
  portugués: "pt-br", portugues: "pt-br", portuguese: "pt-br", pt: "pt-br", "pt-br": "pt-br",
  francés: "fr", frances: "fr", french: "fr", fr: "fr",
  italiano: "it", italian: "it", it: "it",
  japonés: "ja", japones: "ja", japanese: "ja", ja: "ja",
  chino: "zh", mandarín: "zh", mandarin: "zh", zh: "zh",
  hindi: "hi", hi: "hi",
};
export const narrationLanguage = (channelLanguage) => ALIASES[String(channelLanguage || "").trim().toLowerCase()] ?? null;

export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.3;

// Ajustes de narración válidos a partir de lo que pidió el usuario y del canal.
export function resolveNarration(channelLanguage, requested = {}) {
  const voice = voiceById(requested.voice);
  const language = voice?.language ?? narrationLanguage(channelLanguage);
  if (!language) return { error: `Kokoro no tiene voces en «${channelLanguage}». Elige una voz de otro idioma.` };
  const speed = Number(requested.speed);
  return {
    language,
    voice: voice?.id ?? LANGUAGES[language].defaultVoice,
    speed: Number.isFinite(speed) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(speed * 100) / 100)) : 1,
  };
}
