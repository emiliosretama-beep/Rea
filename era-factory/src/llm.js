// Acceso a la IA. Los agentes solo ven dos operaciones:
//   json({ name, system, prompt, schema })   -> objeto que cumple el schema
//   research({ name, system, prompt })        -> { text, sources[] } con búsqueda web real
// `name` identifica la llamada (logs y datos de prueba del modo mock).
//
// Modos:
//   claude -> API de Anthropic (ANTHROPIC_API_KEY)
//   mock   -> datos de prueba fijos (FACTORY_LLM=mock, solo desarrollo y tests)
//   none   -> sin credenciales: cada llamada falla con un error de configuración
import Anthropic from "@anthropic-ai/sdk";
import { LLMError } from "./errors.js";

export { LLMError };

const MAX_PAUSE_RESUMES = 3;

function textOf(content) {
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// Las URLs de las fuentes salen de los bloques de resultado de búsqueda que
// devuelve la API, no del texto del modelo: así sabemos que existen.
function sourcesOf(content) {
  const seen = new Map();
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const r of block.content) {
      if (r.type === "web_search_result" && r.url && !seen.has(r.url))
        seen.set(r.url, { url: r.url, title: r.title || r.url, pageAge: r.page_age ?? null });
    }
  }
  return [...seen.values()];
}

function translateError(err) {
  if (err instanceof LLMError) return err;
  if (err?.name === "AbortError" || err instanceof Anthropic.APIUserAbortError)
    return new LLMError("Tarea cancelada.", { kind: "cancelled" });
  if (err instanceof Anthropic.AuthenticationError)
    return new LLMError("La API key de Anthropic no es válida. Revisa tu archivo .env.", { kind: "config" });
  if (err instanceof Anthropic.RateLimitError)
    return new LLMError("Límite de uso de la API alcanzado. Reintenta en un momento.", { retryable: true });
  if (err instanceof Anthropic.BadRequestError)
    return new LLMError(`Petición rechazada por la API: ${err.message}`);
  if (err instanceof Anthropic.APIConnectionError)
    return new LLMError("No se pudo conectar con la API de Anthropic.", { retryable: true });
  if (err instanceof Anthropic.APIError)
    return new LLMError(`Error de la API (${err.status ?? "red"}): ${err.message}`, {
      retryable: (err.status ?? 500) >= 500,
    });
  return new LLMError(err?.message || String(err));
}

function checkStop(message, name) {
  if (message.stop_reason === "refusal")
    throw new LLMError(`El modelo rechazó la tarea "${name}". Reformula el nicho o el tema.`);
  if (message.stop_reason === "max_tokens")
    throw new LLMError(`La respuesta de "${name}" se cortó por longitud.`, { retryable: true });
}

export function claudeLLM({ model, maxSearches }, client = new Anthropic()) {
  const base = {
    model,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  };

  return {
    mode: "claude",
    webSearch: true,
    async json({ name, system, prompt, schema, effort = "medium", maxTokens = 32000, signal }) {
      try {
        const stream = client.beta.messages.stream(
          {
            ...base,
            max_tokens: maxTokens,
            system,
            output_config: { effort, format: { type: "json_schema", schema } },
            messages: [{ role: "user", content: prompt }],
          },
          { signal },
        );
        const message = await stream.finalMessage();
        checkStop(message, name);
        const text = textOf(message.content);
        try {
          return JSON.parse(text);
        } catch {
          throw new LLMError(`La respuesta de "${name}" no es JSON válido.`, { retryable: true });
        }
      } catch (err) {
        throw translateError(err);
      }
    },

    async research({ name, system, prompt, effort = "medium", signal }) {
      try {
        const messages = [{ role: "user", content: prompt }];
        const collected = [];
        for (let i = 0; i <= MAX_PAUSE_RESUMES; i++) {
          const stream = client.beta.messages.stream(
            {
              ...base,
              max_tokens: 32000,
              system,
              output_config: { effort },
              tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }],
              messages,
            },
            { signal },
          );
          const message = await stream.finalMessage();
          collected.push(...message.content);
          if (message.stop_reason !== "pause_turn") {
            checkStop(message, name);
            return { text: textOf(message.content), sources: sourcesOf(collected) };
          }
          // Turno pausado por una búsqueda larga: se reenvía para que continúe.
          messages.push({ role: "assistant", content: message.content });
        }
        throw new LLMError(`La investigación "${name}" no terminó tras varias pausas.`, { retryable: true });
      } catch (err) {
        throw translateError(err);
      }
    },
  };
}

function noneLLM() {
  const fail = async () => {
    throw new LLMError(
      "Falta ANTHROPIC_API_KEY en era-factory/.env. Los agentes de IA no pueden trabajar sin ella.",
      { kind: "config" },
    );
  };
  return { mode: "none", webSearch: false, json: fail, research: fail };
}

// Modo de prueba: devuelve datos fijos por nombre de llamada. Se inyecta en
// los tests y se puede activar a mano para revisar la interfaz sin gastar API.
export function mockLLM(fixtures, { delayMs = 0 } = {}) {
  const calls = [];
  const wait = (signal) =>
    new Promise((resolve, reject) => {
      if (!delayMs) return resolve();
      const t = setTimeout(resolve, delayMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new LLMError("Tarea cancelada.", { kind: "cancelled" }));
      });
    });
  const answer = async (kind, args) => {
    calls.push({ kind, ...args });
    await wait(args.signal);
    const fixture = fixtures[args.name];
    if (fixture === undefined) throw new LLMError(`Sin datos de prueba para "${args.name}".`);
    const value = typeof fixture === "function" ? fixture(args, calls) : fixture;
    return structuredClone(value);
  };
  return {
    mode: "mock",
    webSearch: true,
    calls,
    json: (args) => answer("json", args),
    research: (args) => answer("research", args),
  };
}

export async function createLLM(config) {
  if (config.llm.mode === "claude") return claudeLLM(config.llm);
  if (config.llm.mode === "mock") {
    const { MOCK_FIXTURES } = await import("./mock-fixtures.js");
    return mockLLM(MOCK_FIXTURES, { delayMs: 900 });
  }
  return noneLLM();
}
