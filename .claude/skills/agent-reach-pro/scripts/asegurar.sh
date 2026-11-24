#!/usr/bin/env bash
# Deja Agent Reach listo en esta máquina. Idempotente: si ya está, solo lo reporta.
# Instala SIEMPRE desde el release oficial de GitHub (el paquete "agent-reach" de PyPI NO es este proyecto).
set -u
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
URL="https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip"

if command -v agent-reach >/dev/null 2>&1; then
  v=$(agent-reach version 2>/dev/null)
  case "$v" in
    \{*) echo "LISTO $v"; exit 0 ;;
    *)   echo "VIEJO ($v): actualizando a 1.6+"
         FORCE="--force" ;;
  esac
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "Instalando uv (instalador de herramientas, no pide contraseña)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1 || { echo "ERROR: no pude instalar uv (¿sin internet o sin terminal?)"; exit 2; }
  export PATH="$HOME/.local/bin:$PATH"
fi

uv tool install ${FORCE:-} "$URL" >/dev/null 2>&1 || { echo "ERROR: falló 'uv tool install' desde GitHub"; exit 3; }
export PATH="$(uv tool dir --bin 2>/dev/null):$PATH"
command -v agent-reach >/dev/null 2>&1 || { echo "ERROR: instalado pero 'agent-reach' no está en PATH; corre 'uv tool update-shell'"; exit 4; }

agent-reach setup > "${TMPDIR:-/tmp}/agent-reach-setup.json" 2>/dev/null
echo "INSTALADO $(agent-reach version)"
echo "Reporte de setup en ${TMPDIR:-/tmp}/agent-reach-setup.json"
