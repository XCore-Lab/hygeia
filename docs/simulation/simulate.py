"""Model-free walkthrough of the Hygeia pipeline for the README.

    python docs/simulation/simulate.py <photo.jpg> [--name case01]

What is real and what is simulated here:

* REAL      the triage rules engine. `backend/app/triage.py` is imported and run unchanged, so the
            level, headline, reasons, actions, tests and notes are exactly what the app would return
            for these inputs. The symptoms-only result is fully real (that path uses no model).
* SIMULATED the three model stages. No checkpoint is loaded. The likelihood distribution and the
            second-reader fields come from `sim_inputs.json` (hand-written, illustrative), and the
            outlined regions come from a classical colour segmentation in this file, not from the
            fusion segmenter (Qwen3-VL + Grounding DINO + SAM 2.1).

So the figures show how a result is assembled and presented. They are not a recorded run of the
models and say nothing about model accuracy. Needs only numpy, opencv-python, pillow, matplotlib.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import textwrap
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app import config, triage  # noqa: E402  (the real rules engine; imports no model code)

INK = (11, 23, 55)
MUTED = (90, 100, 124)
TEAL = (6, 121, 113)
TEAL_TINT = (224, 246, 244)
CORAL = (218, 54, 27)
BG = (243, 251, 252)
CARD = (255, 255, 255)
LINE = (214, 228, 232)
LEVEL_COLOURS = {"low": (22, 140, 96), "moderate": (201, 133, 6), "high": (218, 94, 27), "urgent": (190, 30, 45)}
DISPLAY = {"Genital_warts": "Genital warts", "HSV": "Herpes simplex", "Normal": "Normal-appearing skin",
           "Penile_cancer": "Penile cancer", "Penile_candidiasis": "Penile candidiasis", "Syphillis": "Syphilis"}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    for name in (("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf") if bold else ("segoeui.ttf", "arial.ttf", "DejaVuSans.ttf")):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


# --------------------------------------------------------------------------- localisation (classical)
def segment(bgr: np.ndarray) -> tuple[list[dict], np.ndarray]:
    """Redness-based region proposals. Returns instances and the smoothed redness map (0-1)."""
    h, w = bgr.shape[:2]
    lab = cv2.cvtColor(cv2.GaussianBlur(bgr, (0, 0), 3), cv2.COLOR_BGR2LAB).astype(np.float32)
    a = lab[..., 1]
    # Redness relative to the surrounding skin tone (large-scale background removed).
    base = cv2.GaussianBlur(a, (0, 0), max(h, w) / 6)
    red = np.clip(a - base, 0, None)
    red[lab[..., 0] < 60] = 0  # ignore deep shadow
    # Saturated non-skin colours (nail varnish, clothing) are not erythema.
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    red[cv2.dilate(((hsv[..., 1] > 170) & (hsv[..., 2] > 150)).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0] = 0
    red_n = red / (red.max() + 1e-6)

    thr = max(0.38, float(np.percentile(red_n, 97.5)))
    mask = (red_n >= thr).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    out = []
    for c in sorted(contours, key=cv2.contourArea, reverse=True):
        area = cv2.contourArea(c)
        if area < 0.0015 * h * w:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        per = cv2.arcLength(c, True)
        hull = cv2.contourArea(cv2.convexHull(c))
        circ = 4 * math.pi * area / (per * per + 1e-6)
        m = np.zeros((h, w), np.uint8)
        cv2.drawContours(m, [c], -1, 1, -1)
        out.append({
            "id": len(out) + 1, "contour": c, "bbox": [int(x), int(y), int(bw), int(bh)],
            "area_ratio": round(area / (h * w), 4), "circularity": round(circ, 2),
            "solidity": round(area / (hull + 1e-6), 2),
            "shape": "round" if circ > 0.75 else ("elongated" if max(bw, bh) / max(1, min(bw, bh)) > 2 else "irregular"),
            "confidence": round(float(min(0.95, 0.45 + red_n[m > 0].mean())), 2),
        })
    return out[:6], red_n


def localisation_figure(bgr: np.ndarray, inst: list[dict], red: np.ndarray, labels: dict, path: Path) -> None:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    outlined = rgb.copy()
    for i in inst:
        cv2.drawContours(outlined, [i["contour"]], -1, (255, 255, 255), 5, cv2.LINE_AA)
        cv2.drawContours(outlined, [i["contour"]], -1, TEAL, 3, cv2.LINE_AA)
    heat_src = np.zeros((h, w), np.float32)
    for i in inst:
        cv2.drawContours(heat_src, [i["contour"]], -1, 1.0, -1)
    heat = cv2.GaussianBlur(heat_src * red, (0, 0), max(h, w) / 28)
    heat /= heat.max() + 1e-6
    cm = cv2.cvtColor(cv2.applyColorMap((heat * 255).astype(np.uint8), cv2.COLORMAP_INFERNO), cv2.COLOR_BGR2RGB)
    alpha = (heat[..., None] ** 0.7) * 0.72
    heatmap = (rgb * (1 - alpha) + cm * alpha).astype(np.uint8)

    ph = 620
    pw = int(w * ph / h)
    pad, top, foot = 28, 92, 92
    W = pad + 3 * (pw + pad)
    canvas = Image.new("RGB", (W, top + ph + foot), BG)
    d = ImageDraw.Draw(canvas)
    d.text((pad, 22), "Stage 3 · Where the changes are", font=font(26, True), fill=INK)
    d.text((pad, 58), "Simulated localisation. Colour-based outlines stand in for the fusion segmenter.", font=font(16), fill=MUTED)
    titles = ["1 · Cropped photo", "2 · Outlined regions", "3 · Heat-map fallback"]
    subs = ["what leaves the device", "numbered, reviewed one by one", "orientation aid, not a measurement"]
    sx = pw / w
    for k, im in enumerate((rgb, outlined, heatmap)):
        x0 = pad + k * (pw + pad)
        canvas.paste(Image.fromarray(im).resize((pw, ph), Image.LANCZOS), (x0, top))
        d.rectangle([x0, top, x0 + pw - 1, top + ph - 1], outline=LINE, width=2)
        d.text((x0, top + ph + 12), titles[k], font=font(19, True), fill=INK)
        d.text((x0, top + ph + 40), subs[k], font=font(15), fill=MUTED)
        if k == 1:
            for i in inst:
                bx, by, bw, bh = i["bbox"]
                cx, cy = x0 + int((bx + bw) * sx) + 6, top + int(by * sx) - 6
                tag = f"{i['id']}  {labels.get(str(i['id']), 'region')}"
                tw = d.textlength(tag, font=font(15, True))
                cx = min(cx, x0 + pw - int(tw) - 22)
                cy = max(cy, top + 6)
                d.rounded_rectangle([cx, cy, cx + tw + 16, cy + 26], 8, fill=TEAL)
                d.text((cx + 8, cy + 2), tag, font=font(15, True), fill=(255, 255, 255))
    canvas.save(path)


# --------------------------------------------------------------------------- likelihood figure
def likelihood_figure(lk: dict, path: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams["font.family"] = ["Segoe UI", "DejaVu Sans"]
    c = lambda t: tuple(v / 255 for v in t)  # noqa: E731
    dist = sorted(lk["distribution"].items(), key=lambda kv: kv[1])
    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(11, 3.9), gridspec_kw={"width_ratios": [1.5, 1]}, facecolor=c(BG))
    names = [DISPLAY[k] for k, _ in dist]
    vals = [v for _, v in dist]
    bars = ax.barh(names, vals, color=[c(TEAL) if k == lk["category"] else c((176, 205, 210)) for k, _ in dist], height=0.62)
    for b, v in zip(bars, vals):
        ax.text(v + 0.012, b.get_y() + b.get_height() / 2, f"{v:.0%}", va="center", fontsize=10.5, color=c(INK))
    ax.axvline(config.CONFIDENCE_THRESHOLD, color=c(CORAL), ls="--", lw=1.3)
    ax.text(config.CONFIDENCE_THRESHOLD + 0.015, 2.5, f"confidence gate {config.CONFIDENCE_THRESHOLD:.2f}" + chr(10) + "below it: human review", color=c(CORAL), fontsize=9.5, va="center")
    ax.set_xlim(0, 1.06)
    ax.set_title("Stage 2 · Pattern likelihood (simulated values)", loc="left", fontsize=13, fontweight="bold", color=c(INK))
    ax.set_xlabel("resembles this pattern (never shown as a diagnosis)", fontsize=9.5, color=c(MUTED))

    abn = lk["abnormality_score"]
    ax2.barh(["Abnormality score\n1 − P(normal)"], [abn], color=c(TEAL), height=0.38)
    ax2.axvline(config.ESCALATION_THRESHOLD, color=c(CORAL), ls="--", lw=1.3)
    ax2.text(config.ESCALATION_THRESHOLD + 0.02, 0.33, f"zero-miss threshold {config.ESCALATION_THRESHOLD:.2f}", color=c(CORAL), fontsize=9.5)
    ax2.text(abn - 0.03, 0, f"{abn:.0%}", va="center", ha="right", color="white", fontsize=12, fontweight="bold")
    ax2.set_xlim(0, 1.0)
    ax2.set_ylim(-0.6, 0.6)
    ax2.set_title("Two independent decisions", loc="left", fontsize=13, fontweight="bold", color=c(INK))
    ax2.set_xlabel(f"escalate: {'yes' if lk['escalate'] else 'no'}   ·   human review: {'yes' if lk['review_required'] else 'no'}",
                   fontsize=10.5, color=c(INK))
    for x in (ax, ax2):
        x.set_facecolor(c(BG))
        for s in ("top", "right", "left"):
            x.spines[s].set_visible(False)
        x.spines["bottom"].set_color(c(LINE))
        x.tick_params(colors=c(INK), length=0, labelsize=10.5)
        x.xaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
    fig.tight_layout()
    fig.savefig(path, dpi=140, facecolor=c(BG))
    plt.close(fig)


# --------------------------------------------------------------------------- result card
def result_card(t: dict, title: str, footer: str, path: Path, reader_note: str | None = None) -> None:
    W, pad = 880, 34
    wrap = lambda s, n=100: textwrap.wrap(s, n)  # noqa: E731
    blocks: list[tuple[str, list[str]]] = [("Why this level", t["reasons"]), ("What to do next", t["actions"])]
    if t.get("testing"):
        blocks.append(("Tests to ask about", t["testing"]))
    diff = (t.get("scope") or {}).get("differential") or t.get("differential") or []
    if diff:
        blocks.append(("Other things a clinician would consider", diff))
    if t.get("notes"):
        blocks.append(("Good to know", t["notes"]))

    def layout(d: ImageDraw.ImageDraw | None) -> int:
        y = pad
        col = LEVEL_COLOURS[t["risk_level"]]
        if d:
            d.text((pad, y), title, font=font(15, True), fill=TEAL)
        y += 30
        chip = f"{t['risk_level'].upper()}  ·  urgency {t['urgency_score']}/100"
        if d:
            tw = d.textlength(chip, font=font(15, True))
            d.rounded_rectangle([pad, y, pad + tw + 24, y + 30], 15, fill=col)
            d.text((pad + 12, y + 4), chip, font=font(15, True), fill=(255, 255, 255))
        y += 44
        if d:
            d.text((pad, y), t["headline"], font=font(28, True), fill=INK)
        y += 44
        for ln in wrap(t["summary"], 98):
            if d:
                d.text((pad, y), ln, font=font(17), fill=INK)
            y += 25
        y += 8
        if reader_note:
            lines = wrap(reader_note, 98)
            hh = 40 + 23 * len(lines)
            if d:
                d.rounded_rectangle([pad, y, W - pad, y + hh], 12, fill=TEAL_TINT)
                d.text((pad + 14, y + 9), "Second reader's note · model-generated (simulated here)", font=font(13, True), fill=TEAL)
                for k, ln in enumerate(lines):
                    d.text((pad + 14, y + 32 + 23 * k), ln, font=font(16), fill=INK)
            y += hh + 14
        for head, items in blocks:
            if d:
                d.line([pad, y, W - pad, y], fill=LINE, width=1)
            y += 14
            if d:
                d.text((pad, y), head, font=font(17, True), fill=INK)
            y += 30
            for it in items:
                for k, ln in enumerate(wrap(it, 102)):
                    if d:
                        if k == 0:
                            d.ellipse([pad + 2, y + 9, pad + 9, y + 16], fill=col)
                        d.text((pad + 20, y), ln, font=font(16), fill=INK if k == 0 else MUTED)
                    y += 23
                y += 5
            y += 6
        if d:
            d.line([pad, y, W - pad, y], fill=LINE, width=1)
        y += 12
        for ln in wrap(footer, 124):
            if d:
                d.text((pad, y), ln, font=font(13), fill=MUTED)
            y += 19
        return y + pad - 8

    H = layout(None)
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([10, 10, W - 10, H - 10], 22, fill=CARD, outline=LINE, width=2)
    layout(d)
    img.save(path)


# --------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("photo")
    ap.add_argument("--name", default="case01")
    ap.add_argument("--inputs", default=str(HERE / "sim_inputs.json"))
    args = ap.parse_args()
    sim = json.loads(Path(args.inputs).read_text(encoding="utf-8"))[args.name]
    out = HERE / "out"
    out.mkdir(exist_ok=True)

    bgr = cv2.imdecode(np.fromfile(args.photo, np.uint8), cv2.IMREAD_COLOR)
    inst, red = segment(bgr)

    # Stage 2 (simulated numbers) -> the two real threshold decisions
    dist = sim["likelihood_distribution"]
    cat = max(dist, key=dist.get)
    abn = round(1 - dist["Normal"], 4)
    lk = {"category": cat, "category_display": DISPLAY[cat], "confidence": dist[cat], "abnormality_score": abn,
          "distribution": dist, "escalate": abn >= config.ESCALATION_THRESHOLD,
          "review_required": dist[cat] < config.CONFIDENCE_THRESHOLD, "members_agree": True}

    # Stage 3 (classical stand-in) in the shape triage.assess expects
    total = round(sum(i["area_ratio"] for i in inst), 4)
    n = len(inst)
    abnormalities = {
        "available": True, "backend": "simulated_colour_segmentation", "localisation_reliable": True,
        "instance_count": n,
        "instances": [{k: v for k, v in i.items() if k != "contour"} for i in inst],
        "summary": {"burden": "none" if not n else "few" if n <= 3 else "several" if n <= 7 else "many",
                    "spatial_pattern": "single" if n == 1 else "clustered", "total_area_ratio": total, "multi_source": 0},
    }
    vlm = {"available": True, "parsed": True, **sim["second_reader"]}

    result = triage.assess({"is_relevant": True}, lk, abnormalities, vlm, sim["questionnaire"])
    symptoms_only = triage.assess_symptoms(sim["symptoms_only_questionnaire"])

    localisation_figure(bgr, inst, red, sim.get("region_labels", {}), out / f"{args.name}_localisation.png")
    likelihood_figure(lk, out / f"{args.name}_likelihood.png")
    result_card(result, "HYGEIA · RESULT (PHOTO PATH)",
                "Triage text produced by backend/app/triage.py, unchanged. Model stages simulated: see docs/simulation/README. "
                "Hygeia does not diagnose; only a clinician and a test can say what this is.",
                out / f"{args.name}_result_card.png", reader_note=sim["second_reader"].get("patient_summary"))
    result_card(symptoms_only, "HYGEIA · RESULT (SYMPTOMS-ONLY PATH, NO PHOTO)",
                "Produced by backend/app/triage.py assess_symptoms, unchanged. This path uses no model, so nothing here is simulated.",
                out / "symptoms_only_result_card.png")
    (out / f"{args.name}_payload.json").write_text(json.dumps({
        "_note": "Simulated model stages + real triage engine output. Not a recorded run of the models.",
        "status": "analysed", "likelihood": lk, "abnormalities": abnormalities, "second_reader": sim["second_reader"],
        "triage": result, "symptoms_only_example": symptoms_only}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"instances": abnormalities["instances"], "level": result["risk_level"], "headline": result["headline"],
                      "symptoms_only_level": symptoms_only["risk_level"]}, indent=1))


if __name__ == "__main__":
    main()
