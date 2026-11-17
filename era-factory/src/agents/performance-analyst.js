// AGENTE 7 — Analista de rendimiento (fase 5).
// No forma parte de la cadena de producción (standalone): el trabajo lo hace
// src/performance.js cuando el usuario pega las métricas de un video publicado
// en la pestaña «Resultados». Aquí solo se registra para el panel y la Oficina.
export const performanceAnalyst = {
  id: "performance-analyst",
  name: "Analista de rendimiento",
  role: "Analíticas",
  phase: 5,
  implemented: true,
  standalone: true,
  description:
    "Cuando publicas un video, lee sus métricas (las copias de YouTube Studio, TikTok o Instagram), detecta qué funcionó y envía aprendizajes al investigador, al analista de audiencia, al guionista y al diseñador de miniaturas.",
  dependsOn: ["scriptwriter", "thumbnail-designer"],
  requiresApproval: false,
  run() {
    throw new Error("El analista de rendimiento trabaja desde la pestaña Resultados de cada producción.");
  },
  validate: () => ({ issues: [], warnings: [] }),
};
