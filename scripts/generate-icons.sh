#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/extension-icon.svg
rsvg-convert -w 16 -h 16 "$SRC" -o public/icon-16.png
rsvg-convert -w 24 -h 24 "$SRC" -o public/icon-24.png
rsvg-convert -w 32 -h 32 "$SRC" -o public/icon-32.png
rsvg-convert -w 48 -h 48 "$SRC" -o public/icon-48.png
rsvg-convert -w 128 -h 128 "$SRC" -o public/icon-128.png
rsvg-convert -w 128 -h 128 "$SRC" -o public/extension-icon.png
