// Arma la versión online de ERA Factory: un único HTML para publicar en
// claude.ai. Empaqueta con esbuild el mismo código de public/ y src/ (sin
// nada de Node) y lo junta con index.html, styles.css y el logo.
//   npm run build:online  ->  online/era-factory.html
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const bundle = await build({
  entryPoints: [new URL("src/cloud/entry.js", root).pathname],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["safari16", "chrome110"],
  write: false,
  minify: true,
  legalComments: "none",
  // app.js no se arranca sola: la arranca entry.js cuando el backend está listo.
  banner: { js: "globalThis.__ERA_CLOUD__ = true;" },
});
let js = bundle.outputFiles[0].text;
if (/\bfrom\s*["']node:|require\(["']node:/.test(js)) throw new Error("El paquete online incluye módulos de Node.");

const [index, css, favicon] = await Promise.all([read("public/index.html"), read("public/styles.css"), read("public/favicon.svg")]);
const head = index.slice(index.indexOf("<head>") + 6, index.indexOf("</head>"));
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = [...head.matchAll(/<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g)].map((m) => m[0]);

const faviconUri = `data:image/svg+xml,${encodeURIComponent(favicon.trim())}`;
let body = index.slice(index.indexOf("<body>") + 6, index.indexOf("</body>"));
body = body
  .replace(/\s*<script[^>]*src="\/app\.js"[^>]*><\/script>/, "")
  .replaceAll('"/favicon.svg"', `"${faviconUri}"`)
  .replace('<div id="view" tabindex="-1"></div>', '<div id="view" tabindex="-1"><div class="skeleton"></div></div>');
if (body.includes("/favicon.svg")) throw new Error("Quedó una referencia a /favicon.svg");

// Ajustes del marco de claude.ai: ya rellena arriba/abajo con las zonas
// seguras del teléfono, y pide el margen lateral con max().
const cloudCss = `
.view { padding-top: 16px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
@media (min-width: 900px) { .view { padding: 30px 34px 48px; } }`;

js = js.replaceAll("</script", "<\\/script");
const html = `${title}
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Fábrica de canales de YouTube con agentes de IA que investigan, deciden y escriben bajo tu supervisión.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts.join("\n")}
<style>
${css}
${cloudCss}
</style>
${body.trim()}
<script type="module">
${js}
</script>
`;

await mkdir(new URL("online/", root), { recursive: true });
await writeFile(new URL("online/era-factory.html", root), html);
console.log(`online/era-factory.html · ${(html.length / 1024).toFixed(0)} KB`);
