// Agente que no entra en la cadena: aún no está programado (fase futura) o
// no puede funcionar en esta versión (p. ej. la voz en la versión online).
// Aparece en el panel con el motivo y no puede ejecutarse por error.
export function planned({ id, name, role, phase, description, unavailableReason = null }) {
  const why = unavailableReason ?? `aún no está implementado (fase ${phase})`;
  return {
    id,
    name,
    role,
    phase,
    description,
    implemented: false,
    unavailableReason,
    dependsOn: [],
    requiresApproval: false,
    run() {
      throw new Error(`${name}: ${why}.`);
    },
    validate: () => ({ issues: [`${name}: ${why}.`], warnings: [] }),
  };
}
