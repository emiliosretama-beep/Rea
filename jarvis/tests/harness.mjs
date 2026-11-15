// Arnés para probar Jarvis en un navegador real (Chromium con Playwright).
// Abre online/jarvis.html envuelto en el mismo esqueleto que usa claude.ai al
// publicar, con el visor simulado de fake-claude.js (o sin él: modo demo).
//
// Playwright no es dependencia del repo: tiene que estar instalado en el
// entorno (las sesiones de Claude Code en la nube ya lo traen).
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const here = fileURLToPath(new URL("./", import.meta.url));
const ORIGIN = "http://jarvis.test";

// Copiado de un artifact publicado: es lo que el visor pone alrededor de la página.
const SKELETON =
  "<!doctype html><html><head><meta charset=utf8>" +
  '<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  "<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);" +
  "padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}" +
  "body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}" +
  "img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n";

// Las fuentes de Google se sirven desde una carpeta local si JARVIS_FONTS la
// señala (fonts.css + los .woff2 con "/" cambiado por "_"); si no, se bloquean
// y la página usa sus fuentes de respaldo.
async function routeFonts(context) {
  const dir = process.env.JARVIS_FONTS;
  const css = dir
    ? await readFile(join(dir, "fonts.css"), "utf8").catch(() => null)
    : null;
  await context.route("https://fonts.googleapis.com/**", (route) =>
    css ? route.fulfill({ contentType: "text/css", body: css }) : route.abort(),
  );
  await context.route("https://fonts.gstatic.com/**", async (route) => {
    const name = new URL(route.request().url()).pathname
      .slice(1)
      .replaceAll("/", "_");
    const body = dir ? await readFile(join(dir, name)).catch(() => null) : null;
    if (!body) return route.abort();
    return route.fulfill({
      contentType: "font/woff2",
      headers: { "access-control-allow-origin": "*" },
      body,
    });
  });
}

export async function launch() {
  const browser = await chromium.launch();
  const fragment = await readFile(join(here, "../online/jarvis.html"), "utf8");
  const html = `${SKELETON}${fragment}</body></html>`;

  // `fake`: configuración del visor simulado, o null para abrir sin visor.
  async function open({
    width,
    height,
    fake = null,
    speech = {},
    mobile = false,
    scale = 1,
    reducedMotion,
  }) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: scale,
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: reducedMotion ? "reduce" : "no-preference",
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    });
    await routeFonts(context);
    await context.route(`${ORIGIN}/`, (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: html }),
    );
    await context.route(`${ORIGIN}/favicon.ico`, (route) =>
      route.fulfill({ status: 204 }),
    );
    // `speech`: voz simulada del navegador, o null para que no haya ninguna.
    if (speech) {
      await context.addInitScript(
        `window.__JARVIS_SPEECH__ = ${JSON.stringify(speech)};`,
      );
      await context.addInitScript({ path: join(here, "fake-speech.js") });
    } else {
      await context.addInitScript(
        `Object.defineProperty(window, "speechSynthesis", { value: undefined });`,
      );
    }
    if (fake) {
      await context.addInitScript(
        `window.__JARVIS_FAKE__ = ${JSON.stringify(fake)};`,
      );
      await context.addInitScript({ path: join(here, "fake-claude.js") });
    }
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${ORIGIN}/`);
    await page.evaluate(() => document.fonts.ready);
    return { page, context, errors };
  }

  return { open, close: () => browser.close() };
}

// Escribe en la caja y envía con el botón (como en el teléfono).
export async function say(page, text) {
  await page.fill("#input", text);
  await page.click("#send");
}

// Espera a que Jarvis termine de responder.
export async function settled(page) {
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '.msg--assistant[data-status="thinking"], .msg--assistant[data-status="streaming"]',
      ) &&
      !["pensando…", "respondiendo…", "conectando…"].includes(
        document.querySelector("#status").textContent,
      ),
  );
}

// Ancho de la página contra el de la ventana: no debe haber scroll horizontal.
export function overflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return { scroll: root.scrollWidth, client: root.clientWidth };
  });
}
