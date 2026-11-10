#!/usr/bin/env python
"""Download the open-source models Hygeia uses into ./models/hf_cache/hub.

Run once after setup (setup.ps1 / setup.sh call it for you). Safe to re-run: files that are
already present are skipped, interrupted downloads resume.

    python download_models.py            # the three models the default configuration needs (~9.8 GB)
    python download_models.py --check    # only report what is present / missing
    python download_models.py --with-clip        # also CLIP (only for RELEVANCE_BACKEND=clip or clip+vlm)
    python download_models.py --with-medgemma    # also MedGemma (gated: accept the licence on huggingface.co
                                                 #   and run `huggingface-cli login` first)

The trained DINOv2 classifier checkpoints are NOT downloaded here: they are the project's own
models and ship in ./models/checkpoints.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HUB = ROOT / "models" / "hf_cache" / "hub"

# repo id -> (approx download size in GB, allow patterns, what it is used for)
REQUIRED = {
    "Qwen/Qwen3-VL-4B-Instruct": (8.9, ["*.json", "*.safetensors", "merges.txt", "vocab.json", "tokenizer*", "chat_template*"],
                                  "second reader, skin/relevance gate, lesion grounding, follow-up chat"),
    "IDEA-Research/grounding-dino-tiny": (0.7, ["*.json", "*.safetensors", "*.txt"], "open-vocabulary lesion detector"),
    "facebook/sam2.1-hiera-small": (0.2, ["*.json", "*.safetensors"], "pixel masks for the outlined regions"),
}
OPTIONAL = {
    "openai/clip-vit-base-patch16": (0.6, ["*.json", "*.safetensors", "*.txt"], "CLIP gate (RELEVANCE_BACKEND=clip or clip+vlm)"),
    "google/medgemma-4b-it": (8.6, ["*.json", "*.safetensors", "tokenizer*", "*.model"], "alternative second reader (VLM_BACKEND=medgemma, gated)"),
}


def snapshot_dir(repo_id: str) -> Path | None:
    d = HUB / ("models--" + repo_id.replace("/", "--")) / "snapshots"
    if not d.is_dir():
        return None
    snaps = [p for p in d.iterdir() if p.is_dir()]
    return snaps[0] if snaps else None


def present(repo_id: str) -> bool:
    s = snapshot_dir(repo_id)
    return bool(s) and any(p.suffix == ".safetensors" for p in s.rglob("*"))


def human(nbytes: float) -> str:
    return f"{nbytes / 1e9:.1f} GB" if nbytes >= 1e9 else f"{nbytes / 1e6:.0f} MB"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report only, download nothing")
    ap.add_argument("--with-clip", action="store_true")
    ap.add_argument("--with-medgemma", action="store_true")
    args = ap.parse_args()

    wanted = dict(REQUIRED)
    if args.with_clip:
        wanted["openai/clip-vit-base-patch16"] = OPTIONAL["openai/clip-vit-base-patch16"]
    if args.with_medgemma:
        wanted["google/medgemma-4b-it"] = OPTIONAL["google/medgemma-4b-it"]

    HUB.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "0")
    print(f"Model cache: {HUB}")
    missing = [r for r in wanted if not present(r)]
    for r, (gb, _, why) in wanted.items():
        print(f"  {'ready  ' if r not in missing else 'missing'}  {r:40s} ~{gb:>4} GB  {why}")
    if args.check or not missing:
        print("All required models are present." if not missing else f"{len(missing)} model(s) missing.")
        return 0 if not missing else 1

    total = sum(wanted[r][0] for r in missing)
    print(f"\nDownloading {len(missing)} model(s), about {total:.1f} GB. This needs a stable connection; "
          "re-run this script if it is interrupted, it resumes where it stopped.\n")
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is not installed. Run setup first (it installs backend/requirements.txt).")
        return 2

    for repo_id in missing:
        gb, allow, _ = wanted[repo_id]
        t0 = time.time()
        print(f"--> {repo_id} (~{gb} GB)")
        try:
            path = snapshot_download(repo_id, cache_dir=str(HUB), allow_patterns=allow, max_workers=4)
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            if "gated" in msg.lower() or "401" in msg or "403" in msg:
                print(f"    {repo_id} is gated. Accept its licence on https://huggingface.co/{repo_id} and run "
                      "`huggingface-cli login`, then re-run this script.")
            else:
                print(f"    failed: {msg[:300]}")
            return 1
        size = sum(p.stat().st_size for p in Path(path).rglob("*") if p.is_file() or p.is_symlink())
        print(f"    done in {time.time() - t0:.0f}s -> {path} ({human(size)})")
    print("\nAll models downloaded. Start the app with run.ps1 (Windows) or ./run.sh (Linux).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
