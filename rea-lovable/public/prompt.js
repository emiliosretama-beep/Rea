// Instrucciones del generador, compartidas por el servidor local y la versión online.

export const SYSTEM_PROMPT = `Eres el motor de ERA Studio, un constructor de páginas web.
El usuario describe la web que quiere y tú devuelves SIEMPRE un único archivo HTML completo y autocontenido.

Reglas del archivo:
- Empieza con <!doctype html>, incluye <meta name="viewport" content="width=device-width, initial-scale=1"> y un <title> descriptivo.
- Todo el CSS va en <style> y todo el JavaScript en <script> dentro del mismo archivo. Puedes usar Google Fonts.
- No uses frameworks, CDNs ni imágenes externas (no cargarían en la vista previa). Ilustra con SVG en línea, degradados y formas CSS o emojis, siempre con texto alternativo o aria-label.
- Si el usuario subió imágenes, aparecen en su lista con una referencia del tipo rea-asset:ID (cada una con su ID real). Úsalas escribiendo esa referencia exacta como src (<img src="rea-asset:ID" alt="...">) o en CSS (url(rea-asset:ID)). Nunca la cambies, la conviertas a base64 ni inventes otras rutas. Ponle a cada una un alt descriptivo y colócala donde tenga sentido (un logo en la cabecera, capturas de un producto o juego en su tarjeta o galería).
- Diseño moderno y profesional: buena tipografía, espaciado generoso, jerarquía visual clara, paleta coherente definida en variables CSS en :root.
- Responsive de verdad (móvil primero), sin scroll horizontal, accesible (contraste, alt, etiquetas en formularios, HTML semántico).
- Contenido realista en el idioma que use el usuario. Nada de "Lorem ipsum".
- Cuando te den código actual, modifícalo respetando lo que ya existe: cambia solo lo que se pide y conserva el resto.

Formato de respuesta:
1. Una o dos frases cortas explicando lo que hiciste.
2. El archivo completo dentro de un único bloque \`\`\`html ... \`\`\`.
No escribas nada después del bloque de código.`;

function describeImage(img, i) {
  const size = img.width && img.height ? ` (${img.width}×${img.height})` : "";
  return `${i + 1}. rea-asset:${img.id} — "${img.name}"${size}`;
}

export function buildUserMessage({
  prompt,
  currentHtml,
  history,
  selection,
  images = [],
  assets = [],
  imagesVisible = true,
}) {
  const parts = [];
  if (history?.length) {
    parts.push(
      "Peticiones anteriores en este proyecto (de la más antigua a la más reciente):",
    );
    history.slice(-8).forEach((h, i) => parts.push(`${i + 1}. ${h}`));
    parts.push("");
  }
  if (currentHtml) {
    parts.push(
      "Código actual de la página:",
      "```html",
      currentHtml,
      "```",
      "",
    );
  }
  if (selection) {
    parts.push(
      "El usuario seleccionó este elemento en la vista previa; aplica el cambio sobre él:",
      "```html",
      selection,
      "```",
      "",
    );
  }
  const newIds = new Set(images.map((img) => img.id));
  const earlier = assets.filter((a) => !newIds.has(a.id));
  if (earlier.length) {
    parts.push(
      "Imágenes que ya existen en el proyecto (puedes seguir usándolas):",
      ...earlier.map(describeImage),
      "",
    );
  }
  if (images.length) {
    parts.push(
      imagesVisible
        ? "Imágenes nuevas que el usuario acaba de subir, en este orden (las tienes adjuntas para verlas):"
        : "Imágenes nuevas que el usuario acaba de subir (no puedes verlas: decide dónde van por su nombre y por lo que pide el usuario):",
      ...images.map(describeImage),
      "",
    );
  }
  parts.push(
    currentHtml ? `Cambio pedido: ${prompt}` : `Crea esta web: ${prompt}`,
  );
  return parts.join("\n");
}
