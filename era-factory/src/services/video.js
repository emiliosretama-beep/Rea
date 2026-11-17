// Montaje del video (servidor): escenas con Pillow (tools/render_scenes.py) y
// MP4 con ffmpeg (H.264 + AAC, 1920×1080, 30 fps). Subtítulos .srt siempre;
// incrustados en la imagen solo si se piden. Archivos en
// <mediaRoot>/<productionId>/video-<versión>/
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MediaError, lastLine, run } from "./process.js";

export const FPS = 30;

export function createVideo(
  { python = "python3", script, fontsDir, mediaRoot, ffmpeg = "ffmpeg" },
  { runImpl = run } = {},
) {
  const fonts = { display: join(fontsDir, "Anton-Regular.ttf"), body: join(fontsDir, "AtkinsonHyperlegible-Bold.ttf") };

  function availability() {
    if (!existsSync(script)) return { ok: false, reason: "Falta tools/render_scenes.py." };
    if (!existsSync(fonts.display) || !existsSync(fonts.body))
      return { ok: false, reason: "Faltan las fuentes del video. Ejecuta: bash tools/setup.sh" };
    return { ok: true, reason: null };
  }

  async function renderScenes({ scenes, palette, size, dir, signal, onProgress }) {
    const job = {
      width: size.width,
      height: size.height,
      fonts,
      palette,
      scenes: scenes.map((s) => ({ id: s.id, kind: s.kind, text: s.text, context: s.context ?? "", out: join(dir, `${s.id}.png`) })),
    };
    let failure = null;
    try {
      await runImpl(python, [script], {
        input: JSON.stringify(job),
        signal,
        onLine(line) {
          try {
            const e = JSON.parse(line);
            if (e.event === "scene") onProgress?.({ stage: "scenes", ...e });
            if (e.event === "error") failure = e.message;
          } catch {}
        },
      });
    } catch (err) {
      if (err instanceof MediaError) throw err;
      const detail = failure ?? lastLine(err);
      const missing = /No module named 'PIL'|ModuleNotFoundError/.test(detail);
      throw new MediaError(missing ? "Falta Pillow. Ejecuta: bash tools/setup.sh" : `No se pudieron dibujar las escenas: ${detail}`, {
        kind: missing ? "config" : "llm",
      });
    }
  }

  async function encode({ scenes, audioFile, totalDuration, burnSubtitles, dir, signal, onProgress }) {
    // Las escenas ya tienen el tamaño final; los subtítulos incrustados salen del .ass.
    // Lista para el demuxer concat: cada imagen con su duración (la última se repite: así lo exige ffmpeg).
    const list = scenes.flatMap((s) => [`file '${s.id}.png'`, `duration ${s.duration.toFixed(3)}`]);
    list.push(`file '${scenes.at(-1).id}.png'`);
    await writeFile(join(dir, "scenes.txt"), list.join("\n"));
    let vf = `fps=${FPS},format=yuv420p`;
    if (burnSubtitles) vf += `,ass=subtitles.ass:fontsdir='${fontsDir.replaceAll("'", "")}'`;
    const args = [
      "-hide_banner", "-loglevel", "error", "-y", "-progress", "pipe:1", "-nostats",
      "-f", "concat", "-safe", "0", "-i", "scenes.txt",
      "-i", audioFile,
      "-vf", vf,
      "-af", "apad",
      "-map", "0:v", "-map", "1:a",
      "-t", totalDuration.toFixed(3),
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "20", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      "video.mp4",
    ];
    try {
      await runImpl(ffmpeg, args, {
        cwd: dir,
        signal,
        onLine(line) {
          const m = /^out_time_us=(\d+)/.exec(line);
          if (m) onProgress?.({ stage: "encode", percent: Math.min(100, Math.round(Number(m[1]) / 1e6 / totalDuration * 100)) });
        },
      });
    } catch (err) {
      if (err instanceof MediaError) throw err;
      if (err.code === "ENOENT") throw new MediaError("No se encontró ffmpeg. Instálalo en el servidor.", { kind: "config" });
      throw new MediaError(`ffmpeg no pudo montar el video: ${lastLine(err)}`);
    }
    await rm(join(dir, "scenes.txt"), { force: true });
  }

  return {
    availability,
    mediaPath: (productionId, file) => join(mediaRoot, productionId, file),
    get available() {
      return availability().ok;
    },

    // size: {width, height} (1920×1080 horizontal, 1080×1920 Shorts); ass: subtítulos para incrustar.
    // -> { folder, video: {file, duration, width, height, sizeBytes}, subtitles: {file}, scenes: [{...scene, file}] }
    // coverFile (opcional): PNG del tamaño del video que reemplaza la última escena (portada de un Short).
    async produce({ productionId, scenes, palette, size, audioFile, totalDuration, srt, ass, burnSubtitles, coverFile, signal, onProgress }) {
      if (!/^[\w-]+$/.test(productionId)) throw new MediaError("Identificador de producción no válido.");
      const status = availability();
      if (!status.ok) throw new MediaError(status.reason, { kind: "config" });
      if (!existsSync(audioFile)) throw new MediaError("No se encuentra el audio de la narración. Rehaz la narración.", { kind: "config" });
      const folder = `video-${Date.now().toString(36)}`;
      const dir = join(mediaRoot, productionId, folder);
      await mkdir(dir, { recursive: true });
      try {
        await writeFile(join(dir, "subtitles.srt"), srt);
        if (burnSubtitles) await writeFile(join(dir, "subtitles.ass"), ass);
        await renderScenes({ scenes, palette, size, dir, signal, onProgress });
        if (coverFile) await copyFile(coverFile, join(dir, `${scenes.at(-1).id}.png`));
        await encode({ scenes, audioFile, totalDuration, burnSubtitles, dir, signal, onProgress });
        const { size: bytes } = await stat(join(dir, "video.mp4"));
        for (const old of await readdir(join(mediaRoot, productionId)).catch(() => []))
          if (old.startsWith("video-") && old !== folder) await rm(join(mediaRoot, productionId, old), { recursive: true, force: true });
        return {
          folder,
          video: { file: `${folder}/video.mp4`, duration: totalDuration, width: size.width, height: size.height, sizeBytes: bytes },
          subtitles: { file: `${folder}/subtitles.srt` },
          scenes: scenes.map((s) => ({ ...s, file: `${folder}/${s.id}.png` })),
        };
      } catch (err) {
        await rm(dir, { recursive: true, force: true });
        throw err;
      }
    },
  };
}
