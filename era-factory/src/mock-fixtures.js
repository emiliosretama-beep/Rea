// Datos de prueba del modo FACTORY_LLM=mock y de los tests. NO son IA ni
// investigación real: todo va marcado como [SIMULACIÓN] y las fuentes usan el
// dominio reservado example.com.
const S = "[SIMULACIÓN]";

export const MOCK_FIXTURES = {
  "trends.research": {
    text: `${S} Notas de investigación de prueba. Tema A crece en búsquedas (fuente 1). Tema B genera debate (fuente 2). Tema C tiene poca oferta en español (fuente 3).`,
    sources: [
      { url: "https://example.com/tendencia-a", title: `${S} Artículo sobre el tema A` },
      { url: "https://example.com/tendencia-b", title: `${S} Debate sobre el tema B` },
      { url: "https://example.com/tendencia-c", title: `${S} Foro sobre el tema C` },
    ],
  },
  "trends.structure": {
    summary: `${S} Resumen de prueba del nicho: tres temas con interés y uno con poca competencia.`,
    trends: [
      { topic: `${S} Tema A`, whyNow: "Crece en búsquedas este mes.", competition: "media", sourceIds: [1] },
      { topic: `${S} Tema B`, whyNow: "Debate activo en redes.", competition: "alta", sourceIds: [2] },
      { topic: `${S} Tema C`, whyNow: "Poca oferta en español.", competition: "baja", sourceIds: [3] },
    ],
    ideas: [1, 2, 3, 4, 5].map((n) => ({
      title: `${S} Idea de video ${n}`,
      angle: `Enfoque diferencial ${n}`,
      hook: `¿Sabías que el tema ${n} cambia todo?`,
      whyItWorks: "Responde una pregunta frecuente del público.",
      opportunityScore: 9 - n,
      sourceIds: [((n - 1) % 3) + 1],
    })),
  },
  "audience.analyze": {
    persona: {
      name: "Alex",
      description: `${S} Espectador tipo de prueba: curioso, ve videos en el celular.`,
      ageRange: "18-30",
      motivations: ["Aprender rápido", "Entender las noticias"],
      frustrations: ["Videos lentos", "Clickbait"],
    },
    contentPreferences: ["Videos de 6-10 minutos", "Ejemplos visuales"],
    chosenIdeaIndex: 0,
    decision: {
      title: `${S} Idea de video 1: explicado en 3 minutos`,
      angle: "Explicación directa con ejemplos",
      format: "explicación",
      targetLengthSeconds: 60,
      tone: "cercano y claro",
      why: "Mayor oportunidad y encaja con el público.",
    },
    retentionPlan: ["Promesa en los primeros 5 s", "Cambio visual cada 20 s", "Pregunta abierta a la mitad"],
  },
  "script.write": {
    title: `${S} Idea de video 1: explicado en 3 minutos`,
    hook: "En los próximos minutos vas a entender por qué todo el mundo habla de esto.",
    sections: [
      { heading: "Qué es", narration: "Primero, lo básico. ".repeat(12).trim(), visualNotes: "Título animado" },
      { heading: "Por qué importa", narration: "Esto te afecta porque cambia cómo lo usas. ".repeat(5).trim(), visualNotes: "Gráfica simple" },
      { heading: "Qué hacer", narration: "Tres pasos concretos para aprovecharlo hoy. ".repeat(5).trim(), visualNotes: "Lista en pantalla" },
    ],
    outro: "Ahora ya sabes lo esencial.",
    callToAction: "Suscríbete para el próximo video.",
    claims: [
      { text: "El tema A crece en búsquedas este mes.", sourceId: 1 },
      { text: "Hay poca oferta del tema C en español.", sourceId: 3 },
    ],
    description: `${S} Descripción de prueba para YouTube.`,
    tags: ["prueba", "simulación"],
  },
  "thumbs.design": {
    proposals: [
      ["split-left", "gradient", "noche", "chip", "El tema que nadie explica", "nadie", "", "Nuevo"],
      ["split-right", "burst", "fuego", "rayo", "Lo entiendes en un minuto", "minuto", "", ""],
      ["center", "spotlight", "violeta", "ninguno", "Nadie te dijo esto", "nadie", "Y es más simple de lo que crees", ""],
      ["big-number", "grid", "carbon", "ninguno", "3 pasos para aprovecharlo", "pasos", "", ""],
      ["versus", "solid", "era", "ninguno", "Antes vs ahora", "", "", ""],
      ["question", "gradient", "hielo", "ninguno", "¿Por qué importa?", "importa", "", "Guía"],
      ["stack", "stripes", "papel", "alerta", "No lo ignores", "", "Lo que nadie dice", "Ojo"],
      ["arrow", "gradient", "menta", "flecha", "Así lo aprovechas hoy", "hoy", "", ""],
      ["split-left", "spotlight", "fuego", "lupa", "Lo que no ves", "ves", "", ""],
      ["center", "burst", "noche", "ninguno", "Todo cambia", "cambia", "", ""],
    ].map(([layout, background, palette, icon, headline, accentWord, subline, badge], i) => ({
      concept: `${S} Concepto ${i + 1}`,
      rationale: "Promesa clara y legible en el celular.",
      layout,
      background,
      palette,
      icon,
      headline,
      accentWord,
      subline,
      badge,
    })),
    recommended: [
      { index: 0, reason: "Curiosidad directa." },
      { index: 3, reason: "El número concreto da confianza." },
      { index: 5, reason: "La pregunta engancha al público joven." },
    ],
  },
  "producer.beats": {
    segments: [
      { id: "hook", beats: [{ fromSentence: 0, onScreen: `${S} De qué va este video`, kind: "point" }] },
      { id: "s1", beats: [{ fromSentence: 2, onScreen: "Lo básico primero", kind: "point" }, { fromSentence: 7, onScreen: "Paso a paso", kind: "quote" }] },
      { id: "s2", beats: [{ fromSentence: 1, onScreen: "Cambia cómo lo usas", kind: "point" }] },
      { id: "s3", beats: [{ fromSentence: 1, onScreen: "3 pasos concretos", kind: "number" }] },
      { id: "outro", beats: [{ fromSentence: 1, onScreen: "Suscríbete", kind: "point" }] },
    ],
  },
  "script.factcheck": {
    checks: [
      { claimIndex: 0, verdict: "respaldado", note: "Coincide con la fuente 1." },
      { claimIndex: 1, verdict: "sin_respaldo", note: "La fuente 3 es un foro; conviene confirmarlo." },
    ],
  },
};
