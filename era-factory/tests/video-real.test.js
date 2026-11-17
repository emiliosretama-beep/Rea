// Integración REAL: Kokoro + Pillow + ffmpeg. Se salta si falta algo (bash tools/setup.sh).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PALETTES } from "../public/thumbs/catalog.js";
import { createServer } from "../server.js";
import { loadConfig } from "../src/config.js";
import { createTTS } from "../src/services/tts.js";
import { createVideo } from "../src/services/video.js";
import { END_CARD_SECONDS, buildScenes, subtitleCues, timeSentences, toSrt } from "../src/timeline.js";
import { makeFactory } from "./helpers.js";

const config = loadConfig({});
const mediaRootProbe = createVideo({ ...config.video, mediaRoot: tmpdir() });
const tts = createTTS({ ...config.tts, mediaRoot: tmpdir() });
const ready = mediaRootProbe.availability().ok && tts.availability().ok;

test("video real: narración, escenas y MP4 1920×1080 con audio, entregado por rangos", { skip: !ready && "faltan Kokoro, Pillow o las fuentes" }, async (t) => {
  const mediaRoot = await mkdtemp(join(tmpdir(), "era-video-"));
  t.after(() => rm(mediaRoot, { recursive: true, force: true }));
  const voice = createTTS({ ...config.tts, mediaRoot });
  const video = createVideo({ ...config.video, mediaRoot });
  const segments = [
    { id: "hook", label: "Gancho", text: "Esto es una prueba real. Dura muy poco." },
    { id: "outro", label: "Cierre", text: "Gracias por ver." },
  ];
  const n = await voice.narrate({ productionId: "p1", segments, voice: "ef_dora", language: "es", speed: 1.2 });
  const timed = timeSentences(segments.map((s) => ({ ...s, ...n.segments.find((x) => x.id === s.id) })));
  const total = n.full.duration + END_CARD_SECONDS;
  const scenes = buildScenes(timed, {}, { title: "Prueba", channel: "Canal", callToAction: "Gracias", totalDuration: total });
  const r = await video.produce({
    productionId: "p1", scenes, palette: PALETTES.menta, audioFile: video.mediaPath("p1", n.full.file),
    totalDuration: total, srt: toSrt(subtitleCues(timed)), burnSubtitles: true,
  });
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height:format=duration", "-of", "json", join(mediaRoot, "p1", r.video.file)]));
  const v = probe.streams.find((s) => s.codec_type === "video");
  const a = probe.streams.find((s) => s.codec_type === "audio");
  assert.deepEqual([v.codec_name, v.width, v.height, a.codec_name], ["h264", 1920, 1080, "aac"]);
  assert.ok(Math.abs(Number(probe.format.duration) - total) < 0.2, `duración ${probe.format.duration} ≈ ${total}`);
  assert.match(await readFile(join(mediaRoot, "p1", r.subtitles.file), "utf8"), /Esto es una prueba real\./);

  const { factory } = await makeFactory({ env: { FACTORY_MEDIA: mediaRoot } });
  const server = createServer(factory);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.close();
    await factory.close();
  });
  const res = await fetch(`http://127.0.0.1:${server.address().port}/media/p1/${r.video.file}`, { headers: { Range: "bytes=0-1023" } });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-type"), "video/mp4");
});
