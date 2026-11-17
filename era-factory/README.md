# ERA Factory

Fábrica de canales de YouTube: un equipo de agentes de IA coordinados que
investiga, decide, escribe, narra, diseña las miniaturas y monta tus videos.
Tú supervisas, editas y apruebas desde un centro de operaciones que funciona
en iPhone, iPad y escritorio.

## Estado actual: fase 5 en DEV (pendiente de pasar a estable)

| Agente | Estado | Qué hace |
| --- | --- | --- |
| 1. Investigador de tendencias | ✅ Funciona | Búsqueda web real (herramienta `web_search` de Claude) + videos más vistos del nicho si hay `YOUTUBE_API_KEY`. Propone tendencias e ideas, **cada una citando fuentes reales**. |
| 2. Analista de audiencia | ✅ Funciona | Define al espectador tipo, elige la mejor idea y fija formato, duración, tono y plan de retención. No inventa métricas: dice cuándo no las hay. |
| 3. Guionista | ✅ Funciona | Guion completo (gancho, secciones con narración y notas visuales, cierre, CTA, descripción, etiquetas) + segunda pasada que verifica cada dato contra la investigación. **Necesita tu aprobación.** |
| 4. Narrador | ✅ Funciona (solo con servidor) | Kokoro TTS local: 54 voces en 9 idiomas, velocidad 0,7–1,3×. MP3 por sección + pista completa con pausas; los tiempos de cada sección salen de la duración real del audio. Reproductor sincronizado con el guion. **Necesita tu aprobación.** |
| 5. Diseñador de miniaturas | ✅ Funciona (también online) | Claude propone 10 miniaturas distintas (8 diseños, 6 fondos, 8 paletas con contraste comprobado, 16 iconos) y recomienda 3. Se dibujan con Canvas; comparas, ves cómo quedan en el feed, editas en vivo y descargas el PNG 1280×720. La revisión rechaza cifras que no estén en el guion y propuestas repetidas. **Aprobar exige elegir una.** Son composiciones gráficas: sin fotos. |
| 6. Productor | ✅ Funciona (solo con servidor) | Claude decide qué texto aparece en pantalla en cada frase; escenas 1920×1080 con la paleta de la miniatura (Pillow); MP4 H.264 + AAC con ffmpeg; subtítulos .srt (o incrustados) y capítulos de YouTube cuando cumplen sus reglas. Los tiempos de escena salen del audio real; dentro de una sección, los subtítulos son aproximados (±1 s). **Necesita tu aprobación.** |
| 7. Analista de rendimiento | 🧪 En DEV (también online) | Trabaja aparte de la cadena, en la pestaña **Resultados**: pegas las cifras del video publicado (YouTube Studio, TikTok o Instagram; solo las vistas son obligatorias), las compara con la mediana de tus otros videos y envía aprendizajes con su evidencia al investigador, al analista de audiencia, al guionista y al de miniaturas. Solo usa las cifras que escribes; con menos de 2 videos no da veredicto. Conexión automática con YouTube Analytics (OAuth): pendiente, necesita servidor. |

Los agentes de fases futuras aparecen en el panel marcados como planificados y
**no se ejecutan**: no hay botones decorativos.

## Versión estable y versión DEV

- **Estable: v1.0.0** (git tag `era-factory-v1.0.0`), publicada en
  <https://claude.ai/artifact/BsRfL98pX2iei5NMYQH5km>. Es la que usa Emilio.
  Incluye la vista **Oficina** (el equipo dibujado en una oficina isométrica,
  con su estado real).
- **DEV actual:** <https://claude.ai/artifact/1Hxr13yjW6waE1Bq9ZFEbm> (`npm run build:dev`
  → `online/era-factory-dev.html`). Trae la fase 5 y los ajustes de la Oficina.
- Los cambios nuevos se prueban primero en una **versión DEV** (otro artifact,
  con datos aparte) y solo pasan a la URL estable cuando Emilio lo autoriza.
  Cada versión estable lleva su tag `era-factory-vX.Y.Z` para poder volver atrás.

## Shorts verticales

Cada canal elige su formato: **Shorts verticales 9:16** (por defecto) o
**videos horizontales 16:9** (`public/formats.js`). En Shorts:

- El analista fija la duración en segundos (15–60 s; 30 s por defecto).
- El guionista escribe gancho de máximo 15 palabras, 2–3 momentos y un cierre corto.
- El productor cambia de pantalla cada 2–4 s y monta en 1080×1920, con el texto en la zona
  segura (lejos de los botones de la derecha y del título de abajo).
- Subtítulos incrustados por defecto, de 3 palabras y grandes; el .srt también se entrega.
- Miniaturas verticales 1080×1920 (portada). Como en Shorts YouTube suele usar un fotograma del
  video como portada, la elegida se pone como última escena del Short para seleccionarla al subirlo.

## Producir el video desde la versión online

En la versión online, el botón **Exportar para video** (con el guion aprobado)
descarga un paquete `.json` con el guion, la miniatura elegida y el formato.
Con la versión con servidor instalada:

```bash
node scripts/produce-package.mjs paquete.json --out salida [--plan plan.json] [--voice em_alex] [--speed 1.1] [--subs on|off]
```

Devuelve `salida/video.mp4`, `subtitulos.srt` y `descripcion.txt`. Con `--plan`
se fija qué texto aparece en pantalla en cada frase; sin él, se usa uno
automático (la frase clave recortada).

## Versión online (iPhone y iPad)

Abre <https://claude.ai/artifact/BsRfL98pX2iei5NMYQH5km> en Safari o en la app
de Claude. No necesita servidor ni API key:

- **IA**: usa tu cuenta de Claude (la primera vez pide permiso). Cada tarea
  gasta uso de tu plan; los agentes trabajan de uno en uno.
- **Datos**: se guardan en la nube de claude.ai, privados (`data/users/<tu id>/`),
  y los ves igual en el iPhone y en el iPad.
- **Un dispositivo trabaja a la vez**: si la abres en dos, el segundo queda en
  modo lectura (botón «Usar en este dispositivo») para no producir dos veces.
- **Trabaja mientras la página está abierta.** Si la cierras a media tarea,
  se reanuda al volver a abrirla.
- **Descargas**: las miniaturas se descargan con el diálogo de claude.ai (tú confirmas).
- **Sin voz ni video**: el narrador y el productor necesitan Python, Kokoro y
  ffmpeg, que no caben en una página de claude.ai. Allí aparecen como «Solo con
  servidor» y la cadena termina en la miniatura aprobada.
- **Sin búsqueda web**: una página de claude.ai no puede navegar ni llamar a
  YouTube. Pega en «Material de investigación» enlaces o títulos que veas; se
  convierten en las fuentes numeradas del investigador. Sin material, las
  ideas salen del conocimiento general de Claude y se marcan para que las
  confirmes.

Se genera con `npm run build:online` (empaqueta `public/` y `src/` con esbuild
en `online/era-factory.html`) y se publica en esa misma URL. Edita siempre
`public/` y `src/`, nunca el HTML generado.

## Cómo usarlo con servidor (búsqueda web y YouTube)

Requisitos: Node.js 22.13 o superior.

```bash
cd era-factory
npm install
cp .env.example .env     # pega tu ANTHROPIC_API_KEY (y opcionalmente YOUTUBE_API_KEY)
bash tools/setup.sh         # voz y video: Kokoro (~115 MB), Pillow y fuentes
npm start                # http://127.0.0.1:5180
```

Requisitos de voz y video: Python 3.10+, `ffmpeg` con `libmp3lame`, `libx264`,
`aac` y `libass`, y ~120 MB
de disco para el modelo int8 (`KOKORO_VARIANT=fp16` o `full` para más
calidad y más peso). Narrar tarda aproximadamente lo mismo que dura el audio
en una CPU normal. El audio se guarda en `data/media/` y se borra con su
producción.

1. **Canales → Nuevo canal**: nombre, nicho, idioma, público, tipo de videos y frecuencia.
2. **Producir un video** (con un tema concreto opcional). La cadena arranca sola.
3. Mira el progreso en vivo. Al terminar el guion, la producción se detiene:
   edítalo ahí mismo y **apruébalo**, o **pide cambios** a la IA con tus notas.

Sin `ANTHROPIC_API_KEY` la app abre, pero los agentes fallan con un mensaje
claro. Para revisar la interfaz sin gastar API: `FACTORY_LLM=mock npm start`
(datos de prueba fijos, marcados como `[SIMULACIÓN]`).

Para abrirla desde el iPhone en tu red: `HOST=0.0.0.0 npm start` y entra a
`http://IP-de-tu-compu:5180`. **No tiene login**: hazlo solo en redes de confianza.

## Arquitectura

```
era-factory/
├── server.js               HTTP: interfaz, API REST y eventos en vivo (SSE)
├── src/
│   ├── config.js           variables de entorno (único lugar que las lee)
│   ├── db.js               SQLite (node:sqlite): canales, producciones, tareas, registro, aprendizajes
│   ├── events.js           bus de eventos → SSE
│   ├── llm.js              Claude: json() con JSON Schema y research() con búsqueda web
│   ├── orchestrator.js     coordinador central (ver abajo)
│   ├── factory.js          ensambla todo (servidor y tests)
│   ├── agents/             un archivo por agente + registro (index.js)
│   ├── services/youtube.js YouTube Data API v3
│   ├── services/tts.js     narración: Kokoro (Python) + ffmpeg
│   ├── services/video.js   montaje: escenas (Pillow) + MP4 (ffmpeg)
│   ├── services/process.js lanzar Python/ffmpeg con progreso y cancelación
│   ├── timeline.js         frases, escenas, subtítulos SRT y capítulos
│   ├── voices.js           catálogo de voces e idiomas de Kokoro
│   (public/thumbs/)        catálogo y dibujador de miniaturas, compartidos con el agente
│   ├── db-memory.js        misma interfaz que db.js, en memoria (versión online)
│   ├── routes.js           rutas de la API (servidor y versión online)
│   ├── schema.js           validador de JSON Schema (versión online)
│   ├── cloud/              versión online: arranque, IA vía sample, guardado y turno
│   └── mock-fixtures.js    datos del modo simulación y de los tests
├── public/                 interfaz (HTML + CSS + JS sin framework), común a las dos versiones
├── scripts/build-online.mjs  arma la versión online
├── online/era-factory.html   versión online generada
├── tools/tts_kokoro.py     motor de voz (JSON por stdin, WAV por segmento)
├── tools/setup_kokoro.sh   instala kokoro-onnx y descarga el modelo
├── tools/render_scenes.py  escenas del video (Pillow)
├── tools/setup.sh          todo lo del servidor: Kokoro, Pillow y fuentes
└── tests/                  node:test (incluye una prueba REAL con Kokoro si está instalado)
```

### El coordinador

Cada video es una **producción** con una **tarea por agente**. El coordinador:

- **Asigna** la siguiente tarea en cuanto termina la anterior (cola con límite de concurrencia).
- **Comparte información**: cada agente recibe los resultados de los agentes de los que depende (`dependsOn`) y los aprendizajes del canal.
- **Revisa** cada resultado (`validate`) antes de pasarlo: `issues` hacen repetir la tarea con las correcciones; `warnings` se te muestran.
- **Reintenta**: hasta `FACTORY_MAX_ATTEMPTS` por revisión fallida o error temporal de la API (con espera). Los errores de configuración no se reintentan.
- **Se detiene** donde hace falta tu aprobación; **pedir cambios** rehace la tarea con tus notas e invalida lo que dependía de ella.
- **Cancela** tareas en curso y **recupera** las que quedaron a medias si el servidor se reinicia.
- **Publica** cada cambio en tiempo real a la interfaz.

Estados de tarea: `pending → running → done | awaiting_approval | failed | cancelled`.

### Contra la información inventada

- Las fuentes las pone el **código**, a partir de los resultados reales de la búsqueda web y de YouTube. Los agentes solo pueden citarlas por número.
- La revisión **rechaza** cualquier cita a una fuente que no existe y la tarea se repite.
- El guionista lista cada dato verificable; una segunda pasada lo marca como respaldado, sin respaldo o contradicho. Lo contradicho obliga a reescribir; lo sin respaldo te lo señala antes de aprobar.

### Añadir un agente

Crea `src/agents/<id>.js` con el contrato documentado en `src/agents/index.js`
(`run`, `validate`, `dependsOn`, `requiresApproval`…) y colócalo en `AGENTS`.

## Plan por fases

| Fase | Contenido | Servicios externos |
| --- | --- | --- |
| **1 ✅** | Núcleo, coordinador, agentes 1-3, centro de operaciones | Anthropic API (obligatoria), YouTube Data API v3 (opcional, gratis con cuota) |
| **2 ✅** | Narrador: Kokoro TTS local (`kokoro-onnx` 0.6.1), selector de voz, idioma y velocidad, audio por sección, reproductor sincronizado | Ninguno (local). Modelo int8 + voces desde GitHub (~115 MB) |
| **3 ✅** | Miniaturas: 10 propuestas dibujadas con Canvas, comparación, recomendación, editor en vivo y descarga PNG 1280×720 | Ninguno (fuente Anton de Google Fonts). Fotos o imágenes con IA: pendiente de decidir |
| **4 ✅** | Productor: escenas, montaje MP4, subtítulos, capítulos y descripción para YouTube | ffmpeg (libx264, aac, libass), Pillow y fuentes OFL (Anton, Atkinson Hyperlegible) |
| **5 🧪** | Analista de rendimiento: métricas que pega el usuario → comparación con el canal → aprendizajes para 4 agentes (en DEV). Pendiente: lectura automática con OAuth y subida a YouTube | Ninguno con métricas manuales. Con OAuth: YouTube Analytics API + YouTube Data API |

## Pruebas

```bash
npm test
```

Cubren el coordinador (cadena completa, revisión con reintento, fallo tras
agotar intentos, sin API key, pedir cambios, edición aprobada, cancelar y
reanudar, recuperación tras reinicio), el adaptador de Claude con un cliente
simulado, el de YouTube con respuestas simuladas y la API HTTP con SSE.

`npm test` también corre la batería del coordinador contra la base en memoria
de la versión online, y prueba sus piezas (IA vía `sample` simulada, guardado
y turno con una `db` simulada). La versión online completa se probó en
Chromium con un `window.claude` simulado (flujo completo, dos dispositivos,
recuperación de datos).

**Lo que no se ha probado contra los servicios reales**: las llamadas a la API
de Anthropic y a YouTube (en el entorno de desarrollo no había keys), ni
`sample` y `db` reales de claude.ai (requieren tu sesión y tu permiso). Los tests
verifican la forma de las peticiones y el manejo de respuestas; la primera
ejecución con tus keys es la prueba real.

## Costos

Cada video en fase 1 hace 5 llamadas a Claude (investigación con hasta 6
búsquedas web, estructurar, audiencia, guion, verificación). Las búsquedas web
y los tokens se cobran a tu cuenta de Anthropic; revisa tu consumo en la
consola tras los primeros videos. La búsqueda de YouTube usa ~101 unidades de
cuota de las 10 000 diarias gratuitas.
