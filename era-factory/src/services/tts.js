// Servicio de voz del servidor: Kokoro (tools/tts_kokoro.py) + ffmpeg.
//
// narrate() genera un WAV por segmento con Kokoro, los convierte a MP3 y arma
// la pista completa con una pausa entre secciones. Los tiempos de cada
// sección salen de la duración REAL de su audio, no de una estimación.
// Archivos: <mediaRoot>/<productionId>/narration-<versión>/
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LANGUAGES } from "../voices.js";
import { MediaError, run } from "./process.js";

const SAMPLE_RATE = 24000;
const SECTION_PAUSE_S = 0.6;
const MP3_BITRATE = "128k";

export { MediaError as TTSError };
const TTSError = MediaError;

export function createTTS(
  { python = "python3", script, modelPath, voicesPath, mediaRoot, ffmpeg = "ffmpeg", engineLabel = "Kokoro v1.0" },
  { runImpl = run } = {},
) {
  function availability() {
    if (!existsSync(script)) return { ok: false, reason: "Falta tools/tts_kokoro.py." };
    if (!existsSync(modelPath) || !existsSync(voicesPath))
      return { ok: false, reason: "Faltan los archivos del modelo de voz. Ejecuta: bash tools/setup_kokoro.sh" };
    return { ok: true, reason: null };
  }

  async function synthesize({ segments, voice, language, speed, dir, signal, onProgress }) {
    const job = {
      model: modelPath,
      voices: voicesPath,
      voice,
      lang: LANGUAGES[language].kokoro,
      speed,
      segments: segments.map((s) => ({ id: s.id, text: s.text, out: join(dir, `${s.id}.wav`) })),
    };
    const durations = {};
    let failure = null;
    try {
      await runImpl(python, [script], {
        input: JSON.stringify(job),
        signal,
        onLine(line) {
          let event;
          try {
            event = JSON.parse(line);
          } catch {
            return; // líneas ajenas (avisos de librerías)
          }
          if (event.event === "segment") {
            durations[event.id] = event.duration;
            onProgress?.(event);
          } else if (event.event === "error") failure = event.message;
        },
      });
    } catch (err) {
      if (err instanceof TTSError) throw err;
      if (err.code === "ENOENT") throw new TTSError(`No se encontró ${python}. Instala Python 3.`, { kind: "config" });
      const detail = failure ?? err.stderr?.trim().split("\n").at(-1) ?? err.message;
      const missingPackage = /ModuleNotFoundError|No module named/.test(detail);
      throw new TTSError(
        missingPackage ? "Falta kokoro-onnx. Ejecuta: bash tools/setup_kokoro.sh" : `Kokoro falló: ${detail}`,
        { kind: missingPackage ? "config" : "llm" },
      );
    }
    for (const s of segments)
      if (!(durations[s.id] > 0)) throw new TTSError(`Kokoro no devolvió audio para «${s.label ?? s.id}».`);
    return durations;
  }

  async function ffmpegRun(args, signal) {
    try {
      await runImpl(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { signal });
    } catch (err) {
      if (err instanceof TTSError) throw err;
      if (err.code === "ENOENT") throw new TTSError("No se encontró ffmpeg. Instálalo en el servidor.", { kind: "config" });
      throw new TTSError(`ffmpeg falló: ${err.stderr?.trim().split("\n").at(-1) ?? err.message}`);
    }
  }

  async function assemble({ segments, dir, signal }) {
    const silence = join(dir, "pause.wav");
    await ffmpegRun(
      ["-f", "lavfi", "-i", `anullsrc=r=${SAMPLE_RATE}:cl=mono`, "-t", String(SECTION_PAUSE_S), "-c:a", "pcm_s16le", silence],
      signal,
    );
    const list = segments.flatMap((s, i) => [
      `file '${join(dir, `${s.id}.wav`)}'`,
      ...(i < segments.length - 1 ? [`file '${silence}'`] : []),
    ]);
    const listFile = join(dir, "list.txt");
    await writeFile(listFile, list.join("\n"));
    await ffmpegRun(["-f", "concat", "-safe", "0", "-i", listFile, "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, join(dir, "full.mp3")], signal);
    for (const s of segments)
      await ffmpegRun(["-i", join(dir, `${s.id}.wav`), "-c:a", "libmp3lame", "-b:a", MP3_BITRATE, join(dir, `${s.id}.mp3`)], signal);
    // Los WAV ya no hacen falta: el MP3 es lo que se escucha y lo que usará el montaje.
    for (const name of [...segments.map((s) => `${s.id}.wav`), "pause.wav", "list.txt"])
      await rm(join(dir, name), { force: true });
  }

  return {
    engine: engineLabel,
    availability,
    get available() {
      return availability().ok;
    },

    // segments: [{id, label, text}] -> { folder, segments: [{id, file, start, end, duration}], total }
    async narrate({ productionId, segments, voice, language, speed, signal, onProgress }) {
      if (!/^[\w-]+$/.test(productionId)) throw new TTSError("Identificador de producción no válido.");
      const status = availability();
      if (!status.ok) throw new TTSError(status.reason, { kind: "config" });
      const folder = `narration-${Date.now().toString(36)}`;
      const dir = join(mediaRoot, productionId, folder);
      await mkdir(dir, { recursive: true });
      try {
        const durations = await synthesize({ segments, voice, language, speed, dir, signal, onProgress });
        await assemble({ segments, dir, signal });
        let clock = 0;
        const timed = segments.map((s, i) => {
          const start = clock;
          const duration = durations[s.id];
          clock += duration + (i < segments.length - 1 ? SECTION_PAUSE_S : 0);
          return { id: s.id, file: `${folder}/${s.id}.mp3`, start: round(start), end: round(start + duration), duration };
        });
        // Las narraciones anteriores de esta producción ya no se usan.
        for (const old of await readdir(join(mediaRoot, productionId)).catch(() => []))
          if (old.startsWith("narration-") && old !== folder)
            await rm(join(mediaRoot, productionId, old), { recursive: true, force: true });
        return { folder, segments: timed, full: { file: `${folder}/full.mp3`, duration: round(clock) } };
      } catch (err) {
        await rm(dir, { recursive: true, force: true });
        throw err;
      }
    },

    removeProduction: (productionId) => rm(join(mediaRoot, productionId), { recursive: true, force: true }),
  };
}

const round = (n) => Math.round(n * 1000) / 1000;
