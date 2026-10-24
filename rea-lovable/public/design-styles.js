// Estilos visuales que el usuario puede elegir para sus páginas.
// Cada guía se resume de un DESIGN.md (por ejemplo, de styles.refero.design)
// y se adapta a las reglas de ERA Studio: solo Google Fonts, sin imágenes
// externas y diseño para celular primero. Se envía a la IA en cada petición
// del proyecto, así que debe ser corta: es lo que más tokens repite.

export const DESIGN_STYLES = [
  {
    id: "arena",
    name: "Arena",
    emoji: "🏟️",
    summary: "Negro, un solo verde lima y títulos gigantes de cartel.",
    source: "Refero Styles · estilo de Swoosh (Nike)",
    guide: `Estilo "Arena": una arena de videojuegos a medianoche. Suelo negro, un único verde lima eléctrico y títulos enormes de cartel de torneo. Toma solo el lenguaje visual: no uses nombres, logos ni textos de ninguna marca real.
- Colores (en variables CSS): fondo #111111; tarjetas y modales #1f1f21 con borde 1px #28282a; divisores #39393b; bordes de imágenes #707072; texto #ffffff. Acento lima #b7ff2c SOLO en botones rellenos (texto #000000), bordes de botones secundarios y estados activos o marcados. Nunca en títulos, párrafos ni fondos grandes. No añadas ningún otro color con tono (ni azul, ni rojo...).
- Tarjeta blanca flotante: fondo #ffffff, texto #000000 y borde #e5e5e5 (ese borde solo sobre blanco, nunca sobre oscuro).
- Tipografía: una sola familia, "Geist" (Google Fonts): 700 para títulos y 400/500 para el texto. Título principal con font-size: clamp(56px, 15vw, 110px) y line-height 0.85; títulos de sección clamp(40px, 9vw, 64px) con line-height 1; subtítulo 20px/1.4; texto 16px/1.5. Títulos con interlineado menor de 1, apretados como un cartel.
- Forma: border-radius de 6px en todo (botones, tarjetas, menú, imágenes, modales); nunca 0 ni 12px o más. Sin degradados. Sin sombras, salvo 0 2px 6px rgba(17,17,17,.125) en la barra de navegación.
- Botón principal: fondo #b7ff2c, texto #000000, Geist 500 16px, padding 16px 20px, radio 6px. Botón secundario: borde 1px #b7ff2c, texto #b7ff2c, fondo transparente.
- Composición: portada a todo el ancho con el título grande abajo a la izquierda y el botón lima debajo. Alterna secciones de imagen a sangre, frases gigantes centradas sobre negro y tarjetas blancas que flotan sobre las imágenes, como portada de revista. Separación entre secciones de 48 a 64px, padding de tarjetas de 20 a 24px y espaciado en múltiplos de 4px. Pie con borde superior 1px #39393b y enlaces de 14px.
- Imágenes: si el usuario subió fotos, úsalas grandes, recortadas y con mucho contraste. Si no hay, crea composiciones oscuras con SVG o CSS (siluetas, rejillas de luz, formas geométricas); nada de ilustraciones infantiles.`,
  },
];

// Estilo propio del proyecto: el usuario pega el DESIGN.md de un estilo de
// styles.refero.design. Se recorta porque viaja en cada petición a la IA.
export const REFERO_STYLE_ID = "refero";
export const MAX_REFERO_STYLE_CHARS = 12000;

export function findDesignStyle(id) {
  return DESIGN_STYLES.find((s) => s.id === id) ?? null;
}
