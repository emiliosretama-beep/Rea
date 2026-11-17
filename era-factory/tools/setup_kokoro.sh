#!/usr/bin/env bash
# Instala el narrador (Kokoro TTS) para ERA Factory: el paquete de Python y
# los archivos del modelo en tools/models/ (no se suben a git).
#   bash tools/setup_kokoro.sh            -> modelo int8 (88 MB, recomendado)
#   KOKORO_VARIANT=fp16 bash tools/...    -> fp16 (177 MB) o "full" (325 MB)
set -euo pipefail
cd "$(dirname "$0")"
BASE="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
case "${KOKORO_VARIANT:-int8}" in
  int8) MODEL="kokoro-v1.0.int8.onnx" ;;
  fp16) MODEL="kokoro-v1.0.fp16.onnx" ;;
  full) MODEL="kokoro-v1.0.onnx" ;;
  *) echo "KOKORO_VARIANT debe ser int8, fp16 o full" >&2; exit 1 ;;
esac
python3 -m pip install --quiet "kokoro-onnx==0.6.1"
mkdir -p models
for f in "$MODEL" voices-v1.0.bin; do
  if [ ! -s "models/$f" ]; then
    echo "Descargando $f…"
    curl -fL --retry 3 -o "models/$f.part" "$BASE/$f" && mv "models/$f.part" "models/$f"
  fi
done
echo "Listo: tools/models/$MODEL y tools/models/voices-v1.0.bin"
