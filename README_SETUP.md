# Hygeia — setup guide for this bundle

Hygeia is a private, chat-first sexual-health triage app: a photo (only when there is
something to see), eight tap-to-answer questions, four AI models, an honest urgency
level with the reasons shown, and a clinic finder. This folder contains everything
except the open-source models, which are **downloaded automatically on your machine**
during setup (about 10 GB), so the bundle itself stays small (~1.8 GB, almost all of it
the project's own trained classifier checkpoints).

```
hygeia_share/
  setup.ps1 / setup.sh        one-time install: Python env + PyTorch CUDA + model download + self-test
  run.ps1   / run.sh          start the app  ->  http://127.0.0.1:8000
  download_models.py          fetches the open-source models into models/hf_cache (idempotent, resumable)
  backend/                    FastAPI service (Python 3.11): app/, scripts/, tests/, requirements.txt, .env.example
  frontend/                   React source + dist/ (pre-built; served by the backend, Node.js not needed)
  models/
    checkpoints/              best_T11_dinov2_l14_deep_long_final.pth (ViT-L/14, 1.2 GB)
                              best_T09_dinov2_b14_res336.pth, best_T05_dinov2_b14_unfreeze4.pth (330 MB each)
    ensemble_summary.json     validation-selected blend weights (T11 0.667 / T09 0.167 / T05 0.167)
    hf_cache/                 EMPTY in the bundle; filled by download_models.py
  docs/                       README_APP.md (architecture, API, every design decision) + pipeline technical documentation
  Dockerfile, docker-compose.yml   optional GPU container
```

## 1. What you need

| | Minimum | Notes |
|---|---|---|
| OS | Windows 10/11 or Linux (Ubuntu 22.04) | macOS works CPU-only and is very slow for the VLM stages |
| Python | **3.11** | Windows: python.org installer, tick "py launcher". 3.12/3.13 are not tested with these pins |
| GPU | NVIDIA with **6 GB VRAM or more**, driver that supports CUDA 12.x (driver ≥ 550 recommended) | tested on an RTX 3050 6 GB laptop; 8 GB+ is faster. Without a GPU everything still runs, but the second reader takes minutes per photo |
| Disk | ~25 GB free | PyTorch + packages ~5 GB, downloaded models ~10 GB, this bundle ~2 GB |
| Internet | during setup only | Python packages from PyPI/pytorch.org, models from huggingface.co (no account needed for the defaults) |

## 2. Install (one time)

**Windows** — open PowerShell in this folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass    # only if PowerShell refuses to run scripts
.\setup.ps1
```

**Linux**:

```bash
chmod +x setup.sh run.sh
./setup.sh
```

Setup does four things and prints each step: creates `backend/.venv`, installs
PyTorch 2.6 (CUDA 12.4) and the requirements, **downloads the open-source models**,
and runs the preprocessing self-test. Expect 15–40 minutes depending on your connection.

Models downloaded (into `models/hf_cache/hub`, same layout as the Hugging Face cache):

| Model | Size | Used for |
|---|---|---|
| `Qwen/Qwen3-VL-4B-Instruct` | ~8.9 GB | skin/relevance gate, lesion grounding, second reader, overlay verification, follow-up chat |
| `IDEA-Research/grounding-dino-tiny` | ~0.7 GB | open-vocabulary lesion detector |
| `facebook/sam2.1-hiera-small` | ~0.2 GB | pixel masks for the outlined regions |

If the download is interrupted, run `.\setup.ps1` (or `backend\.venv\Scripts\python download_models.py`)
again: it resumes and skips what is already there. `download_models.py --check` shows what is present.
Optional extras: `--with-clip` (CLIP gate, only if you set `RELEVANCE_BACKEND=clip`),
`--with-medgemma` (gated model: accept the licence on huggingface.co and `huggingface-cli login` first).

The three `.pth` checkpoints in `models/checkpoints` are the project's own trained DINOv2
classifiers and are already in the bundle; nothing to download for them.

## 3. Run

```powershell
.\run.ps1                                  # Windows  ->  http://127.0.0.1:8000
./run.sh                                   # Linux
.\run.ps1 -Port 9000 -BindHost 0.0.0.0     # reachable from other devices on the same Wi-Fi (phone testing)
```

Open http://127.0.0.1:8000 for the landing page and http://127.0.0.1:8000/check for the
chat. Models load in the background for 1–2 minutes after start; the small dot in the
app header turns green ("Ready") when every model is loaded, and `GET /api/health` lists
per-model status. Swagger UI is at `/docs`. `run` also checks the model cache first and
downloads anything missing.

Typical timings on a 6 GB laptop GPU after warm-up: photo gate ~3 s, pattern analysis
~1 s, localisation ~5–20 s, second reader ~30–60 s; a symptoms-only check (no photo) is
instant.

## 4. Routes

| Route | What |
|---|---|
| `/` + About, Services, Products, Contact, legal pages | landing site; every "Start anonymous chat" button opens `/check` |
| `/check` | patient chat: consent → 8 questions → photo only if something is visible (gate on attach) or symptoms-only path → result → follow-up chat → clinic finder (city or device location → Google Maps) |
| `/result/:id` | full report (likelihood ensemble, outlined regions with sources and reviewer verdicts, second reader, triage reasons) |
| `/history` | results kept in the browser only |
| `/models`, `/advanced` | clinician pages: model card / runtime status, and the original form with analysis settings |

## 5. Configuration (optional)

Copy `backend/.env.example` to `backend/.env` and edit. Defaults are right for a 6 GB GPU.
Useful keys: `VLM_4BIT=false` on a 12 GB+ GPU (faster second reader), `VLM_BACKEND=none`
to run without the VLM (gate falls back to CLIP, which then needs `--with-clip`),
`RELEVANCE_BACKEND=clip+vlm` to put CLIP in front of the VLM gate, `HF_HUB_OFFLINE=true`
once everything is cached.

## 6. Verify

```powershell
cd backend
.venv\Scripts\python -m tests.test_parity          # also run by setup
.venv\Scripts\python -m scripts.smoke_test all     # loads every stage once (needs the GPU free)
curl http://127.0.0.1:8000/api/health              # with the server running: every model "ready"
```

## 7. Troubleshooting

- **`cuda available: False`** during setup: NVIDIA driver missing or too old. Update the driver from nvidia.com; no CUDA toolkit install is needed (PyTorch ships its own).
- **bitsandbytes errors on Windows**: `pip install -U bitsandbytes` inside `backend\.venv`; version 0.45+ ships Windows CUDA wheels.
- **Everything is ~10x slower than the timings above**: on Windows the GPU spills into system RAM instead of failing. Close other GPU programs (browsers with hardware acceleration, games) and restart `run.ps1`.
- **Port 8000 in use**: `.\run.ps1 -Port 9000`.
- **Model download fails or is slow**: re-run `download_models.py` (resumes). Behind a proxy set `HTTPS_PROXY`. A Hugging Face token (`huggingface-cli login`) raises rate limits but is not required for the default models.
- **"Run setup first"**: `backend\.venv` does not exist yet; run `setup.ps1`.

## 8. Docker (optional)

Needs the NVIDIA Container Toolkit.

```bash
docker compose run --rm hygeia /opt/venv/bin/python /app/download_models.py   # once
docker compose up --build                                                     # http://localhost:8000
```

## 9. Developing the UI (optional, needs Node.js 18+)

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to :8000
npm run build    # regenerates frontend/dist that the backend serves
```

See `docs/README_APP.md` for the architecture, the model table, every API endpoint and the
design decisions (zero-miss escalation, confidence gate, out-of-scope detection, no-contact
reasoning, overlay verification and heatmap fallback).
