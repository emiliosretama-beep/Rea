// Registro de agentes. Para añadir un agente nuevo:
//   1. crea src/agents/<id>.js exportando un objeto con el contrato de abajo,
//   2. impórtalo y colócalo en AGENTS en el orden de la cadena de producción.
//
// Contrato de un agente:
//   id, name, role, description   textos para la interfaz
//   phase                          fase del plan en la que se implementa
//   implemented                    false = aparece en el panel pero no entra en la cadena
//   dependsOn: [agentId]           resultados que recibe en ctx.inputs
//   requiresApproval               la cadena se detiene hasta que el usuario aprueba
//   run(ctx) -> output             hace el trabajo (ctx: channel, production, inputs,
//                                  insights, feedback, attempt, services, signal, log)
//   validate(output, ctx) -> { issues: [], warnings: [] }
//                                  issues = se repite la tarea; warnings = se avisa
//   titleFrom?(output)             título del video, si este agente lo decide
import { trendResearcher } from "./trend-researcher.js";
import { audienceAnalyst } from "./audience-analyst.js";
import { scriptwriter } from "./scriptwriter.js";
import { narrator } from "./narrator.js";
import { planned } from "./planned.js";

const AGENTS = [
  trendResearcher,
  audienceAnalyst,
  scriptwriter,
  narrator,
  planned({
    id: "thumbnail-designer",
    name: "Diseñador de miniaturas",
    role: "Miniaturas",
    phase: 3,
    description: "Genera 10 propuestas de miniatura 1280×720, las compara, recomienda las mejores y deja editar la final.",
  }),
  planned({
    id: "producer",
    name: "Productor",
    role: "Producción",
    phase: 4,
    description: "Reúne guion, audio e imágenes y arma el video final con ffmpeg.",
  }),
  planned({
    id: "performance-analyst",
    name: "Analista de rendimiento",
    role: "Analíticas",
    phase: 5,
    description: "Lee las métricas reales de YouTube Analytics (OAuth), detecta qué funcionó y envía aprendizajes al investigador y al guionista.",
  }),
];

// unavailable: { agentId: motivo } para agentes que esta versión no puede
// ejecutar (la versión online no genera audio). Quedan fuera de la cadena.
export function createRegistry({ agents = AGENTS, unavailable = {} } = {}) {
  agents = agents.map((a) => (unavailable[a.id] ? planned({ ...a, unavailableReason: unavailable[a.id] }) : a));
  const byId = new Map(agents.map((a) => [a.id, a]));
  return {
    get: (id) => byId.get(id),
    all: () => agents,
    pipeline: () => agents.filter((a) => a.implemented),
    describe: () =>
      agents.map(({ id, name, role, phase, description, implemented, unavailableReason, dependsOn, requiresApproval }) => ({
        id,
        name,
        role,
        phase,
        description,
        implemented,
        unavailableReason: unavailableReason ?? null,
        dependsOn,
        requiresApproval,
      })),
  };
}
