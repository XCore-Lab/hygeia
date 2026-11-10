"""End-to-end API test against a running server.

Run from backend/:  .venv/Scripts/python -m scripts.e2e_test [http://127.0.0.1:8000]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import config  # noqa: E402


def wait_ready(timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            h = requests.get(f"{BASE}/api/health", timeout=5).json()
            st = {k: v["status"] for k, v in h["models"].items()}
            if all(s in ("ready", "error") for s in st.values()):
                print("models:", st); print("gpu:", h["gpu"])
                return h
            print("  waiting for models:", {k: v for k, v in st.items() if v != "ready"})
        except Exception as e:  # noqa: BLE001
            print("  server not up yet:", e)
        time.sleep(5)
    raise SystemExit("server never became ready")


def stream(path: Path, q: dict, opts: dict):
    t0 = time.time()
    with requests.post(f"{BASE}/api/analyze/stream", files={"image": (path.name, path.read_bytes(), "image/jpeg")},
                       data={"questionnaire": json.dumps(q), "options": json.dumps(opts)}, stream=True, timeout=900) as r:
        r.raise_for_status()
        result = None
        for line in r.iter_lines():
            if not line or not line.startswith(b"data: "):
                continue
            ev = json.loads(line[6:])
            if ev["type"] == "stage":
                print(f"  [{time.time() - t0:5.1f}s] {ev['stage']:14s} {ev['status']}")
            elif ev["type"] == "result":
                result = ev["data"]
            elif ev["type"] == "error":
                raise SystemExit("server error: " + ev["message"])
    return result


def main():
    wait_ready()
    test = config.TRAIN_ROOT / "STD_new_dataset" / "test"
    q = {"age": 29, "sex_at_birth": "male", "symptoms": ["bumps", "itching"], "duration": "1-4w", "pain": False,
         "itching": True, "changed": True, "fever": False, "exposure": "unprotected", "partner_sti": False,
         "prior_sti": False, "notes": "small bumps appeared about two weeks ago"}

    print("\n== State B: abnormal skin image, full pipeline")
    img = sorted((test / "Genital_warts").iterdir())[3]
    res = stream(img, q, {"likelihood_mode": "ensemble", "tta": False, "segmentation": True, "vlm": True})
    lk, tr, sr, ab = res["likelihood"], res["triage"], res["second_reader"], res["abnormalities"]
    print(f"  status={res['status']} category={lk['category']} conf={lk['confidence']} abn={lk['abnormality_score']} "
          f"esc={lk['escalate']} review={lk['review_required']}")
    print(f"  segmentation: n={ab['instance_count']} source={ab.get('source')} overlay={'yes' if ab['overlay'] else 'no'}")
    print(f"  second reader: parsed={sr.get('parsed')} consistency={sr.get('consistency')} latency={sr.get('latency_ms')}ms")
    print(f"  triage: {tr['risk_level']} - {tr['headline']}")
    print(f"  timings: {res['timings_ms']}")
    assert res["status"] == "analysed" and lk["attention_map"] and res["preview"]

    print("\n== chat")
    c = requests.post(f"{BASE}/api/chat", json={"result_id": res["result_id"], "message": "Is this serious and what happens at the clinic?"}, timeout=600)
    c.raise_for_status(); print("  reply:", c.json()["reply"][:400])

    print("\n== State A: non-skin image (relevance gate must stop the pipeline)")
    non_skin = ROOT / "STD_document" / "fig_architecture.png"
    res2 = stream(non_skin, {"symptoms": ["none"]}, {"vlm": False, "segmentation": False})
    print(f"  {non_skin.name}: status={res2['status']} relevant={res2['relevance']['is_relevant']} p={res2['relevance']['p_relevant']} "
          f"triage={res2['triage']['risk_level']} '{res2['triage']['headline']}'")
    assert res2["status"] == "not_analysable" and res2["likelihood"] is None
    for p in (ROOT / "Hygia" / "hygeia-landing-page-main").glob("*.png"):
        r_ill = stream(p, {}, {"vlm": False, "segmentation": False})
        print(f"  (informational) illustration {p.name[:40]!r}: relevant={r_ill['relevance']['is_relevant']} p={r_ill['relevance']['p_relevant']}")

    print("\n== Normal image, single model + TTA, no VLM")
    img = sorted((test / "Normal").iterdir())[2]
    res3 = stream(img, {"symptoms": ["none"], "exposure": "protected"}, {"likelihood_mode": "single", "tta": True, "segmentation": True, "vlm": False})
    lk3 = res3["likelihood"]
    print(f"  category={lk3['category']} conf={lk3['confidence']} abn={lk3['abnormality_score']} mode={lk3['mode']} tta={lk3['tta']} "
          f"triage={res3['triage']['risk_level']} seg_n={res3['abnormalities']['instance_count']}")
    print("  reasons:", " | ".join(res3["triage"]["reasons"]))
    print(f"  timings: {res3['timings_ms']}")

    print("\n== stored result + model card")
    g = requests.get(f"{BASE}/api/results/{res['result_id']}", timeout=30); g.raise_for_status()
    m = requests.get(f"{BASE}/api/models", timeout=30).json()
    print("  components:", [c["id"] for c in m["card"]["components"]])
    print("\nALL E2E CHECKS PASSED")


if __name__ == "__main__":
    main()
