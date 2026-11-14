// Genera dist/index.html: un solo archivo con JS, CSS y fuente incluidos.
// Uso: npm run build
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

// npm run build:release -> versión para itch.io (sin ayudas de prueba) en release/index.html
const RELEASE = process.argv.includes('--release');
const js = await build({
  entryPoints: ['src/main.js'],
  define: RELEASE ? { 'globalThis.R66_RELEASE': 'true' } : {},
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['safari15', 'chrome100', 'firefox100'],
  write: false,
});
const css = await build({
  entryPoints: ['styles.css'],
  bundle: true,
  minify: true,
  loader: { '.woff2': 'dataurl' },
  write: false,
});

const jsText = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const cssText = css.outputFiles[0].text;

let html = await readFile('index.html', 'utf8');
const swap = (needle, value) => {
  if (!html.includes(needle)) throw new Error(`build: no se encontró ${needle} en index.html`);
  html = html.replace(needle, () => value);
};
swap('<link rel="stylesheet" href="styles.css">', `<style>${cssText}</style>`);
swap('<script type="module" src="src/main.js"></script>', `<script>${jsText}</script>`);

const outDir = RELEASE ? 'release' : 'dist';
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/index.html`, html);
console.log(`${outDir}/index.html listo (${(html.length / 1024).toFixed(0)} KB)`);
