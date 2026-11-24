// Vistazo rapido: renderiza solo algunos fotogramas como JPG, sin hacer el video entero.
// Uso (desde la carpeta del proyecto):
//   node vistazo.mjs   (preparar.sh lo copia al proyecto)
//   node vistazo.mjs <carpeta-salida> [frame1 frame2 ...]
// Sin frames: saca uno a mitad de cada escena (lee public/reel/datos.json).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const salida = path.resolve(process.argv[2] ?? "vistazo");
fs.mkdirSync(salida, { recursive: true });
const datos = JSON.parse(fs.readFileSync("public/reel/datos.json", "utf8"));
let frames = process.argv.slice(3).map(Number);
if (!frames.length) frames = datos.escenas.map((e) => e.desde + Math.round(e.frames * 0.55));

const navegador = ["/opt/pw-browsers/chromium_headless_shell", process.env.REMOTION_CHROME].find(
  (p) => p && fs.existsSync(p),
);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id: "Reel", inputProps: datos, browserExecutable: navegador });
for (const f of frames) {
  const archivo = path.join(salida, `f${String(f).padStart(5, "0")}.jpg`);
  await renderStill({
    serveUrl,
    composition: comp,
    frame: f,
    output: archivo,
    inputProps: datos,
    imageFormat: "jpeg",
    jpegQuality: 85,
    browserExecutable: navegador,
    chromiumOptions: { gl: "angle" },
  });
  console.log("OK", archivo);
}
