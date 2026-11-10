"""Re-run the untouched held-out test split through the SERVING path.

Technical doc section 36 requires the production preprocessing path to be
functionally equivalent to the evaluation path that produced every reported
metric. This script proves it: it must reproduce test accuracy 0.9486 for the
single T11 model and 0.9486 / macro-F1 0.9484 for the ensemble.

Run from backend/:  .venv/Scripts/python -m scripts.validate_test_split [--limit N]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import config  # noqa: E402
from app.models import likelihood  # noqa: E402
from app.utils.image import decode_image  # noqa: E402


def macro_f1(y, p, k):
    f1s = []
    for c in range(k):
        tp = int(((p == c) & (y == c)).sum()); fp = int(((p == c) & (y != c)).sum()); fn = int(((p != c) & (y == c)).sum())
        prec = tp / (tp + fp) if tp + fp else 0.0; rec = tp / (tp + fn) if tp + fn else 0.0
        f1s.append(2 * prec * rec / (prec + rec) if prec + rec else 0.0)
    return float(np.mean(f1s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="images per class (0 = all)")
    ap.add_argument("--out", default="results/serving_path_validation.json")
    args = ap.parse_args()

    root = config.TRAIN_ROOT / "STD_new_dataset" / "test"
    items = []
    for ci, c in enumerate(config.CLASS_NAMES):
        files = sorted(p for p in (root / c).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"})
        items += [(p, ci) for p in (files[: args.limit] if args.limit else files)]
    print(f"{len(items)} test images")

    members = {n: likelihood.registry.slots[f"likelihood:{n}"].get() for n in config.LIKELIHOOD_MEMBERS}
    weights = likelihood.active_members("ensemble")
    probs = {n: [] for n in members}
    y = []
    t0 = time.time()
    for i, (p, ci) in enumerate(items):
        img = decode_image(p.read_bytes())
        for n, m in members.items():
            pr, _ = m.predict(img, tta=False)
            probs[n].append(pr)
        y.append(ci)
        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(items)}  {time.time() - t0:.0f}s")
    y = np.array(y)
    probs = {n: np.stack(v) for n, v in probs.items()}
    k = len(config.CLASS_NAMES)

    report = {"n": int(len(y)), "escalation_threshold": config.ESCALATION_THRESHOLD}
    for n, pr in probs.items():
        pred = pr.argmax(1)
        report[n] = {"accuracy": float((pred == y).mean()), "macro_f1": macro_f1(y, pred, k)}
    blend = sum(w * probs[n] for n, w in weights.items())
    pred = blend.argmax(1)
    report["ensemble"] = {"weights": weights, "accuracy": float((pred == y).mean()), "macro_f1": macro_f1(y, pred, k)}

    # binary triage behaviour of the deployed configuration
    abn = 1 - blend[:, config.NORMAL_INDEX]
    is_abn = y != config.NORMAL_INDEX
    for thr in (0.20, 0.50, 0.70):
        esc = abn >= thr
        sens = float((esc & is_abn).sum() / is_abn.sum()); spec = float((~esc & ~is_abn).sum() / (~is_abn).sum())
        report[f"binary@{thr}"] = {"sensitivity": sens, "specificity": spec, "missed_abnormal": int((~esc & is_abn).sum())}
    conf = blend.max(1)
    keep = conf >= config.CONFIDENCE_THRESHOLD
    report["confidence_gate"] = {"threshold": config.CONFIDENCE_THRESHOLD, "coverage": float(keep.mean()),
                                 "accuracy_on_retained": float((pred[keep] == y[keep]).mean())}
    report["documented"] = {"T11_test_accuracy": 0.9486, "ensemble_test_accuracy": 0.9486, "ensemble_test_macro_f1": 0.9484,
                            "zero_miss@0.20": {"sensitivity": 1.0, "specificity": 0.8917}}
    out = Path(__file__).resolve().parents[1] / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"-> {out}")


if __name__ == "__main__":
    main()
