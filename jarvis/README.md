# Jarvis

Asistente personal de Emilio: un chat con cuatro modos, tareas, memoria y voz,
con estética de HUD y la marca ERA. Vive como página de Claude (artifact) y usa
la cuenta de Claude de quien la abre, sin API key.

- **Página publicada**: <https://claude.ai/artifact/YXeo6agJJraQ6Ch1hwiiQP>
  (privada; para actualizarla, publica `online/jarvis.html` sobre esa misma URL).
- **Alcance**: Fase 1. La Fase 2 (resumen matutino y conexión a OpenJarvis)
  no está empezada.

## Qué hace

| Función   | Descripción                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| Chat      | Respuesta en streaming, con botón para detener. Markdown con bloques de código copiables.                        |
| Modos     | General, Juegos (ERAGames, itch.io), Escuela (paso a paso) y Organizar. Cada uno cambia instrucciones y modelo.  |
| Tareas    | Agregar, marcar y borrar, a mano o pidiéndoselo a Jarvis ("anota…", "ya hice…"). Todo borrado se puede deshacer. |
| Memoria   | Datos que Jarvis recuerda entre conversaciones ("recuerda que…").                                                |
| Modo voz  | Hablarle con el botón del micrófono: el mensaje se envía solo al hacer una pausa y Jarvis contesta hablando.     |
| El núcleo | El sol de ERA animado: respira en reposo, gira al pensar y pulsa con cada trozo de texto que llega.              |
| Modo demo | Si la vista no puede usar Claude, responde con textos fijos y lo avisa.                                          |

## Cómo funciona

Jarvis se apoya en las _capabilities_ que claude.ai da a una página publicada.
Cada una puede faltar en una vista, y la página sigue funcionando sin ella.

| Capability  | Para qué                                                                      | Si falta                                                    |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `sample`    | Hablar con Claude en streaming y darle herramientas para tareas y memoria.    | Modo demo.                                                  |
| `db`+`user` | Guardar tareas y recuerdos en `data/users/<id>/jarvis/`, privado por persona. | Aviso; nada se guarda al cerrar.                            |
| `dictation` | El micrófono: dictar con un toque.                                            | En teléfono y tableta se usa el dictado del teclado.        |
| `tts`       | La voz de Claude para leer las respuestas.                                    | Se usa la voz del navegador (`speechSynthesis`), si existe. |

Detalles que conviene saber antes de tocar el código:

- `sample` no tiene _system prompt_ ni memoria: en cada mensaje la página manda
  las instrucciones (`prompt.js`) como primer turno, con la fecha, las tareas y
  los recuerdos numerados, seguidas del historial.
- Jarvis actúa con herramientas de `sample` cuando la vista las admite
  (`limits().tools`). Si no, usa órdenes de texto como `[[tarea: …]]` que la
  página interpreta y esconde (`backend.js`).
- General y Organizar usan el modelo rápido; Juegos y Escuela, el que piensa
  antes de escribir (`tier` en `prompt.js`).
- La conversación en curso se guarda solo en el dispositivo (`session.js`);
  tareas y memoria se sincronizan entre dispositivos (`store.js`).
- Las respuestas se pintan con un Markdown propio que escapa todo el HTML
  (`markdown.js`). No hay LaTeX: las fórmulas van en texto plano.

### Modo voz

Un mensaje dictado se contesta hablando; uno escrito, solo con texto.

- **Con `dictation` y `tts`** (Chrome y la app de escritorio): un toque en el
  micrófono, se habla, y tras 1.6 s de silencio el mensaje se envía solo.
  Jarvis lee la respuesta con la voz de Claude.
- **Sin ellas** (iPhone, iPad): una página de Claude no puede abrir el
  micrófono. El botón abre el teclado para usar su tecla de dictado; tras 2.2 s
  sin texto nuevo el mensaje se envía solo y el teclado se cierra. Jarvis
  contesta con la voz del navegador, frase por frase según llega el texto.
- Safari solo deja hablar a una página después de un toque: el del micrófono
  sirve para eso. Si aun así la voz no arranca, la página lo avisa y deja el
  botón «Escuchar» en la respuesta.
- No hay palabra de activación ("Oye Jarvis") ni conversación continua: cada
  turno empieza con un toque.

## Estructura

```
jarvis/
├── public/            # Código fuente (edita aquí)
│   ├── index.html     # Estructura de la página
│   ├── styles.css     # Estilos y colores (tema oscuro único)
│   ├── app.js         # Une todo: estado, envío de mensajes, modos
│   ├── backend.js     # De dónde sale la IA: claude.ai o demo; herramientas
│   ├── prompt.js      # Instrucciones de Jarvis y de cada modo
│   ├── store.js       # Tareas y memoria (db o solo sesión)
│   ├── chat.js        # Lista de mensajes
│   ├── panels.js      # Paneles de Tareas y Memoria
│   ├── core.js        # El núcleo animado
│   ├── talk.js        # Modo voz: dictar y enviar solo tras una pausa
│   ├── voice.js       # Micrófono y voz (de la plataforma o del navegador)
│   ├── markdown.js    # Markdown seguro
│   ├── session.js     # Conversación guardada en el dispositivo
│   ├── status.js      # Textos de estado
│   ├── demo.js        # Respuestas del modo demo
│   └── ui.js          # Utilidades de interfaz
├── scripts/build-online.mjs   # Une todo en un solo HTML
├── online/jarvis.html         # Resultado: lo que se publica (no editar a mano)
└── tests/             # Pruebas (ver abajo)
```

## Cambiar y publicar

1. Edita los archivos de `public/`.
2. `npm run build:online` genera `online/jarvis.html`.
3. Publica ese archivo en la URL de arriba con estas capabilities:
   `sample`, `db`, `user`, `dictation`, `tts`.

## Pruebas

```bash
npm test               # lógica: Markdown, instrucciones, tareas, acciones, voz
npm run test:browser   # flujos completos en Chromium, con capturas
```

`test:browser` necesita Playwright instalado en el entorno (las sesiones de
Claude Code en la nube ya lo traen). Usa dos simuladores: `tests/fake-claude.js`
imita el contrato de las capabilities y `tests/fake-speech.js` la voz del
navegador.

Qué **no** cubren las pruebas, y hay que revisar a mano en el dispositivo:

- Safari real en iPhone y iPad (las pruebas corren en Chromium), incluido el
  comportamiento del teclado y de su dictado.
- Si Safari deja que la voz del navegador suene dentro de la página de Claude.
- La IA real: calidad de las respuestas, tiempos y si la app móvil admite
  herramientas.
- El micrófono y la voz reales de la plataforma (solo existen en navegadores
  Chromium y en la app de escritorio).
