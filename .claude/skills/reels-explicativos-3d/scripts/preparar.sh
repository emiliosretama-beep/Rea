#!/usr/bin/env bash
# Instala (o actualiza) el taller de reels 3D fuera del repo.
# Uso: bash preparar.sh [carpeta]   (por defecto ~/reels-3d)
# Crea: <carpeta>/proyecto (Remotion + three, con node_modules), <carpeta>/voces (Piper)
# y <carpeta>/reels (aqui van tus reels). Se puede ejecutar varias veces sin romper nada.
set -euo pipefail

SKILL="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-${REELS_DIR:-$HOME/reels-3d}}"
PROY="$BASE/proyecto"
VOCES="$BASE/voces"
VOZ="${REELS_VOZ:-es_MX-claude-high}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR falta $1"; exit 1; }; }
need node; need npm; need ffmpeg; need ffprobe; need python3

mkdir -p "$PROY" "$VOCES" "$BASE/reels"

# 1. plantilla: copia el codigo (sin pisar node_modules ni los reels ya generados)
mkdir -p "$PROY/src/escenas" "$PROY/public/reel"
cp "$SKILL/plantilla/package.json" "$SKILL/plantilla/tsconfig.json" "$SKILL/plantilla/remotion.config.ts" "$PROY/"
cp -r "$SKILL/plantilla/src/kit" "$SKILL/plantilla/src/"*.ts* "$PROY/src/"
[ -f "$PROY/src/escenas/index.ts" ] || cp "$SKILL/plantilla/src/escenas/index.ts" "$PROY/src/escenas/"
[ -f "$PROY/public/reel/datos.json" ] || cp "$SKILL/plantilla/public/reel/datos.json" "$PROY/public/reel/"
cp -r "$SKILL/plantilla/public/fuentes" "$PROY/public/"
mkdir -p "$PROY/public/sonidos"
cp "$SKILL/sonidos/"*.wav "$PROY/public/sonidos/"
cp "$SKILL/scripts/vistazo.mjs" "$PROY/"

if [ ! -d "$PROY/node_modules/@remotion/three" ]; then
  echo "Instalando Remotion + three (1-2 min)..."
  (cd "$PROY" && npm install --no-audit --no-fund --loglevel=error)
fi

# 2. voz gratis: Piper TTS + una voz en espanol de rhasspy/piper-voices (Hugging Face)
python3 -c "import piper" 2>/dev/null || python3 -m pip install --quiet piper-tts
IDIOMA="${VOZ%%-*}"; RESTO="${VOZ#*-}"; NOMBRE="${RESTO%-*}"; CALIDAD="${RESTO##*-}"
URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/${IDIOMA%%_*}/$IDIOMA/$NOMBRE/$CALIDAD"
for f in "$VOZ.onnx" "$VOZ.onnx.json"; do
  [ -s "$VOCES/$f" ] || { echo "Descargando voz $f..."; curl -fsSL -o "$VOCES/$f" "$URL/$f"; }
done

echo "LISTO proyecto=$PROY voces=$VOCES reels=$BASE/reels voz=$VOZ"
