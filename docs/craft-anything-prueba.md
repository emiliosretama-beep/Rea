# Prueba de Craft Anything (2026-11-25)

Repo: <https://github.com/storytold/craft-anything> · commit `0a4e66b` · versión 0.6.1 (early alpha).
Licencia MIT o Apache-2.0. Prueba hecha en una sesión en la nube (Linux x86_64, sin pantalla ni GPU).

## Instalación

- Hay binarios para Linux en Releases (AppImage, .deb, .rpm, tarball), pero desde esta sesión
  la descarga de releases da 403 (solo se permite `git clone` anónimo de repos públicos).
- Se compiló la CLI desde el código: `cargo build --release -p craft-anything-cli`
  (necesita Rust 1.97 o más nuevo). Tardó **7 min 45 s** con 4 núcleos; binario de 43 MB.
- No hay `curl | sh`. El `build.rs` de la CLI solo hace algo en Windows. Las dependencias
  vienen de crates.io y de `storytold/craft-libs` fijado a un commit.
- Todo quedó fuera del repo (scratchpad). Nada de binarios en git.
- `craft-anything-cli doctor` → sano: encontró Chrome, Java, GDB; el servidor MCP respondió.

## Qué se probó

Objetivo: ERA Studio servido en local (`python3 -m http.server` desde `rea-lovable/public/`).
Herramientas usadas por MCP (stdio), grupo `browser`, modo **Clean room**:

| Paso | Herramienta | Tiempo | Resultado |
|---|---|---|---|
| Abrir la web | `web_site_open` | 3.7 s | OK: título "ERA Studio", 2 formularios, idioma `es` |
| Capturar a 360/768/1440 | `web_site_capture` | 3.9 s | OK: 3 capturas + `capture.json` con tokens de diseño |
| Menús y diálogos | `web_page_states_capture` | 0.5 s | Encontró 0 (ERA no usa `aria-expanded`/`<summary>`) |

Lo que encontró de ERA Studio (correcto al compararlo con el código):

- Fuente Inter, texto `#14183a` y `#5a6080`, fondo `#f6f6fb`.
- Radios 999 / 22 / 16 / 12 / 10 px; columna de contenido de 560 px.
- Título "Crea tu web hablando." a 38 px (360), 54 px (768) y 70 px (1440).
- Chips de ejemplo: 2 por fila a 360 px y 4 a 768 px. Sin scroll lateral en ningún ancho.

## Qué no se probó

- **Modo Deep** (`web_page_js_analyze`, leer el JavaScript): lo bloqueó el control de permisos
  de la sesión porque hacía falta `--allow-run` (se salta las aprobaciones).
- **Construir** (`rebuild`): usa Claude Code como agente constructor (`ai detect` lo encontró).
  No se lanzó porque arranca otro agente dentro de la sesión con tu cuenta; queda pendiente
  de que Emilio lo autorice.

## Cómo repetirlo

```sh
cargo build --release -p craft-anything-cli
craft-anything-cli doctor
craft-anything-cli mcp            # y luego: enable_toolset browser → web_site_open → web_site_capture
craft-anything-cli rebuild http://127.0.0.1:8765/ "Recreate this website as a single HTML file" --rounds 1
```
