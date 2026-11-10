# Hygeia Vision AI — STD visual triage application

Full-stack implementation of the pipeline described in
`STD_document/Hygeia_Vision_AI_Pipeline_Technical_Documentation_v2.md`:
a relevance gate, the DINOv2 disease-likelihood classifier (served as the
validation-selected ensemble), abnormality localisation, a medical
vision-language "second reader" (MedGemma 4B, Qwen3-VL selectable), and the
orchestrator-side triage engine, behind a FastAPI service with a React UI.

> The system is a risk-assessment / decision-support component undergoing
> clinical validation. It does **not** diagnose. Category labels are never
> shown as a diagnosis; a low-confidence "normal" is never shown as reassurance;
> a rejected image is never reported as "nothing found".

## Model combination

| Stage | Model served | Why |
|---|---|---|
| 1 · Relevance gate (terminal) | CLIP ViT-B/16 zero-shot prompt ensemble (`openai/clip-vit-base-patch16`) | The documented EfficientNetV2-S gate checkpoint is not in the repo. Drop-in: `RELEVANCE_BACKEND=effnet`. |
| 2 · Disease likelihood | **DINOv2 ViT-L/14 T11** (0.667) + **ViT-B/14 @336 T09** (0.167) + **ViT-B/14 T05** (0.167) | Weights frozen by the training repo's greedy ensemble search on validation only. Same test accuracy as T11 alone (0.9486), higher ROC-AUC (0.9920 → 0.9954), which matters because the two deployed decisions are threshold-based. `LIKELIHOOD_MODE=single` reproduces the documented single-model configuration; TTA is a per-request option. |
| 2b · Explanation | Gradient-weighted token activation map from the T11 backbone | Shows where the production model looked; also used as a prior for stage 3. |
| 3 · Abnormality localisation | **Fusion segmenter**: Qwen3-VL lesion grounding (semantic labels) + Grounding DINO (tiny) morphology prompts + classifier-attention regions → weighted box fusion → **SAM 2.1** (hiera-small) masks → second-reader review of every numbered region | The documented YOLO26L-seg weights are not in the repo. Three independent proposal sources are fused (confidence rises with agreement), SAM 2.1 gives the pixel masks, and the VLM accepts/rejects each region; rejected single-source regions are removed, multi-source ones are kept as *disputed*. Feature extraction (area ratio, bbox, centroid, perimeter, circularity, solidity, shape descriptor, cluster summary) follows doc §29–30 and is backend-independent. Drop-in: `VAIS_BACKEND=yolo`; VLM-free variant: `VAIS_BACKEND=gdino_sam`. |
| 4 · Second reader | **Qwen3-VL-4B-Instruct** (NF4 4-bit) — `VLM_BACKEND=medgemma` switches to MedGemma 4B-IT | One resident model grounds lesions, describes what is visible, cross-checks the classifier (consistent / partial / inconsistent), reviews each segmented region, lists red flags, writes the plain-language note and answers follow-up questions. It never overrides the measured classifier. MedGemma is medically tuned but cannot emit boxes; on a ≥ 8 GB GPU pair it with `VAIS_VLM_GROUNDER=Qwen/Qwen3-VL-2B-Instruct`. |
| 5 · Triage | Rules engine (doc §33) | Branches on relevance first, handles all four `escalate` × `review_required` combinations, applies the zero-miss escalation threshold (0.20) and confidence gate (0.60), folds in questionnaire signals. Every level comes with its reasons. |

All of this fits a 6 GB laptop GPU: Qwen3-VL-4B is resident in 4-bit (~3.4 GB);
the classifiers, CLIP gate and fp16 segmentation models are parked in host RAM
and hop onto the GPU per call (0.2–0.3 s each). This matters on Windows: WDDM
silently spills CUDA allocations into system RAM instead of raising OOM, and a
GPU that is "full" runs every stage about ten times slower. A GPU-serialising
lock keeps forward passes from overlapping.

Measured on an RTX 3050 6 GB laptop (per request, after warm-up):

| Stage | Time |
|---|---|
| Relevance gate | ~0.2 s |
| Likelihood ensemble + attention map | ~0.7–1.0 s |
| Localisation: VLM grounding (Qwen3-VL, ≤ 10 boxes) | ~6–20 s (skipped on confidently-normal reads) |
| Localisation: Grounding DINO + SAM 2.1 masks + fusion | ~1.5 s |
| Second reader + region review (Qwen3-VL, ~450 tokens) | ~45–60 s |
| Whole pipeline without the VLM | ~3 s |

## Layout

```
hygeia_app/
  backend/            FastAPI service (Python 3.11, torch 2.6 cu124)
    app/
      main.py         routes: /api/health /api/models /api/analyze /api/analyze/stream /api/chat /api/results/{id}
      pipeline.py     stage sequence + result store
      triage.py       risk engine
      config.py       every setting (env / .env overridable)
      models/         relevance.py likelihood.py segmentation.py vlm.py dinov2_arch.py registry.py
      model_card.json documented metrics served to the UI
    scripts/          smoke_test.py · validate_test_split.py (serving-path parity on the 720-image test set)
    tests/            test_parity.py (serving transform == training evaluation transform)
  frontend/           Vite + React + TypeScript + Tailwind
```

## Run

Backend (first time):

```powershell
cd "D:\RP project\STD\hygeia_app\backend"
.\setup.ps1          # venv + torch cu124 + requirements
.\run.ps1            # http://127.0.0.1:8000  (Swagger at /docs)
```

Models load in the background on start (~1–2 min the first time, MedGemma
quantisation included). `GET /api/health` reports per-model status.

Frontend (dev, with proxy to the API):

```powershell
cd "D:\RP project\STD\hygeia_app\frontend"
npm install
npm run dev          # http://localhost:5173
```

Production build served by the backend: `npm run build` → the API serves
`frontend/dist` at `/`.

## Verification

```powershell
cd backend
.venv\Scripts\python -m tests.test_parity              # transforms identical to training repo
.venv\Scripts\python -m scripts.validate_test_split    # re-scores the 720 held-out test images via the serving path
.venv\Scripts\python -m scripts.smoke_test [relevance|likelihood|segmentation|vlm|all]
```

Expected from `validate_test_split`: T11 accuracy 0.9486; ensemble accuracy
0.9486, macro-F1 0.9484; zero-miss threshold 0.20 → sensitivity 1.000,
specificity 0.892 (see `results/serving_path_validation.json`).

## API

`POST /api/analyze/stream` (multipart: `image`, `questionnaire` JSON,
`options` JSON) streams Server-Sent Events `{type:"stage", stage, status}` and
finishes with `{type:"result", data}` — the unified vision payload of doc §32
extended with `second_reader`, `triage`, `quality`, `timings_ms` and base64
`preview` / `attention_map` / `overlay` images. `POST /api/chat`
`{result_id, message}` continues a grounded conversation while the result is in
server memory (6 h TTL). Images are never written to disk.

## Configuration

See `backend/.env.example`. Thresholds, ensemble vs single, TTA, VLM backend
(`medgemma` / `qwen3vl` / `none`), device policies and the drop-in paths for the
trained EfficientNetV2-S gate and YOLO26L-seg weights are all environment
variables.

## Honest limitations

* The relevance gate and the fusion segmenter served here are **substitutes**
  for the documented trained models; they have no measured accuracy on this
  domain. Multi-source agreement and the second-reader review reduce false
  localisations but do not eliminate them. The classifier and its thresholds
  are the measured components.
* HSV remains the weakest class (F1 0.89); errors cluster among ulcerative
  presentations, which still route to assessment.
* The VLM can hallucinate. Its text is labelled model-generated and is advisory.
* End-to-end chained sensitivity has not been measured on a single held-out set.

## Frontend routes (2026-11-08)

The public landing site (merged from `Hygia/hygeia-landing-page-main`) and the
patient chat share one Vite build:

| Route | What |
|---|---|
| `/`, `/about`, `/services`, `/products`, `/why-it-matters`, `/contact`, `/privacy-policy`, `/terms-of-service` | Landing site. Every "Start anonymous chat" button navigates to `/check`. |
| `/check` | Patient chat: consent → in-chat photo upload (camera or gallery) → conversational questionnaire with tap-to-answer chips (any question can be skipped) → live pipeline view while analysing → result summary bubble → free-text follow-up (`/api/chat`) and a Sri Lanka government STD clinic finder. Conversation state survives reloads via `sessionStorage`; the photo itself does not. |
| `/result/:id` | Full report for a check (reached from "See the full report"). |
| `/history` | Results kept in this browser only. |
| `/models`, `/advanced` | Clinician pages: model card / runtime status, and the original form with analysis settings (ensemble, TTA, segmentation, second reader toggles). |

Analysis settings are not shown to patients; `/check` always runs the ensemble
with segmentation and the second reader on, TTA off.

### Beyond the six classes, and the "no sexual contact" case (2026-11-08)

* The second reader is told explicitly that the classifier only knows six
  categories and is asked for `outside_trained_categories`, `best_match` and a
  `transmission_note`, with non-STI and normal-variant look-alikes allowed in
  `alternative_considerations`.
* `triage.assess` now returns `scope` (`outside_trained_categories`,
  `best_match`, `differential`) and `notes`. Scope is flagged when the second
  reader says so, or when the classifier is under the confidence gate and the
  second reader disagrees / the ensemble members disagree. The differential
  merges the second reader's alternatives with rule-based look-alikes keyed by
  category and reported symptoms (folliculitis, dermatitis, balanitis, molluscum,
  pearly penile papules, friction sores, ...).
* `exposure == "none"` never lowers the level (zero-miss policy) but adds a
  reason, a plain-language note (skin-to-skin transmission, delayed symptoms,
  non-STI look-alikes), an action for the clinician and a non-STI test
  suggestion. Per-category transmission facts are attached when escalated.
* The chat, the result bubble and the full-report triage card show the scope
  badge, "Other things a clinician would consider" and "Good to know".
* Clinic finder is worldwide: the chat asks for a city or uses the device
  location and opens a Google Maps search for sexual health clinics.

### Photo gate on attach, and the "nothing visible" path (2026-11-08)

* `POST /api/precheck` runs intake + the relevance gate only (~0.3 s). The chat
  calls it the moment a photo is attached and bounces non-skin images before the
  questionnaire. The CLIP gate now scores two questions from one embedding:
  P(skin content) and P(real photograph vs graphic/screenshot); `p_relevant` is
  their product, so brand graphics and UI screenshots that depict skin are
  rejected.
* The chat asks "is there something you can see?" before asking for a photo.
  "No" (or "Go by symptoms instead" on the photo step) takes the symptoms-only
  path: felt-symptom chips, the same remaining questions, then `POST /api/triage`
  (`pipeline.run_symptoms` -> `triage.assess_symptoms`), which returns a result
  with `status: "symptoms_only"`, no image stages, window-period and PEP
  guidance for exposures, and a non-STI differential. The result is stored like
  any other so `/api/chat` works on it (the VLM is called without an image).

### Two-tier relevance gate (2026-11-08, evening)

`RELEVANCE_BACKEND=clip+vlm` (new default). CLIP scores every image in ~0.3 s;
anything it does not confidently reject (`p_clip >= RELEVANCE_CLIP_SKIP_BELOW`,
default 0.10) is shown to the resident Qwen3-VL with a strict yes/no prompt
(`vlm.gate`, 448 px, 48 tokens, ~2.5 s). The VLM verdict is authoritative:
`p_relevant = 0.9 + 0.1*p_clip` on yes, `0.1*p_clip` on no. The gate returns
`seen` (the VLM's three-to-six-word description), which the chat quotes when it
asks for a retake ("it looks like an illustrated male torso, not a close-up of
skin I can read"). `RELEVANCE_BACKEND=clip` restores the CLIP-only gate;
`vlm` makes the VLM decide every image.

**Update:** the default is now `RELEVANCE_BACKEND=vlm`: the resident Qwen3-VL is the
only skin/relevance gate and CLIP is not loaded at all (it remains available with
`RELEVANCE_BACKEND=clip` or `clip+vlm`, and is the automatic fallback when
`VLM_BACKEND=none`). The gate call is `vlm.gate()`: 448 px image, strict yes/no
JSON with a short description of what it saw, about 2.5 s on the 6 GB GPU.

**Flow order (final):** consent -> eight questions -> if a visible symptom
(bump, sore, blister, rash) was reported, the photo is requested last and the
analysis starts immediately after the gate accepts it; otherwise the chat asks
"is there something you can see?" and either requests the photo or runs the
symptoms-only triage straight away.

### Second-reader verification of the localisation (2026-11-08, late)

The second reader now judges the overlay as a whole and can fix it:

* Extra fields in the second read: `outlines_verdict` (good / partly / wrong, when
  numbered outlines were shown) and `missed_lesions` (0-1000 relative boxes for
  visible lesions no outline covers; all visible lesions when there are none).
* `segmentation.correct_with_vlm`: missed boxes become SAM 2.1 masks and are added as
  instances with source `vlm_review` (deduplicated against existing masks). A
  `wrong` verdict with replacements drops the old outlines; `wrong` without any
  replacement sets `localisation_reliable: false`, the overlay is removed, the chat
  hides the markup and `triage.assess` ignores the segmentation evidence.
* Heatmap fallback: on an escalated read with no reliable outlines, the reader's
  boxes (or a fresh grounding pass) are rendered as a soft Gaussian heat map
  (`abnormalities.heatmap`, `heatmap_source: "second_reader"`). The chat shows it with
  an "orientation aid, not a measurement" caption; the full report has a "Reader heat
  map" view. The classifier attention map remains available in the likelihood card.

### Crop step and VLM refusal handling (2026-11-08, final)

* **Crop before upload.** Picking a photo opens a full-screen crop sheet
  (`frontend/src/components/chat/CropSheet.tsx`): drag to move, pull corners to
  resize, "Use this area" or "Use the whole photo". The crop is cut client-side
  (EXIF orientation respected, max side 2048, JPEG 0.92) and only that file goes
  through the gate and the pipeline, so faces and surroundings never leave the device.
* **No blocking of genital photos.** Every VLM prompt (gate, grounding, second
  reader, chat) is prefixed with `CLINICAL_CONTEXT`: the image is a consented
  clinical photograph submitted to a medical triage tool, clinical description is
  required, never refuse or add warnings. `vlm.looks_like_refusal()` detects a
  refusal-shaped reply; the second read and the gate retry once with the framing
  repeated. If the reader still refuses, `second_reader.refused = true`, the triage
  says so and proceeds on the measured classifier; a refusing gate accepts the photo
  by default rather than blocking the person. Verified on one image per class:
  no refusals from Qwen3-VL-4B.
