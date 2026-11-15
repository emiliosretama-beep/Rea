// Arma la versión online de Jarvis: un único HTML para publicar en claude.ai.
// Junta index.html, styles.css y los módulos JS de public/ en un solo archivo,
// sin cambiar la lógica (backend.js y store.js detectan que corren online).
//   node scripts/build-online.mjs  ->  online/jarvis.html
// El resultado es un fragmento (sin <html> ni <head>): el visor de claude.ai lo
// envuelve en su propio esqueleto al publicarlo.
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// Orden de dependencias: cada módulo va después de los que importa.
const MODULES = [
  "public/prompt.js",
  "public/markdown.js",
  "public/store.js",
  "public/demo.js",
  "public/backend.js",
  "public/voice.js",
  "public/core.js",
  "public/ui.js",
  "public/chat.js",
  "public/panels.js",
  "public/session.js",
  "public/status.js",
  "public/app.js",
];

function stripModuleSyntax(code, file) {
  const out = code
    .replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm, "");
  if (/^\s*(import|export)\s/m.test(out))
    throw new Error(`Sintaxis de módulo sin convertir en ${file}`);
  return `// ---- ${file} ----\n${out.trim()}\n`;
}

// Al quedar todos los módulos en un mismo ámbito, dos con el mismo nombre de
// función o constante chocarían: Node lo detecta al revisar la sintaxis.
async function checkSyntax(js) {
  const dir = await mkdtemp(join(tmpdir(), "jarvis-build-"));
  const file = join(dir, "bundle.mjs");
  try {
    await writeFile(file, js);
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    throw new Error(
      `El JS unido no es válido:\n${error.stderr ?? error.message}`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const [index, css, ...modules] = await Promise.all([
  read("public/index.html"),
  read("public/styles.css"),
  ...MODULES.map(read),
]);

const head = index.slice(index.indexOf("<head>") + 6, index.indexOf("</head>"));
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = head.match(
  /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/,
);
if (!fonts)
  throw new Error("No encontré el enlace de Google Fonts en index.html");

let body = index.slice(index.indexOf("<body>") + 6, index.indexOf("</body>"));
body = body.replace(/\s*<script[^>]*src="app\.js"[^>]*><\/script>/, "");
if (/<script/.test(body))
  throw new Error("Quedó un <script> sin unir en el body");

const js = modules
  .map((code, i) => stripModuleSyntax(code, MODULES[i]))
  .join("\n");
await checkSyntax(js);

const html = `${title}
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts[0].replace(/\s+/g, " ")}
<style>
${css.trim()}
</style>
${body.trim()}
<script type="module">
${
  // Un "</script" literal dentro del código cerraría la etiqueta embebida.
  js.replaceAll("</script", "<\\/script")
}
</script>
`;

await mkdir(new URL("online/", root), { recursive: true });
await writeFile(new URL("online/jarvis.html", root), html);
console.log(
  `online/jarvis.html · ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`,
);
