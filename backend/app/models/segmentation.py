"""Component 3 - Visual Abnormality Instance Segmentation (VAIS), fusion edition.

The documented production model is a YOLO26L-seg network trained on 2,500
annotated images. Its weights are not in this repository, so the default backend
is a multi-source *fusion* segmenter:

  proposals   = VLM grounding (Qwen3-VL names and boxes each lesion)
              + Grounding DINO (open-vocabulary morphology prompts)
              + classifier attention regions (where the DINOv2 ensemble looked)
  fusion      = weighted box fusion: overlapping proposals become one instance whose
                confidence rises with the number of independent sources that agree
  masks       = SAM 2.1 (box-prompted) -> pixel masks -> geometry / morphology features
  review      = the second-reader VLM sees the numbered outlines and accepts/rejects
                each instance (applied by the pipeline after the second read)

The feature-extraction and post-processing sequence (doc sections 29-30) is
identical for every backend, so the YOLO weights can be dropped in later via
VAIS_BACKEND=yolo without touching the output contract.
"""
from __future__ import annotations

import logging
import math
import time

import cv2
import numpy as np
import torch
from PIL import Image

from .. import config
from .registry import DEVICE, registry

log = logging.getLogger("hygeia.vais")

MORPHOLOGY_PROMPTS = {
    "wart": "wart_like_growth",
    "ulcer": "ulcer",
    "sore": "sore_or_erosion",
    "blister": "vesicle_or_blister",
    "bump": "papule_or_bump",
    "lump": "nodule_or_lump",
    "rash": "rash_or_erythema",
    "red patch": "rash_or_erythema",
    "skin lesion": "lesion",
}
TEXT_QUERY = ". ".join(MORPHOLOGY_PROMPTS) + "."
# semantic label (from the VLM or the detector phrase) -> canonical type of the output contract
TYPE_KEYWORDS = [
    ("wart", "wart_like_growth"), ("condylom", "wart_like_growth"), ("papilloma", "wart_like_growth"),
    ("cauliflower", "wart_like_growth"), ("growth", "wart_like_growth"),
    ("ulcer", "ulcer"), ("chancre", "ulcer"),
    ("erosion", "sore_or_erosion"), ("sore", "sore_or_erosion"), ("fissure", "sore_or_erosion"), ("crust", "sore_or_erosion"),
    ("vesic", "vesicle_or_blister"), ("blister", "vesicle_or_blister"), ("bulla", "vesicle_or_blister"),
    ("papule", "papule_or_bump"), ("bump", "papule_or_bump"), ("pustule", "papule_or_bump"),
    ("nodule", "nodule_or_lump"), ("lump", "nodule_or_lump"), ("mass", "nodule_or_lump"), ("tumou", "nodule_or_lump"),
    ("erythem", "rash_or_erythema"), ("rash", "rash_or_erythema"), ("red", "rash_or_erythema"), ("inflam", "rash_or_erythema"),
    ("plaque", "plaque_or_patch"), ("patch", "plaque_or_patch"), ("pigment", "plaque_or_patch"), ("macule", "plaque_or_patch"),
    ("scal", "scaling_or_maceration"), ("macerat", "scaling_or_maceration"), ("flak", "scaling_or_maceration"), ("white", "scaling_or_maceration"),
    ("discharge", "discharge"), ("exudate", "discharge"), ("pus", "discharge"),
    ("swell", "swelling"), ("oedema", "swelling"), ("edema", "swelling"),
    ("attention", "classifier_attention_region"),
]
PALETTE = [(64, 224, 208), (20, 52, 164), (0, 163, 108), (255, 140, 0), (220, 20, 60),
           (148, 0, 211), (255, 215, 0), (0, 191, 255)]


def _to_type(label: str) -> str:
    label = (label or "").lower().strip()
    for k, v in TYPE_KEYWORDS:
        if k in label:
            return v
    for k, v in MORPHOLOGY_PROMPTS.items():
        if k in label:
            return v
    return "visual_abnormality"


# ---------------------------------------------------------------------------
# Model wrappers
# ---------------------------------------------------------------------------
class MaskModel:
    """Box-prompted mask decoder: SAM 2.x (``Sam2Model``) or SAM 1 (``SamModel``) from transformers."""

    def __init__(self, model_id: str):
        lo = config.HF_LOCAL_ONLY
        self.model_id = model_id
        self.is_sam2 = "sam2" in model_id.lower() or "sam-2" in model_id.lower()
        if self.is_sam2:
            from transformers import Sam2Model, Sam2Processor

            self.proc = Sam2Processor.from_pretrained(model_id, local_files_only=lo)
            self.model = Sam2Model.from_pretrained(model_id, local_files_only=lo).eval()
        else:
            from transformers import SamModel, SamProcessor

            self.proc = SamProcessor.from_pretrained(model_id, local_files_only=lo)
            self.model = SamModel.from_pretrained(model_id, local_files_only=lo).eval()

    @torch.no_grad()
    def __call__(self, img: Image.Image, boxes: list, device: torch.device, half: bool) -> tuple[list[np.ndarray], list[float]]:
        inputs = self.proc(images=img, input_boxes=[boxes], return_tensors="pt")
        inputs = {k: (v.to(device) if hasattr(v, "to") else v) for k, v in inputs.items()}
        if half:
            inputs["pixel_values"] = inputs["pixel_values"].half()
            inputs["input_boxes"] = inputs["input_boxes"].half()
        with torch.autocast("cuda", dtype=torch.float16, enabled=device.type == "cuda"):
            out = self.model(**inputs, multimask_output=False)
        pred = out.pred_masks.float().cpu()
        if self.is_sam2:
            masks = self.proc.post_process_masks(pred, inputs["original_sizes"].cpu())[0]
        else:
            masks = self.proc.image_processor.post_process_masks(
                pred, inputs["original_sizes"].cpu(), inputs["reshaped_input_sizes"].cpu())[0]
        iou = out.iou_scores.float().cpu()[0, :, 0]
        return [masks[i, 0].numpy().astype(np.uint8) for i in range(len(boxes))], iou.tolist()


class GDinoDetector:
    def __init__(self, model_id: str):
        from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

        lo = config.HF_LOCAL_ONLY
        self.proc = AutoProcessor.from_pretrained(model_id, local_files_only=lo)
        self.model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id, local_files_only=lo).eval()

    @torch.no_grad()
    def __call__(self, img: Image.Image, device: torch.device, half: bool) -> list[dict]:
        inputs = self.proc(images=img, text=TEXT_QUERY, return_tensors="pt").to(device)
        if half:
            inputs["pixel_values"] = inputs["pixel_values"].half()
        with torch.autocast("cuda", dtype=torch.float16, enabled=device.type == "cuda"):
            out = self.model(**inputs)
        out.logits = out.logits.float(); out.pred_boxes = out.pred_boxes.float()
        res = self.proc.post_process_grounded_object_detection(
            out, inputs.input_ids, threshold=config.VAIS_BOX_THRESHOLD,
            text_threshold=config.VAIS_TEXT_THRESHOLD, target_sizes=[img.size[::-1]])[0]
        boxes, scores = res["boxes"].cpu().numpy(), res["scores"].cpu().numpy()
        labels = res.get("text_labels", res.get("labels", []))
        if len(boxes) == 0:
            return []
        keep = _nms(boxes, scores, iou_thr=0.6)[: config.VAIS_MAX_INSTANCES]
        return [{"box": [float(v) for v in boxes[i]], "score": float(scores[i]), "label": str(labels[i]) or "lesion",
                 "source": "gdino"} for i in keep]


class FusionBackend:
    """Open-vocabulary detector + box-prompted mask model, fp16 weights parked on the host."""

    def __init__(self, with_detector: bool = True):
        self.det = GDinoDetector(config.VAIS_GDINO_ID) if with_detector else None
        self.mask = MaskModel(config.VAIS_MASK_MODEL)
        self.device = torch.device("cpu")
        self._half = False
        if DEVICE.type == "cuda":          # park fp16 weights on the host: half the transfer per call
            for m in self._modules():
                m.half()
            self._half = True

    def _modules(self):
        return [m for m in ((self.det.model if self.det else None), self.mask.model) if m is not None]

    def to(self, device):
        self.device = torch.device(device)
        if self.device.type == "cuda" and not self._half:
            for m in self._modules():
                m.half()
            self._half = True
        for m in self._modules():
            m.to(self.device)
        return self

    def _ensure_cpu_dtype(self):
        """Only a genuine CPU run needs fp32 weights (CPU fp16 kernels are slow or missing)."""
        if self.device.type == "cpu" and self._half:
            for m in self._modules():
                m.float()
            self._half = False

    def warm(self):
        im = Image.new("RGB", (256, 256), (180, 140, 120))
        self.detect(im)
        self.segment_boxes(im, [[60.0, 60.0, 160.0, 160.0]], [0.5], ["warm"])

    def detect(self, img: Image.Image) -> list[dict]:
        if self.det is None:
            return []
        self._ensure_cpu_dtype()
        return self.det(img, self.device, self._half and self.device.type == "cuda")

    def segment_boxes(self, img: Image.Image, boxes: list, scores: list, labels: list,
                      extras: list[dict] | None = None) -> list[dict]:
        """Prompt the mask model with boxes (from fusion or from the classifier's attention map)."""
        if not boxes:
            return []
        self._ensure_cpu_dtype()
        masks, iou = self.mask(img, boxes, self.device, self._half and self.device.type == "cuda")
        inst = []
        for i in range(len(boxes)):
            m = masks[i]
            if m.sum() == 0:
                continue
            d = {"mask": m, "box": list(boxes[i]), "score": float(scores[i]),
                 "mask_quality": float(iou[i]), "label": str(labels[i])}
            if extras:
                d.update(extras[i])
            inst.append(d)
        return inst


class YoloBackend:
    def __init__(self, weights: str):
        from ultralytics import YOLO

        self.model = YOLO(weights)
        self.device = "cpu"

    def to(self, device):
        self.device = str(device)
        return self

    def __call__(self, img: Image.Image) -> list[dict]:
        r = self.model.predict(img, conf=config.VAIS_CONF_THRESHOLD, device=self.device, verbose=False)[0]
        if r.masks is None:
            return []
        out = []
        masks = r.masks.data.cpu().numpy()
        for i in range(len(masks)):
            m = cv2.resize(masks[i].astype(np.uint8), img.size, interpolation=cv2.INTER_NEAREST)
            out.append({"mask": m, "box": r.boxes.xyxy[i].tolist(), "score": float(r.boxes.conf[i]),
                        "mask_quality": None, "label": r.names[int(r.boxes.cls[i])], "source": "yolo",
                        "sources": ["yolo"], "agreement": 1})
        return out


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thr: float) -> list[int]:
    order = scores.argsort()[::-1]
    keep = []
    while len(order):
        i = order[0]
        keep.append(int(i))
        if len(order) == 1:
            break
        xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0]); yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
        xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2]); yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])
        inter = np.clip(xx2 - xx1, 0, None) * np.clip(yy2 - yy1, 0, None)
        a = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
        b = (boxes[order[1:], 2] - boxes[order[1:], 0]) * (boxes[order[1:], 3] - boxes[order[1:], 1])
        iou = inter / (a + b - inter + 1e-9)
        order = order[1:][iou < iou_thr]
    return keep


def _load_backend():
    if config.VAIS_BACKEND == "yolo":
        if not config.VAIS_YOLO_WEIGHTS:
            raise FileNotFoundError("VAIS_YOLO_WEIGHTS not set")
        return YoloBackend(config.VAIS_YOLO_WEIGHTS)
    if config.VAIS_BACKEND in ("fusion", "gdino_sam"):
        return FusionBackend(with_detector=("gdino" in active_sources()))
    raise RuntimeError("VAIS disabled")


def active_sources() -> list[str]:
    if config.VAIS_BACKEND == "gdino_sam":
        return [s for s in ("gdino", "cam") if s in config.VAIS_SOURCES] or ["gdino", "cam"]
    return list(config.VAIS_SOURCES)


if config.VAIS_BACKEND != "none":
    registry.register("segmentation", _load_backend, config.VAIS_DEVICE_POLICY)


# ---------------------------------------------------------------------------
# Proposal fusion
# ---------------------------------------------------------------------------
def _box_iou(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def _containment(a, b) -> float:
    """Fraction of the smaller box covered by the intersection."""
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    small = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return (ix * iy) / small if small > 0 else 0.0


SOURCE_PRIORITY = {"vlm": 0, "gdino": 1, "cam": 2}


def fuse_proposals(props: list[dict], iou_thr: float, weights: dict[str, float]) -> list[dict]:
    """Weighted box fusion across sources.

    Proposals that overlap (IoU >= iou_thr, or one almost inside the other) form one instance. Within a
    source only the best score counts; across sources the evidence combines as 1 - prod(1 - w_s * s_s),
    so an instance seen by two independent sources outranks one seen by a single source.
    """
    props = sorted(props, key=lambda p: -(weights.get(p["source"], 0.5) * p["score"]))
    clusters: list[dict] = []
    for p in props:
        home = None
        for c in clusters:
            if _box_iou(c["box"], p["box"]) >= iou_thr or _containment(c["box"], p["box"]) >= 0.85:
                home = c
                break
        if home is None:
            clusters.append({"box": list(p["box"]), "members": [p]})
        else:
            home["members"].append(p)
            w = np.array([weights.get(m["source"], 0.5) * m["score"] for m in home["members"]])
            b = np.array([m["box"] for m in home["members"]])
            home["box"] = (b * w[:, None]).sum(0) / w.sum()
    out = []
    for c in clusters:
        per_source: dict[str, float] = {}
        for m in c["members"]:
            per_source[m["source"]] = max(per_source.get(m["source"], 0.0), float(m["score"]))
        miss = 1.0
        for s, sc in per_source.items():
            miss *= 1.0 - min(0.99, weights.get(s, 0.5) * sc)
        lead = sorted(c["members"], key=lambda m: (SOURCE_PRIORITY.get(m["source"], 9), -m["score"]))[0]
        out.append({
            "box": [float(v) for v in c["box"]], "score": round(1.0 - miss, 4), "label": lead["label"],
            "sources": sorted(per_source, key=lambda s: SOURCE_PRIORITY.get(s, 9)),
            "source_scores": {k: round(v, 3) for k, v in per_source.items()},
            "agreement": len(per_source), "source": lead["source"],
        })
    out.sort(key=lambda o: -o["score"])
    return out


# ---------------------------------------------------------------------------
# Feature extraction (doc section 29) and post-processing (doc section 30.2)
# ---------------------------------------------------------------------------
def _shape_descriptor(circularity: float, aspect: float, solidity: float) -> str:
    if solidity < 0.80:
        return "irregular"
    if aspect > 2.0 or aspect < 0.5:
        return "elongated"
    if circularity > 0.70:
        return "round"
    return "well_circumscribed"


def _polygon(contour, img_w: int, img_h: int, max_pts: int = 60) -> list[list[float]]:
    eps = 0.006 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2)
    if len(approx) > max_pts:
        approx = approx[np.linspace(0, len(approx) - 1, max_pts).astype(int)]
    return [[round(float(x) / img_w, 4), round(float(y) / img_h, 4)] for x, y in approx]


def extract_features(instances: list[dict], img_w: int, img_h: int) -> list[dict]:
    img_area = float(img_w * img_h)
    feats = []
    for k, inst in enumerate(instances):
        m = inst["mask"]
        area = float(m.sum())
        if area < 16:
            continue
        contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        c = max(contours, key=cv2.contourArea)
        perimeter = float(cv2.arcLength(c, True))
        hull_area = float(cv2.contourArea(cv2.convexHull(c))) or area
        x, y, w, h = cv2.boundingRect(c)
        M = cv2.moments(m, binaryImage=True)
        cx, cy = (M["m10"] / M["m00"], M["m01"] / M["m00"]) if M["m00"] else (x + w / 2, y + h / 2)
        circularity = float(4 * math.pi * area / (perimeter ** 2)) if perimeter else 0.0
        aspect = w / h if h else 1.0
        solidity = area / hull_area if hull_area else 1.0
        label = str(inst.get("label") or "lesion")
        feats.append({
            "id": k, "type": _to_type(label), "label": label, "raw_label": label,
            "confidence": round(inst["score"], 3),
            "mask_quality": round(inst["mask_quality"], 3) if inst.get("mask_quality") is not None else None,
            "area_px": int(area), "area_ratio": round(area / img_area, 5),
            "bbox": [int(x), int(y), int(w), int(h)], "aspect_ratio": round(aspect, 3),
            "centroid": [round(cx, 1), round(cy, 1)], "perimeter_px": round(perimeter, 1),
            "circularity": round(min(circularity, 1.0), 3), "solidity": round(min(solidity, 1.0), 3),
            "shape": _shape_descriptor(circularity, aspect, solidity),
            "source": inst.get("source", "detector"),
            "sources": inst.get("sources") or [inst.get("source", "detector")],
            "source_scores": inst.get("source_scores") or {},
            "agreement": int(inst.get("agreement", 1)),
            "polygon": _polygon(c, img_w, img_h),
            "_contour": c, "_mask": m,
        })
    return feats


def cluster_summary(feats: list[dict], img_w: int, img_h: int) -> dict:
    n = len(feats)
    if n == 0:
        return {"instance_count": 0, "total_area_ratio": 0.0, "burden": "none", "spatial_pattern": "none",
                "largest_area_ratio": 0.0, "dominant_shape": None, "types": {}, "labels": {}, "multi_source": 0}
    union = np.zeros((img_h, img_w), dtype=np.uint8)
    for f in feats:
        union |= f["_mask"]
    total_ratio = float(union.sum()) / float(img_w * img_h)
    diag = math.hypot(img_w, img_h)
    pattern = "single"
    if n > 1:
        pts = np.array([f["centroid"] for f in feats])
        d = np.linalg.norm(pts[:, None, :] - pts[None, :, :], axis=-1)
        np.fill_diagonal(d, np.inf)
        nn = d.min(axis=1).mean() / diag
        pattern = "clustered" if nn < 0.12 else ("scattered" if nn > 0.30 else "grouped")
    shapes = [f["shape"] for f in feats]
    types: dict[str, int] = {}
    labels: dict[str, int] = {}
    for f in feats:
        types[f["type"]] = types.get(f["type"], 0) + 1
        labels[f["label"]] = labels.get(f["label"], 0) + 1
    burden = "few" if n <= 3 else ("several" if n <= 8 else "many")
    return {
        "instance_count": n, "total_area_ratio": round(total_ratio, 5),
        "largest_area_ratio": round(max(f["area_ratio"] for f in feats), 5),
        "burden": burden, "spatial_pattern": pattern,
        "dominant_shape": max(set(shapes), key=shapes.count), "types": types, "labels": labels,
        "multi_source": sum(1 for f in feats if f.get("agreement", 1) > 1),
    }


def render_overlay(img: Image.Image, feats: list[dict]) -> Image.Image:
    base = np.asarray(img).copy()
    overlay = base.copy()
    for i, f in enumerate(feats):
        color = PALETTE[i % len(PALETTE)]
        overlay[f["_mask"].astype(bool)] = color
    out = cv2.addWeighted(overlay, 0.40, base, 0.60, 0)
    scale = max(1, round(max(img.size) / 640))
    for i, f in enumerate(feats):
        color = PALETTE[i % len(PALETTE)]
        cv2.drawContours(out, [f["_contour"]], -1, color, 2 * scale)
        x, y, w, h = f["bbox"]
        cv2.rectangle(out, (x, y), (x + w, y + h), color, 1 * scale)
        label = f"#{i + 1} {f['label']} {f['confidence']:.2f}"
        cv2.putText(out, label, (x, max(12 * scale, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45 * scale, (255, 255, 255), 2 * scale, cv2.LINE_AA)
        cv2.putText(out, label, (x, max(12 * scale, y - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45 * scale, color, 1 * scale, cv2.LINE_AA)
    return Image.fromarray(out)


def render_review_image(img: Image.Image, feats: list[dict]) -> Image.Image:
    """Numbered outlines only (no fill, no labels) so the reviewer VLM is not primed by our labels."""
    out = np.asarray(img).copy()
    scale = max(1, round(max(img.size) / 640))
    for i, f in enumerate(feats):
        color = PALETTE[i % len(PALETTE)]
        cv2.drawContours(out, [f["_contour"]], -1, (255, 255, 255), 3 * scale)
        cv2.drawContours(out, [f["_contour"]], -1, color, 1 * scale)
        x, y, w, h = f["bbox"]
        cx, cy = x + 11 * scale, max(11 * scale, y - 11 * scale)
        cv2.circle(out, (cx, cy), 10 * scale, color, -1)
        cv2.circle(out, (cx, cy), 10 * scale, (255, 255, 255), 1 * scale)
        cv2.putText(out, str(i + 1), (cx - 5 * scale, cy + 5 * scale), cv2.FONT_HERSHEY_SIMPLEX, 0.45 * scale,
                    (255, 255, 255), 1 * scale, cv2.LINE_AA)
    return Image.fromarray(out)


def _cam_score(mask: np.ndarray, cam: np.ndarray) -> float:
    """Mean classifier attention inside the mask (cam is on the centre-crop square)."""
    h, w = mask.shape
    side = min(h, w)
    top, left = (h - side) // 2, (w - side) // 2
    cam_full = cv2.resize(cam.astype(np.float32), (side, side), interpolation=cv2.INTER_LINEAR)
    sub = mask[top:top + side, left:left + side].astype(bool)
    if sub.sum() == 0:
        return 0.0
    return float(cam_full[sub].mean())


def cam_boxes(cam: np.ndarray, img_w: int, img_h: int, thr: float = 0.45, max_boxes: int = 6) -> list[dict]:
    """Connected high-attention regions of the classifier CAM -> boxes in full-image coordinates."""
    side = min(img_w, img_h)
    top, left = (img_h - side) // 2, (img_w - side) // 2
    heat = cv2.resize(cam.astype(np.float32), (side, side), interpolation=cv2.INTER_CUBIC)
    binary = (heat >= thr).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    out = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if area < 0.002 * side * side:
            continue
        score = float(heat[lab == i].mean())
        pad = int(0.06 * max(w, h))
        x0, y0 = max(0, x - pad) + left, max(0, y - pad) + top
        x1, y1 = min(side, x + w + pad) + left, min(side, y + h + pad) + top
        out.append({"box": [float(x0), float(y0), float(x1), float(y1)], "score": score,
                    "area_ratio": float(area) / (side * side), "label": "classifier attention region", "source": "cam"})
    out.sort(key=lambda b: -b["score"])
    return [b for b in out if b["area_ratio"] <= config.VAIS_MAX_AREA_RATIO][:max_boxes]


def _empty(backend: str, size, **extra) -> dict:
    return {"available": False, "backend": backend, "instance_count": 0, "instances": [],
            "total_area_ratio": 0.0, "summary": cluster_summary([], *size), "overlay": None,
            "model_version": None, "latency_ms": 0, **extra}


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------
def segment(img: Image.Image, cam: np.ndarray | None = None, likelihood: dict | None = None) -> dict:
    """Return the `abnormalities` block (doc section 32.1) with overlay image.

    `cam` is the classifier's token activation map (None on confidently-normal reads);
    `likelihood` lets the VLM grounder receive a hint and lets the stage skip the (slow) VLM call on
    confidently-normal images. Private keys (``_feats``, ``_work``, ``_review_image``) are consumed by the
    pipeline for the second-reader review and must be popped before serialisation.
    """
    from . import vlm as vlm_mod
    from ..utils.image import to_base64_jpeg

    t0 = time.time()
    if config.VAIS_BACKEND == "none" or "segmentation" not in registry.slots:
        return _empty("none", img.size)
    work = img.copy()
    work.thumbnail((config.VAIS_MAX_SIDE, config.VAIS_MAX_SIDE))
    W, H = work.size
    slot = registry.slots["segmentation"]
    sources = active_sources()
    timings: dict[str, int] = {}
    provenance: dict = {"sources_requested": sources, "sources_used": [], "proposals": {}}

    # ---------------------------------------------------------------- YOLO (trained VAIS weights)
    if config.VAIS_BACKEND == "yolo":
        with slot.on_device() as backend:
            raw = [r for r in backend(work) if r["score"] >= config.VAIS_CONF_THRESHOLD]
        feats = [f for f in extract_features(raw, W, H) if f["area_ratio"] <= config.VAIS_MAX_AREA_RATIO]
        provenance["sources_used"] = ["yolo"]
        return _finish(work, feats, t0, timings, provenance, "yolo")

    # ---------------------------------------------------------------- proposal sources
    props: list[dict] = []
    confident_normal = bool(likelihood) and not likelihood.get("escalate") and not likelihood.get("review_required")
    vlm_info = None
    if "vlm" in sources and vlm_mod.grounding_available() and not (config.VAIS_VLM_SKIP_CONFIDENT_NORMAL and confident_normal):
        hint = None
        if likelihood and likelihood.get("escalate"):
            top = likelihood["predictions"][:2]
            hint = ("the leading visual pattern resembles " + " or ".join(f"{p['display']} ({p['score']:.0%})" for p in top)
                    + ". Only box what you can actually see.")
        try:
            g = vlm_mod.ground(work, hint)
            if g:
                for b in g["boxes"]:
                    x1, y1, x2, y2 = b["box"]
                    b["box"] = [max(0.0, x1), max(0.0, y1), min(float(W), x2), min(float(H), y2)]
                props += [b for b in g["boxes"] if b["box"][2] - b["box"][0] > 3 and b["box"][3] - b["box"][1] > 3]
                timings["vlm_grounding"] = g["latency_ms"]
                vlm_info = {"model_id": g["model_id"], "boxes": len(g["boxes"]), "raw": g["raw"][:600]}
                provenance["sources_used"].append("vlm")
                provenance["proposals"]["vlm"] = len(g["boxes"])
                log.info("VAIS vlm grounding: %d boxes in %.1fs", len(g["boxes"]), g["latency_ms"] / 1000)
        except Exception as e:  # noqa: BLE001
            log.warning("VLM grounding failed: %s", e)
            vlm_info = {"error": str(e)}
    elif "vlm" in sources:
        provenance["vlm_skipped"] = "confident_normal" if confident_normal else "no_grounding_capable_vlm"

    def _run(backend):
        t_det = time.time()
        local = list(props)
        if "gdino" in sources and backend.det is not None:
            dets = backend.detect(work)
            local += dets
            provenance["proposals"]["gdino"] = len(dets)
            if dets:
                provenance["sources_used"].append("gdino")
            timings["gdino"] = round((time.time() - t_det) * 1000)
        if cam is not None and "cam" in sources:
            cb = cam_boxes(cam, W, H)
            local += cb
            provenance["proposals"]["cam"] = len(cb)
            if cb:
                provenance["sources_used"].append("cam")
        # drop whole-image / background proposals before fusion
        local = [p for p in local if ((p["box"][2] - p["box"][0]) * (p["box"][3] - p["box"][1])) / (W * H) <= config.VAIS_MAX_AREA_RATIO]
        fused = fuse_proposals(local, config.VAIS_FUSION_IOU, config.VAIS_SOURCE_WEIGHTS)
        provenance["fused"] = len(fused)
        # Classifier attention is coarse (16x16 patch grid): it may *support* an instance another source
        # proposed, but on its own it is not a discrete lesion. CAM-only clusters are dropped here; if nothing
        # else survives, the explicit CAM-prompted fallback below takes over (and is labelled as such).
        fused = [f for f in fused if f["sources"] != ["cam"]]
        fused = [f for f in fused if f["score"] >= config.VAIS_CONF_THRESHOLD][: config.VAIS_MAX_INSTANCES]
        t_m = time.time()
        raw = backend.segment_boxes(work, [f["box"] for f in fused], [f["score"] for f in fused], [f["label"] for f in fused],
                                    extras=[{k: f[k] for k in ("sources", "source_scores", "agreement", "source")} for f in fused])
        timings["masks"] = round((time.time() - t_m) * 1000)
        feats = [f for f in extract_features(raw, W, H) if f["area_ratio"] <= config.VAIS_MAX_AREA_RATIO]
        if cam is not None:
            for f in feats:
                f["classifier_attention"] = round(_cam_score(f["_mask"], cam), 3)
            feats = [f for f in feats if f["classifier_attention"] >= config.VAIS_CAM_MIN or f["confidence"] >= 0.55
                     or f["agreement"] >= 2]
        # classifier-guided fallback: masks prompted directly by the CAM's high-attention regions
        if not feats and cam is not None:
            cands = cam_boxes(cam, W, H)
            raw = backend.segment_boxes(work, [c["box"] for c in cands], [c["score"] for c in cands],
                                        ["classifier attention region"] * len(cands),
                                        extras=[{"source": "cam", "sources": ["cam"], "agreement": 1} for _ in cands])
            feats = [f for f in extract_features(raw, W, H) if f["area_ratio"] <= config.VAIS_MAX_AREA_RATIO]
            for f in feats:
                f["classifier_attention"] = round(_cam_score(f["_mask"], cam), 3)
                f["type"] = "classifier_attention_region"
            if feats:
                provenance["fallback"] = "classifier_attention"
        log.info("VAIS fusion on %s: %.2fs (%d proposals -> %d fused -> %d instances)", backend.device,
                 time.time() - t_det, len(local), len(fused), len(feats))
        return feats

    try:
        with slot.on_device() as backend:
            feats = _run(backend)
    except torch.cuda.OutOfMemoryError:
        log.warning("VAIS OOM on GPU - retrying on CPU")
        torch.cuda.empty_cache()
        feats = _run(slot.get().to("cpu"))
    if vlm_info:
        provenance["vlm_grounding"] = vlm_info
    provenance["sources_used"] = list(dict.fromkeys(provenance["sources_used"]))
    return _finish(work, feats, t0, timings, provenance, config.VAIS_BACKEND)


def _finish(work: Image.Image, feats: list[dict], t0: float, timings: dict, provenance: dict, backend: str) -> dict:
    from ..utils.image import to_base64_jpeg

    feats.sort(key=lambda f: (-f.get("agreement", 1), -f["confidence"], -f["area_ratio"]))
    for i, f in enumerate(feats):
        f["id"] = i + 1
    summary = cluster_summary(feats, *work.size)
    overlay = to_base64_jpeg(render_overlay(work, feats), max_side=900) if feats else None
    review_img = render_review_image(work, feats) if feats else None
    clean = [{k: v for k, v in f.items() if not k.startswith("_")} for f in feats]
    source = provenance.get("fallback") or ("fusion" if backend == "fusion" else "detector")
    return {
        "available": True, "backend": backend,
        "instance_count": summary["instance_count"], "total_area_ratio": summary["total_area_ratio"],
        "instances": clean, "summary": summary, "overlay": overlay,
        "proposals": sum(provenance.get("proposals", {}).values()), "source": source, "provenance": provenance,
        "analysed_size": list(work.size), "confidence_threshold": config.VAIS_CONF_THRESHOLD,
        "mask_model": config.VAIS_MASK_MODEL, "timings_ms": timings,
        "model_version": config.MODEL_VERSIONS["segmentation"],
        "latency_ms": round((time.time() - t0) * 1000),
        "_feats": feats, "_work": work, "_review_image": review_img,
    }


def apply_review(seg: dict, feats: list[dict], work: Image.Image, review: list[dict]) -> dict:
    """Fold the second reader's per-instance verdicts into the abnormalities block.

    An instance the reviewer rejects is removed when a single source proposed it; instances backed by
    two or more independent sources stay, flagged as disputed, so one model cannot silently erase them.
    """
    from ..utils.image import to_base64_jpeg

    if not review or not feats:
        return seg
    by_id = {int(r["id"]): r for r in review}
    kept, removed = [], []
    for f in feats:
        r = by_id.get(f["id"])
        if r is None:
            kept.append(f)
            continue
        f["review"] = {"is_abnormal": r["is_abnormal"], "label": r["label"], "note": r["note"], "disputed": False}
        if r["is_abnormal"]:
            kept.append(f)
        elif f.get("agreement", 1) >= 2:
            f["review"]["disputed"] = True
            kept.append(f)
        else:
            removed.append({"id": f["id"], "label": f["label"], "confidence": f["confidence"],
                            "reviewer_label": r["label"], "note": r["note"]})
    summary = cluster_summary(kept, *work.size)
    out = dict(seg)
    out.update({
        "instances": [{k: v for k, v in f.items() if not k.startswith("_")} for f in kept],
        "instance_count": summary["instance_count"], "total_area_ratio": summary["total_area_ratio"],
        "summary": summary, "overlay": to_base64_jpeg(render_overlay(work, kept), max_side=900) if kept else None,
        "review": {"applied": True, "reviewed": len(review), "removed": removed,
                   "confirmed": sum(1 for f in kept if f.get("review", {}).get("is_abnormal")),
                   "disputed": sum(1 for f in kept if f.get("review", {}).get("disputed"))},
        "_kept": kept,
    })
    return out


def _mask_iou(a: np.ndarray, b: np.ndarray) -> float:
    a = a.astype(bool); b = b.astype(bool)
    inter = float(np.logical_and(a, b).sum())
    union = float(np.logical_or(a, b).sum())
    return inter / union if union else 0.0


def correct_with_vlm(seg: dict, kept: list[dict], work: Image.Image, missed: list[dict], cam: np.ndarray | None,
                     verdict: str | None) -> dict:
    """Second-reader correction of the localisation.

    * ``missed`` boxes (relative 0-1, from the second reader) are turned into masks with the box-prompted mask
      model and added as instances with source ``vlm_review``.
    * If the reader's verdict on the existing outlines is ``wrong`` and it supplied replacements, the old
      instances are dropped; if it is ``wrong`` and nothing replaces them, the overlay is marked unreliable so
      the UI hides it and the triage ignores it.
    """
    from ..utils.image import to_base64_jpeg

    W, H = work.size
    added: list[dict] = []
    boxes = []
    for m in missed or []:
        x1, y1, x2, y2 = m["box"]
        b = [x1 * W, y1 * H, x2 * W, y2 * H]
        if (b[2] - b[0]) < 4 or (b[3] - b[1]) < 4:
            continue
        if ((b[2] - b[0]) * (b[3] - b[1])) / (W * H) > config.VAIS_MAX_AREA_RATIO:
            continue
        boxes.append((b, m["label"]))
    if boxes and "segmentation" in registry.slots:
        try:
            with registry.slots["segmentation"].on_device() as backend:
                raw = backend.segment_boxes(work, [b for b, _ in boxes], [0.6] * len(boxes), [lbl for _, lbl in boxes],
                                            extras=[{"source": "vlm_review", "sources": ["vlm_review"], "agreement": 1}
                                                    for _ in boxes])
            cands = [f for f in extract_features(raw, W, H) if f["area_ratio"] <= config.VAIS_MAX_AREA_RATIO]
            for f in cands:
                if any(_mask_iou(f["_mask"], k["_mask"]) > 0.5 for k in kept):
                    continue  # already outlined
                f["review"] = {"is_abnormal": True, "label": f["label"], "note": "added by the second reader", "disputed": False}
                if cam is not None:
                    f["classifier_attention"] = round(_cam_score(f["_mask"], cam), 3)
                added.append(f)
        except Exception:  # noqa: BLE001
            log.exception("second-reader correction masks failed")

    replaced = False
    reliable = True
    reason = None
    if verdict == "wrong":
        if added:
            replaced = True
            kept = []
        else:
            reliable = False
            reason = "The second reader judged the outlined regions to be in the wrong place and could not supply a correction."
    elif verdict == "partly" and not added and not kept:
        reliable = False
        reason = "The second reader rejected the outlined regions."
    final = kept + added
    final.sort(key=lambda f: (-f.get("agreement", 1), -f["confidence"], -f["area_ratio"]))
    for i, f in enumerate(final):
        f["id"] = i + 1
    summary = cluster_summary(final, W, H)
    out = dict(seg)
    out.pop("_kept", None)
    out.update({
        "instances": [{k: v for k, v in f.items() if not k.startswith("_")} for f in final],
        "instance_count": summary["instance_count"], "total_area_ratio": summary["total_area_ratio"],
        "summary": summary,
        "overlay": to_base64_jpeg(render_overlay(work, final), max_side=900) if (final and reliable) else None,
        "localisation_reliable": reliable,
        "localisation_verdict": verdict,
        "correction": {"added": len(added), "replaced": replaced, "hidden_reason": reason},
    })
    return out


def render_heatmap(work: Image.Image, boxes_rel: list[dict]) -> Image.Image:
    """Soft attention-style map from the second reader's boxes (relative 0-1): a Gaussian per box,
    blended over the photo. Used when crisp outlines are unavailable or were judged unreliable."""
    W, H = work.size
    base = np.asarray(work.convert("RGB")).astype(np.float32)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    heat = np.zeros((H, W), dtype=np.float32)
    for b in boxes_rel:
        x1, y1, x2, y2 = b["box"]
        cx, cy = (x1 + x2) / 2 * W, (y1 + y2) / 2 * H
        sx = max((x2 - x1) * W / 2.2, 6.0)
        sy = max((y2 - y1) * H / 2.2, 6.0)
        heat += np.exp(-(((xs - cx) ** 2) / (2 * sx * sx) + ((ys - cy) ** 2) / (2 * sy * sy)))
    if heat.max() > 0:
        heat /= heat.max()
    color = cv2.applyColorMap((heat * 255).astype(np.uint8), cv2.COLORMAP_TURBO)[:, :, ::-1].astype(np.float32)
    alpha = (heat * 0.65)[:, :, None]
    out = base * (1 - alpha) + color * alpha
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
