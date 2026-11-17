# ERA Factory

Fábrica de canales de YouTube: un equipo de agentes de IA coordinados que
investiga, decide, escribe y narra videos, y (en próximas fases) diseña y produce.
Tú supervisas, editas y apruebas desde un centro de operaciones que funciona
en iPhone, iPad y escritorio.

## Estado actual: fase 2 terminada

| Agente | Estado | Qué hace |
| --- | --- | --- |
| 1. Investigador de tendencias | ✅ Funciona | Búsqueda web real (herramienta `web_search` de Claude) + videos más vistos del nicho si hay `YOUTUBE_API_KEY`. Propone tendencias e ideas, **cada una citando fuentes reales**. |
| 2. Analista de audiencia | ✅ Funciona | Define al espectador tipo, elige la mejor idea y fija formato, duración, tono y plan de retención. No inventa métricas: dice cuándo no las hay. |
| 3. Guionista | ✅ Funciona | Guion completo (gancho, secciones con narración y notas visuales, cierre, CTA, descripción, etiquetas) + segunda pasada que verifica cada dato contra la investigación. **Necesita tu aprobación.** |
| 4. Narrador | ✅ Funciona (solo con servidor) | Kokoro TTS local: 54 voces en 9 idiomas, velocidad 0,7–1,3×. MP3 por sección + pista completa con pausas; los tiempos de cada sección salen de la duración real del audio. Reproductor sincronizado con el guion. **Necesita tu aprobación.** |
| 5. Diseñador de miniaturas | Fase 3 | 10 propuestas 1280×720, comparar, recomendar, editar. |
| 6. Productor | Fase 4 | Montaje con ffmpeg: audio + imágenes + guion → MP4. |
| 7. Analista de rendimiento | Fase 5 | YouTube Analytics (OAuth): métricas reales → aprendizajes para 1 y 3. |

Los agentes de fases futuras aparecen en el panel marcados como planificados y
**no se ejecutan**: no hay botones decorativos.

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
- **Sin voz**: el narrador necesita Python, Kokoro y ffmpeg, que no caben en una
  página de claude.ai. Allí aparece como «Solo con servidor» y la cadena
  termina en el guion aprobado.
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
bash tools/setup_kokoro.sh   # voz: instala kokoro-onnx y baja el modelo (~115 MB)
npm start                # http://127.0.0.1:5180
```

Requisitos del narrador: Python 3.10+, `ffmpeg` con `libmp3lame` y ~120 MB
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
│   ├── voices.js           catálogo de voces e idiomas de Kokoro
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
| 3 | Miniaturas: 10 propuestas renderizadas a PNG 1280×720, comparación, recomendación y editor | Render local con Chromium; generación de imágenes con IA opcional (por decidir) |
| 4 | Productor: montaje con ffmpeg (audio + escenas + subtítulos) → MP4 descargable | ffmpeg (local) |
| 5 | Analista de rendimiento: métricas reales y bucle de aprendizaje; subida a YouTube opcional | YouTube Analytics API + YouTube Data API con OAuth 2.0 |

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
