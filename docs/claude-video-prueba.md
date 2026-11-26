# claude-video (`/watch`) en la nube: revisión y estado

Fecha: 2026-11-26 · Repo revisado: https://github.com/bradautomates/claude-video
(MIT), commit `03ceb42f7fa2c4439aca01752118044baabffb8f`, versión 0.3.2.

## Estado: revisado, pero NO instalado ni probado todavía

- La revisión de seguridad está hecha (abajo).
- La instalación en `~/.claude/skills/watch` la **bloqueó el control de
  permisos** de la sesión, porque cambia la configuración de Claude y la
  petición llegó como notificación del sistema, no como mensaje de Emilio. Hace
  falta que Emilio lo pida directamente en el chat.
- La clave de Gemini **no se pudo guardar con el formulario seguro**
  (`request_credential`), porque ese formulario solo guarda claves para el
  header `Authorization: Bearer`, y Gemini la lee en `x-goog-api-key`.

## Revisión de seguridad

| Archivo | Qué hace | ¿Manda datos a algún sitio? |
|---|---|---|
| `hooks/hooks.json` + `hooks/scripts/check-setup.sh` | Hook `SessionStart` (máx. 5 s): ejecuta `setup.py --check` y, si falta algo, muestra un aviso de una línea. Siempre termina con `exit 0`. | No. Según el código, `--check` no usa la red. |
| `scripts/gemini.py` | Llama a `https://generativelanguage.googleapis.com` (`/v1beta/interactions`, y la Files API para archivos locales). La clave va **solo en el header `x-goog-api-key`** y se borra de los mensajes de error. Los archivos subidos se borran al terminar (o caducan solos en 48 h). | Solo a Google. Con un link de YouTube manda **la URL**, no el video. |
| `scripts/setup.py` | Comprueba si están ffmpeg y yt-dlp, y escribe `~/.config/watch/.env` (permisos 0600). En macOS usa `brew`; en Linux **solo da instrucciones**, no instala nada. WhisperX (opcional) descarga uv, PyTorch y modelos de PyPI, pytorch.org, Hugging Face y astral.sh. | Solo si eliges WhisperX. |
| `scripts/download.py` | Ejecuta `yt-dlp` para info, subtítulos y video. | Al sitio del video (en esta nube YouTube responde 429). |
| `scripts/whisper.py` | Opcional: sube el audio a Groq u OpenAI si eliges ese modo y das su clave. | Solo si lo activas. |

No hay telemetría, no usa `eval` ni descarga código en tiempo de ejecución, y
solo usa la biblioteca estándar de Python. **Veredicto: seguro** para el modo
Gemini con links de YouTube.

## Para dejarlo funcionando (lo hace Emilio, 2 minutos)

1. Crea una clave gratis en https://aistudio.google.com/apikey.
2. En la app: menú del entorno en la barra de título → **Rea** → Editar →
   **Network secrets**. Agrega: host `generativelanguage.googleapis.com`,
   header `x-goog-api-key`, sin prefijo, y como valor la clave. Si esa sección
   no permite elegir el header, la alternativa es una variable de entorno
   `GEMINI_API_KEY` (menos privada: cualquier comando de la sesión puede leerla).
3. En una sesión nueva, dile a Claude en el chat: "instala claude-video
   (commit 03ceb42) en ~/.claude/skills y agrégalo al setup script del entorno".
4. Pruébalo pegando un link de YouTube: `/watch <link> ¿de qué trata?`

Setup script propuesto para el entorno (instala la versión revisada):

```bash
set -e
if [ ! -d "$HOME/.claude/skills/watch" ]; then
  tmp=$(mktemp -d)
  git clone -q https://github.com/bradautomates/claude-video.git "$tmp/cv"
  git -C "$tmp/cv" checkout -q 03ceb42f7fa2c4439aca01752118044baabffb8f
  mkdir -p "$HOME/.claude/skills" && cp -r "$tmp/cv/skills/watch" "$HOME/.claude/skills/watch"
  rm -rf "$tmp"
fi
mkdir -p "$HOME/.config/watch" && chmod 700 "$HOME/.config/watch"
[ -f "$HOME/.config/watch/.env" ] || printf 'WATCH_ENGINE=gemini\nGEMINI_API_KEY=placeholder\n' > "$HOME/.config/watch/.env"
chmod 600 "$HOME/.config/watch/.env"
```

`GEMINI_API_KEY=placeholder` es un valor de relleno: el script se niega a
arrancar sin clave, y el proxy cambia el header por la clave real (si se guardó
como Network secret). Con la opción de variable de entorno, borra esa línea:
la variable real tiene prioridad sobre el archivo `.env`.

## Límites del plan gratis (verificar en AI Studio, cambian seguido)

- YouTube: máximo **8 horas de video al día**, solo videos **públicos** (no
  privados ni ocultos), 1 video por petición.
- Peticiones al día: según informes de 2026, unas **20 al día** en los modelos
  Flash (antes eran 250). Google ya no publica una tabla fija; la cifra real está
  en la página de límites de AI Studio. Se reinicia a medianoche, hora del Pacífico.
- Privacidad: en el plan gratis, Google puede usar lo que mandas para mejorar
  sus productos. No lo uses con videos privados ni de clientes.
