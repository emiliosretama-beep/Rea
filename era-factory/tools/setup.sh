#!/usr/bin/env bash
# Prepara la versión con servidor de ERA Factory para la voz y el video:
#   - Kokoro (voz):           tools/setup_kokoro.sh
#   - Pillow (escenas):       paquete de Python
#   - Fuentes OFL del video:  Anton y Atkinson Hyperlegible en tools/fonts/
# Requiere Python 3.10+ y ffmpeg (con libx264, aac, libmp3lame y libass).
set -euo pipefail
cd "$(dirname "$0")"
bash ./setup_kokoro.sh
python3 -m pip install --quiet "Pillow>=10"
mkdir -p fonts
BASE="https://raw.githubusercontent.com/google/fonts/main/ofl"
for f in "anton/Anton-Regular.ttf" "atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf"; do
  name="$(basename "$f")"
  if [ ! -s "fonts/$name" ]; then
    echo "Descargando $name…"
    curl -fL --retry 3 -o "fonts/$name.part" "$BASE/$f" && mv "fonts/$name.part" "fonts/$name"
  fi
done
command -v ffmpeg >/dev/null || echo "AVISO: falta ffmpeg. Instálalo (p. ej. apt-get install -y ffmpeg)." >&2
echo "Listo: voz, escenas y fuentes del video."
