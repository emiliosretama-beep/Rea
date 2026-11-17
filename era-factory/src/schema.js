// Validador mínimo de JSON Schema para el subconjunto que usan los agentes:
// type, properties, required, additionalProperties:false, items, enum, anyOf.
// Hace falta en la versión online: allí Claude responde texto y el formato
// no viene garantizado por la API como en el servidor.

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matches(type, actual) {
  return type === actual || (type === "number" && actual === "integer");
}

export function validateSchema(value, schema, path = "respuesta") {
  const errors = [];
  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => validateSchema(value, s, path).length === 0);
    if (!ok) errors.push(`${path}: no coincide con ningún formato permitido`);
    return errors;
  }
  const actual = typeOf(value);
  if (schema.type && !matches(schema.type, actual)) {
    errors.push(`${path}: se esperaba ${schema.type} y llegó ${actual}`);
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: valor no permitido «${value}»`);
  if (actual === "object" && schema.properties) {
    for (const key of schema.required ?? [])
      if (!(key in value)) errors.push(`${path}.${key}: falta`);
    for (const [key, sub] of Object.entries(schema.properties))
      if (key in value) errors.push(...validateSchema(value[key], sub, `${path}.${key}`));
  }
  if (actual === "array" && schema.items)
    value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, `${path}[${i}]`)));
  return errors;
}

// Elimina las claves que el schema no declara (additionalProperties: false).
export function pruneToSchema(value, schema) {
  if (schema.anyOf) {
    const match = schema.anyOf.find((s) => validateSchema(value, s).length === 0);
    return match ? pruneToSchema(value, match) : value;
  }
  if (typeOf(value) === "object" && schema.properties)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k in schema.properties)
        .map(([k, v]) => [k, pruneToSchema(v, schema.properties[k])]),
    );
  if (Array.isArray(value) && schema.items) return value.map((v) => pruneToSchema(v, schema.items));
  return value;
}
