"""Runtime configuration for the Hygeia Vision AI backend.

Every value can be overridden with an environment variable of the same name
(optionally via a `.env` file next to this package). Paths default to the
artefacts already present in the `STD` project tree.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

try:  # optional .env support
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:  # pragma: no cover
    pass


def _env(name: str, default):
    raw = os.environ.get(name)
    if raw is None:
        return default
    if isinstance(default, bool):
        return raw.strip().lower() in ("1", "true", "yes", "on")
    if isinstance(default, int):
        return int(raw)
    if isinstance(default, float):
        return float(raw)
    return raw


BACKEND_DIR = Path(__file__).resolve().parents[1]
# Release layout (self-contained bundle):  <root>/backend  <root>/frontend  <root>/models/{checkpoints,hf_cache,ensemble_summary.json}
BUNDLE_MODELS = Path(_env("MODELS_DIR", str(BACKEND_DIR.parent / "models")))
if (BUNDLE_MODELS / "hf_cache" / "hub").is_dir() and not os.environ.get("HF_HUB_CACHE") and not os.environ.get("HF_HOME"):
    os.environ["HF_HUB_CACHE"] = str(BUNDLE_MODELS / "hf_cache" / "hub")   # must be set before huggingface_hub is imported
# Development layout (this repository): checkpoints live in the training project next to the app.
STD_ROOT = Path(_env("STD_ROOT", str(BACKEND_DIR.parents[1])))
TRAIN_ROOT = Path(_env("TRAIN_ROOT", str(STD_ROOT / "STD_model_train")))
CKPT_DIR = Path(_env("CKPT_DIR", str(BUNDLE_MODELS / "checkpoints" if (BUNDLE_MODELS / "checkpoints").is_dir() else TRAIN_ROOT / "checkpoints")))
RESULTS_DIR = TRAIN_ROOT / "results"

# ----------------------------------------------------------------------------
# Component 2 - Disease-likelihood classifier
# ----------------------------------------------------------------------------
CLASS_NAMES = ["Genital_warts", "HSV", "Normal", "Penile_cancer", "Penile_candidiasis", "Syphillis"]
# Artefact spelling is load-bearing (see technical doc section 3.4); map for display only.
DISPLAY_NAMES = {
    "Genital_warts": "Genital warts",
    "HSV": "Herpes simplex (HSV)",
    "Normal": "Normal-appearing skin",
    "Penile_cancer": "Penile cancer",
    "Penile_candidiasis": "Penile candidiasis",
    "Syphillis": "Syphilis",
}
NORMAL_INDEX = CLASS_NAMES.index("Normal")

LIKELIHOOD_MEMBERS = {
    # name -> (checkpoint path, validation-selected blend weight)
    "T11_dinov2_l14_deep_long_final": (CKPT_DIR / "best_T11_dinov2_l14_deep_long_final.pth", 2 / 3),
    "T09_dinov2_b14_res336": (CKPT_DIR / "best_T09_dinov2_b14_res336.pth", 1 / 6),
    "T05_dinov2_b14_unfreeze4": (CKPT_DIR / "best_T05_dinov2_b14_unfreeze4.pth", 1 / 6),
}
PRIMARY_MEMBER = "T11_dinov2_l14_deep_long_final"


def _load_ensemble_weights() -> dict[str, float]:
    """Prefer the weights frozen by `src/ensemble.py` (fitted on validation only)."""
    p = BUNDLE_MODELS / "ensemble_summary.json"
    if not p.exists():
        p = RESULTS_DIR / "_ensemble" / "ensemble_summary.json"
    try:
        w = json.loads(p.read_text(encoding="utf-8"))["weights"]
        mapped = {}
        for name, val in w.items():
            key = name if name in LIKELIHOOD_MEMBERS else (
                "T11_dinov2_l14_deep_long_final" if name.startswith("T11") else name)
            if key in LIKELIHOOD_MEMBERS:
                mapped[key] = float(val)
        if mapped:
            return mapped
    except Exception:
        pass
    return {k: v[1] for k, v in LIKELIHOOD_MEMBERS.items()}


ENSEMBLE_WEIGHTS = _load_ensemble_weights()

LIKELIHOOD_MODE = _env("LIKELIHOOD_MODE", "ensemble")      # single | ensemble
LIKELIHOOD_TTA = _env("LIKELIHOOD_TTA", False)              # 4-view TTA (4x cost)
CONFIDENCE_THRESHOLD = _env("CONFIDENCE_THRESHOLD", 0.60)   # confidence gate (doc section 22)
ESCALATION_THRESHOLD = _env("ESCALATION_THRESHOLD", 0.20)   # zero-miss operating point (doc section 20.4)

# ----------------------------------------------------------------------------
# Component 1 - Skin relevance gate
# ----------------------------------------------------------------------------
RELEVANCE_BACKEND = _env("RELEVANCE_BACKEND", "vlm")        # vlm (default: the second reader decides) | clip | clip+vlm | effnet
RELEVANCE_CLIP_SKIP_BELOW = _env("RELEVANCE_CLIP_SKIP_BELOW", 0.10)  # clip+vlm: skip the VLM when CLIP is this sure it is not skin
VLM_GATE_IMAGE_MAX_SIDE = _env("VLM_GATE_IMAGE_MAX_SIDE", 448)
RELEVANCE_CLIP_ID = _env("RELEVANCE_CLIP_ID", "openai/clip-vit-base-patch16")
RELEVANCE_EFFNET_CKPT = _env("RELEVANCE_EFFNET_CKPT", "")   # optional trained EfficientNetV2-S gate
RELEVANCE_THRESHOLD = _env("RELEVANCE_THRESHOLD", 0.50)
RELEVANCE_DEVICE_POLICY = _env("RELEVANCE_DEVICE_POLICY", "gpu_on_demand")
# Only the VLM stays resident on a 6 GB GPU. Windows (WDDM) silently spills CUDA memory into system RAM
# instead of raising OOM, which makes every stage 10x slower - so the classifiers hop on per call (~0.3 s).
LIKELIHOOD_PRIMARY_POLICY = _env("LIKELIHOOD_PRIMARY_POLICY", "gpu_on_demand")
LIKELIHOOD_SECONDARY_POLICY = _env("LIKELIHOOD_SECONDARY_POLICY", "gpu_on_demand")

# ----------------------------------------------------------------------------
# Component 3 - Visual abnormality instance segmentation (VAIS)
# ----------------------------------------------------------------------------
VAIS_BACKEND = _env("VAIS_BACKEND", "fusion")               # fusion | gdino_sam | yolo | none
# fusion = multi-source proposals (VLM grounding + Grounding DINO + classifier attention) -> weighted box
# fusion -> SAM 2.1 masks -> second-reader instance review.  gdino_sam = the same machinery without the VLM.
VAIS_SOURCES = [x.strip() for x in _env("VAIS_SOURCES", "vlm,gdino,cam").split(",") if x.strip()]
VAIS_SOURCE_WEIGHTS = {"vlm": _env("VAIS_W_VLM", 1.0), "gdino": _env("VAIS_W_GDINO", 0.8), "cam": _env("VAIS_W_CAM", 0.6)}
VAIS_FUSION_IOU = _env("VAIS_FUSION_IOU", 0.45)              # proposals overlapping at least this much are the same instance
VAIS_GDINO_ID = _env("VAIS_GDINO_ID", "IDEA-Research/grounding-dino-tiny")
VAIS_MASK_MODEL = _env("VAIS_MASK_MODEL", "facebook/sam2.1-hiera-small")  # any SAM 2.x or SAM 1 checkpoint id
VAIS_SAM_ID = VAIS_MASK_MODEL
VAIS_YOLO_WEIGHTS = _env("VAIS_YOLO_WEIGHTS", "")
VAIS_CONF_THRESHOLD = _env("VAIS_CONF_THRESHOLD", 0.30)
VAIS_BOX_THRESHOLD = _env("VAIS_BOX_THRESHOLD", 0.30)
VAIS_TEXT_THRESHOLD = _env("VAIS_TEXT_THRESHOLD", 0.25)
VAIS_MAX_INSTANCES = _env("VAIS_MAX_INSTANCES", 25)
VAIS_MAX_SIDE = _env("VAIS_MAX_SIDE", 768)                   # working resolution (CPU cost scales with pixels)
VAIS_MAX_AREA_RATIO = _env("VAIS_MAX_AREA_RATIO", 0.45)      # larger proposals are background, not instances
VAIS_CAM_MIN = _env("VAIS_CAM_MIN", 0.12)                    # min classifier attention inside an instance
VAIS_DEVICE_POLICY = _env("VAIS_DEVICE_POLICY", "gpu_on_demand")  # fp16 on GPU per call; falls back to CPU on OOM  # gpu_resident | gpu_on_demand | cpu
# VLM grounding source
VAIS_VLM_GROUNDER = _env("VAIS_VLM_GROUNDER", "shared")      # shared (reuse the second-reader VLM if it can ground) | <HF model id> | none
VAIS_VLM_MAX_BOXES = _env("VAIS_VLM_MAX_BOXES", 10)
VAIS_VLM_MAX_NEW_TOKENS = _env("VAIS_VLM_MAX_NEW_TOKENS", 240)
VAIS_VLM_IMAGE_MAX_SIDE = _env("VAIS_VLM_IMAGE_MAX_SIDE", 896)
VAIS_VLM_SKIP_CONFIDENT_NORMAL = _env("VAIS_VLM_SKIP_CONFIDENT_NORMAL", True)  # no VLM grounding on confidently-normal reads
VAIS_INSTANCE_REVIEW = _env("VAIS_INSTANCE_REVIEW", True)    # second reader reviews each numbered instance

# ----------------------------------------------------------------------------
# Component 4 - Vision-language second reader
# ----------------------------------------------------------------------------
VLM_BACKEND = _env("VLM_BACKEND", "qwen3vl")                # qwen3vl (grounding-capable, default) | medgemma | none
VLM_MODEL_IDS = {
    "medgemma": _env("VLM_MEDGEMMA_ID", "google/medgemma-4b-it"),
    "qwen3vl": _env("VLM_QWEN_ID", "Qwen/Qwen3-VL-4B-Instruct"),
}
VLM_4BIT = _env("VLM_4BIT", True)
VLM_MAX_NEW_TOKENS = _env("VLM_MAX_NEW_TOKENS", 600)
VLM_CHAT_MAX_NEW_TOKENS = _env("VLM_CHAT_MAX_NEW_TOKENS", 220)
VLM_DEVICE_POLICY = _env("VLM_DEVICE_POLICY", "gpu_resident")
VLM_IMAGE_MAX_SIDE = _env("VLM_IMAGE_MAX_SIDE", 896)
# Which backends can emit bounding boxes (Qwen3-VL: relative 0-1000 coordinates). MedGemma cannot.
VLM_GROUNDING_CAPABLE = {"qwen3vl": True, "medgemma": False}

# ----------------------------------------------------------------------------
# Service
# ----------------------------------------------------------------------------
DEVICE = _env("DEVICE", "auto")                              # auto | cuda | cpu
WARMUP_ON_START = _env("WARMUP_ON_START", True)
RESULT_TTL_SECONDS = _env("RESULT_TTL_SECONDS", 3600 * 6)
MAX_UPLOAD_MB = _env("MAX_UPLOAD_MB", 20)
CORS_ORIGINS = [o.strip() for o in _env("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080").split(",")]
FRONTEND_DIST = Path(_env("FRONTEND_DIST", str(BACKEND_DIR.parent / "frontend" / "dist")))
HF_LOCAL_ONLY = _env("HF_HUB_OFFLINE", False)

MODEL_VERSIONS = {
    "relevance": (f"clip_zero_shot_gate_v1[{RELEVANCE_CLIP_ID}]" if RELEVANCE_BACKEND == "clip"
                  else "effnetv2s_skin_relevance_v1" if RELEVANCE_BACKEND == "effnet"
                  else f"vlm_gate_v1[{VLM_MODEL_IDS.get(VLM_BACKEND)}]" if RELEVANCE_BACKEND == "vlm"
                  else f"clip_zero_shot_gate_v1[{RELEVANCE_CLIP_ID}]+vlm_gate_v1[{VLM_MODEL_IDS.get(VLM_BACKEND)}]"),
    "likelihood": PRIMARY_MEMBER if LIKELIHOOD_MODE == "single" else "ensemble_T11_T09_T05_val_selected",
    "segmentation": {"fusion": f"fusion[{'+'.join(VAIS_SOURCES)}]->{VAIS_MASK_MODEL.split('/')[-1]}",
                     "gdino_sam": f"zero_shot_{VAIS_GDINO_ID.split('/')[-1]}+{VAIS_MASK_MODEL.split('/')[-1]}",
                     "yolo": "yolo26l_seg_vais_v1", "none": None}[VAIS_BACKEND],
    "vlm": VLM_MODEL_IDS.get(VLM_BACKEND) if VLM_BACKEND != "none" else None,
}
