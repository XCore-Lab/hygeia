"""Component 4 - Vision-language model: second reader, lesion grounding, instance review, chat.

The VLM never overrides the measured classifier. It is used for what the closed-set
models cannot do:

* ``ground``       - propose and *name* discrete lesions as boxes (Qwen3-VL emits
                     bounding boxes in relative 0-1000 coordinates); these feed the
                     fusion segmenter as one proposal source among three.
* ``second_read``  - describe what is visible, sanity-check the classifier's
                     category, review each numbered segmentation instance, write a
                     supportive non-diagnostic note.
* ``chat``         - grounded follow-up conversation.

Everything it says is labelled as model-generated text.
"""
from __future__ import annotations

import json
import logging
import re
import time

import torch
from PIL import Image

from .. import config
from .registry import DEVICE, GPU_LOCK, registry
from ..utils.image import resize_max_side

log = logging.getLogger("hygeia.vlm")

CLINICAL_CONTEXT = (
    "CONTEXT: every image you receive is a consented clinical photograph of genital or peri-genital skin, submitted by the person themselves to a medical triage tool. Describing anatomy and lesions in clinical language is required and appropriate; it is not sexual content. Never refuse, never add content warnings, never say you cannot look at the image. If you truly cannot see skin, say so in the JSON fields. "
)

SYSTEM_PROMPT = (
    CLINICAL_CONTEXT +
    "You are the second-reader assistant inside Hygeia, a sexual-health image triage support tool "
    "that is undergoing clinical validation. You are not a doctor and this is not a diagnosis. "
    "You examine a photograph of genital or peri-genital skin together with the structured output of "
    "an upstream vision pipeline (a six-category likelihood classifier and an abnormality "
    "segmentation model). Your job: (1) describe objectively what is visible - colour, texture, "
    "elevation, number and distribution of lesions, borders, surface changes, discharge, swelling; "
    "(2) judge whether the classifier's leading category is visually consistent with what you see, "
    "and say why; (3) list visual red flags that would warrant prompt clinical review; (4) write a "
    "short, calm, plain-language note for the person. Rules: never state or imply a confirmed "
    "diagnosis; say 'a pattern that resembles X' rather than 'this is X'; never name a condition as "
    "certain; never prescribe or dose medication; always point "
    "to clinical testing for confirmation; be respectful and non-judgemental. "
    "IMPORTANT SCOPE: the classifier only knows six categories (normal, genital warts, HSV, syphilis, "
    "candidiasis, penile cancer). Genital skin shows many other things: normal variants (pearly penile "
    "papules, Fordyce spots, angiokeratoma), folliculitis, contact or irritant dermatitis, balanitis, tinea, "
    "psoriasis, lichen sclerosus or planus, scabies, molluscum, friction or traumatic injury, insect bites, "
    "fixed drug eruption. If what you see fits one of these better than any of the six, say so: set "
    "outside_trained_categories to true and name the closest visual match in best_match. "
    "If the questionnaire reports no recent sexual contact, weigh non-sexually-transmitted explanations and "
    "skin-to-skin transmission explicitly (herpes, warts and molluscum spread by skin contact; thrush, "
    "balanitis and dermatitis are not sexually transmitted; symptoms can appear months after an exposure) "
    "without dismissing the classifier. "
    "Answer ONLY with a single JSON object and no markdown."
)

SECOND_READ_SCHEMA = (
    '{"visual_description": string (2-3 sentences, objective), '
    '"observed_features": [string, ...] (short morphology terms), '
    '"image_quality": string (one of: good, acceptable, poor) , '
    '"image_quality_note": string, '
    '"consistency": string (one of: consistent, partially_consistent, inconsistent, cannot_assess), '
    '"consistency_rationale": string (1-3 sentences), '
    '"alternative_considerations": [string, ...] (other visual patterns a clinician might consider, including non-STI and normal-variant look-alikes where plausible; max 3, short), '
    '"outside_trained_categories": bool (true if the appearance fits something outside the six trained categories better than any of them), '
    '"best_match": string (the single closest visual pattern in two to five words, may be outside the six, or "uncertain"), '
    '"transmission_note": string (one sentence: whether the closest match is usually sexually transmitted, passed by skin-to-skin contact, or not transmissible), '
    '"red_flags": [string, ...] (ONLY features you can actually see in THIS image that need prompt review; an empty list if none - never list textbook or hypothetical warning signs), '
    '"patient_summary": string (3-4 short sentences, plain language, supportive, no diagnosis, says what the next step is), '
    '"suggested_questions": [string, ...] (2-3 follow-up questions a clinician would ask), '
    '"missed_lesions": [[x1, y1, x2, y2, "label"], ...] (discrete visible lesions NOT covered by any numbered outline - '
    'all visible lesions if there are no outlines; integer box coordinates in a 0-1000 relative frame; max 4; [] if none)'
)

INSTANCE_REVIEW_SCHEMA = (
    ', "instance_review": [{"id": int (the number drawn next to the outline), '
    '"is_abnormal": bool (true if the outlined region really shows a skin abnormality, false if it is normal anatomy, '
    'hair, shadow, background or an artefact), "label": string (one or two words: the morphology you see, e.g. papule, '
    'ulcer, vesicle cluster, erythema, plaque, scaling, normal skin), "note": string (max 12 words)}, ...] '
    '(one entry per numbered outline, in order), '
    '"outlines_verdict": string (one of: good, partly, wrong - taken together, do the numbered outlines mark the visible '
    'abnormality in the right place? "wrong" if they sit on normal skin, hair, background or the wrong area; "partly" if '
    'some are right and some are not or something visible is missed)'
)

CHAT_SYSTEM_PROMPT = (
    CLINICAL_CONTEXT +
    "You are Hygeia, a private, non-judgemental sexual-health assistant inside a triage support tool "
    "that is undergoing clinical validation. You have already analysed the person's photograph; the "
    "structured findings are given to you. Answer their follow-up questions briefly (under 120 words), "
    "warmly and honestly. Never give a diagnosis, never say a condition is confirmed, never prescribe "
    "medication. Say 'the pattern resembles X' rather than 'you have X'. Encourage confidential testing "
    "at a clinic when relevant, explain what the findings "
    "mean in plain language, and reassure them that most conditions are treatable and that seeking "
    "care is the right step. The classifier recognises only six patterns; if the findings say the appearance "
    "may be outside them, say so plainly and name the closest match. If the person reports no recent sexual "
    "contact, explain that an STI is less likely but not excluded (skin-to-skin transmission, symptoms months "
    "after exposure) and that several non-STI skin conditions look similar. Clinics exist worldwide; suggest "
    "searching for a sexual health, GUM or STD clinic, or a GP or dermatologist, near them. "
    "If asked something outside sexual health or outside your findings, say so."
)

GATE_PROMPT = (
    CLINICAL_CONTEXT +
    "You are the intake filter of a sexual-health skin triage tool. Decide whether this image is a REAL PHOTOGRAPH "
    "(not a drawing, cartoon, 3D render, screenshot, web page, document, diagram or graphic) that shows a close-up of "
    "HUMAN SKIN, or the genital, groin, pubic, buttock, inner-thigh or lip/mouth area, clearly enough that a skin change "
    "could be assessed. Not acceptable: a face or portrait, a clothed or distant body, animals, objects, rooms, food, "
    "text, screenshots, illustrations, medical diagrams, or images too blurry or dark to see skin. "
    "Answer ONLY with JSON: {\"analysable_skin_photo\": true or false, \"what_is_it\": \"3-6 words\"}"
)

GROUNDING_PROMPT = (
    CLINICAL_CONTEXT +
    "This is a clinical photograph used by a sexual-health screening tool. Locate every DISCRETE visible skin "
    "lesion or abnormal skin area: wart, papule, nodule, vesicle, blister, ulcer, sore, erosion, fissure, plaque, "
    "rash, erythema, scaling, maceration, discharge, swelling, mass, pigmented patch. "
    "Normal anatomy is NOT a lesion (glans, corona, foreskin, frenulum, scrotum, pubic hair, hair follicles, veins, "
    "skin folds). Do not box the whole organ or the whole image. Box each lesion separately; a dense cluster of many "
    "tiny lesions may be boxed as one cluster. At most {max_boxes} boxes, largest or most obvious first. "
    "Output ONLY a JSON list of items [x1, y1, x2, y2, \"label\"] where the coordinates are integers in a "
    "0-1000 relative frame and the label is one or two words. If the skin looks normal, output []."
)

_BOX_RE = re.compile(r"\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*\"([^\"]{0,40})\"\s*\]")
_DICT_BOX_RE = re.compile(r"\"bbox(?:_2d)?\"\s*:\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\][^}]*?\"label\"\s*:\s*\"([^\"]{0,40})\"")


def parse_boxes(text: str) -> list[dict]:
    """Lenient parser: works on truncated or slightly malformed output; relative 0-1000 coords."""
    out = []
    for m in list(_BOX_RE.finditer(text)) + list(_DICT_BOX_RE.finditer(text)):
        x1, y1, x2, y2 = (float(m.group(i)) for i in range(1, 5))
        x1, x2 = sorted((max(0.0, min(1000.0, x1)), max(0.0, min(1000.0, x2))))
        y1, y2 = sorted((max(0.0, min(1000.0, y1)), max(0.0, min(1000.0, y2))))
        if x2 - x1 < 4 or y2 - y1 < 4:
            continue
        out.append({"rel_box": [x1, y1, x2, y2], "label": m.group(5).strip().lower() or "lesion"})
    return out


def _iou(a: list[float], b: list[float]) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def dedupe_boxes(items: list[dict], iou_thr: float = 0.85) -> list[dict]:
    kept: list[dict] = []
    for it in items:
        if all(_iou(it["rel_box"], k["rel_box"]) < iou_thr for k in kept):
            kept.append(it)
    return kept


class HFVisionLanguageModel:
    def __init__(self, backend: str, model_id: str | None = None):
        from transformers import AutoModelForImageTextToText, AutoProcessor

        model_id = model_id or config.VLM_MODEL_IDS[backend]
        self.backend, self.model_id = backend, model_id
        lo = config.HF_LOCAL_ONLY
        self.processor = AutoProcessor.from_pretrained(model_id, local_files_only=lo)
        kwargs: dict = {"local_files_only": lo}
        use_cuda = DEVICE.type == "cuda"
        if use_cuda and config.VLM_4BIT:
            from transformers import BitsAndBytesConfig

            skip = ["vision_tower", "multi_modal_projector", "lm_head"] if backend == "medgemma" else ["visual", "lm_head"]
            kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True,
                bnb_4bit_compute_dtype=torch.bfloat16, llm_int8_skip_modules=skip)
            kwargs["dtype"] = torch.bfloat16
            kwargs["device_map"] = {"": 0}
        elif use_cuda:
            kwargs["dtype"] = torch.float16
            kwargs["device_map"] = {"": 0}
        else:
            kwargs["dtype"] = torch.float32
        self.model = AutoModelForImageTextToText.from_pretrained(model_id, **kwargs).eval()
        self.quantized = "quantization_config" in kwargs
        self.supports_grounding = bool(config.VLM_GROUNDING_CAPABLE.get(backend, "qwen" in model_id.lower()))

    def _device(self):
        return next(self.model.parameters()).device

    @torch.no_grad()
    def generate(self, messages: list[dict], max_new_tokens: int, stopping_criteria=None) -> str:
        inputs = self.processor.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt")
        inputs = inputs.to(self._device())
        n_in = inputs["input_ids"].shape[1]
        gen = {"max_new_tokens": max_new_tokens, "do_sample": False}
        if stopping_criteria is not None:
            gen["stopping_criteria"] = stopping_criteria
        with GPU_LOCK:
            try:
                out = self.model.generate(**inputs, **gen)
            except torch.cuda.OutOfMemoryError:
                log.warning("VLM OOM - clearing cache and retrying with a shorter budget")
                torch.cuda.empty_cache()
                gen["max_new_tokens"] = max(128, max_new_tokens // 2)
                out = self.model.generate(**inputs, **gen)
            finally:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
        text = self.processor.batch_decode(out[:, n_in:], skip_special_tokens=True)[0]
        return text.strip()

    # ------------------------------------------------------------------ grounding
    def ground(self, img: Image.Image, hint: str | None = None, max_boxes: int | None = None) -> dict:
        """Return lesion boxes in pixel coordinates of `img` (plus the raw text for provenance)."""
        from transformers import StoppingCriteria, StoppingCriteriaList

        max_boxes = max_boxes or config.VAIS_VLM_MAX_BOXES
        im = resize_max_side(img, config.VAIS_VLM_IMAGE_MAX_SIDE)
        text = GROUNDING_PROMPT.format(max_boxes=max_boxes)
        if hint:
            text += " Context from an upstream classifier (do not let it make you invent lesions): " + hint
        messages = [{"role": "user", "content": [{"type": "image", "image": im}, {"type": "text", "text": text}]}]
        tok = self.processor.tokenizer
        n_prompt = [0]

        class _StopOnRepeatOrCount(StoppingCriteria):
            """Greedy decoding can loop on dense lesion fields: stop once a box repeats or the cap is reached."""

            def __init__(self):
                self.k = 0

            def __call__(self, input_ids, scores, **kw):
                self.k += 1
                if self.k % 6:
                    return torch.zeros(input_ids.shape[0], dtype=torch.bool, device=input_ids.device)
                if n_prompt[0] == 0:
                    n_prompt[0] = input_ids.shape[1] - self.k
                gen = tok.decode(input_ids[0, n_prompt[0]:], skip_special_tokens=True)
                boxes = parse_boxes(gen)
                stop = len(boxes) >= max_boxes or len(dedupe_boxes(boxes, 0.85)) < len(boxes)
                return torch.full((input_ids.shape[0],), stop, dtype=torch.bool, device=input_ids.device)

        t0 = time.time()
        raw = self.generate(messages, config.VAIS_VLM_MAX_NEW_TOKENS, StoppingCriteriaList([_StopOnRepeatOrCount()]))
        items = dedupe_boxes(parse_boxes(raw), 0.85)[:max_boxes]
        W, H = img.size
        boxes = []
        for it in items:
            x1, y1, x2, y2 = it["rel_box"]
            boxes.append({"box": [x1 / 1000 * W, y1 / 1000 * H, x2 / 1000 * W, y2 / 1000 * H],
                          "label": it["label"], "score": 0.75, "source": "vlm"})
        return {"boxes": boxes, "raw": raw, "latency_ms": round((time.time() - t0) * 1000),
                "model_id": self.model_id}


def _load_vlm():
    if config.VLM_BACKEND == "none":
        raise RuntimeError("VLM disabled")
    return HFVisionLanguageModel(config.VLM_BACKEND)


def _load_grounder():
    mid = config.VAIS_VLM_GROUNDER
    backend = "qwen3vl" if "qwen" in mid.lower() else ("medgemma" if "gemma" in mid.lower() else "qwen3vl")
    return HFVisionLanguageModel(backend, model_id=mid)


if config.VLM_BACKEND != "none":
    registry.register("vlm", _load_vlm, config.VLM_DEVICE_POLICY)
if config.VAIS_VLM_GROUNDER not in ("shared", "none", ""):
    registry.register("vlm_grounder", _load_grounder, "gpu_resident")


def available() -> bool:
    return config.VLM_BACKEND != "none" and "vlm" in registry.slots


def grounder_slot():
    """The slot whose model can emit boxes, or None."""
    if "vlm_grounder" in registry.slots:
        return registry.slots["vlm_grounder"]
    if config.VAIS_VLM_GROUNDER == "shared" and available() and config.VLM_GROUNDING_CAPABLE.get(config.VLM_BACKEND, False):
        return registry.slots["vlm"]
    return None


def grounding_available() -> bool:
    return grounder_slot() is not None


def ground(img: Image.Image, hint: str | None = None) -> dict | None:
    slot = grounder_slot()
    if slot is None:
        return None
    return slot.get().ground(img, hint)


# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------
def _fmt_pct(x: float) -> str:
    return f"{100 * x:.1f}%"


def context_block(likelihood: dict, abnormalities: dict, questionnaire: dict | None) -> str:
    ranked = ", ".join(f"{p['display']} {_fmt_pct(p['score'])}" for p in likelihood["predictions"][:4])
    lines = [
        f"Classifier leading category: {likelihood['category_display']} (confidence {_fmt_pct(likelihood['confidence'])}).",
        f"Full ranking: {ranked}.",
        f"Abnormality score (1 - P(normal)): {_fmt_pct(likelihood['abnormality_score'])}; "
        f"escalate={likelihood['escalate']}, review_required={likelihood['review_required']}.",
    ]
    if abnormalities.get("available"):
        s = abnormalities["summary"]
        if abnormalities["instance_count"]:
            inst = "; ".join(
                f"#{i + 1} {f.get('label') or f['type'].replace('_', ' ')} conf {f['confidence']:.2f}, {f['shape']}, "
                f"area {_fmt_pct(f['area_ratio'])} of image"
                + (f", agreed by {f['agreement']} sources" if f.get('agreement', 1) > 1 else "")
                for i, f in enumerate(abnormalities["instances"][:8]))
            lines.append(
                f"Segmentation: {abnormalities['instance_count']} abnormality instance(s), pattern "
                f"{s['spatial_pattern']}, total affected area {_fmt_pct(s['total_area_ratio'])}. {inst}.")
        else:
            lines.append("Segmentation: no discrete abnormality instance detected above threshold.")
    else:
        lines.append("Segmentation: not available for this run.")
    if questionnaire:
        q = questionnaire
        parts = []
        if q.get("age"):
            parts.append(f"age {q['age']}")
        if q.get("sex_at_birth"):
            parts.append(f"sex at birth {q['sex_at_birth']}")
        if q.get("symptoms"):
            parts.append("symptoms: " + ", ".join(q["symptoms"]))
        if q.get("duration"):
            parts.append(f"duration {q['duration']}")
        for k, lbl in (("pain", "painful"), ("itching", "itchy"), ("changed", "changing over time"),
                       ("fever", "fever or feeling unwell"), ("partner_sti", "partner diagnosed with an STI"),
                       ("prior_sti", "previous STI")):
            if q.get(k):
                parts.append(lbl)
        if q.get("exposure"):
            parts.append(f"recent sexual exposure: {q['exposure']}")
        if q.get("notes"):
            parts.append(f"notes: {q['notes'][:400]}")
        if parts:
            lines.append("Questionnaire: " + "; ".join(parts) + ".")
    return "\n".join(lines)


def _parse_json(text: str) -> dict | None:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.S)
    start, end = t.find("{"), t.rfind("}")
    if start < 0:
        return None
    cand = t[start:end + 1] if end > start else t[start:] + "}"
    for attempt in (cand, cand.replace("\n", " ")):
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            continue
    # last resort: trim to last complete key/value pair
    m = list(re.finditer(r",\s*\"[a-z_]+\"\s*:", cand))
    while m:
        cut = cand[: m[-1].start()] + "}"
        try:
            return json.loads(cut)
        except json.JSONDecodeError:
            m.pop()
    return None


_REFUSAL_RE = re.compile(
    r"(i(?:'m| am) (?:sorry|unable)|i can(?:'t|not) (?:help|assist|analy[sz]e|describe|view|look)|"
    r"(?:not|un)able to (?:help|assist|analy[sz]e|describe|process)|"
    r"(?:sexually )?explicit|inappropriate|against (?:my|the) (?:guidelines|policy)|content polic|"
    r"i must decline|cannot provide|refus)", re.I)


def looks_like_refusal(text: str) -> bool:
    """True when a reply reads like a safety refusal instead of the requested JSON."""
    t = (text or "").strip()
    if not t:
        return True
    if t.startswith("{") and '"' in t:
        return False
    return bool(_REFUSAL_RE.search(t[:400]))


def _clean_boxes(items) -> list[dict]:
    """Relative 0-1 boxes from the VLM's [[x1,y1,x2,y2,"label"], ...] (0-1000 frame)."""
    out: list[dict] = []
    if not isinstance(items, list):
        return out
    for it in items[:4]:
        try:
            if isinstance(it, dict):
                vals = it.get("bbox_2d") or it.get("bbox") or it.get("box")
                label = it.get("label", "lesion")
            else:
                vals, label = it[:4], (it[4] if len(it) > 4 else "lesion")
            x1, y1, x2, y2 = [float(v) for v in vals]
        except (TypeError, ValueError, IndexError):
            continue
        if x2 <= x1 or y2 <= y1 or x2 > 1000 or y2 > 1000 or x1 < 0 or y1 < 0:
            continue
        out.append({"box": [x1 / 1000, y1 / 1000, x2 / 1000, y2 / 1000], "label": str(label)[:40] or "lesion"})
    return out


def _clean_review(items) -> list[dict]:
    out = []
    if not isinstance(items, list):
        return out
    for it in items:
        if not isinstance(it, dict):
            continue
        try:
            iid = int(it.get("id"))
        except (TypeError, ValueError):
            continue
        flag = it.get("is_abnormal")
        if isinstance(flag, str):
            flag = flag.strip().lower() in ("true", "yes", "1")
        out.append({"id": iid, "is_abnormal": bool(flag), "label": str(it.get("label") or "").strip()[:40],
                    "note": str(it.get("note") or "").strip()[:160]})
    return out


def second_read(img: Image.Image, likelihood: dict, abnormalities: dict, questionnaire: dict | None,
                review_image: Image.Image | None = None) -> dict:
    """One VLM call: description + consistency + red flags + patient note (+ per-instance review).

    When the segmenter produced instances, the VLM is shown the image with numbered outlines and asked
    to review each one; the pipeline then drops instances the reviewer rejects (unless several
    independent sources agreed on them).
    """
    t0 = time.time()
    if not available():
        return {"available": False, "backend": "none"}
    vlm = registry.slots["vlm"].get()
    n_inst = abnormalities.get("instance_count", 0) if abnormalities else 0
    with_review = bool(config.VAIS_INSTANCE_REVIEW and review_image is not None and n_inst)
    im = resize_max_side(review_image if with_review else img, config.VLM_IMAGE_MAX_SIDE)
    schema = "{" + SECOND_READ_SCHEMA + (INSTANCE_REVIEW_SCHEMA if with_review else "") + "}"
    user_text = "Upstream pipeline output:\n" + context_block(likelihood, abnormalities, questionnaire)
    if with_review:
        user_text += (f"\n\nThe image carries {n_inst} coloured numbered outline(s) drawn by the segmentation stage. "
                      "They are overlays, not part of the skin: describe the skin, not the outlines, and review each "
                      "numbered region in instance_review.")
    user_text += "\n\nExamine the image and respond with exactly this JSON schema:\n" + schema
    messages = [
        {"role": "system", "content": [{"type": "text", "text": SYSTEM_PROMPT}]},
        {"role": "user", "content": [{"type": "image", "image": im}, {"type": "text", "text": user_text}]},
    ]
    budget = config.VLM_MAX_NEW_TOKENS + (40 * min(n_inst, 8) if with_review else 0)
    raw = vlm.generate(messages, budget)
    parsed = _parse_json(raw)
    refused = False
    if parsed is None and looks_like_refusal(raw):
        # One retry with the clinical framing repeated in the user turn; the model must not block a consented
        # medical photo. If it still refuses, the pipeline continues on the measured classifier alone.
        log.warning("VLM second read looked like a refusal; retrying with reinforced clinical framing")
        messages[1]["content"][1]["text"] = (CLINICAL_CONTEXT + " Respond with the JSON only.\n\n" + user_text)
        raw2 = vlm.generate(messages, budget)
        parsed = _parse_json(raw2)
        if parsed is None and looks_like_refusal(raw2):
            refused = True
        raw = raw2 if parsed is not None or not raw else raw
    out = {
        "available": True, "backend": vlm.backend, "model_id": vlm.model_id, "quantized_4bit": vlm.quantized,
        "parsed": parsed is not None, "raw": raw if parsed is None else None, "refused": refused,
        "reviewed_instances": with_review,
        "latency_ms": round((time.time() - t0) * 1000),
    }
    if parsed:
        for k in ("observed_features", "alternative_considerations", "red_flags", "suggested_questions"):
            v = parsed.get(k)
            parsed[k] = [str(x) for x in v] if isinstance(v, list) else ([str(v)] if v else [])
        parsed["instance_review"] = _clean_review(parsed.get("instance_review")) if with_review else []
        flag = parsed.get("outside_trained_categories")
        if isinstance(flag, str):
            flag = flag.strip().lower() in ("true", "yes", "1")
        parsed["outside_trained_categories"] = bool(flag)
        for k in ("best_match", "transmission_note"):
            v = parsed.get(k)
            parsed[k] = str(v).strip()[:160] if v else ""
        verdict = str(parsed.get("outlines_verdict") or "").strip().lower()
        parsed["outlines_verdict"] = verdict if verdict in ("good", "partly", "wrong") else (None if not with_review else "good")
        parsed["missed_lesions"] = _clean_boxes(parsed.get("missed_lesions"))
        out.update(parsed)
    else:
        out["patient_summary"] = ("The second reader declined to describe this photo, so this result rests on the measured "
                                  "classifier and the outlined regions alone." if refused else raw[:1200])
        out["consistency"] = "cannot_assess"
        out["instance_review"] = []
        out["error"] = "second reader refused" if refused else None
    return out


def chat(img: Image.Image | None, context: str, history: list[dict], message: str) -> str:
    if not available():
        return "The conversational assistant is not enabled on this server."
    vlm = registry.slots["vlm"].get()
    first_user = [{"type": "text", "text": ("Findings from my photo analysis:" + chr(10) if img is not None else "Findings from my check (no photo was needed):" + chr(10)) + context}]
    if img is not None:
        first_user.insert(0, {"type": "image", "image": resize_max_side(img, 640)})
    messages = [{"role": "system", "content": [{"type": "text", "text": CHAT_SYSTEM_PROMPT}]},
                {"role": "user", "content": first_user},
                {"role": "assistant", "content": [{"type": "text", "text": "Understood. I have reviewed the findings and I'm ready to help."}]}]
    for turn in history[-8:]:
        messages.append({"role": turn["role"], "content": [{"type": "text", "text": turn["text"]}]})
    messages.append({"role": "user", "content": [{"type": "text", "text": message}]})
    return vlm.generate(messages, config.VLM_CHAT_MAX_NEW_TOKENS)


def gate(img: Image.Image) -> dict | None:
    """Ask the resident VLM whether the image is an analysable photo of human skin. ~2-3 s on a 6 GB GPU."""
    if not available():
        return None
    t0 = time.time()
    vlm = registry.slots["vlm"].get()
    im = resize_max_side(img, config.VLM_GATE_IMAGE_MAX_SIDE)
    messages = [{"role": "user", "content": [{"type": "image", "image": im}, {"type": "text", "text": GATE_PROMPT}]}]
    raw = vlm.generate(messages, 48)
    parsed = _parse_json(raw) or {}
    if not parsed and looks_like_refusal(raw):
        log.warning("VLM gate looked like a refusal; retrying")
        raw = vlm.generate(messages, 48)
        parsed = _parse_json(raw) or {}
        if not parsed and looks_like_refusal(raw):
            return {"is_skin": None, "what": "", "raw": raw[:200], "refused": True,
                    "latency_ms": round((time.time() - t0) * 1000)}
    flag = parsed.get("analysable_skin_photo")
    if isinstance(flag, str):
        flag = flag.strip().lower() in ("true", "yes", "1")
    if flag is None:
        low = raw.lower()
        flag = ("true" in low or "yes" in low) and "false" not in low
    return {
        "is_skin": bool(flag),
        "what": str(parsed.get("what_is_it") or "").strip()[:60],
        "raw": raw[:200],
        "latency_ms": round((time.time() - t0) * 1000),
    }
