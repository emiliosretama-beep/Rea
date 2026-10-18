// Arma la versión online de Rea Studio: un único HTML para publicar en claude.ai.
// Junta index.html, styles.css, el logo y los módulos JS de public/ en un
// solo archivo, sin cambiar la lógica (backend.js detecta que corre online).
//   node scripts/build-online.mjs  ->  online/rea-studio.html
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// Orden de dependencias: cada módulo va después de los que importa.
const MODULES = [
  "public/prompt.js",
  "public/demo.js",
  "public/backend.js",
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

const [index, css, favicon, ...modules] = await Promise.all([
  read("public/index.html"),
  read("public/styles.css"),
  read("public/favicon.svg"),
  ...MODULES.map(read),
]);

const head = index.slice(index.indexOf("<head>") + 6, index.indexOf("</head>"));
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = [
  ...head.matchAll(
    /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g,
  ),
].map((m) => m[0]);

let body = index.slice(index.indexOf("<body>") + 6, index.indexOf("</body>"));
body = body.replace(/\s*<script[^>]*src="\/app\.js"[^>]*><\/script>/, "");

// El logo va embebido para no depender de archivos sueltos.
const faviconUri = `data:image/svg+xml,${encodeURIComponent(favicon.trim())}`;
const js = modules
  .map((code, i) => stripModuleSyntax(code, MODULES[i]))
  .join("\n")
  .replaceAll('"/favicon.svg"', JSON.stringify(faviconUri))
  // Un "</script" literal dentro del código cerraría la etiqueta embebida.
  .replaceAll("</script", "<\\/script");
body = body.replaceAll('"/favicon.svg"', `"${faviconUri}"`);
if (body.includes("/favicon.svg") || js.includes("/favicon.svg"))
  throw new Error("Quedó una referencia a /favicon.svg");

const html = `${title}
<link rel="preconnect" href="https://fonts.googleapis.com" />
${fonts.join("\n")}
<style>
${css}
</style>
${body.trim()}
<script type="module">
${js}
</script>
`;

await mkdir(new URL("online/", root), { recursive: true });
await writeFile(new URL("online/rea-studio.html", root), html);
console.log(
  `online/rea-studio.html · ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`,
);
