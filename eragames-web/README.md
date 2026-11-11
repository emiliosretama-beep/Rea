# Web de ERA Games

Página 3D con scroll del estudio. Todo vive en `index.html` (three.js desde CDN); las capturas
reales de los juegos están en `shots/`.

- **Logo e intro:** son los oficiales de `era-intro/intro_era_games.html` (repo `Rally`). No se rediseñan.
- **Cambiar la película:** tabla `CUES` al inicio del script de `index.html`.
- **Textos:** el español va en el HTML y el inglés en el atributo `data-en` del mismo elemento.
- **Link de itch.io:** constante `ITCH_URL`.
- **Probar:** `python3 -m http.server` en esta carpeta (con `file://` las capturas no cargan en la consola).
- **Versión online (artifact de claude.ai):** `python3 build_online.py` crea `online/eragames.html`
  sin `<html>/<head>/<body>`; se publica junto con `shots/`.
