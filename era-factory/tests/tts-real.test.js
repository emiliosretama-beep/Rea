// Integración REAL: Kokoro + ffmpeg + entrega por rangos. Se salta (y lo dice)
// si el modelo no está instalado: bash tools/setup_kokoro.sh
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadConfig } from "../src/config.js";
import { createServer } from "../server.js";
import { createTTS } from "../src/services/tts.js";
import { makeFactory } from "./helpers.js";

const config = loadConfig({});
const installed = existsSync(config.tts.modelPath) && existsSync(config.tts.voicesPath);

test("Kokoro real: narra, arma la pista con pausas y el servidor la entrega por rangos", { skip: !installed && "Kokoro no instalado" }, async (t) => {
  const mediaRoot = await mkdtemp(join(tmpdir(), "era-media-"));
  t.after(() => rm(mediaRoot, { recursive: true, force: true }));
  const tts = createTTS({ ...config.tts, mediaRoot });
  const progress = [];
  const result = await tts.narrate({
    productionId: "p1",
    voice: "ef_dora",
    language: "es",
    speed: 1,
    segments: [
      { id: "hook", label: "Gancho", text: "Esto es una prueba real del narrador." },
      { id: "outro", label: "Cierre", text: "Gracias por escuchar." },
    ],
    onProgress: (e) => progress.push(e.id),
  });
  assert.deepEqual(progress, ["hook", "outro"]);
  const [hook, outro] = result.segments;
  assert.ok(hook.duration > 1 && outro.duration > 0.5);
  assert.equal(outro.start, Math.round((hook.duration + 0.6) * 1000) / 1000, "pausa de 0,6 s entre secciones");
  assert.ok(existsSync(join(mediaRoot, "p1", result.full.file)));

  // Una segunda narración reemplaza a la anterior (no se acumulan archivos).
  const again = await tts.narrate({ productionId: "p1", voice: "em_alex", language: "es", speed: 1.2, segments: [{ id: "hook", text: "Otra vez." }] });
  assert.equal(existsSync(join(mediaRoot, "p1", result.folder)), false);

  const { factory } = await makeFactory({ env: { FACTORY_MEDIA: mediaRoot } });
  const server = createServer(factory);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    server.close();
    await factory.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/media/p1/${again.full.file}`;
  const partial = await fetch(url, { headers: { Range: "bytes=0-99" } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("content-type"), "audio/mpeg");
  assert.equal((await partial.arrayBuffer()).byteLength, 100);
  assert.equal((await fetch(url.replace("full.mp3", "../../etc.mp3"))).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/media/p1/x/full.mp3`)).status, 404);
});
