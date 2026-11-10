"""End-to-end inference sequence (technical doc section 31).

1. intake            - decode, orient, hash, quality heuristics
2. relevance gate    - terminal: a rejected image returns a State A payload
3. likelihood        - DINOv2 ensemble, confidence gate + escalation threshold, token CAM
4. segmentation      - abnormality instances + geometry / morphology features
5. second reader     - VLM description, consistency check, patient note
6. triage            - risk engine over the unified payload + questionnaire
7. assemble          - unified vision payload with model versions
"""
from __future__ import annotations

import logging
import threading
import time
import uuid
from typing import Callable

from PIL import Image

from . import config, triage
from .models import likelihood, relevance, segmentation, vlm
from .utils.image import decode_image, image_id, quality_report, to_base64_jpeg

log = logging.getLogger("hygeia.pipeline")

Emit = Callable[[str, str, dict | None], None]


class ResultStore:
    """In-memory store of finished analyses so the chat endpoint can ground on them."""

    def __init__(self, ttl: int):
        self.ttl = ttl
        self._d: dict[str, dict] = {}
        self._lock = threading.Lock()

    def put(self, rid: str, payload: dict, image: Image.Image):
        with self._lock:
            self._d[rid] = {"payload": payload, "image": image, "history": [], "t": time.time()}
            self._sweep()

    def get(self, rid: str) -> dict | None:
        with self._lock:
            return self._d.get(rid)

    def _sweep(self):
        now = time.time()
        for k in [k for k, v in self._d.items() if now - v["t"] > self.ttl]:
            self._d.pop(k, None)


store = ResultStore(config.RESULT_TTL_SECONDS)


def _noop(stage: str, status: str, data: dict | None = None):
    pass


def run(image_bytes: bytes, questionnaire: dict | None = None, options: dict | None = None,
        emit: Emit = _noop) -> dict:
    options = options or {}
    t_start = time.time()
    rid = "res_" + uuid.uuid4().hex[:10]
    timings: dict[str, int] = {}

    # ---------------------------------------------------------------- intake
    emit("intake", "running", None)
    t0 = time.time()
    img = decode_image(image_bytes)
    iid = image_id(image_bytes)
    quality = quality_report(img)
    timings["intake"] = round((time.time() - t0) * 1000)
    emit("intake", "done", {"image_id": iid, "quality": quality})

    payload: dict = {
        "result_id": rid, "image_id": iid, "quality": quality,
        "questionnaire": questionnaire or {},
        "options": {"likelihood_mode": options.get("likelihood_mode") or config.LIKELIHOOD_MODE,
                    "tta": bool(options.get("tta", config.LIKELIHOOD_TTA)),
                    "segmentation": options.get("segmentation", True) and config.VAIS_BACKEND != "none",
                    "vlm": options.get("vlm", True) and vlm.available()},
        "model_versions": dict(config.MODEL_VERSIONS),
        "preview": to_base64_jpeg(img, max_side=720),
    }

    # ---------------------------------------------------------------- relevance gate
    emit("relevance", "running", None)
    rel = relevance.check(img)
    timings["relevance"] = rel["latency_ms"]
    payload["relevance"] = rel
    emit("relevance", "done", rel)

    if not rel["is_relevant"]:
        payload.update({"likelihood": None, "abnormalities": None, "second_reader": None, "status": "not_analysable"})
        payload["model_versions"].update({"likelihood": None, "segmentation": None, "vlm": None})
        payload["triage"] = triage.assess(rel, None, None, None, questionnaire)
        payload["timings_ms"] = timings | {"total": round((time.time() - t_start) * 1000)}
        emit("triage", "done", payload["triage"])
        store.put(rid, payload, img)
        return payload

    # ---------------------------------------------------------------- likelihood
    emit("likelihood", "running", None)
    lk = likelihood.predict(img, mode=payload["options"]["likelihood_mode"], tta=payload["options"]["tta"])
    cam = lk.pop("_cam", None)
    cam_prior = cam if lk["category"] != "Normal" else None
    timings["likelihood"] = lk["latency_ms"]
    payload["likelihood"] = lk
    emit("likelihood", "done", {k: v for k, v in lk.items() if k != "attention_map"})

    # ---------------------------------------------------------------- segmentation
    if payload["options"]["segmentation"]:
        emit("segmentation", "running", None)
        try:
            seg = segmentation.segment(img, cam=cam_prior, likelihood=lk)
        except Exception as e:  # noqa: BLE001
            log.exception("segmentation failed")
            seg = {"available": False, "backend": config.VAIS_BACKEND, "error": str(e), "instance_count": 0,
                   "instances": [], "total_area_ratio": 0.0, "summary": segmentation.cluster_summary([], *img.size),
                   "overlay": None, "model_version": None, "latency_ms": 0}
        seg_feats, seg_work, review_img = seg.pop("_feats", None), seg.pop("_work", None), seg.pop("_review_image", None)
        timings["segmentation"] = seg.get("latency_ms", 0)
        if seg.get("timings_ms", {}).get("vlm_grounding"):
            timings["vlm_grounding"] = seg["timings_ms"]["vlm_grounding"]
        emit("segmentation", "done", {k: v for k, v in seg.items() if k != "overlay"})
    else:
        seg = {"available": False, "backend": "skipped", "instance_count": 0, "instances": [], "total_area_ratio": 0.0,
               "summary": segmentation.cluster_summary([], *img.size), "overlay": None, "model_version": None, "latency_ms": 0}
        seg_feats = seg_work = review_img = None
        emit("segmentation", "skipped", None)
    payload["abnormalities"] = seg

    # ---------------------------------------------------------------- second reader
    if payload["options"]["vlm"]:
        emit("second_reader", "running", None)
        try:
            sr = vlm.second_read(img, lk, seg, questionnaire, review_image=review_img)
        except Exception as e:  # noqa: BLE001
            log.exception("VLM second read failed")
            sr = {"available": False, "backend": config.VLM_BACKEND, "error": str(e)}
        timings["second_reader"] = sr.get("latency_ms", 0)
        emit("second_reader", "done", sr)
        # fold the per-instance review back into the segmentation block (never erases multi-source instances),
        # then let the reader correct the localisation: add lesions it saw that were missed, replace outlines it
        # judged wrong, or hide an overlay it could not fix.
        if seg.get("available") and seg_work is not None and sr.get("available") and sr.get("parsed"):
            try:
                kept = seg_feats or []
                if sr.get("instance_review") and seg_feats:
                    seg = segmentation.apply_review(seg, seg_feats, seg_work, sr["instance_review"])
                    kept = seg.pop("_kept", kept)
                verdict = sr.get("outlines_verdict")
                missed = sr.get("missed_lesions") or []
                if missed or verdict in ("wrong", "partly"):
                    seg = segmentation.correct_with_vlm(seg, kept, seg_work, missed, cam_prior, verdict)
                else:
                    seg.pop("_kept", None)
                    seg["localisation_reliable"] = True
                    seg["localisation_verdict"] = verdict
                payload["abnormalities"] = seg
                emit("segmentation", "done", {k: v for k, v in seg.items() if k != "overlay"})
            except Exception:  # noqa: BLE001
                log.exception("applying second-reader review/correction failed")
                seg.pop("_kept", None)
        # Fallback visual when outlines are missing or unreliable on an abnormal read: a soft heatmap from the
        # second reader's own boxes (fresh grounding pass if it gave none). Never crisp outlines.
        try:
            needs_fallback = (seg.get("available") and lk.get("escalate")
                              and (seg.get("localisation_reliable") is False or not seg.get("instance_count")))
            if needs_fallback and seg_work is not None and vlm.available():
                boxes = list(sr.get("missed_lesions") or [])
                if not boxes and vlm.grounding_available():
                    g = vlm.ground(seg_work)
                    Wv, Hv = seg_work.size
                    for b in (g or {}).get("boxes", []):
                        x1, y1, x2, y2 = b["box"]
                        boxes.append({"box": [max(0, x1) / Wv, max(0, y1) / Hv, min(Wv, x2) / Wv, min(Hv, y2) / Hv],
                                      "label": b.get("label", "lesion")})
                boxes = [b for b in boxes if b["box"][2] > b["box"][0] and b["box"][3] > b["box"][1]]
                if boxes:
                    seg["heatmap"] = to_base64_jpeg(segmentation.render_heatmap(seg_work, boxes), max_side=900)
                    seg["heatmap_source"] = "second_reader"
                    seg["heatmap_boxes"] = len(boxes)
                    payload["abnormalities"] = seg
        except Exception:  # noqa: BLE001
            log.exception("VLM heatmap fallback failed")
    else:
        sr = {"available": False, "backend": "skipped"}
        emit("second_reader", "skipped", None)
    payload["second_reader"] = sr

    # ---------------------------------------------------------------- triage + assemble
    emit("triage", "running", None)
    payload["triage"] = triage.assess(rel, lk, seg, sr, questionnaire)
    payload["status"] = "analysed"
    payload["timings_ms"] = timings | {"total": round((time.time() - t_start) * 1000)}
    emit("triage", "done", payload["triage"])
    store.put(rid, payload, img)
    return payload


def chat_context(payload: dict) -> str:
    """Compact text summary of a stored result for the conversational assistant."""
    if payload.get("status") == "not_analysable":
        return ("The photo could not be analysed (relevance gate rejected it). Triage: "
                + payload["triage"]["summary"])
    if payload.get("status") == "symptoms_only":
        tr = payload["triage"]
        sc = tr.get("scope") or {}
        lines = ["No photo was analysed: the person reported nothing visible on the skin, so this is a "
                 "questionnaire-only assessment. Answers: " + _questionnaire_text(payload.get("questionnaire")) + ".",
                 f"Triage level: {tr['risk_level']} - {tr['headline']}. Reasons: " + " ".join(tr["reasons"][:4])]
        if sc.get("differential"):
            lines.append("Possibilities a clinician would consider: " + "; ".join(sc["differential"]))
        if tr.get("notes"):
            lines.append("Context notes: " + " ".join(tr["notes"]))
        if tr.get("testing"):
            lines.append("Suggested tests: " + "; ".join(tr["testing"]))
        return chr(10).join(lines)
    lk, tr = payload["likelihood"], payload["triage"]
    sr = payload.get("second_reader") or {}
    lines = [vlm.context_block(lk, payload.get("abnormalities") or {}, payload.get("questionnaire"))]
    lines.append(f"Triage level: {tr['risk_level']} - {tr['headline']}. Reasons: " + " ".join(tr["reasons"][:4]))
    if sr.get("visual_description"):
        lines.append("Second-reader description: " + sr["visual_description"])
    sc = tr.get("scope") or {}
    if sc.get("outside_trained_categories"):
        lines.append("Scope: the appearance may be OUTSIDE the six trained categories; closest match: "
                     + (sc.get("best_match") or "uncertain") + ".")
    if sc.get("differential"):
        lines.append("Other possibilities a clinician would consider: " + "; ".join(sc["differential"]))
    if tr.get("notes"):
        lines.append("Context notes: " + " ".join(tr["notes"]))
    if tr.get("testing"):
        lines.append("Suggested tests: " + "; ".join(tr["testing"]))
    return "\n".join(lines)


def precheck(image_bytes: bytes) -> dict:
    """Intake + relevance gate only (~0.5 s): lets the chat bounce a non-skin photo before the questions."""
    t0 = time.time()
    img = decode_image(image_bytes)
    quality = quality_report(img)
    rel = relevance.check(img)
    return {
        "is_relevant": bool(rel["is_relevant"]), "p_relevant": rel["p_relevant"], "threshold": rel["threshold"],
        "seen": rel.get("seen") or "", "p_clip": rel.get("p_clip"),
        "quality": quality, "warnings": quality.get("warnings", []),
        "latency_ms": round((time.time() - t0) * 1000),
    }


def run_symptoms(questionnaire: dict | None) -> dict:
    """Questionnaire-only check for the "nothing visible" path. Stored like any result so /api/chat works."""
    t0 = time.time()
    rid = "res_" + uuid.uuid4().hex[:10]
    payload = {
        "result_id": rid, "image_id": None, "status": "symptoms_only",
        "quality": None, "questionnaire": questionnaire or {},
        "options": {"likelihood_mode": "none", "tta": False, "segmentation": False, "vlm": vlm.available()},
        "model_versions": {"relevance": None, "likelihood": None, "segmentation": None,
                           "vlm": config.MODEL_VERSIONS.get("vlm")},
        "preview": "", "relevance": None, "likelihood": None, "abnormalities": None, "second_reader": None,
        "triage": triage.assess_symptoms(questionnaire),
    }
    payload["timings_ms"] = {"total": round((time.time() - t0) * 1000)}
    store.put(rid, payload, None)
    return payload


def _questionnaire_text(q: dict | None) -> str:
    if not q:
        return "no answers given"
    parts = []
    for k in ("age", "sex_at_birth", "duration", "exposure"):
        if q.get(k):
            parts.append(f"{k.replace('_', ' ')}: {q[k]}")
    if q.get("symptoms"):
        parts.append("symptoms: " + ", ".join(q["symptoms"]))
    for k, lbl in (("pain", "painful"), ("itching", "itchy"), ("changed", "changing"), ("fever", "fever"),
                   ("partner_sti", "partner diagnosed with an STI"), ("prior_sti", "previous STI")):
        if q.get(k):
            parts.append(lbl)
    if q.get("notes"):
        parts.append("notes: " + str(q["notes"])[:400])
    return "; ".join(parts) or "no answers given"
