// Modo demo: respuestas fijas cuando esta vista no puede usar Claude.
// Entiende dos órdenes sencillas para que las tareas y la memoria se puedan
// probar sin IA.
import { USER_NAME } from "./prompt.js";

const HOW_TO_UNLOCK =
  "Para usarme completo, ábreme desde Claude y acepta el permiso.";

const DEMO_REPLIES = {
  general: [
    `Estoy en **modo demo**, ${USER_NAME}: aquí no hay IA conectada, así que solo tengo respuestas fijas.`,
    "Lo que sí puedes probar ahora:",
    "- Escribe `anota comprar cartulina` para crear una tarea.",
    "- Escribe `recuerda que mi examen es el viernes` para guardar un recuerdo.",
    HOW_TO_UNLOCK,
  ],
  juegos: [
    `En modo Juegos te ayudo con tus proyectos de ERAGames: mecánicas, controles táctiles, rendimiento en iPhone y la publicación en itch.io.`,
    `Ahora estoy en **modo demo** y no puedo revisar tu caso. ${HOW_TO_UNLOCK}`,
  ],
  escuela: [
    "En modo Escuela te explico paso a paso, compruebo los resultados y te dejo un ejercicio para confirmar que entendiste.",
    `Ahora estoy en **modo demo** y no puedo resolver tu duda. ${HOW_TO_UNLOCK}`,
  ],
  organizar: [
    "En modo Organizar convierto lo que me digas en tareas claras y te ayudo a decidir qué va primero.",
    "En **modo demo** solo entiendo órdenes directas: prueba `anota estudiar para el examen`.",
    HOW_TO_UNLOCK,
  ],
};

const TASK_ORDER =
  /^(?:anota|apunta|agrega|añade|crea)(?:\s+(?:la|una|esta))?(?:\s+tarea)?\s*:?\s+(.+)$/i;
const MEMORY_ORDER =
  /^(?:recuerda|acu[eé]rdate\s+de|guarda)(?:\s+que)?\s*:?\s+(.+)$/i;

// `runner` ejecuta las acciones (ver backend.js). Devuelve el texto a mostrar.
export async function demoReply({ mode, text, runner }) {
  const clean = text.trim().replace(/[.!]+$/, "");
  const task = clean.match(TASK_ORDER);
  if (task) {
    await runner.createTask(task[1]);
    return `Anotado, ${USER_NAME}. Lo ves en Tareas.`;
  }
  const memory = clean.match(MEMORY_ORDER);
  if (memory) {
    await runner.remember(memory[1]);
    return `Listo, lo guardé en Memoria.`;
  }
  return (DEMO_REPLIES[mode] ?? DEMO_REPLIES.general)
    .join("\n\n")
    .replace(/\n\n- /g, "\n- ");
}
