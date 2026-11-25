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

## Videos (sesiones de video)

- Emilio pasa el guion. Antes de producir, pregúntale **siempre** qué estilo
  de animación quiere (no lo elijas tú): `/stick-figure`, `/zach-d-films`,
  `/map-route`, `/graph`, `/breakdown`, `/minimalistic-graphics`,
  `/low-poly`, `/minecraft`, `/kurzgesagt`, `/dan-koe`, o videos con
  Remotion/IA (`remotion-ia`). Puede mezclar varios.
- Todos esos estilos están en **una sola skill**, `.claude/skills/animacion`
  (`estilos/<estilo>/GUIA.md` + el `kit/` compartido), copiada de
  <https://github.com/artemnovitckii/claude-animation-skills> (MIT). Ya no hay
  que clonar nada: en cada sesión nueva basta `bash videos/setup.sh`
  (paquetes de Node, Playwright 1.63.0 = Chromium de `/opt/pw-browsers`, voz
  ~1 GB). No correr `kit/setup.sh` ni `playwright install`.
- En este repo usa `animacion` aunque también aparezca la skill de claude.ai
  `videos-verticales-ia`: su contenido ya está en `estilos/remotion-ia`.
- Toda skill nueva de animación o video se agrega como estilo dentro de
  `animacion` (pasos en su `SKILL.md`), revisándola antes con `skills-scout`.
- Voz: Kokoro (thewh1teagle/kokoro-onnx). En español usa `lang="es"` y las
  voces `ef_dora`, `em_alex` o `em_santa` (`tts_kokoro.py` viene fijo en
  inglés). El alineador Parakeet es inglés: usa sus tiempos pero el texto del
  guion para los subtítulos.

## Videos de lecciones (horizontales, para estudiar)

- Cuando Emilio mande una lección de un curso (p. ej. un link de
  academy.claude.com), sigue `videos/lecciones/README.md`: corre primero
  `bash videos/setup.sh`, copia `videos/lecciones/plantilla/` (motor 1920x1080
  con la Lección 1 de Claude 101 como ejemplo) y produce un video de ≈4 min.
