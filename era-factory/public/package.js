// Paquete para producir el video fuera de la versión online: guion aprobado,
// miniatura elegida, formato y voz. Lo crea el botón «Exportar para video» y
// lo consume scripts/produce-package.mjs (voz con Kokoro + montaje con ffmpeg).
// Módulo puro: lo usan la interfaz (empaquetado) y el script (lectura).

export const PACKAGE_KIND = "era-factory-package";
export const PACKAGE_VERSION = 1;

export function buildPackage({ production, channel, tasks }) {
  const byAgent = Object.fromEntries(tasks.map((t) => [t.agentId, t]));
  const script = byAgent.scriptwriter;
  if (script?.status !== "done") throw new Error("Aprueba el guion antes de exportar.");
  const thumb = byAgent["thumbnail-designer"];
  return {
    kind: PACKAGE_KIND,
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    channel: { name: channel.name, niche: channel.niche, language: channel.language, format: channel.format ?? "long" },
    production: { id: production.id, title: production.title },
    narration: production.settings?.narration ?? null,
    script: script.output,
    thumbnail: thumb?.status === "done" ? thumb.output.final : null,
  };
}

// Revisa un paquete recibido. Devuelve los problemas (vacío si se puede producir).
export function checkPackage(pkg) {
  const issues = [];
  if (pkg?.kind !== PACKAGE_KIND) return ["No es un paquete de ERA Factory."];
  if (pkg.version !== PACKAGE_VERSION) issues.push(`Versión de paquete ${pkg.version} no soportada.`);
  const s = pkg.script;
  if (!s?.title || !s?.hook || !Array.isArray(s?.sections) || !s.sections.length) issues.push("El guion está incompleto.");
  if (!pkg.channel?.language) issues.push("Falta el idioma del canal.");
  return issues;
}

export const packageFilename = (pkg) =>
  `era-${String(pkg.production.title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "") || "video"}.json`;
