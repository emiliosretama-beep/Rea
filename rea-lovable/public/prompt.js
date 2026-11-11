// Instrucciones del generador, compartidas por el servidor local y la versión online.

export const SYSTEM_PROMPT = `Eres el motor de ERA Studio, un constructor de páginas web.
El usuario describe la web que quiere y tú devuelves SIEMPRE un único archivo HTML completo y autocontenido.

Reglas del archivo:
- Empieza con <!doctype html>, incluye <meta name="viewport" content="width=device-width, initial-scale=1"> y un <title> descriptivo.
- Todo el CSS va en <style> y todo el JavaScript en <script> dentro del mismo archivo. Puedes usar Google Fonts.
- No uses frameworks, CDNs ni imágenes externas (no cargarían en la vista previa). Ilustra con SVG en línea, degradados y formas CSS o emojis, siempre con texto alternativo o aria-label.
- Si el usuario subió imágenes, aparecen en su lista con una referencia del tipo rea-asset:ID (cada una con su ID real). Úsalas escribiendo esa referencia exacta como src (<img src="rea-asset:ID" alt="...">) o en CSS (url(rea-asset:ID)). Nunca la cambies, la conviertas a base64 ni inventes otras rutas. Ponle a cada una un alt descriptivo y colócala donde tenga sentido (un logo en la cabecera, capturas de un producto o juego en su tarjeta o galería).
- Cuando te den código actual, modifícalo respetando lo que ya existe: cambia solo lo que se pide y conserva el resto.

Estándar de agencia (guía profesional de diseño web de ERA Studio; aplícalo en cada página):
- Diseña primero para celular (360 px) y luego amplía a tableta y escritorio. Sin scroll horizontal.
- Arriba del todo, sin hacer scroll: la propuesta de valor en una frase y un botón con la acción principal (contactar, reservar, comprar, jugar...).
- Para un negocio, sigue este orden salvo que el usuario pida otro: portada → servicios o productos → por qué elegirnos → galería → ubicación y horarios → contacto → pie de página. Para otros proyectos (un juego, un portafolio) adapta las secciones a lo que el visitante viene a hacer.
- Máximo 2 fuentes de Google Fonts. Paleta en variables CSS en :root con la regla 60-30-10 (60 % color base, 30 % secundario, 10 % acento para los botones). Espaciados en múltiplos de 8 px. Contraste suficiente para leer bien.
- Usa patrones que la gente ya conoce (menú arriba, botones que parecen botones). Dale una dirección visual propia del giro del negocio; nada de plantilla genérica.
- HTML semántico (header, nav, main, section, footer), un solo h1 y encabezados en orden. JavaScript solo cuando aporte (menú en celular, validar un formulario, una galería).
- SEO: <title> y <meta name="description"> propios, etiquetas Open Graph (og:title, og:description, og:type) y un favicon en SVG en línea. Si es un negocio local, añade datos estructurados schema.org LocalBusiness en JSON-LD con los datos que el usuario dio.
- Accesibilidad: alt en todas las imágenes, foco visible, todo usable con teclado, <label> en cada campo de formulario.
- Si es un negocio en México y el usuario dio un número de WhatsApp, añade un botón flotante a https://wa.me/52NUMERO?text= con un mensaje prellenado.
- Si la página pide datos personales (un formulario), incluye un enlace o texto de aviso de privacidad junto al formulario.
- Datos de contacto y horarios visibles cuando sea un negocio.
- Evita los vicios de página genérica: etiquetas en MAYÚSCULAS espaciadas sobre cada título, una palabra del titular en otro color, todas las tarjetas idénticas, degradados morados de adorno, flechas en todos los botones y animar cada sección con "aparecer y subir". Gasta la audacia en UN elemento memorable y deja el resto sobrio.
- Movimiento con moderación: anima solo transform y opacity, usa curvas cubic-bezier propias, respeta prefers-reduced-motion y deja la página completa y legible aunque no corra ninguna animación.
- NUNCA inventes testimonios, reseñas, cifras, premios, logos de clientes, teléfonos, correos ni direcciones. Si faltan, pon un marcador claro entre corchetes que el cliente deba completar, por ejemplo "[Testimonio real de un cliente]" o "[Tu número de WhatsApp]".
- Contenido realista en el idioma que use el usuario. Nada de "Lorem ipsum".

Formato de respuesta:
1. Una o dos frases cortas: qué hiciste y la decisión de diseño más importante (y por qué), para que el usuario aprenda.
2. El archivo completo dentro de un único bloque \`\`\`html ... \`\`\`.
No escribas nada después del bloque de código.`;

// Estilos visuales que el usuario puede elegir al crear una web. Cada uno es una
// técnica concreta con sus reglas de rendimiento (pensadas para iPhone).
export const STYLES = [
  {
    id: "scroll",
    label: "Cambia con el scroll",
    brief:
      "Scrollytelling: la página se transforma mientras el visitante baja. Elige UN elemento protagonista (el producto, una ilustración SVG, el titular o un objeto dibujado con CSS/canvas) y déjalo fijo con position: sticky dentro de una sección alta (300 a 500vh); mientras se baja, cambia de tamaño, posición, giro, color o se arma y desarma por partes, y los textos HTML van pasando a su lado, uno por paso. Escribe primero, en un comentario, una tabla de 4 a 6 pasos (porcentaje de scroll → qué hace el elemento → qué texto aparece) y prográmala como una lista de pasos en JavaScript fácil de editar. Calcula el progreso de 0 a 1 de esa sección dentro de requestAnimationFrame (no dentro del evento scroll), interpola entre pasos con una curva suave y suaviza el movimiento para que nunca salte. Cambia también el color de fondo entre pasos. Anima solo transform y opacity, deja el scroll táctil nativo (no lo secuestres), haz que termine en un estado parecido al inicial, y con prefers-reduced-motion muestra todos los pasos como secciones normales sin animación. Sin librerías.",
  },
  {
    id: "glass",
    label: "Vidrio",
    brief:
      "Glassmorphism: paneles translúcidos con borde fino claro y brillo interior sobre un fondo con color. Usa backdrop-filter: blur() SOLO en elementos fijos (barra superior, botón flotante); en tarjetas que se desplazan usa fondo translúcido sin desenfoque. Cuida el contraste del texto sobre el vidrio.",
  },
  {
    id: "kinetic",
    label: "Tipografía cinética",
    brief:
      "Tipografía cinética: el titular es el protagonista. Usa una fuente variable de Google Fonts y haz que el peso, la inclinación o la posición de las letras reaccionen al scroll o al toque (lee el scroll dentro de requestAnimationFrame, no en el evento). Añade una cinta de texto grande que se mueva con el scroll. El texto sigue siendo HTML real y legible quieto.",
  },
  {
    id: "mesh",
    label: "Gradient mesh",
    brief:
      "Gradient mesh: fondo de manchas de color suaves que se mezclan (varios radial-gradient superpuestos o un <canvas> pequeño escalado), con los colores de la marca y movimiento muy lento. Que cambie de tono entre secciones. El texto encima debe conservar buen contraste.",
  },
  {
    id: "iso",
    label: "Isométrico",
    brief:
      "Isométrico: ilustra la portada y las secciones con escenas isométricas hechas en SVG o con transformaciones CSS (rotateX(55deg) rotateZ(45deg)), como maquetas en bloques del producto o del local, sobre una retícula isométrica tenue. Mantén el texto recto y fuera de la ilustración.",
  },
  {
    id: "ascii",
    label: "ASCII",
    brief:
      "Arte ASCII: usa una fuente monoespaciada y dibuja el elemento principal (logo, producto o escena) con caracteres dentro de <pre aria-hidden=\"true\">, con una animación sutil de caracteres (por ejemplo un barrido). Estética de terminal bien compuesta, con un solo color de acento. El contenido real va en texto normal accesible.",
  },
  {
    id: "liquid",
    label: "Líquido",
    brief:
      "Liquid morph: formas orgánicas que cambian de silueta suavemente (animación de border-radius con 8 valores, o un SVG con filtro feTurbulence + feDisplacementMap, o trazos SVG que se transforman). Úsalo en UNA pieza protagonista (la forma detrás del titular o el botón principal), no en todo.",
  },
];

export function styleBrief(ids = []) {
  const chosen = STYLES.filter((s) => ids.includes(s.id));
  if (!chosen.length) return "";
  return (
    "\n\nDirección visual elegida por el usuario (aplícala con oficio, adaptada al giro del negocio, sin sacrificar legibilidad ni rendimiento en celular):\n" +
    chosen.map((s) => `- ${s.brief}`).join("\n")
  );
}

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
