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
