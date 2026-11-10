"""Component 1 - Skin relevance gate.

The documented production gate is a fine-tuned EfficientNetV2-S binary classifier.
Its checkpoint is not present in this repository, so the default backend is a
CLIP zero-shot gate with a prompt ensemble (skin / anatomical content versus the
space of accidental uploads: rooms, pets, documents, screenshots, faces...).
Set RELEVANCE_BACKEND=effnet and RELEVANCE_EFFNET_CKPT to swap in the trained gate.

The gate is terminal: a failed image never reaches Components 2-4 (doc section 11).
"""
from __future__ import annotations

import time

import torch
from PIL import Image

from .. import config
from .registry import DEVICE, GPU_LOCK, registry

POSITIVE_PROMPTS = [
    "a close-up photo of human skin",
    "a clinical photograph of a skin condition",
    "a photo of a skin lesion, rash, bump or sore",
    "a medical photo of the genital area",
    "a dermatology photograph of the penis or groin",
    "a photo of healthy skin on a human body",
    "a close-up photo of a wart, ulcer or blister on skin",
    "a photo of irritated red skin",
]
NEGATIVE_PROMPTS = [
    "a photo of a building or a room",
    "a landscape or outdoor scenery photo",
    "a photo of an animal or a pet",
    "a screenshot of a phone or computer screen",
    "a photo of a document, text or a form",
    "a photo of food or a drink",
    "a photo of a household object or furniture",
    "a photo of a car or a vehicle",
    "a cartoon, drawing or illustration",
    "a portrait photo of a person's face",
    "a photo of clothing or fabric",
    "a photo of a hand holding a product",
    "a blank or black image",
]
# Second question, scored independently from the same image embedding: is this a real
# photograph at all? Brand graphics, renders and web pages that depict skin otherwise pass.
PHOTO_PROMPTS = [
    "a real photograph taken with a phone camera",
    "a close-up photograph of part of a human body",
    "an unedited medical photo",
]
GRAPHIC_PROMPTS = [
    "a digital illustration or 3D render",
    "a cartoon or a drawing",
    "a graphic design, poster or web page",
    "a screenshot with text and buttons",
    "a logo or an icon",
]


class ClipGate:
    def __init__(self, model_id: str):
        from transformers import CLIPModel, CLIPProcessor

        self.processor = CLIPProcessor.from_pretrained(model_id, local_files_only=config.HF_LOCAL_ONLY)
        self.model = CLIPModel.from_pretrained(model_id, local_files_only=config.HF_LOCAL_ONLY).eval()
        self.use_half = DEVICE.type == "cuda"
        prompts = POSITIVE_PROMPTS + NEGATIVE_PROMPTS
        photo_prompts = PHOTO_PROMPTS + GRAPHIC_PROMPTS
        with torch.no_grad():  # text side is computed once, in fp32 on the CPU
            tok = self.processor(text=prompts, return_tensors="pt", padding=True)
            te = self.model.get_text_features(**tok)
            self.text_emb = te / te.norm(dim=-1, keepdim=True)
            tok2 = self.processor(text=photo_prompts, return_tensors="pt", padding=True)
            te2 = self.model.get_text_features(**tok2)
            self.photo_emb = te2 / te2.norm(dim=-1, keepdim=True)
        if self.use_half:
            self.model.half()
            self.text_emb = self.text_emb.half()
            self.photo_emb = self.photo_emb.half()
        self.n_pos = len(POSITIVE_PROMPTS)
        self.n_photo = len(PHOTO_PROMPTS)
        self.prompts = prompts
        self.photo_prompts = photo_prompts

    def to(self, device):
        self.model.to(device)
        self.text_emb = self.text_emb.to(device)
        self.photo_emb = self.photo_emb.to(device)
        return self

    @torch.no_grad()
    def __call__(self, img: Image.Image) -> dict:
        dev = self.model.device
        px = self.processor(images=img, return_tensors="pt")["pixel_values"].to(dev)
        if self.use_half:
            px = px.half()
        with GPU_LOCK:
            ie = self.model.get_image_features(pixel_values=px)
            ie = ie / ie.norm(dim=-1, keepdim=True)
            scale = self.model.logit_scale.exp()
            logits = (scale * ie @ self.text_emb.T).float()
            logits2 = (scale * ie @ self.photo_emb.T).float()
        probs = logits.softmax(dim=-1)[0].cpu()
        probs2 = logits2.softmax(dim=-1)[0].cpu()
        p_skin = float(probs[: self.n_pos].sum())
        p_photo = float(probs2[: self.n_photo].sum())
        top = torch.topk(probs, 3)
        top2 = int(torch.argmax(probs2))
        return {
            # One number for the gate: P(skin content) x P(real photograph).
            "p_relevant": p_skin * p_photo,
            "p_skin": p_skin, "p_photo": p_photo,
            "top_prompts": [{"prompt": self.prompts[i], "p": round(float(probs[i]), 3)} for i in top.indices.tolist()]
                           + [{"prompt": self.photo_prompts[top2], "p": round(float(probs2[top2]), 3)}],
        }


class EffNetGate:
    """Optional trained EfficientNetV2-S skin/non-skin gate (binary head, index 1 = skin)."""

    def __init__(self, ckpt_path: str):
        import timm
        from torchvision import transforms

        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        sd = ckpt.get("state_dict", ckpt.get("model", ckpt))
        n_out = next(v.shape[0] for k, v in sd.items() if k.endswith("weight") and v.ndim == 2)
        self.model = timm.create_model("tf_efficientnetv2_s.in21k_ft_in1k", pretrained=False, num_classes=n_out)
        self.model.load_state_dict(sd, strict=False)
        self.model.eval()
        self.n_out = n_out
        size = int(ckpt.get("img_size", 300))
        self.tf = transforms.Compose([transforms.Resize(int(size / 0.95)), transforms.CenterCrop(size),
                                      transforms.ToTensor(),
                                      transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))])

    def to(self, device):
        self.model.to(device)
        return self

    @torch.no_grad()
    def __call__(self, img: Image.Image) -> dict:
        x = self.tf(img).unsqueeze(0).to(next(self.model.parameters()).device)
        with GPU_LOCK:
            out = self.model(x).float()
        p = torch.sigmoid(out)[0, 0].item() if self.n_out == 1 else out.softmax(-1)[0, 1].item()
        return {"p_relevant": float(p), "top_prompts": []}


def _load_gate():
    if config.RELEVANCE_BACKEND == "effnet" and config.RELEVANCE_EFFNET_CKPT:
        return EffNetGate(config.RELEVANCE_EFFNET_CKPT)
    return ClipGate(config.RELEVANCE_CLIP_ID)


# In pure VLM mode the resident second reader is the gate and CLIP is never loaded.
# (If the VLM itself is switched off, fall back to CLIP so the gate still exists.)
VLM_ONLY = config.RELEVANCE_BACKEND == "vlm" and config.VLM_BACKEND != "none"
if not VLM_ONLY:
    registry.register("relevance", _load_gate, config.RELEVANCE_DEVICE_POLICY)


def check(img: Image.Image) -> dict:
    """Two-tier gate. CLIP scores every image (fast). In clip+vlm mode the resident vision-language model
    gives the final verdict on anything CLIP does not confidently reject; in vlm mode it always decides."""
    t0 = time.time()
    backend = config.RELEVANCE_BACKEND
    if VLM_ONLY:
        from . import vlm as _vlm
        verdict = _vlm.gate(img)
        if verdict and verdict.get("refused"):
            # The model declined to look. Do not punish the user for that: let the photo through to the measured
            # classifier and record why.
            return {
                "is_relevant": True, "confidence": 0.5, "p_relevant": 0.5, "p_clip": None, "p_skin": 0.5, "p_photo": 0.5,
                "vlm_verdict": verdict, "seen": "", "threshold": config.RELEVANCE_THRESHOLD,
                "evidence": [{"prompt": "second reader declined to judge the photo; accepted by default", "p": 0.5}],
                "backend": backend, "model_version": config.MODEL_VERSIONS["relevance"],
                "latency_ms": round((time.time() - t0) * 1000),
            }
        if not verdict or verdict.get("is_skin") is None:
            raise RuntimeError("the vision-language gate is not available: " + str((verdict or {}).get("error") or "VLM not loaded"))
        ok = bool(verdict["is_skin"])
        p = 0.98 if ok else 0.02
        what = verdict.get("what") or ("analysable skin photo" if ok else "not an analysable skin photo")
        return {
            "is_relevant": ok,
            "confidence": 0.98,
            "p_relevant": p, "p_clip": None, "p_skin": p, "p_photo": p,
            "vlm_verdict": verdict, "seen": verdict.get("what") or "",
            "threshold": config.RELEVANCE_THRESHOLD,
            "evidence": [{"prompt": "second reader: " + what, "p": 0.98 if ok else 0.02}],
            "backend": backend,
            "model_version": config.MODEL_VERSIONS["relevance"],
            "latency_ms": round((time.time() - t0) * 1000),
        }
    with registry.slots["relevance"].on_device() as gate:
        out = gate(img)
    p_clip = out["p_relevant"]
    p = p_clip
    verdict = None
    if backend == "clip+vlm" and p_clip >= config.RELEVANCE_CLIP_SKIP_BELOW:
        from . import vlm as _vlm  # local import: vlm is optional and loads lazily
        try:
            verdict = _vlm.gate(img)
        except Exception as e:  # noqa: BLE001 - fall back to CLIP alone
            verdict = {"is_skin": None, "what": "", "error": str(e)[:160], "latency_ms": 0}
        if verdict and verdict.get("is_skin") is not None:
            # The VLM is authoritative; CLIP only shades the number inside the accept / reject band.
            p = 0.9 + 0.1 * p_clip if verdict["is_skin"] else 0.1 * p_clip
    evidence = list(out.get("top_prompts", []))
    if verdict and verdict.get("is_skin") is not None:
        evidence.insert(0, {"prompt": "second reader: " + (verdict.get("what") or ("analysable skin photo" if verdict["is_skin"] else "not an analysable skin photo")),
                            "p": 0.99 if verdict["is_skin"] else 0.01})
    return {
        "is_relevant": bool(p >= config.RELEVANCE_THRESHOLD),
        "confidence": round(p if p >= config.RELEVANCE_THRESHOLD else 1.0 - p, 4),
        "p_relevant": round(p, 4),
        "p_clip": round(p_clip, 4),
        "p_skin": round(out.get("p_skin", p_clip), 4),
        "p_photo": round(out.get("p_photo", 1.0), 4),
        "vlm_verdict": verdict,
        "seen": (verdict or {}).get("what") or "",
        "threshold": config.RELEVANCE_THRESHOLD,
        "evidence": evidence,
        "backend": config.RELEVANCE_BACKEND,
        "model_version": config.MODEL_VERSIONS["relevance"],
        "latency_ms": round((time.time() - t0) * 1000),
    }
