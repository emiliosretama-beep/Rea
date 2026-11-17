// Métricas de un video publicado (fase 5). Módulo puro, compartido por el
// servidor, la versión online y la interfaz: una sola definición de campos,
// límites y cálculos.
//
// Las cifras las copia el usuario de YouTube Studio, TikTok o Instagram: la
// versión online no puede conectarse a YouTube Analytics.

export const PLATFORMS = ["YouTube Shorts", "YouTube (video largo)", "TikTok", "Instagram Reels", "Facebook Reels"];

// kind: int = entero; pct = 0-100; loop = % que puede pasar de 100 (Shorts repetidos); sec = segundos.
export const FIELDS = [
  { k: "views", label: "Vistas", kind: "int", grp: "alcance", req: true },
  { k: "subs", label: "Suscriptores o seguidores ganados", kind: "int", grp: "alcance" },
  { k: "avgViewPct", label: "% visto en promedio", kind: "loop", grp: "retencion", hint: "Retención media. En Shorts puede pasar de 100 % si lo repiten." },
  { k: "avgWatchSec", label: "Tiempo medio visto (segundos)", kind: "sec", grp: "retencion" },
  { k: "stayedPct", label: "% que se quedó", kind: "pct", grp: "retencion", hint: "Shorts: «Vieron» frente a «Deslizaron». TikTok: % que lo vio completo." },
  { k: "ctr", label: "CTR de impresiones (%)", kind: "pct", grp: "retencion", hint: "Solo YouTube: cuántos tocaron la miniatura." },
  { k: "likes", label: "Me gusta", kind: "int", grp: "interaccion" },
  { k: "comments", label: "Comentarios", kind: "int", grp: "interaccion" },
  { k: "shares", label: "Compartidos", kind: "int", grp: "interaccion" },
];

const MAX = { int: 1e10, pct: 100, loop: 1000, sec: 36000 };
export const MAX_NOTES = 1500;

// Destinatarios de los aprendizajes.
export const LEARNING_FOR = { investigador: "Investigador", audiencia: "Analista de audiencia", guionista: "Guionista", miniaturas: "Miniaturas" };

// Acepta 1234, 1,234, 1.234, 12.5, 12,5, 1.2k, 3 mil, 1.5m y 45 %.
// Devuelve null si está vacío y NaN si no es un número.
export function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const s = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/%$/, "");
  if (!s) return null;
  const m = s.match(/^(\d[\d.,]*)(k|mil|m)?$/);
  if (!m) return NaN;
  let n = m[1];
  // «1.234» o «1,234» sin sufijo = separador de miles; si no, la coma es decimal.
  n = /^\d{1,3}([.,]\d{3})+$/.test(n) && !m[2] ? n.replace(/[.,]/g, "") : n.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(n)) return NaN;
  const x = Number(n);
  return m[2] === "k" || m[2] === "mil" ? x * 1e3 : m[2] === "m" ? x * 1e6 : x;
}

// Fecha local de hoy (AAAA-MM-DD), para no aceptar fechas futuras.
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Valida el formulario de resultados. Devuelve { value } o { errors }.
export function cleanResults(form) {
  const errors = [];
  const metrics = {};
  for (const f of FIELDS) {
    const n = parseNumber(form?.[f.k]);
    if (n === null) {
      if (f.req) errors.push(`${f.label}: es obligatorio`);
      continue;
    }
    if (Number.isNaN(n) || n < 0 || n > MAX[f.kind]) {
      errors.push(`${f.label}: valor no válido`);
      continue;
    }
    metrics[f.k] = f.kind === "int" ? Math.round(n) : Math.round(n * 10) / 10;
  }
  const platform = PLATFORMS.includes(form?.platform) ? form.platform : PLATFORMS[0];
  const publishedAt = String(form?.publishedAt ?? "").trim() || null;
  if (publishedAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || Number.isNaN(Date.parse(publishedAt))) errors.push("Fecha de publicación: no válida");
    else if (publishedAt > todayLocal()) errors.push("Fecha de publicación: está en el futuro");
  }
  if (errors.length) return { errors };
  return { value: { platform, publishedAt, metrics, notes: String(form?.notes ?? "").trim().slice(0, MAX_NOTES) } };
}

// Huella de unos resultados: si cambia, el análisis guardado quedó viejo.
export const resultsSignature = (r) => (r ? JSON.stringify([r.platform, r.publishedAt, r.metrics, r.notes]) : "");

// Interacción = (me gusta + comentarios + compartidos) / vistas, en %.
export function engagement(m) {
  const present = ["likes", "comments", "shares"].filter((k) => m[k] != null);
  return m.views > 0 && present.length ? Math.round((present.reduce((s, k) => s + m[k], 0) / m.views) * 1000) / 10 : null;
}

export function formatMetric(k, v) {
  const f = FIELDS.find((x) => x.k === k) ?? { kind: "pct" };
  if (v == null) return "—";
  if (f.kind === "int") return Number(v).toLocaleString("es-MX");
  const n = v.toLocaleString("es-MX", { maximumFractionDigits: 1 });
  return f.kind === "sec" ? `${n} s` : `${n} %`;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
}

// Compara este video con la mediana de los otros del canal (de la misma
// plataforma si hay al menos 2). others: [results].
export function baseline(others, results) {
  const same = others.filter((o) => o.platform === results.platform);
  const used = same.length >= 2 ? same : others;
  const withEngage = (m) => ({ ...m, engage: engagement(m) });
  const mine = withEngage(results.metrics);
  const theirs = used.map((o) => withEngage(o.metrics));
  const rows = [];
  for (const k of ["views", "avgViewPct", "stayedPct", "ctr", "avgWatchSec", "engage", "subs"]) {
    const values = theirs.map((m) => m[k]).filter((v) => v != null);
    if (mine[k] == null || !values.length) continue;
    rows.push({
      k,
      label: k === "engage" ? "Interacción (%)" : FIELDS.find((f) => f.k === k).label,
      actual: mine[k],
      mediana: Math.round(median(values) * 10) / 10,
      n: values.length,
    });
  }
  return { n: used.length, samePlatform: used === same && same.length > 0, rows };
}

// Las métricas en líneas legibles, para el prompt.
export function metricLines(m) {
  const lines = FIELDS.filter((f) => m[f.k] != null).map((f) => `- ${f.label}: ${formatMetric(f.k, m[f.k])}`);
  const e = engagement(m);
  if (e != null) lines.push(`- Interacción (me gusta + comentarios + compartidos entre vistas): ${e} %`);
  return lines.join("\n") || "- (sin cifras)";
}
