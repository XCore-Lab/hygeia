"""Preprocessing parity: serving transform == training-repo evaluation transform (doc section 36).

Run from backend/:  .venv/Scripts/python -m pytest -q tests   (or python -m tests.test_parity)
"""
from __future__ import annotations

import sys
from pathlib import Path

import torch

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app import config  # noqa: E402
from app.models.likelihood import eval_transform, tta_transforms  # noqa: E402
from app.utils.image import decode_image  # noqa: E402

sys.path.insert(0, str(config.TRAIN_ROOT))
try:  # the training repository is present in the development tree, not in the deployment bundle
    from src.augmentation import build_eval_transform, build_tta_transforms  # noqa: E402
    from src.utils import Config  # noqa: E402
    HAVE_TRAIN_REPO = (config.TRAIN_ROOT / "STD_new_dataset" / "test").is_dir()
except Exception:  # noqa: BLE001
    HAVE_TRAIN_REPO = False


def _samples(n=2):
    root = config.TRAIN_ROOT / "STD_new_dataset" / "test"
    out = []
    for c in config.CLASS_NAMES:
        out += sorted(root.joinpath(c).iterdir())[:n]
    return out


def test_transforms_are_well_formed():
    """Self-contained check (runs everywhere): shapes, normalisation and the four TTA views."""
    from PIL import Image
    img = Image.new("RGB", (640, 480), (190, 140, 120))
    for size in (224, 336):
        x = eval_transform(size)(img)
        assert x.shape == (3, size, size)
        assert abs(float(x.mean())) < 3.0
    views = tta_transforms(224)
    assert list(views) == ["original", "hflip", "tight_crop", "full_resize"]
    assert all(t(img).shape == (3, 224, 224) for t in views.values())


def test_eval_transform_matches_training_repo():
    if not HAVE_TRAIN_REPO:
        return
    for size in (224, 336):
        cfg = Config(img_size=size)
        ref, ours = build_eval_transform(cfg), eval_transform(size)
        for p in _samples():
            img = decode_image(p.read_bytes())
            a, b = ref(img), ours(img)
            assert a.shape == b.shape == (3, size, size)
            assert torch.equal(a, b), f"eval transform differs for {p.name} @ {size}"


def test_tta_views_match_training_repo():
    if not HAVE_TRAIN_REPO:
        return
    cfg = Config(img_size=224)
    ref, ours = build_tta_transforms(cfg), tta_transforms(224)
    assert list(ref) == list(ours)
    for p in _samples(1):
        img = decode_image(p.read_bytes())
        for k in ref:
            assert torch.equal(ref[k](img), ours[k](img)), f"TTA view {k} differs"


def test_class_order_is_artefact_order():
    assert config.CLASS_NAMES == ["Genital_warts", "HSV", "Normal", "Penile_cancer", "Penile_candidiasis", "Syphillis"]
    assert config.NORMAL_INDEX == 2


if __name__ == "__main__":
    test_transforms_are_well_formed()
    test_class_order_is_artefact_order()
    if HAVE_TRAIN_REPO:
        test_eval_transform_matches_training_repo()
        test_tta_views_match_training_repo()
        print("parity OK (serving transforms are tensor-identical to the training repository)")
    else:
        print("parity OK (self-contained checks; training repository not present, cross-check skipped)")
