# Instrucciones de Emilio para este repositorio

Este repo contiene REA (copia de morluto/rea) y, en `rea-lovable/`, ERA Studio,
el constructor de webs de Emilio. Sus instrucciones de desarrollo están en
`AGENTS.md`; aquí van las reglas propias de Emilio, que se suman a esas.

## Diseño: usar siempre la skill `web-pro-empresas`

Siempre que diseñes o construyas algo visual (una página web, una landing, una
interfaz, un rediseño, una plantilla o una propuesta para un cliente), carga
primero la skill `anthropic-skills:web-pro-empresas` y sigue su proceso
completo: descubrimiento, elección de herramienta, diseño mobile-first, código,
checklist de calidad, publicación, negocio y modo profesor.

Esto incluye diseñar páginas para usarlas dentro de ERA Studio (por ejemplo,
escribir el prompt que Emilio pegará en la app) y cambios de diseño en la
propia ERA Studio.

## Referencias de Refero

Emilio quiere que cada web parta de una referencia real de
[Refero Styles](https://styles.refero.design). En el plan de diseño:

- Si Emilio mandó el enlace de un estilo (`styles.refero.design/style/<id>`),
  lee esa página (es pública) y úsala como base: paleta, tipografía,
  espaciado, componentes y composición.
- Si no mandó ninguno, pídele uno o propón 2 o 3 de la página de inicio de
  Refero Styles que encajen con el giro, y espera su elección.
- La búsqueda y la API de Refero están cerradas a la automatización (responden
  403) y su MCP es de pago: no intentes saltarte ese bloqueo.
- Toma solo el lenguaje visual: nunca el nombre, el logo, los textos ni las
  fotos de la marca de origen. Las fuentes de pago se sustituyen por la
  alternativa gratuita que indique el DESIGN.md, y la guía `web-pro-empresas`
  sigue mandando en calidad (accesibilidad, SEO, no inventar datos).
- En ERA Studio, el estilo "📋 De Refero" guarda el DESIGN.md pegado en el
  proyecto y lo envía a la IA en cada petición.

## ERA Studio

- La marca es **ERA Studio** (no "Rea"): logo del sol que forma una E,
  naranja ERA `#f04e23` y azul noche. La carpeta se sigue llamando
  `rea-lovable` y la clave de localStorage `rea-studio:projects`; no las
  cambies sin migrar los datos guardados.
- La versión online se publica en
  <https://claude.ai/artifact/Rmc1e7R2W8YoAvtNt3BGR7> y se genera con
  `npm run build:online` desde `rea-lovable/public/`. Edita siempre los
  archivos de `public/`, nunca `online/rea-studio.html` a mano.
- Emilio usa sobre todo iPhone y iPad: prueba cada cambio de interfaz en
  pantalla táctil y a 360 px de ancho.
