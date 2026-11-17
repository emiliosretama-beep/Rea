// Línea de tiempo del video, a partir de la narración REAL (duración de cada
// sección medida en su audio). Dentro de una sección, el tiempo de cada frase
// se reparte según su número de palabras: es una aproximación (±1 s), porque
// Kokoro no devuelve tiempos fiables por palabra. Módulo puro (sin Node).

export const END_CARD_SECONDS = 3;
const MIN_SCENE = 1.2;
const SRT_LINE = 42;

const words = (text) => (String(text).match(/\S+/g) || []).length;
const round = (n) => Math.round(n * 1000) / 1000;

export function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?…])\s+(?=[^\s])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

// segments: [{id, label, text, start, end, duration}] (salida del narrador)
// -> mismas secciones con sus frases y el tiempo de cada una.
export function timeSentences(segments) {
  return segments.map((seg) => {
    const sentences = splitSentences(seg.text);
    const total = sentences.reduce((n, s) => n + words(s), 0) || 1;
    let clock = seg.start;
    return {
      ...seg,
      sentences: sentences.map((text) => {
        const duration = (seg.duration * words(text)) / total;
        const item = { text, start: round(clock), end: round(clock + duration) };
        clock += duration;
        return item;
      }),
    };
  });
}

// Escenas: tarjeta de título (gancho), tarjeta de cada sección, los momentos
// que eligió el productor y la tarjeta final. Sin huecos ni solapes.
// plan: { [segmentId]: [{ fromSentence, onScreen, kind }] }
export function buildScenes(timed, plan, { title, channel, callToAction, totalDuration }) {
  const raw = [];
  timed.forEach((seg, index) => {
    const beats = [...(plan[seg.id] ?? [])].sort((a, b) => a.fromSentence - b.fromSentence);
    const segEnd = index < timed.length - 1 ? timed[index + 1].start : seg.end;
    const at = (i) => seg.sentences[Math.min(i, seg.sentences.length - 1)]?.start ?? seg.start;
    if (seg.id === "hook") raw.push({ kind: "title", text: title, context: channel, start: seg.start });
    else if (seg.id !== "outro") raw.push({ kind: "section", text: seg.label, context: `Parte ${index}`, start: seg.start });
    for (const beat of beats) {
      // La tarjeta de título o de sección se ve al menos un momento.
      const start = Math.max(at(beat.fromSentence), raw.length && raw.at(-1).start >= seg.start ? raw.at(-1).start + 2.5 : seg.start);
      if (start < segEnd - MIN_SCENE / 2) raw.push({ kind: beat.kind, text: beat.onScreen, context: seg.id === "hook" ? "" : seg.label, start });
    }
  });
  const narrationEnd = timed.at(-1)?.end ?? 0;
  raw.push({ kind: "end", text: callToAction || "Gracias por ver", context: channel, start: narrationEnd });
  // Fin de cada escena = inicio de la siguiente; se descartan las demasiado cortas.
  const scenes = [];
  raw.forEach((scene, i) => {
    const end = i < raw.length - 1 ? raw[i + 1].start : totalDuration;
    if (end - scene.start < MIN_SCENE && scene.kind !== "end" && scenes.length) {
      return; // la anterior se alarga hasta la siguiente
    }
    scenes.push({ ...scene, start: round(scene.start), end: round(end) });
  });
  for (let i = 0; i < scenes.length - 1; i++) scenes[i].end = scenes[i + 1].start;
  scenes.at(-1).end = round(totalDuration);
  return scenes.map((s, i) => ({ id: `scene-${String(i + 1).padStart(3, "0")}`, ...s, duration: round(s.end - s.start) }));
}

// ---------- Subtítulos (SRT) ----------

function wrap(text, width = SRT_LINE) {
  const lines = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if (line && (line + " " + w).length > width) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines;
}

// Cada subtítulo: como mucho 2 líneas de 42 caracteres. Con maxWords (Shorts),
// trozos de pocas palabras en una sola línea: se leen de un vistazo.
export function subtitleCues(timed, { maxWords = null } = {}) {
  const cues = [];
  for (const seg of timed)
    for (const s of seg.sentences) {
      const chunks = [];
      if (maxWords) {
        const ws = s.text.split(/\s+/).filter(Boolean);
        for (let i = 0; i < ws.length; i += maxWords) chunks.push([ws.slice(i, i + maxWords).join(" ")]);
      } else {
        const lines = wrap(s.text);
        for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2));
      }
      const total = chunks.reduce((n, c) => n + words(c.join(" ")), 0) || 1;
      let clock = s.start;
      for (const chunk of chunks) {
        const duration = ((s.end - s.start) * words(chunk.join(" "))) / total;
        cues.push({ start: round(clock), end: round(clock + duration), lines: chunk });
        clock += duration;
      }
    }
  return cues;
}

const srtTime = (t) => {
  const ms = Math.round(t * 1000);
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

export const toSrt = (cues) =>
  cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.lines.join("\n")}\n`).join("\n");

// ASS para incrustar los subtítulos: tamaño y posición exactos en píxeles del
// video (con .srt, libass usa una escala propia y el tamaño se adivina).
const assTime = (t) => {
  const cs = Math.round(t * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const assText = (t) => t.replace(/\\/g, "\\\\").replace(/[{}]/g, "").replace(/\n/g, " ");

export function toAss(cues, { width, height, vertical }) {
  const size = Math.round(Math.min(width, height) * (vertical ? 0.095 : 0.045));
  // Vertical: por encima del título y los botones de YouTube (≈30 % inferior).
  const marginV = Math.round(height * (vertical ? 0.3 : 0.06));
  const outline = Math.max(3, Math.round(size * 0.08));
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,Atkinson Hyperlegible,${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${outline},0,2,${Math.round(width * 0.08)},${Math.round(width * (vertical ? 0.17 : 0.08))},${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${c.lines.map(assText).join("\\N")}`),
    "",
  ].join("\n");
}

// ---------- Capítulos de YouTube ----------
// YouTube los acepta si empiezan en 0:00, hay al menos 3 y cada uno dura 10 s o más.

const clock = (t) => {
  const s = Math.floor(t);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor(s / 60) % 60).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
};

export function youtubeChapters(timed, totalDuration) {
  const chapters = timed.map((seg, i) => ({
    time: i === 0 ? 0 : seg.start,
    label: seg.id === "hook" ? "Introducción" : seg.id === "outro" ? "Cierre" : seg.label,
  }));
  if (chapters.length < 3) return { chapters: [], text: "", reason: "Hacen falta al menos 3 capítulos." };
  for (let i = 0; i < chapters.length; i++) {
    const end = i < chapters.length - 1 ? chapters[i + 1].time : totalDuration;
    if (end - chapters[i].time < 10)
      return { chapters: [], text: "", reason: `«${chapters[i].label}» dura menos de 10 s; YouTube no lo aceptaría como capítulo.` };
  }
  return { chapters, text: chapters.map((c) => `${clock(c.time)} ${c.label}`).join("\n"), reason: null };
}
