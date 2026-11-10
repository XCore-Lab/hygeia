"""Stage-by-stage smoke test on real held-out images. Run from backend/: .venv/Scripts/python -m scripts.smoke_test"""
import json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import config
from app.models import registry as reg
from app.utils.image import decode_image
from app.models import relevance, likelihood, segmentation, vlm
from app import triage

root = config.TRAIN_ROOT / "STD_new_dataset" / "test"
if root.is_dir():
    samples = {c: sorted((root / c).iterdir())[0] for c in config.CLASS_NAMES}
else:  # deployment bundle: exercise every stage on a synthetic skin-coloured image (no accuracy claim)
    import io
    from PIL import Image, ImageDraw
    _im = Image.new("RGB", (640, 480), (205, 160, 140)); _d = ImageDraw.Draw(_im)
    _d.ellipse((260, 180, 380, 300), fill=(190, 70, 70)); _d.ellipse((420, 120, 470, 170), fill=(170, 60, 80))
    _buf = io.BytesIO(); _im.save(_buf, "JPEG"); _p = Path(__file__).resolve().parent / "_synthetic_sample.jpg"; _p.write_bytes(_buf.getvalue())
    samples = {"synthetic": _p}
    print("(dataset not found - using a synthetic image; results below exercise the stages, they are not an accuracy check)")
stage = sys.argv[1] if len(sys.argv) > 1 else "all"

if stage in ("all", "relevance"):
    print("== relevance");
    for c, p in samples.items():
        r = relevance.check(decode_image(p.read_bytes()))
        print(f"  {c:20s} relevant={r['is_relevant']} p={r['p_relevant']:.3f} {r['latency_ms']}ms  top={r['evidence'][0]['prompt']!r}")
    from PIL import Image
    import numpy as np
    noise = Image.fromarray((np.random.rand(300, 300, 3) * 255).astype('uint8'))
    r = relevance.check(noise); print(f"  {'noise':20s} relevant={r['is_relevant']} p={r['p_relevant']:.3f}")
    print(reg.gpu_mem())

if stage in ("all", "likelihood"):
    print("== likelihood (ensemble)")
    for c, p in samples.items():
        t0 = time.time()
        r = likelihood.predict(decode_image(p.read_bytes()))
        ok = "OK " if r["category"] == c else "MISS"
        print(f"  {ok} {c:20s} -> {r['category']:20s} conf={r['confidence']:.3f} abn={r['abnormality_score']:.3f} esc={r['escalate']} rev={r['review_required']} agree={r['members_agree']} {r['latency_ms']}ms cam={'yes' if r['attention_map'] else 'no'}")
    print(reg.gpu_mem())

if stage in ("all", "segmentation"):
    print("== segmentation")
    for c, p in list(samples.items()):
        img = decode_image(p.read_bytes())
        lk = likelihood.predict(img); cam = lk.pop("_cam")
        r = segmentation.segment(img, cam=cam if lk["category"] != "Normal" else None)
        print(f"  {c:20s} n={r['instance_count']}/{r['proposals']} area={r['total_area_ratio']:.4f} pattern={r['summary']['spatial_pattern']} {r['latency_ms']}ms src={r['source']} types={r['summary']['types']} attn={[f.get('classifier_attention') for f in r['instances']]}")
    print(reg.gpu_mem())

if stage in ("all", "vlm"):
    print("== vlm second read")
    c, p = "Genital_warts", samples["Genital_warts"]
    img = decode_image(p.read_bytes())
    lk = likelihood.predict(img); lk.pop('_cam', None)
    seg = segmentation.segment(img) if config.VAIS_BACKEND != "none" else {"available": False}
    q = {"age": 26, "sex_at_birth": "male", "symptoms": ["bumps"], "duration": "1-4w", "exposure": "unprotected"}
    sr = vlm.second_read(img, lk, seg, q)
    print(json.dumps({k: v for k, v in sr.items() if k != "raw"}, indent=1)[:3000])
    if sr.get("raw"): print("RAW:", sr["raw"][:1500])
    print(reg.gpu_mem())
    tr = triage.assess({"is_relevant": True}, lk, seg, sr, q)
    print("== triage", tr["risk_level"], tr["headline"]); print(" ", "\n  ".join(tr["reasons"]))
    print("== chat")
    print(vlm.chat(img, "Classifier: genital warts 93%. Triage: moderate.", [], "Is this serious? What should I do next?"))
