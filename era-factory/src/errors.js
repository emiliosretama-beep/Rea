// Errores que comparten el servidor y la versión online.

// Fallo de la IA. kind: "llm" | "config" | "cancelled". retryable: vale la
// pena reintentar sola (límite de uso, red, respuesta mal formada).
export class LLMError extends Error {
  constructor(message, { kind = "llm", retryable = false } = {}) {
    super(message);
    this.name = "LLMError";
    this.kind = kind;
    this.retryable = retryable;
  }
}
