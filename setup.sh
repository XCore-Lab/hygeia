#!/usr/bin/env bash
# Hygeia - one-time setup (Linux). Run from this folder:  ./setup.sh
# Needs: Python 3.11, an NVIDIA GPU with 6 GB+ VRAM and a CUDA 12.x capable driver, ~25 GB free disk,
# internet (Python packages ~5 GB + models ~10 GB). Node.js is NOT required (frontend/dist is pre-built).
#   ./setup.sh --skip-models      install only; download models later with  backend/.venv/bin/python download_models.py
#   ./setup.sh --with-clip        also fetch CLIP (only for RELEVANCE_BACKEND=clip or clip+vlm)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"
PY=${PYTHON:-python3.11}; command -v "$PY" >/dev/null 2>&1 || PY=python3
echo; echo "[1/4] Python environment"
[ -d .venv ] || "$PY" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -c "import torch; print('torch', torch.__version__, '| cuda available:', torch.cuda.is_available(), '|', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only (the VLM stages will be very slow)')"
cd "$ROOT"
echo; echo "[2/4] Trained checkpoints"
for f in best_T11_dinov2_l14_deep_long_final.pth best_T09_dinov2_b14_res336.pth best_T05_dinov2_b14_unfreeze4.pth; do
  [ -f "models/checkpoints/$f" ] && echo "  ok  $f" || { echo "  MISSING models/checkpoints/$f - the bundle is incomplete"; exit 1; }
done
echo; echo "[3/4] Open-source models (downloaded from Hugging Face into models/hf_cache)"
if [[ " $* " == *" --skip-models "* ]]; then echo "  skipped"; else
  ARGS=(); [[ " $* " == *" --with-clip "* ]] && ARGS+=(--with-clip); [[ " $* " == *" --with-medgemma "* ]] && ARGS+=(--with-medgemma)
  backend/.venv/bin/python download_models.py "${ARGS[@]}"
fi
echo; echo "[4/4] Self-test"
cd "$ROOT/backend" && .venv/bin/python -m tests.test_parity
echo; echo "Setup complete. Start the app with:  ./run.sh   then open http://127.0.0.1:8000"
