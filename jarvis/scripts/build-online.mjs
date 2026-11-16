// Arma las dos versiones de Jarvis a partir de public/:
// - online/jarvis.html: un único HTML para publicar en claude.ai.
// - site/index.html: la versión independiente que sirve el Worker de
//   Cloudflare (ver wrangler.toml), con micrófono propio.
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
  "public/site.js",
  "public/siteservices.js",
  "public/voice.js",
  "public/core.js",
  "public/ui.js",
  "public/chat.js",
  "public/panels.js",
  "public/session.js",
  "public/status.js",
  "public/talk.js",
  "public/voicepanel.js",
  "public/handsfree.js",
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

const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts[0].replace(/\s+/g, " ")}`;
// Un "</script" literal dentro del código cerraría la etiqueta embebida.
const appScript = `<script type="module">
${js.replaceAll("</script", "<\\/script")}
</script>`;

// Para claude.ai: un fragmento (sin <html> ni <head>); el visor lo envuelve
// en su propio esqueleto al publicarlo.
const html = `${title}
<meta name="claude:viewport-fit-sides" content="cover">
${fontLinks}
<style>
${css.trim()}
</style>
${body.trim()}
${appScript}
`;

// Para el Worker: un documento completo. JARVIS_SITE le dice a la app que la
// IA y la memoria salen del Worker y que puede usar el micrófono.
const reset = head.match(/<style>[\s\S]*?<\/style>/)[0];
const meta = [
  ...head.matchAll(/<meta\s+name="(?:description|theme-color)"[^>]*>/g),
].map((found) => found[0].replace(/\s+/g, " "));
const favicon = `data:image/svg+xml,${encodeURIComponent((await read("public/favicon.svg")).trim())}`;
const site = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${title}
${meta.join("\n")}
<meta name="apple-mobile-web-app-title" content="Jarvis">
<link rel="icon" href="${favicon}" type="image/svg+xml">
${fontLinks}
${reset.replace(/\s+/g, " ")}
<style>
${css.trim()}
</style>
<script>window.JARVIS_SITE = true;</script>
</head>
<body>
${body.trim()}
${appScript}
</body>
</html>
`;

const outputs = [
  ["online/jarvis.html", html],
  ["site/index.html", site],
];
for (const [path, content] of outputs) {
  await mkdir(new URL(path.split("/")[0] + "/", root), { recursive: true });
  await writeFile(new URL(path, root), content);
  console.log(`${path} · ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}
