#!/bin/sh
# Captures one interface at native 4x: tools/captura.sh <escena> [frames] [out.png]
# Uses the installed Google Chrome in headless mode; nothing is added to the game.
cd "$(dirname "$0")/.." || exit 1
NAME=${1:-paleta}; T=${2:-0}; OUT=${3:-artifacts/ui-$NAME-$T.png}
CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --window-size=1280,740 \
  --virtual-time-budget=4000 --screenshot="$OUT" "file://$PWD/index.html?escena=$NAME&t=$T" >/dev/null 2>&1
echo "$OUT"
