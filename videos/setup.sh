#!/usr/bin/env bash
# Prepara un contenedor nuevo para hacer videos (Claude Code en la nube).
# Las skills de animación ya vienen en el repo (.claude/skills/animacion); esto
# instala sus paquetes de Node, Playwright compatible con el Chromium del
# contenedor y la voz Kokoro + el alineador Parakeet (~1 GB, solo la primera vez).
# Sustituye a kit/setup.sh, que corre "playwright install" (no se debe en la nube).
# Se puede correr varias veces: lo que ya está instalado se salta.
#   bash videos/setup.sh
set -euo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.claude/skills/animacion/kit"
say() { printf '\n== %s\n' "$*"; }

say "paquetes de Node (three.js, Playwright 1.63.0 = Chromium de /opt/pw-browsers)"
cd "$KIT"
[ -d node_modules/three ] || npm install --no-audit --no-fund
node -e "process.exit(require('./node_modules/playwright/package.json').version==='1.63.0'?0:1)" 2>/dev/null || npm install --no-audit --no-fund playwright@1.63.0
mkdir -p vendor
[ -s vendor/gsap.min.js ] || curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js -o vendor/gsap.min.js \
  || (T=$(mktemp -d) && cd "$T" && npm pack -s gsap@3.12.5 >/dev/null && tar xzf gsap-3.12.5.tgz package/dist/gsap.min.js && cp package/dist/gsap.min.js "$KIT/vendor/")  # si cdnjs está bloqueado

say "hyperframes (render de los estilos rápidos y 3D)"
# onnxruntime-node intenta bajar binarios de GPU que ya no existen (404) y aborta la instalación
npm_config_onnxruntime_node_install_cuda=skip npx --yes hyperframes@0.8.34 --version >/dev/null 2>&1 || echo "aviso: hyperframes no se pudo instalar"

say "voz Kokoro y alineador Parakeet"
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -c "import kokoro_onnx, sherpa_onnx, soundfile, scipy" 2>/dev/null || .venv/bin/python -m pip install -q numpy scipy soundfile kokoro-onnx sherpa-onnx
M=$KIT/models; mkdir -p "$M"
[ -s "$M/kokoro-v1.0.onnx" ] || curl -fL -o "$M/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
[ -s "$M/voices-v1.0.bin" ] || curl -fL -o "$M/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
if ! ls -d "$M"/sherpa-onnx-nemo-parakeet* >/dev/null 2>&1; then
  curl -fL -o "$M/p.tar.bz2" https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2
  (cd "$M" && tar xjf p.tar.bz2 && rm p.tar.bz2)
fi

say "prueba rápida"
node -e "require('$KIT/node_modules/playwright').chromium.launch().then(b=>{console.log('Chromium OK', b.version()); return b.close()})"
.venv/bin/python -c "from kokoro_onnx import Kokoro; k=Kokoro('$M/kokoro-v1.0.onnx','$M/voices-v1.0.bin'); print('Kokoro OK, voces es:', [v for v in k.get_voices() if v[:2] in ('ef','em')])"
echo; echo "Listo."
