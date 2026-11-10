# Model-free walkthrough

`simulate.py` produces the figures used in the top-level [`README.md`](../../README.md) without
loading any model, so it runs on any machine in a few seconds.

```bash
python docs/simulation/simulate.py path/to/photo.jpg --name case01
```

Requirements: `numpy`, `opencv-python`, `pillow`, `matplotlib`. Output goes to `docs/simulation/out/`.

## What is real and what is simulated

| Part | Source | Status |
|---|---|---|
| Triage level, headline, reasons, actions, tests, notes | `backend/app/triage.py`, imported and run unchanged | **Real** |
| Symptoms-only result card | `triage.assess_symptoms` (this path uses no model) | **Real** |
| Thresholds (0.20 escalation, 0.60 confidence) | `backend/app/config.py` | **Real** |
| Likelihood distribution | `sim_inputs.json`, hand-written | Simulated |
| Second-reader fields and note | `sim_inputs.json`, hand-written | Simulated |
| Outlined region and heat map | classical colour segmentation in `simulate.py` | Simulated stand-in for the fusion segmenter |

The figures show how a result is assembled and presented. They are not a recorded run of the
models and must not be quoted as evidence of model accuracy. For real outputs, run the app
(`README_SETUP.md`) and use the result card and `/result/:id`.

## Adding another case

1. Add a block to `sim_inputs.json` next to `case01` (questionnaire, likelihood distribution,
   second-reader fields, region labels).
2. Run `simulate.py <photo> --name <case>`.
3. Reference `out/<case>_*.png` from the README.

## Photos

Only use photographs you have the right to publish, with consent for this use and no
identifying features. The app itself never stores photos; anything committed here is stored
permanently in git history.
