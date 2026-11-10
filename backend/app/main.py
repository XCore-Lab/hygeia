"""Hygeia Vision AI - FastAPI service.

Endpoints
---------
GET  /api/health            model/GPU status
GET  /api/models            model card (documented metrics + runtime configuration)
POST /api/warmup            load every registered model
POST /api/analyze           multipart: image + questionnaire(JSON) + options(JSON) -> unified payload
POST /api/analyze/stream    same input; Server-Sent Events with per-stage progress, final payload last
GET  /api/results/{id}      fetch a stored result
POST /api/chat              follow-up conversation grounded on a stored result (VLM)
"""
from __future__ import annotations

import json
import logging
import queue
import threading
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from . import config, pipeline
from .models import registry as reg
from .models import vlm
from .schemas import AnalyzeOptions, ChatRequest, Questionnaire, TriageRequest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("hygeia.api")

app = FastAPI(title="Hygeia Vision AI", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS + ["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_CARD = json.loads((Path(__file__).resolve().parent / "model_card.json").read_text(encoding="utf-8"))


@app.on_event("startup")
def _startup():
    if config.WARMUP_ON_START:
        threading.Thread(target=reg.registry.warmup, daemon=True, name="warmup").start()


# ----------------------------------------------------------------------------- helpers
def _parse_json_form(raw: str | None, model, name: str):
    if not raw:
        return model()
    try:
        return model.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(422, f"invalid {name}: {e}") from e


async def _read_upload(image: UploadFile) -> bytes:
    data = await image.read()
    if not data:
        raise HTTPException(400, "empty upload")
    if len(data) > config.MAX_UPLOAD_MB * 2**20:
        raise HTTPException(413, f"image larger than {config.MAX_UPLOAD_MB} MB")
    return data


# ----------------------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {"ok": True, "device": str(reg.DEVICE), "gpu": reg.gpu_mem(), "models": reg.registry.status(),
            "config": {"likelihood_mode": config.LIKELIHOOD_MODE, "tta": config.LIKELIHOOD_TTA,
                       "confidence_threshold": config.CONFIDENCE_THRESHOLD,
                       "escalation_threshold": config.ESCALATION_THRESHOLD,
                       "relevance_backend": config.RELEVANCE_BACKEND, "vais_backend": config.VAIS_BACKEND,
                       "vlm_backend": config.VLM_BACKEND, "vlm_model": config.VLM_MODEL_IDS.get(config.VLM_BACKEND),
                       "ensemble_weights": config.ENSEMBLE_WEIGHTS},
            "model_versions": config.MODEL_VERSIONS}


@app.get("/api/models")
def models():
    return {"card": MODEL_CARD, "runtime": health()}


@app.post("/api/warmup")
def warmup():
    return reg.registry.warmup()


@app.post("/api/analyze")
async def analyze(image: UploadFile = File(...), questionnaire: str | None = Form(None),
                  options: str | None = Form(None)):
    data = await _read_upload(image)
    q = _parse_json_form(questionnaire, Questionnaire, "questionnaire")
    o = _parse_json_form(options, AnalyzeOptions, "options")
    try:
        return pipeline.run(data, q.model_dump(), o.model_dump())
    except Exception as e:  # noqa: BLE001
        log.exception("analysis failed")
        raise HTTPException(500, f"analysis failed: {e}") from e


@app.post("/api/precheck")
async def precheck(image: UploadFile = File(...)):
    """Relevance gate only, so the UI can ask for a retake before the questionnaire."""
    data = await _read_upload(image)
    try:
        return pipeline.precheck(data)
    except Exception as e:  # noqa: BLE001
        log.exception("precheck failed")
        raise HTTPException(500, f"precheck failed: {e}") from e


@app.post("/api/analyze/stream")
async def analyze_stream(image: UploadFile = File(...), questionnaire: str | None = Form(None),
                         options: str | None = Form(None)):
    data = await _read_upload(image)
    q = _parse_json_form(questionnaire, Questionnaire, "questionnaire")
    o = _parse_json_form(options, AnalyzeOptions, "options")
    events: queue.Queue = queue.Queue()

    def emit(stage: str, status: str, payload: dict | None):
        events.put({"type": "stage", "stage": stage, "status": status, "data": payload})

    def worker():
        try:
            result = pipeline.run(data, q.model_dump(), o.model_dump(), emit)
            events.put({"type": "result", "data": result})
        except Exception as e:  # noqa: BLE001
            log.exception("analysis failed")
            events.put({"type": "error", "message": f"{type(e).__name__}: {e}"})
        finally:
            events.put(None)

    threading.Thread(target=worker, daemon=True).start()

    def gen():
        while True:
            try:
                ev = events.get(timeout=15)
            except queue.Empty:
                yield ": keep-alive\n\n"
                continue
            if ev is None:
                break
            yield f"data: {json.dumps(ev)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/triage")
def triage_only(req: TriageRequest):
    """Questionnaire-only check for the "nothing visible" path (no photo)."""
    return pipeline.run_symptoms(req.questionnaire.model_dump())


@app.get("/api/results/{rid}")
def get_result(rid: str):
    rec = pipeline.store.get(rid)
    if not rec:
        raise HTTPException(404, "result not found or expired")
    return rec["payload"]


@app.post("/api/chat")
def chat(req: ChatRequest):
    rec = pipeline.store.get(req.result_id)
    if not rec:
        raise HTTPException(404, "result not found or expired")
    if not vlm.available():
        raise HTTPException(503, "VLM backend disabled")
    ctx = pipeline.chat_context(rec["payload"])
    try:
        reply = vlm.chat(rec["image"], ctx, rec["history"], req.message)
    except Exception as e:  # noqa: BLE001
        log.exception("chat failed")
        raise HTTPException(500, f"chat failed: {e}") from e
    rec["history"].append({"role": "user", "text": req.message})
    rec["history"].append({"role": "assistant", "text": reply})
    return {"reply": reply, "history": rec["history"]}


# ----------------------------------------------------------------------------- frontend (built)
if config.FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = config.FRONTEND_DIST / path
        if path and f.is_file():
            return FileResponse(f)
        return FileResponse(config.FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return JSONResponse({"service": "Hygeia Vision AI", "docs": "/docs", "health": "/api/health"})
