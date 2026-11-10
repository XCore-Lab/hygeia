#!/usr/bin/env bash
# Start Hygeia (API + web UI) - Linux.
#   ./run.sh                          -> http://127.0.0.1:8000
#   PORT=9000 HOST=0.0.0.0 ./run.sh   (reachable from other machines)
#   OFFLINE=1 ./run.sh                (never contact Hugging Face; all models must already be in models/hf_cache)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
[ -x "$ROOT/backend/.venv/bin/python" ] || { echo "Run ./setup.sh first."; exit 1; }
export HF_HUB_CACHE="$ROOT/models/hf_cache/hub"
[ "${OFFLINE:-0}" = "1" ] && export HF_HUB_OFFLINE=1
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
cd "$ROOT"
if ! backend/.venv/bin/python download_models.py --check >/dev/null; then
  echo "Some models are missing; downloading now (~10 GB on first run)..."; backend/.venv/bin/python download_models.py
fi
echo "Starting Hygeia on http://${HOST:-127.0.0.1}:${PORT:-8000} (models load in the background for 1-2 minutes)"
cd "$ROOT/backend"
exec .venv/bin/python -m uvicorn app.main:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}" --timeout-keep-alive 120
