// YouTube Data API v3 (solo lectura pública, con API key).
// Docs: https://developers.google.com/youtube/v3/docs/search/list
//       https://developers.google.com/youtube/v3/docs/videos/list
// Coste de cuota: search.list = 100 unidades, videos.list = 1 (cuota diaria
// gratuita: 10 000). Las métricas privadas del canal (retención, CTR) NO están
// aquí: requieren YouTube Analytics API con OAuth (fase 5).
const API = "https://www.googleapis.com/youtube/v3";

export class YouTubeError extends Error {
  constructor(message, { reason } = {}) {
    super(message);
    this.name = "YouTubeError";
    this.reason = reason;
  }
}

// "PT1H2M3S" -> 3723 segundos
export function parseIsoDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => Number(v || 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

const LANGUAGE_CODES = {
  español: "es",
  spanish: "es",
  inglés: "en",
  ingles: "en",
  english: "en",
  portugués: "pt",
  portugues: "pt",
  francés: "fr",
  frances: "fr",
  alemán: "de",
  aleman: "de",
  italiano: "it",
};

export function languageCode(language) {
  const key = String(language || "").trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key;
  return LANGUAGE_CODES[key] ?? null;
}

export function createYouTube({ apiKey, regionCode }, { fetchImpl = fetch } = {}) {
  async function call(path, params, signal) {
    const url = new URL(`${API}/${path}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
    url.searchParams.set("key", apiKey);
    let res;
    try {
      res = await fetchImpl(url, { signal });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      throw new YouTubeError(`No se pudo conectar con YouTube: ${err.message}`);
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason = body?.error?.errors?.[0]?.reason;
      const message =
        reason === "quotaExceeded"
          ? "Se agotó la cuota diaria de la YouTube Data API."
          : reason === "keyInvalid" || res.status === 400
            ? `YouTube rechazó la petición: ${body?.error?.message || res.status}`
            : `Error de YouTube (${res.status}): ${body?.error?.message || "desconocido"}`;
      throw new YouTubeError(message, { reason });
    }
    return body;
  }

  return {
    connected: Boolean(apiKey),

    // Videos más vistos sobre un tema en los últimos `days` días, con estadísticas.
    async topVideos(query, { language, days = 30, maxResults = 12, signal } = {}) {
      if (!apiKey) return null;
      const publishedAfter = new Date(Date.now() - days * 86400_000).toISOString();
      const search = await call(
        "search",
        {
          part: "snippet",
          type: "video",
          q: query,
          order: "viewCount",
          publishedAfter,
          maxResults,
          regionCode,
          relevanceLanguage: languageCode(language),
        },
        signal,
      );
      const ids = (search.items || []).map((i) => i.id?.videoId).filter(Boolean);
      if (!ids.length) return [];
      const details = await call("videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") }, signal);
      return (details.items || []).map((v) => ({
        id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        title: v.snippet?.title ?? "",
        channel: v.snippet?.channelTitle ?? "",
        publishedAt: v.snippet?.publishedAt ?? null,
        views: v.statistics?.viewCount !== undefined ? Number(v.statistics.viewCount) : null,
        likes: v.statistics?.likeCount !== undefined ? Number(v.statistics.likeCount) : null,
        comments: v.statistics?.commentCount !== undefined ? Number(v.statistics.commentCount) : null,
        durationSeconds: parseIsoDuration(v.contentDetails?.duration),
      }));
    },
  };
}
