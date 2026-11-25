# Videos de lecciones (horizontales) — guía para Claude

Emilio estudia cursos (por ejemplo Claude 101 de academy.claude.com) y quiere
cada lección convertida en un **video horizontal para aprender**. Esta carpeta
tiene todo lo necesario para hacerlo en un chat nuevo.

- `plantilla/` → motor horizontal 1920x1080 ya armado. Trae la **Lección 1 de
  Claude 101 ("¿Qué es Claude?")** como ejemplo terminado (3 min 46 s).
- `../setup.sh` → instala todo en un contenedor nuevo (correr primero).

## 0. Preparar el contenedor (cada sesión nueva)

```bash
bash /home/user/Rea/videos/setup.sh     # ~1 GB la primera vez; luego se salta lo instalado
```
Deja: skills de animación en `~/.claude/skills/`, Playwright 1.63.0 (el del
Chromium de `/opt/pw-browsers`; **no** correr `playwright install`), la voz
Kokoro y el alineador Parakeet en
`/home/user/artemnovitckii/claude-animation-skills/kit`.

## 1. Formato acordado con Emilio (no cambiar sin preguntarle)

| Decisión | Valor |
|---|---|
| Tamaño | Horizontal **1920x1080**, 30 fps |
| Duración | **≈ 4 min** por lección (cubrir TODO lo que enseña la página, con un ejemplo por idea y repaso final) |
| Estilo | **Monitos (stick-figure) + estilo vectorial tipo kurzgesagt** (fondo morado, píldoras de colores). Igual pregúntale el estilo al empezar (regla de CLAUDE.md), ofreciendo este como recomendado |
| Estructura | Portada → 4-5 capítulos con etiqueta arriba a la izquierda → **Repaso** con lista ✓ → reflexión → "Siguiente lección" |
| Ayudas de estudio | Etiqueta de capítulo fija, barra de progreso naranja abajo, subtítulos de hasta 5 palabras |
| Voz | Kokoro `em_alex`, velocidad **1.02** (más lenta que los shorts) |
| Personaje "Claude" | Un **orbe naranja con cara** (`orb()` en `env7.js`). Es inventado, **no** el logo oficial |
| Texto | El guion lo escribe Claude **con sus palabras**, fiel a la lección. No copiar el texto de la página |

## 2. Proceso por lección

1. **Leer la lección.** Si no hay herramienta WebFetch, usar el agente
   `web-fetch` pidiendo TODO el contenido (encabezados, listas, ejemplos,
   puntos clave, reflexión, siguiente lección). Las páginas de academy.claude.com
   abren sin login.
2. **Preguntar** estilo y duración (AskUserQuestion), con el formato de arriba
   como recomendado.
3. **Copiar la plantilla:**
   `cp -r plantilla /tmp/.../scratchpad/leccionN` (trabajar en el scratchpad;
   guardar en el repo solo lo que valga la pena conservar).
4. **Guion** en `script.json`: lista de frases, ~600 palabras para 4 min.
   Capítulos con frases cortas, una idea por frase.
5. **Pronunciación.** En `tts_es.py`, la lista `SAY` cambia nombres en inglés
   por su versión fonética **solo para la voz** (los subtítulos muestran la
   ortografía real). Añadir los nombres nuevos de cada lección
   (p. ej. `("Projects", "Próyects")`). Los multi-palabra van antes que los cortos.
6. **Voz y tiempos:**
   ```bash
   PY=/home/user/artemnovitckii/claude-animation-skills/kit/.venv/bin/python
   rm -f audio/words_ref.json
   $PY tts_es.py em_alex 1.02 && cp audio/vo_kokoro.wav audio/vo.wav && $PY align_es.py
   ```
   `align_es.py` alinea frase por frase (Parakeet es inglés: solo aporta
   tiempos; el texto sale del guion).
7. **Escenas** en `web/shots.js`. Cada escena empieza en una **línea del guion**:
   `SC.push([númeroDeLínea, 'whip'|'cut', (ctx, t) => { ... }])`.
   Los tiempos NO se escriben a mano; se sacan de la voz:
   - `L(i)` inicio de la línea i, `LE(i)` final.
   - `T(i, 'palabra')` momento en que se dice esa palabra en la línea i.
   - `at(t, momento, dur)` → 0..1 para animar apariciones.
   - Capítulos en `const CH = [[línea, 'texto', color], ...]`.
   Utilería disponible: `env7.js` (orbe, ventanas, chat, terminal, editor de
   código, dispositivos, sliders, checklist, calendario, iconos), `env4.js`
   (`kzBG`, `pill`, `glow`, `pin`, mapas), `env5.js` (cerebro, batería, Tierra…),
   `env6.js` (flechas, billetes, edificio, contador), `chars.js` (monitos).
8. **Revisar fotogramas a MITAD de cada escena** (no al final: ahí cae la
   transición con barrido y sale movido):
   ```bash
   export NODE_PATH=/home/user/artemnovitckii/claude-animation-skills/kit/node_modules
   node render_h.js stills 12.5,40.2,...      # escribe stills/s_*.jpg
   ```
   Verificar: nada importante en la franja de subtítulos (y ≈ 900–1010),
   nada encimado, textos dentro de sus píldoras.
9. **Sonido:** `audio.py` ya calcula los barridos y campanitas a partir de las
   líneas; actualizar las listas `SC`, `CHAP` y los `pop` con los números de
   línea de la nueva lección. Luego `$PY audio.py`.
10. **Render final** (≈10 min para 4 min de video, conviene en segundo plano):
    `bash build.sh leccion2` → `leccion2.mp4`. Mandarlo con SendUserFile.

## 3. Errores ya resueltos (no repetirlos)

- **Emojis** en el canvas salen como cuadritos en Chromium sin pantalla: usar
  texto o dibujos. (`✓` y `→` sí funcionan.)
- **"Claude" leído en español** suena "Cláude": por eso existe `SAY`.
- **Playwright** debe ser 1.63.0 (lo hace `setup.sh`).
- La franja de subtítulos está en y = 965; la etiqueta de capítulo en y ≈ 64.
- `capText()` conserva los puntos internos (`Claude.ai`) y pone todo en minúsculas.

## Curso Claude Code 101 (lecciones en `claude-code-101/`)

- **Personaje:** Emilio pidió que Claude sea el **monito pixelado de Claude Code**
  (no el orbe). Está en `claude-code-101/leccion01/web/env8.js`: `clawd(ctx, x, y,
  tamañoPíxel, t, {wave, look, walk, happy, sweat, glow, alpha, flip})`, con `x, y` en
  los pies. Ese archivo también redefine `orb()` para que la laptop y los paneles de
  la plantilla muestren al monito. Para una lección nueva: copiar la plantilla,
  luego `env8.js` y la línea `<script src="env8.js">` de `index.html` de la lección 1.
  Es un dibujo hecho a mano del personaje de Anthropic: sirve para estudiar; si un
  video se publica, avisar a Emilio de que es su mascota.
- **Leer la lección:** el entorno "Rea" ya permite `academy.claude.com`. La página
  trae el resumen en HTML; la **transcripción del video** sale al dar clic en la
  pestaña "Transcripción" con Playwright (script `claude-code-101/leer_leccion.js`).
- Las lecciones de este curso son cortas (≈5 min de video): para llegar a ≈3.5–4 min
  se agrega un ejemplo propio por idea y, si hace falta, un mapa del curso al final.

## 4. Al entregar

Resumen corto: tabla de capítulos con lo que se aprende, qué revisar
(pronunciación de nombres en inglés), que el guion es propio y fiel a la
lección, y la fecha de los datos. Ofrecer la siguiente lección del curso.
