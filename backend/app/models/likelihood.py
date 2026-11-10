"""Component 2 - Disease-likelihood vision classification.

Serves the production DINOv2 ViT-L/14 checkpoint (T11) and, in ensemble mode,
blends it with the two validation-selected members (T09 @336px, T05) using the
weights frozen by the training repository's greedy ensemble search.

Preprocessing is byte-for-byte the evaluation transform used to produce every
reported metric (resize shorter side to round(size/0.875), centre-crop, ImageNet
normalisation) - see technical doc section 36 (preprocessing parity).
"""
from __future__ import annotations

import logging
import time

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from .. import config
from .dinov2_arch import DINOv2Classifier
from .registry import DEVICE, GPU_LOCK, registry

log = logging.getLogger("hygeia.likelihood")

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def eval_transform(img_size: int):
    resize = int(round(img_size / 0.875))
    return transforms.Compose([
        transforms.Resize(resize), transforms.CenterCrop(img_size),
        transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)])


def tta_transforms(img_size: int) -> dict:
    base_resize = int(round(img_size / 0.875))
    norm = [transforms.ToTensor(), transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)]
    return {
        "original": transforms.Compose([transforms.Resize(base_resize), transforms.CenterCrop(img_size)] + norm),
        "hflip": transforms.Compose([transforms.Resize(base_resize), transforms.CenterCrop(img_size),
                                     transforms.RandomHorizontalFlip(p=1.0)] + norm),
        "tight_crop": transforms.Compose([transforms.Resize(int(round(img_size / 0.80))),
                                          transforms.CenterCrop(img_size)] + norm),
        "full_resize": transforms.Compose([transforms.Resize((img_size, img_size))] + norm),
    }


class LikelihoodMember:
    def __init__(self, name: str, path):
        self.name = name
        self.path = path
        ckpt = torch.load(path, map_location="cpu", weights_only=False)
        assert list(ckpt["classes"]) == config.CLASS_NAMES, f"class order mismatch in {name}"
        self.classes = list(ckpt["classes"])
        self.cfg = ckpt["config"]
        self.epoch = ckpt.get("epoch")
        self.val = ckpt.get("val", {})
        self.img_size = int(self.cfg.get("img_size", 224))
        self.model = DINOv2Classifier.from_checkpoint(ckpt).eval()
        del ckpt
        self.use_half = DEVICE.type == "cuda"
        if self.use_half:
            self.model.half()
        self.model.to(memory_format=torch.channels_last)
        self.transform = eval_transform(self.img_size)
        self.tta = tta_transforms(self.img_size)
        self.params_m = round(sum(p.numel() for p in self.model.parameters()) / 1e6, 1)

    def to(self, device):
        self.model.to(device)
        return self

    @property
    def device(self):
        return next(self.model.parameters()).device

    def _batch(self, views: list[torch.Tensor]) -> torch.Tensor:
        x = torch.stack(views).to(self.device, non_blocking=True)
        x = x.to(memory_format=torch.channels_last)
        return x.half() if self.use_half else x

    @torch.no_grad()
    def predict(self, img: Image.Image, tta: bool = False) -> tuple[np.ndarray, dict]:
        views = self.tta if tta else {"original": self.transform}
        x = self._batch([t(img) for t in views.values()])
        with GPU_LOCK:
            logits = self.model(x).float()
        probs = F.softmax(logits, dim=1).cpu().numpy()
        per_view = {k: probs[i].tolist() for i, k in enumerate(views)}
        return probs.mean(axis=0), per_view

    def token_cam(self, img: Image.Image, class_idx: int) -> np.ndarray:
        """Gradient-weighted token activation map for `class_idx` on the patch grid.

        The head consumes [CLS ; mean(patches)], so d logit / d mean(patches) gives a
        per-channel weight vector; weighting each patch token by it yields a spatial
        map highlighting the regions that drove the prediction (Grad-CAM over tokens).
        """
        x = self._batch([self.transform(img)])
        with GPU_LOCK, torch.enable_grad():
            tokens = self.model.tokens(x).float().detach().requires_grad_(True)
            head = self.model.head.float() if self.use_half else self.model.head
            feats = self.model.pool(tokens.to(torch.float32))
            logit = head(feats)[0, class_idx]
            grad = torch.autograd.grad(logit, tokens)[0]
            if self.use_half:
                self.model.head.half()
        patches = tokens[0, self.model.num_prefix:].detach()
        w = grad[0, self.model.num_prefix:].mean(dim=0)           # channel weights (uniform across patches)
        cam = torch.relu((patches * w).sum(dim=-1))
        grid = self.img_size // self.model.patch_size
        cam = cam.reshape(grid, grid).cpu().numpy()
        if cam.max() > 0:
            cam = cam / cam.max()
        return cam


def _load_member(name: str):
    path, _ = config.LIKELIHOOD_MEMBERS[name]
    if not path.exists():
        raise FileNotFoundError(f"checkpoint not found: {path}")
    return LikelihoodMember(name, path)


for _name in config.LIKELIHOOD_MEMBERS:
    registry.register(f"likelihood:{_name}", (lambda n=_name: _load_member(n)),
                      config.LIKELIHOOD_PRIMARY_POLICY if _name == config.PRIMARY_MEMBER else config.LIKELIHOOD_SECONDARY_POLICY)


def active_members(mode: str | None = None) -> dict[str, float]:
    mode = mode or config.LIKELIHOOD_MODE
    if mode == "single":
        return {config.PRIMARY_MEMBER: 1.0}
    weights = {k: v for k, v in config.ENSEMBLE_WEIGHTS.items() if k in config.LIKELIHOOD_MEMBERS}
    s = sum(weights.values())
    return {k: v / s for k, v in weights.items()}


def cam_to_heatmap(cam: np.ndarray, img: Image.Image, alpha: float = 0.45) -> Image.Image:
    """Overlay the token CAM on the centre-cropped region of the original image."""
    import cv2

    w, h = img.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    crop = img.crop((left, top, left + side, top + side))
    base = np.asarray(crop)
    heat = cv2.resize((cam * 255).astype(np.uint8), (side, side), interpolation=cv2.INTER_CUBIC)
    heat = cv2.applyColorMap(heat, cv2.COLORMAP_JET)[:, :, ::-1]
    mix = (alpha * heat + (1 - alpha) * base).astype(np.uint8)
    return Image.fromarray(mix)


def predict(img: Image.Image, mode: str | None = None, tta: bool | None = None,
            with_cam: bool = True) -> dict:
    """Return the Component 2 standalone contract (doc section 32.3) plus diagnostics."""
    tta = config.LIKELIHOOD_TTA if tta is None else tta
    mode = mode or config.LIKELIHOOD_MODE
    weights = active_members(mode)
    t0 = time.time()
    member_out, blend = {}, np.zeros(len(config.CLASS_NAMES), dtype=np.float64)
    for name, w in weights.items():
        with registry.slots[f"likelihood:{name}"].on_device() as member:
            p, per_view = member.predict(img, tta=tta)
        member_out[name] = {
            "weight": round(w, 4), "img_size": member.img_size, "backbone": member.cfg["backbone"],
            "probs": {c: round(float(v), 4) for c, v in zip(config.CLASS_NAMES, p)},
            "argmax": config.CLASS_NAMES[int(p.argmax())],
            "per_view": {k: round(float(max(v)), 4) for k, v in per_view.items()} if tta else None,
        }
        blend += w * p
    blend = blend / blend.sum()
    idx = int(blend.argmax())
    confidence = float(blend[idx])
    abnormality = float(1.0 - blend[config.NORMAL_INDEX])
    review_required = confidence < config.CONFIDENCE_THRESHOLD
    escalate = abnormality >= config.ESCALATION_THRESHOLD
    ranked = sorted(zip(config.CLASS_NAMES, blend.tolist()), key=lambda kv: -kv[1])

    cam_b64, cam = None, None
    if with_cam:
        try:
            from ..utils.image import to_base64_jpeg
            with registry.slots[f"likelihood:{config.PRIMARY_MEMBER}"].on_device() as primary:
                cam = primary.token_cam(img, idx)
            cam_b64 = to_base64_jpeg(cam_to_heatmap(cam, img), max_side=640)
        except Exception as e:  # noqa: BLE001
            log.warning("token CAM failed: %s", e)

    agreement = len({m["argmax"] for m in member_out.values()}) == 1
    return {
        "category": config.CLASS_NAMES[idx],
        "category_display": config.DISPLAY_NAMES[config.CLASS_NAMES[idx]],
        "confidence": round(confidence, 4),
        "abnormality_score": round(abnormality, 4),
        "distribution": {c: round(float(v), 4) for c, v in zip(config.CLASS_NAMES, blend)},
        "predictions": [{"class": c, "display": config.DISPLAY_NAMES[c], "score": round(s, 4)} for c, s in ranked],
        "auto_processed": not review_required,
        "review_required": review_required,
        "escalate": escalate,
        "visual_indicators": VISUAL_INDICATORS.get(config.CLASS_NAMES[idx], []),
        "thresholds": {"confidence_gate": config.CONFIDENCE_THRESHOLD, "escalation": config.ESCALATION_THRESHOLD},
        "mode": mode, "tta": tta, "members": member_out, "members_agree": agreement,
        "attention_map": cam_b64,
        "_cam": cam,
        "model_version": config.MODEL_VERSIONS["likelihood"],
        "latency_ms": round((time.time() - t0) * 1000),
    }


# Doc section 3.4 - visual characteristics each category was trained to recognise.
VISUAL_INDICATORS = {
    "Normal": [],
    "Genital_warts": ["papillomatous_growth", "cauliflower_like_surface", "clustered_papules"],
    "HSV": ["vesicular_clusters", "shallow_ulceration", "erythematous_base"],
    "Syphillis": ["chancre_type_ulceration", "indurated_margins", "secondary_rash_pattern"],
    "Penile_candidiasis": ["erythema", "satellite_lesions", "surface_scaling_or_maceration"],
    "Penile_cancer": ["indurated_or_exophytic_mass", "irregular_ulceration", "abnormal_pigmentation"],
}
