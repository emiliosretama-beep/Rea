// IA de la versión online: Claude con la cuenta de quien abre la página
// (capability `sample` de claude.ai). Misma interfaz que src/llm.js.
//
// Diferencias con el servidor, todas deliberadas:
// - Sin búsqueda web (sample no navega): research() trabaja con el
//   conocimiento de Claude y el material que aporta el usuario.
// - El formato JSON no lo garantiza la API: se valida aquí y, si falla, se
//   hace UNA llamada de corrección con los errores concretos.
// - Nunca se reintenta solo un error de sample (lo pide su contrato): la
//   tarea queda fallida y el usuario pulsa Reintentar.
import { LLMError } from "../errors.js";
import { pruneToSchema, validateSchema } from "../schema.js";

const CONFIG_CODES = new Set([
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
  "session_expired",
]);

const MESSAGES = {
  not_granted: "No diste permiso para que ERA Factory use Claude. Recarga la página y acéptalo.",
  sampling_disabled: "Claude no está disponible en esta cuenta.",
  session_expired: "Tu sesión de Claude caducó. Vuelve a iniciar sesión y recarga.",
  rate_limited: "Llegaste al límite de uso de tu cuenta de Claude. Espera un rato y pulsa Reintentar.",
  refused: "Claude no puede hacer esta tarea tal como está planteada. Cambia el tema o pide cambios.",
  prompt_too_large: "Hay demasiado texto para una sola tarea. Acorta el material de investigación.",
  empty_completion: "Claude no devolvió respuesta. Pulsa Reintentar.",
  invalid_json: "La respuesta llegó incompleta o sin el formato esperado. Pulsa Reintentar.",
  upstream_error: "Falló la conexión con Claude. Pulsa Reintentar.",
};

function translate(err, name) {
  const code = err?.code ?? "upstream_error";
  if (code === "cancelled") return new LLMError("Tarea cancelada.", { kind: "cancelled" });
  const message = MESSAGES[code] ?? (CONFIG_CODES.has(code) ? MESSAGES.not_granted : MESSAGES.upstream_error);
  return new LLMError(`${message} (${name})`, { kind: CONFIG_CODES.has(code) ? "config" : "llm" });
}

const header = (name, system) => `[Tarea interna: ${name}]\n${system}\n\n`;

function formatRule(schema) {
  return (
    "\n\n## Formato de respuesta\nResponde SOLO con un objeto JSON válido (sin texto antes ni después, " +
    "sin bloque de código) que cumpla exactamente este JSON Schema:\n" +
    JSON.stringify(schema)
  );
}

export function cloudLLM(sample, { tierFor = () => "default" } = {}) {
  async function call(fn, input, opts) {
    try {
      return await fn(input, { cache: false, ...opts });
    } catch (err) {
      throw translate(err, opts.name);
    }
  }

  return {
    mode: "cloud",
    webSearch: false,

    async json({ name, system = "", prompt, schema, signal }) {
      const input = header(name, system) + prompt + formatRule(schema);
      const opts = { signal, modelTier: tierFor(name), name };
      let value = await call((i, o) => sample.json(i, strip(o)), input, opts);
      let errors = validateSchema(value, schema);
      if (errors.length) {
        // Una sola corrección, con los errores concretos (no es un bucle).
        const fix =
          input +
          `\n\n## Corrección\nTu respuesta anterior no cumplía el formato:\n- ${errors.slice(0, 12).join("\n- ")}\n` +
          `Respuesta anterior:\n${JSON.stringify(value).slice(0, 20000)}\n\nDevuelve el JSON completo corregido.`;
        value = await call((i, o) => sample.json(i, strip(o)), fix, opts);
        errors = validateSchema(value, schema);
        if (errors.length)
          throw new LLMError(`La respuesta de Claude no tiene el formato esperado (${errors[0]}). Pulsa Reintentar.`);
      }
      return pruneToSchema(value, schema);
    },

    async research({ name, system = "", prompt, signal }) {
      const opts = { signal, modelTier: tierFor(name), name };
      const { text, truncated } = await call((i, o) => sample(i, strip(o)), header(name, system) + prompt, opts);
      if (truncated) throw new LLMError(`La investigación se cortó por longitud. Pulsa Reintentar. (${name})`);
      return { text, sources: [] };
    },
  };
}

// `name` es nuestro, no de sample: no se le pasa.
function strip({ name, ...opts }) {
  return opts;
}
