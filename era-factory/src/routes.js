import { LANGUAGES, VOICES, resolveNarration, voiceById } from "./voices.js";

// Rutas de la API, sin nada de Node: el servidor las expone por HTTP y la
// versión online las llama directamente en el navegador. Una sola lógica.

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Lo que la interfaz puede saber de la configuración (nunca secretos).
export function publicStatus(config, services) {
  return {
    llm: {
      mode: config.llm.mode,
      model: config.llm.mode === "claude" ? config.llm.model : null,
      webSearch: Boolean(services.llm.webSearch),
    },
    youtube: { connected: Boolean(services.youtube.connected), region: config.youtube.regionCode },
    tts: services.tts ? services.tts.availability() : { ok: false, reason: "La voz necesita la versión con servidor." },
  };
}

// Material de investigación que pega el usuario (enlaces, títulos, notas).
export const MAX_MATERIAL = 6000;

const CHANNEL_FIELDS = {
  name: 80,
  niche: 200,
  language: 40,
  audience: 400,
  videoType: 200,
  frequency: 80,
};

// Valida el formulario de canal una vez, en la frontera.
function parseChannel(body) {
  const out = {};
  const missing = [];
  for (const [field, max] of Object.entries(CHANNEL_FIELDS)) {
    const value = typeof body?.[field] === "string" ? body[field].trim() : "";
    if (!value) missing.push(field);
    else if (value.length > max) throw new HttpError(400, `El campo ${field} supera ${max} caracteres.`);
    out[field] = value;
  }
  if (missing.length) throw new HttpError(400, "Faltan campos del canal.", missing);
  return out;
}

export function createRoutes(factory) {
  const { db, orchestrator, registry, config, services } = factory;

  // El audio generado vive fuera de la base de datos: se borra con su producción.
  const removeMedia = (id) => Promise.resolve(services.tts?.removeProduction?.(id)).catch(() => {});

  const productionDetail = (id) => {
    const production = db.getProduction(id);
    if (!production) throw new HttpError(404, "Producción no encontrada.");
    const channel = db.getChannel(production.channelId);
    return {
      production,
      channel,
      // Voz que usará (o usó) el narrador: lo elegido o lo que toca por idioma del canal.
      narration: resolveNarration(channel?.language, production.settings?.narration),
      tasks: db.listTasks(id),
      logs: db.listLogs({ productionId: id, limit: 300 }),
    };
  };

  const summary = () => {
    const productions = db.listProductions();
    const count = (s) => productions.filter((p) => p.status === s).length;
    return {
      channels: db.listChannels().length,
      productions: productions.length,
      active: count("running") + count("queued"),
      awaitingApproval: count("awaiting_approval"),
      failed: count("failed"),
      completed: count("completed"),
    };
  };

  // [método, patrón, manejador(params, body, url)]
  return [
    ["GET", /^\/api\/status$/, () => ({
      ...publicStatus(config, services),
      agents: registry.describe(),
      activity: orchestrator.activity(),
      summary: summary(),
    })],
    ["GET", /^\/api\/voices$/, () => ({ languages: LANGUAGES, voices: VOICES })],
    ["GET", /^\/api\/channels$/, () => db.listChannels()],
    ["POST", /^\/api\/channels$/, (_, body) => db.createChannel(parseChannel(body))],
    ["PUT", /^\/api\/channels\/([\w-]+)$/, ([id], body) => {
      if (!db.getChannel(id)) throw new HttpError(404, "Canal no encontrado.");
      return db.updateChannel(id, parseChannel(body));
    }],
    ["DELETE", /^\/api\/channels\/([\w-]+)$/, ([id]) => {
      const productions = db.listProductions({ channelId: id });
      for (const p of productions) if (["running", "queued"].includes(p.status)) orchestrator.cancel(p.id);
      if (!db.deleteChannel(id)) throw new HttpError(404, "Canal no encontrado.");
      for (const p of productions) removeMedia(p.id);
      return { ok: true };
    }],
    ["GET", /^\/api\/productions$/, (_, __, url) => {
      const channels = new Map(db.listChannels().map((c) => [c.id, c]));
      return db.listProductions({ channelId: url.searchParams.get("channelId") || undefined }).map((p) => ({
        ...p,
        channelName: channels.get(p.channelId)?.name ?? "",
        tasks: db.listTasks(p.id).map(({ agentId, status }) => ({ agentId, status })),
      }));
    }],
    ["POST", /^\/api\/productions$/, (_, body) => {
      const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      return orchestrator.startProduction({
        channelId: String(body.channelId || ""),
        topicHint: text(body.topicHint, 300),
        material: text(body.material, MAX_MATERIAL),
      });
    }],
    ["GET", /^\/api\/productions\/([\w-]+)$/, ([id]) => productionDetail(id)],
    ["DELETE", /^\/api\/productions\/([\w-]+)$/, ([id]) => {
      if (db.getProduction(id)?.status === "running") orchestrator.cancel(id);
      if (!db.deleteProduction(id)) throw new HttpError(404, "Producción no encontrada.");
      removeMedia(id);
      return { ok: true };
    }],
    ["PUT", /^\/api\/productions\/([\w-]+)\/settings$/, ([id], body) => {
      const production = db.getProduction(id);
      if (!production) throw new HttpError(404, "Producción no encontrada.");
      const settings = { ...production.settings };
      if (body.narration !== undefined) {
        if (!voiceById(body.narration?.voice)) throw new HttpError(400, "Esa voz no existe.");
        const resolved = resolveNarration(null, body.narration);
        settings.narration = { voice: resolved.voice, speed: resolved.speed };
      }
      return db.updateProduction(id, { settings });
    }],
    ["POST", /^\/api\/productions\/([\w-]+)\/cancel$/, ([id]) => orchestrator.cancel(id)],
    ["POST", /^\/api\/tasks\/([\w-]+)\/approve$/, ([id], body) => orchestrator.approve(id, { output: body.output })],
    ["POST", /^\/api\/tasks\/([\w-]+)\/changes$/, ([id], body) => orchestrator.requestChanges(id, body.notes)],
    ["POST", /^\/api\/tasks\/([\w-]+)\/retry$/, ([id]) => orchestrator.retry(id)],
    ["GET", /^\/api\/logs$/, (_, __, url) => db.listLogs({ limit: Math.min(Number(url.searchParams.get("limit")) || 60, 300) })],
  ];
}

