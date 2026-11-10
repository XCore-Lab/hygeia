"""Image intake helpers: decoding, EXIF orientation, hashing, quality checks, encoding."""
from __future__ import annotations

import base64
import hashlib
import io

import numpy as np
from PIL import Image, ImageFile, ImageOps

ImageFile.LOAD_TRUNCATED_IMAGES = True


def decode_image(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def image_id(data: bytes) -> str:
    return "img_" + hashlib.sha256(data).hexdigest()[:12]


def to_base64_png(img: Image.Image, max_side: int | None = None) -> str:
    if max_side:
        img = img.copy()
        img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def to_base64_jpeg(img: Image.Image, max_side: int | None = None, quality: int = 88) -> str:
    if max_side:
        img = img.copy()
        img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def quality_report(img: Image.Image) -> dict:
    """Lightweight capture-quality heuristics (the gate itself is binary, doc section 11.2)."""
    w, h = img.size
    small = img.copy()
    small.thumbnail((512, 512))
    g = np.asarray(small.convert("L"), dtype=np.float32)
    # Laplacian variance as a blur proxy
    lap = (np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])).var()
    brightness = float(g.mean() / 255.0)
    contrast = float(g.std() / 255.0)
    warnings = []
    if min(w, h) < 224:
        warnings.append("low_resolution")
    if lap < 25:
        warnings.append("possible_blur")
    if brightness < 0.18:
        warnings.append("too_dark")
    elif brightness > 0.88:
        warnings.append("overexposed")
    if contrast < 0.08:
        warnings.append("low_contrast")
    return {
        "width": w, "height": h, "sharpness": round(float(lap), 1),
        "brightness": round(brightness, 3), "contrast": round(contrast, 3),
        "warnings": warnings,
    }


def resize_max_side(img: Image.Image, max_side: int) -> Image.Image:
    if max(img.size) <= max_side:
        return img
    out = img.copy()
    out.thumbnail((max_side, max_side), Image.LANCZOS)
    return out
