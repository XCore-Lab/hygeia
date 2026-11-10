# Hygeia — instructions for Claude Code

This folder is a ready-to-run bundle of the Hygeia sexual-health triage app (FastAPI backend,
pre-built React frontend, trained DINOv2 checkpoints). The open-source models are NOT included;
`download_models.py` fetches them from Hugging Face (~10 GB). Read `README_SETUP.md` first.

## Your job when asked to "set this up"

1. Check prerequisites and report them before installing anything:
   - Python 3.11 available (`py -3.11 --version` on Windows, `python3.11 --version` on Linux).
     If missing, tell the user to install it from python.org (Windows: tick "py launcher"); do not try other versions.
   - NVIDIA GPU with 6 GB+ VRAM and a driver that supports CUDA 12.x (`nvidia-smi`). Without a GPU the
     app still runs on CPU but the vision-language stages take minutes per photo; say so.
   - ~25 GB free disk and an internet connection.
2. Run the setup script from this folder, not from a subfolder:
   - Windows PowerShell: `Set-ExecutionPolicy -Scope Process Bypass; .\setup.ps1`
   - Linux: `chmod +x setup.sh run.sh && ./setup.sh`
   It creates `backend/.venv`, installs PyTorch 2.6 (CUDA 12.4) + `backend/requirements.txt`, runs
   `download_models.py`, then `tests/test_parity.py`. Expect 15–40 minutes. If the model download is
   interrupted, re-run `backend\.venv\Scripts\python download_models.py` (it resumes).
3. Start the app: `.\run.ps1` (Windows) or `./run.sh` (Linux). Then poll `http://127.0.0.1:8000/api/health`
   until every model reports `"status": "ready"` (1–2 minutes). Open http://127.0.0.1:8000 (landing)
   and http://127.0.0.1:8000/check (the chat).
4. Confirm it works end to end: `POST /api/triage` with `{"questionnaire":{"symptoms":["itching"]}}`
   must return `status: "symptoms_only"`; uploading any close-up skin photo in the chat must reach a result card.

## Rules

- Do NOT change model ids, thresholds or the `backend/app` code to make setup pass; fix the environment instead.
- Do NOT install a different PyTorch / CUDA combination unless the pinned one fails on this machine; if you
  must, keep torch 2.6.x and say why.
- `models/checkpoints/*.pth` and `models/ensemble_summary.json` are the project's own trained weights: never
  delete, re-download or "regenerate" them. If they are missing, the bundle is incomplete; ask for them.
- No Node.js is needed: `frontend/dist` is pre-built and served by the backend. Only run `npm install` /
  `npm run build` in `frontend/` if the user explicitly wants to edit the UI.
- Keep everything inside this folder. The backend finds `models/` automatically; the run scripts set
  `HF_HUB_CACHE` to `models/hf_cache/hub`. Do not point it at a global cache.
- Windows GPU note: if stages are ~10x slower than the timings in `README_SETUP.md`, the GPU is spilling to
  system RAM; close other GPU apps and restart `run.ps1`.

## Layout

- `backend/app/main.py` routes, `pipeline.py` stage sequence, `triage.py` rules engine, `models/` wrappers,
  `config.py` every setting (overridable via `backend/.env`, see `.env.example`).
- `frontend/src/pages/Chat.tsx` the patient chat; `frontend/src/components/landing/` the landing site.
- `docs/README_APP.md` architecture, API, and all design decisions; `docs/*_Technical_Documentation_v2.md` the pipeline spec.
