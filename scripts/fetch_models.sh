#!/usr/bin/env bash
# Scarica il modello vocale Whisper da includere nell'app (≈57 MB),
# così l'utente non deve scaricarlo al primo avvio.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/models/ggml-base-q5_1.bin
if [ ! -s "$OUT" ]; then
  curl -fL --retry 5 --retry-delay 3 -o "$OUT.part" \
    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin
  mv "$OUT.part" "$OUT"
fi
ls -lh "$OUT"
