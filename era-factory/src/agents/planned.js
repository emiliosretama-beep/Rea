// Agente del plan que todavía no está programado. Aparece en el panel con su
// fase, pero no entra en la cadena y no puede ejecutarse por error.
export function planned({ id, name, role, phase, description }) {
  return {
    id,
    name,
    role,
    phase,
    description,
    implemented: false,
    dependsOn: [],
    requiresApproval: false,
    run() {
      throw new Error(`${name} aún no está implementado (fase ${phase}).`);
    },
    validate: () => ({ issues: [`${name} aún no está implementado.`], warnings: [] }),
  };
}
