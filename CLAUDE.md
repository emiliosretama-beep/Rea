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

## ERA Factory

- `era-factory/` es la fábrica de canales de YouTube con agentes de IA
  (Node 22, `node:sqlite`, sin framework). El plan por fases y la arquitectura
  están en `era-factory/README.md`; actualiza su tabla de estado al terminar
  cada fase.
- No simules funciones: un agente sin programar se registra con `planned()` y
  no entra en la cadena. Las fuentes que citan los agentes salen siempre de
  resultados reales (búsqueda web, YouTube) o del material que pega el
  usuario, nunca del texto del modelo.
- Prueba con `npm test` y con el navegador a 360 px (`FACTORY_LLM=mock`).
- La versión online **estable** (v1.1.0, tag `era-factory-v1.1.0`) está en
  <https://claude.ai/artifact/BsRfL98pX2iei5NMYQH5km> y se genera con
  `npm run build:online`. No la republiques sin autorización de Emilio: los
  cambios nuevos se publican primero en un artifact DEV aparte y pasan a la
  URL estable (con un tag `era-factory-vX.Y.Z` nuevo) solo cuando él lo
  apruebe. Allí no hay `confirm()`, `fetch` externo ni búsqueda web.
- La versión DEV está en <https://claude.ai/artifact/1Hxr13yjW6waE1Bq9ZFEbm>
  y se genera con `npm run build:dev` (`online/era-factory-dev.html`).
- Antes de republicar la estable, lee el artifact: si alguien le añadió algo
  (como pasó con la vista Oficina), pásalo primero a `public/` para no
  borrarlo.

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
