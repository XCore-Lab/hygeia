# HYGEIA VISION AI PIPELINE
HYGEIA VISION AI PIPELINE
Consolidated Production Technical Documentation
Three-Component Computer-Vision Architecture
Version 2.0  |  22 August 2026  |  In-house production documentation

| Document status | FINAL — CONSOLIDATED PRODUCTION RELEASE |
| System | Hygeia Vision AI Pipeline — image intake, relevance gating, disease-likelihood classification, abnormality segmentation and triage integration |
| Supersedes | *Hygeia Vision Pipeline* (three-component overview) and *Disease-Likelihood Vision Classification Model* (v1.0, 22 August 2026). Both are consolidated here in full. |
| Architecture | 3 coordinated vision components executed in sequence |
| Primary output | Single unified structured vision-analysis payload |
| Consumer | Hygeia Orchestrator Agent / risk-assessment engine |
| Clinical status | **Undergoing clinical trial and clinical validation.** Engineering performance is validated; clinical validity is not yet established. See Section 2. |
| Intended use | Risk assessment, visual-feature analysis and clinical decision support — **not** autonomous medical diagnosis |


> **Purpose of this document**
>
> This is the authoritative in-house technical specification for the Hygeia Vision AI Pipeline as implemented and deployed. It consolidates two previously separate documents into one start-to-end record covering the complete workflow from image input to unified structured output, the three trained models that make up the pipeline, their datasets, training methodology, measured engineering results, inference contracts, integration logic, operational requirements, limitations and safety boundaries. Nothing from either source document has been omitted; where the two sources overlapped, differed or left gaps, the reconciliation is documented explicitly in Section 45.



> **Engineering performance is not clinical validity**
>
> Every accuracy, sensitivity, precision and mAP figure in this document is an ENGINEERING MEASUREMENT obtained on curated, retrospectively collected, held-out image datasets under controlled evaluation protocols. These figures describe how the trained models behave on those datasets. They are NOT clinical performance claims, they are not derived from prospective patient outcomes, and they must not be presented to users, clinicians, partners or regulators as evidence of diagnostic accuracy. The clinical validity of the overall Hygeia system is the subject of an ongoing clinical trial and clinical validation programme. Until that programme reports, all outputs of this pipeline are decision-support signals only.



---

# PART I — System Overview

*Scope, clinical positioning, architecture, data flow and component inventory*


# 1. Introduction and Scope

## 1.1 What this system is

The Hygeia Vision AI Pipeline is the computer-vision subsystem of the Hygeia sexual-health triage platform. It accepts a user-submitted image and returns a single structured, machine-readable description of what is visible in that image: whether the image is analysable at all, what visual likelihood patterns it exhibits across the trained clinical categories, and where — at pixel and instance level — any visible abnormalities are located, together with their size, shape and morphology.

That structured description is handed to the Hygeia Orchestrator Agent, which combines it with questionnaire responses, sexual-health history and other non-visual signals to reach a triage decision. The vision pipeline never reaches that decision itself and never communicates directly with the user.

## 1.2 The three components

The pipeline is composed of three independently trained models executed in a fixed sequence. Each has a distinct responsibility, a distinct failure mode and its own evaluation record.

| # | Component | Responsibility | Primary output | Documented in |
|---|---|---|---|---|
| 1 | **Skin Relevance Classification Model** | Entry gate. Determines whether the uploaded image contains relevant human skin / anatomical visual content, and filters out unrelated objects, scenery, animals, screenshots and other non-relevant content before any downstream inference runs. | Relevance class, confidence score, gate decision | Part II |
| 2 | **Disease-Likelihood Vision Classification Model** | Global image-level analysis. Estimates visual likelihood patterns associated with the six trained clinical categories, emits a full probability distribution, an abnormality score and a confidence-gated review decision. | Ranked class likelihoods, abnormality score, confidence gate outcome | Part III |
| 3 | **Visual Abnormality Instance Segmentation Model (VAIS)** | Local analysis. Detects, localises and segments individual visible abnormalities — lesions, bumps, lumps, ulcers, sores, wart-like growths, skin tags, redness and ulcerated regions — at pixel and instance level, and derives quantitative geometry and morphology features. | Instance masks, instance count, per-instance location, area, shape and confidence | Part IV |

The three are complementary rather than redundant. Component 1 protects the pipeline from inputs it was never trained to interpret. Component 2 provides GLOBAL evidence — what the image as a whole resembles. Component 3 provides LOCAL evidence — how many discrete abnormalities are present, where they are, how large they are and what shape they take. A triage decision built on both global and local evidence is materially better grounded than one built on either alone.

## 1.3 Scope of this document

| In scope | Out of scope |
|---|---|
| Image intake, validation, relevance gating and preprocessing | User authentication, session and account management |
| All three vision models: datasets, architecture, training, evaluation | Questionnaire and history-based risk scoring logic |
| Confidence gating, escalation thresholds and human-review routing | Clinician review tooling and clinical workflow design |
| Instance segmentation, mask post-processing and visual-feature extraction | Notification, messaging and user-facing reporting layers |
| Unified vision output contract and orchestrator integration | Regulatory certification submissions and clinical trial protocol design |
| Model serving, monitoring, retraining governance and security posture | Non-vision platform infrastructure |
| Evaluation methodology, measured engineering performance and limitations | Clinical validation results (pending — see Section 2) |

## 1.4 Design principles

The pipeline was built against five standing principles. Each one is traceable to a specific control documented later in this text.

**Evidence over assumption.** Every architectural and training decision recorded here is supported by a controlled measurement rather than by convention or expectation. Section 18 sets out the four controlled findings that produced the deployed classification model, and Section 17.1 documents the single-variable comparison structure of the experimental programme.

**Assistive, not diagnostic.** The pipeline characterises visible findings and quantifies its own uncertainty. It does not issue clinical diagnoses. Section 2 sets out this boundary in full and Section 43 records the safety properties that support it.

**Uncertainty is surfaced, never hidden.** Cases the models cannot decide confidently are routed to human review rather than resolved by a low-confidence automated answer. Section 22 derives the deployed confidence gate from measured data rather than assigning it by convention.

**Measurement integrity is a system property.** Fixed disjoint splits, single-exposure test evaluation and validation-only model selection are enforced by the pipeline's own tooling, not left to discipline. Section 41 documents the evaluation safeguards.

**Engineering claims and clinical claims are kept separate.** Model performance is reported as model performance. Clinical validity is reported as pending. The two are never merged into a single headline. Section 2 governs this.

# 2. Clinical Positioning, Trial Status and Intended Use

This section takes precedence over every performance figure in this document. Where any other section could be read as making a clinical claim, this section governs.


> **This pipeline is not a diagnostic system**
>
> It does not determine that a user has a sexually transmitted infection, cancer, or any other disease from a submitted image. No output of this pipeline is presented to a user as a clinical diagnosis, and no output is sufficient on its own to direct clinical care.


## 2.1 Why diagnostic category labels were used in training

The Disease-Likelihood model was trained against six named clinical categories — Normal, genital warts, HSV, syphilis, penile candidiasis and penile cancer. Those names were used during development for a specific engineering reason: supervising the network with clinically meaningful categories forces it to learn the visual patterns that actually distinguish these presentations — vesicular clustering, papillomatous surface texture, indurated ulcer margins, satellite lesions, abnormal pigmentation — rather than incidental image properties.

The category names are therefore TRAINING SUPERVISION TARGETS, not production diagnoses. In production the pipeline's function is to identify and characterise visible features: lesions, bumps, warts, redness, abnormal pigmentation, ulceration, swelling, surface irregularity and other suspicious visual changes. These extracted visual indicators are supplied as supporting evidence to the wider risk-assessment and triage pipeline, which determines whether a submission appears normal, requires further assessment, or may represent a potentially serious condition warranting review by a qualified healthcare professional.

The pipeline therefore functions as a visual-feature and risk-identification component rather than an autonomous diagnostic classifier. This design supports safer triage and referral, and avoids presenting an AI-generated category as a confirmed clinical finding.

## 2.2 What the pipeline actually asserts

| The pipeline does assert | The pipeline does not assert |
|---|---|
| "This image is / is not analysable skin content." | "This user has genital warts." |
| "The visual pattern in this image most resembles the *genital warts* training category, with probability 0.93." | "This user does not have an STI." |
| "The summed likelihood of any abnormal category is 0.996." | "This lesion is benign / malignant." |
| "Four discrete abnormality instances are segmented, occupying 1.8% of the analysed region, irregular in shape." | "No further testing is required." |
| "Model confidence is below the deployed gate; route this case to human review." | "This result is a diagnosis." |

## 2.3 Clinical trial and validation status


> **Clinical validation is in progress and is not yet complete**
>
> The overall Hygeia system, including this vision pipeline as one of its inputs, is currently UNDERGOING CLINICAL TRIAL AND CLINICAL VALIDATION. The engineering results in Parts II, III and IV were obtained on retrospectively collected, curated image datasets under controlled offline evaluation. They establish that the trained models generalise to held-out images from the same collection process. They do NOT establish clinical sensitivity, clinical specificity, positive or negative predictive value in a real patient population; performance across the full diversity of skin tones, anatomical sites, camera hardware, lighting conditions and disease stages encountered in practice; or non-inferiority against any standard of care. Those questions are precisely what the clinical trial exists to answer.


The distinction the organisation must hold consistently:

| Dimension | Engineering performance (established) | Clinical validity (pending) |
|---|---|---|
| Population | Curated retrospective image corpus, held-out split | Prospective enrolled trial population |
| Ground truth | Dataset labels as collected and annotated | Clinician assessment, laboratory and serological confirmation, follow-up |
| Question answered | Does the model generalise to unseen images from this distribution? | Does the system improve triage outcomes safely in real use? |
| Status | VALIDATED — see Sections 19, 20, 28, 41 | IN PROGRESS — results not yet available |
| Permitted use of the figures | Internal engineering governance, model selection, regression detection, release gating | None. These figures must not appear in clinical, marketing or regulatory claims. |

## 2.4 Required conditions of use

1. Vision output is consumed only by the Orchestrator Agent, never surfaced raw to a user.
2. No user-facing text derived from this pipeline may use diagnostic phrasing.
3. Every case falling below the confidence gate is routed to human review, not resolved automatically.
4. A qualified healthcare professional remains in the loop for every escalated case.
5. All figures in this document are labelled as engineering measurements wherever they are reproduced.

# 3. System Architecture

## 3.1 End-to-end processing flow

The pipeline is a nine-stage sequence. Stages 1 to 8 are owned by the vision subsystem; stage 9 is the integration boundary with the wider platform.

| # | Stage | Component | Operation | Output |
|---|---|---|---|---|
| 1 | Intake | Platform | Image retrieved from object storage; format, decodability and integrity validation; conversion to RGB | Validated RGB image |
| 2 | Relevance preprocessing | Component 1 | Resize and normalise to the EfficientNetV2-S input contract | Normalised tensor |
| 3 | RELEVANCE GATE | Component 1 | Binary classification: relevant skin content vs non-relevant. TERMINAL DECISION POINT — a failing image stops here and the vision path returns early. | Relevance class, confidence, gate decision |
| 4 | Classification preprocessing | Component 2 | Resize shorter side to 256, centre crop 224, ImageNet normalisation, channels-last NCHW tensor | Normalised tensor |
| 5 | Likelihood inference | Component 2 | DINOv2 ViT-L/14 forward pass under fp16 autocast | Softmax distribution over six categories |
| 6 | Confidence gate and abnormality scoring | Component 2 | Maximum softmax probability compared against the deployed confidence threshold; abnormality score computed as 1 − P(Normal) and compared against the escalation threshold | Auto-process / escalate / review-required decisions |
| 7 | Instance segmentation | Component 3 | YOLO26L-seg instance segmentation with per-instance confidence filtering | Per-instance masks, boxes, class labels, confidences |
| 8 | Feature extraction and payload assembly | Vision subsystem | Mask post-processing, geometry and morphology extraction; merging of all three components' outputs into one structured object; model versions attached | Unified vision-analysis payload |
| 9 | Triage integration | Orchestrator | Findings combined with questionnaire and history signals by the risk-assessment engine | Triage decision and routing |

Stages 4–6 and stage 7 are logically independent given a relevance-accepted image and may be executed concurrently; payload assembly at stage 8 is the join point.


*[Figure A1 — Hygeia Vision AI Pipeline architecture. The relevance gate is a terminal decision point: a rejected image returns a State A payload and never reaches the two analysis models. Components 2 and 3 run concurrently on accepted images and their outputs are merged into a single payload for the Orchestrator Agent.]*


## 3.2 Why the relevance gate is first

Placing the relevance classifier ahead of the other two components serves three purposes simultaneously.

**Correctness.** The Disease-Likelihood model is a closed-set six-way classifier. Presented with a photograph of a building, it will still emit a normalised probability distribution over six clinical categories, because softmax cannot express "none of these". The relevance gate is the only component in the pipeline that can express that. Without it, out-of-distribution inputs produce confident nonsense.

**Cost.** Component 2 is a 304.4M-parameter vision transformer and Component 3 is a large segmentation network. The relevance classifier is a comparatively small EfficientNetV2-S. Rejecting irrelevant inputs at the cheapest stage avoids spending the expensive stages on them.

**Safety.** An irrelevant image that reaches the classifier could produce an abnormality score and an escalation, injecting noise into the triage layer. The gate prevents that class of fault entirely.

## 3.3 The two decisions the pipeline informs

The pipeline supports two operationally distinct decisions, which are evaluated separately throughout this document because they carry very different consequences.

| Decision | Question | Measured engineering performance | Consequence of error |
|---|---|---|---|
| PRIMARY — binary | Is this submission abnormal and therefore in need of assessment? | 99.31% accuracy, 0.9950 sensitivity (Section 20) | A missed abnormal case is not escalated — the failure mode with genuine clinical weight |
| SECONDARY — categorical | What kind of abnormality is visible, and where? | 94.86% six-way accuracy (Section 19); 0.920 mAP50 instance segmentation (Section 28) | A confusion between two abnormal categories still routes to assessment; triage outcome unchanged |

This separation is the reason binary triage performance is reported as a first-class result rather than being folded into the six-way figure. The binary decision governs whether a case is escalated at all; the categorical decision only characterises what was escalated.

## 3.4 The six trained categories

| Category | Visual characteristics the model learns |
|---|---|
| Normal | Healthy skin presentation; absence of lesion, ulceration or abnormal pigmentation |
| Genital warts | Papillomatous, cauliflower-like or filiform growths; clustered papules |
| HSV (herpes simplex) | Vesicular clusters, shallow ulceration, erythematous base |
| Syphilis | Chancre-type ulceration, indurated margins, secondary-stage rash patterns |
| Penile candidiasis | Erythema, satellite lesions, surface scaling and maceration |
| Penile cancer | Indurated or exophytic mass, irregular ulceration, abnormal pigmentation |


> **Class-name spelling in artefacts**
>
> The stored class ordering inside the production checkpoint uses the literal strings ["Genital_warts", "HSV", "Normal", "Penile_cancer", "Penile_candidiasis", "Syphillis"]. Note that "Syphillis" is misspelled in the artefact. This spelling is load-bearing — it is the key used in the serving layer's label mapping and in every stored metrics file — and must NOT be corrected without a coordinated migration of the checkpoint, the evaluation artefacts and the API contract. User-facing text must map it to the correct spelling "Syphilis". See Section 45, item R-1.


## 3.5 Unified output philosophy

The final output of the vision pipeline is deliberately NOT a single class label. It is a structured combination of three things: relevance information, image-level likelihood evidence, and localised abnormality features. This combined representation gives the Orchestrator Agent both global and local visual evidence, together with explicit uncertainty signals, so that application-level triage logic can reason over the full picture rather than over one argmax. Section 32 specifies the contract in full.

# 4. Component Inventory

The training and evaluation stack is organised into the following functional modules.

| Module | Responsibility |
|---|---|
| Dataset layer | Split loading, class mapping and split assignment |
| Augmentation | Training transforms, test-time augmentation views and batch mixing |
| Model registry | DINOv2, ViT and Swin classifier constructors |
| Training engine | Staged fine-tuning, layer-wise learning-rate decay, mixed precision, checkpoint restoration |
| Metrics | Classification metrics, ROC and precision-recall computation |
| Evaluation | Inference, test-time augmentation, metric and plot emission |
| Checkpoint evaluation | Standalone scoring of a stored checkpoint |
| Ensembling | Greedy member and weight selection on validation data |
| Serving layer | Prediction endpoint — legacy implementation, migration required, see Section 37 |
| Documentation build | Regenerates this document from stored metrics |

The retained evaluation artefacts produced by these modules are listed in Section 47.

---

# PART II — Component 1 — Skin Relevance Classification Model

*Entry gate, input validation and relevance filtering*


# 5. Objective and Role in the Pipeline

The Skin Relevance Classification Model is the entry gate of the Hygeia Vision AI Pipeline. Its purpose is to determine whether an uploaded image contains sufficiently relevant human skin / anatomical visual content for further analysis. Images containing unrelated objects, scenery, animals, screenshots, documents, or other non-relevant content are filtered out before any downstream inference runs.

It is the only component in the pipeline capable of expressing "this input is outside the domain". Both downstream models are closed-set: the Disease-Likelihood classifier must distribute probability across six clinical categories no matter what it is shown, and the segmentation model will attempt to find abnormality instances in any image. Neither can decline. The relevance gate is therefore not an optimisation — it is a correctness requirement.

## 5.1 Responsibilities

1. Validate that the submitted image is analysable skin content.
2. Emit a calibrated confidence for that determination.
3. Return a hard gate decision that short-circuits the pipeline on failure.
4. Provide the signal that drives a user-facing "please retake the photograph" prompt, so that a rejected image results in a retry rather than in silence.

# 6. Dataset

| Property | Value |
|---|---|
| Relevant skin images | 5,329 |
| Non-skin images | 5,499 |
| Total images | 10,828 |
| Class balance | 49.2% skin / 50.8% non-skin — effectively balanced by construction |
| Relevant image coverage | Normal skin and a broad variety of visible skin appearances, inflammatory changes, injuries and condition-related visual patterns |
| Non-skin coverage | Buildings, landscapes, animals, household items, random objects and other visually diverse non-skin content |

The relevant class was deliberately drawn to include both healthy skin and the full range of condition-related appearances present in the wider vision dataset. This matters: a gate trained only on healthy skin would learn "smooth uniform skin texture" as the positive concept and would then reject exactly the abnormal presentations the pipeline exists to analyse. Covering inflammatory changes, injuries and disease-related patterns in the positive class prevents that failure mode by construction.

The negative class was drawn for visual diversity rather than for adversarial difficulty. It represents the realistic space of accidental and mistaken uploads — a photograph of a room, a pet, a screenshot — rather than deliberately deceptive near-skin content.

# 7. Model Architecture

The production relevance classifier uses **EfficientNetV2-S** as the visual backbone. The model is configured as a binary classifier to provide a fast and accurate first-stage gating decision while maintaining a practical inference footprint for production deployment.

| Property | Specification |
|---|---|
| Backbone | EfficientNetV2-S |
| Task | Binary classification: Relevant Skin / Non-Relevant |
| Input | RGB image resized to the configured inference resolution |
| Classification head | Global pooling + dropout + fully connected output |
| Training approach | Transfer learning followed by controlled fine-tuning |
| Output | Class label, probability / confidence, and gate decision |

EfficientNetV2-S was selected for the gate rather than a larger backbone because the task is comparatively easy — separating skin from non-skin is a coarse texture-and-colour discrimination, not a fine-grained clinical distinction — while the latency and memory cost of the gate is paid on **every** submission, including the ones that will be rejected. Spending a large transformer on this stage would invert the cost structure the gate exists to protect.

# 8. Preprocessing and Augmentation

Deterministic preprocessing follows the backbone's input requirements: resizing and normalisation according to the EfficientNetV2-S contract.

Training-time augmentation was chosen to simulate realistic capture variation without distorting the visual properties that carry clinical meaning:

- Image resizing and normalisation according to the backbone input requirements.
- Moderate rotation and translation for positional variation.
- Random zoom and scale adjustment.
- Brightness and contrast variation to simulate different capture conditions.
- Horizontal flipping where appropriate.
- Quality-preserving augmentation that avoids excessive distortion of clinically relevant visual appearance.

The last point is a standing constraint across all three components of this pipeline. Augmentations that are routine in general computer vision — heavy colour shifts, aggressive elastic deformation, strong noise injection — can destroy or fabricate the exact signals (erythema hue, lesion margin sharpness, surface texture) that the downstream models depend on. Augmentation strength is bounded accordingly.

# 9. Training Configuration

| Setting | Value |
|---|---|
| Optimiser | AdamW / Adam |
| Loss | Binary cross-entropy |
| Regularisation | Dropout, augmentation, checkpointing and early stopping |
| Primary metrics | Accuracy, precision, recall, F1-score and ROC-AUC |
| Hardware profile | GPU-accelerated training environment |

# 10. Evaluation Results

The relevance model achieved strong separation between skin and non-skin images on the held-out evaluation set. The test set contained **571 images: 290 non-skin and 281 skin**.

| Measure | Result |
|---|---|
| Non-skin correctly classified | 290 / 290 |
| Skin correctly classified | 278 / 281 |
| Overall correct predictions | 568 / 571 |
| Overall accuracy | 99.5% |
| Class-level performance | Approximately 0.99 precision / recall / F1 across both classes |


*[Figure R1 — Skin Relevance Classification Model: classification report on the held-out test set (n = 571). Engineering measurement.]*


## 10.1 Reconstructed confusion matrix

The reported counts fully determine the confusion matrix, which is reconstructed here because the error direction — not just the error rate — is what matters operationally.

| | Predicted Non-Skin | Predicted Skin | Total |
|---|---|---|---|
| **True Non-Skin** | 290 (true negative) | 0 (false positive) | 290 |
| **True Skin** | 3 (false negative) | 278 (true positive) | 281 |
| **Total** | 293 | 278 | 571 |

Derived metrics, consistent with the classification report in Figure R1:

| Metric | Non-Skin | Skin |
|---|---|---|
| Precision | 290 / 293 = 0.9898 | 278 / 278 = 1.0000 |
| Recall | 290 / 290 = 1.0000 | 278 / 281 = 0.9893 |
| F1 | 0.9949 | 0.9946 |
| Overall accuracy | 568 / 571 = 0.9947 (99.5%) | 568 / 571 = 0.9947 (99.5%) |

## 10.2 Error direction and why it matters

The gate made **zero false-accept errors**: not one non-skin image was admitted into the downstream pipeline. All three errors were in the opposite direction — genuine skin images incorrectly rejected, a false-rejection rate of 3 / 281 = **1.07%** of skin submissions.

That asymmetry is the desirable direction for pipeline correctness, because a false accept would inject an out-of-distribution image into a closed-set classifier and produce a meaningless likelihood distribution. But it carries an operational consequence that must be handled explicitly:


> **False rejection is a silent path to non-analysis**
>
> A genuine skin image rejected at the gate is never seen by the Disease-Likelihood or segmentation models. If the pipeline returns that outcome as anything resembling "nothing found", a real abnormality can be missed with no model error ever being recorded. The relevance gate outcome MUST therefore be returned to the orchestrator as a distinct "not analysable" state — never collapsed into a normal or low-risk result — and MUST drive a user-facing retake prompt. See Section 32.2 and the compound-sensitivity analysis in Section 34.3.


# 11. Operational Behaviour of the Gate

## 11.1 Gate logic

The gate emits a boolean `is_relevant` together with the confidence backing it. The pipeline behaviour is binary and terminal:

| Gate outcome | Pipeline behaviour |
|---|---|
| Relevant | Proceed to Components 2 and 3. Relevance class and confidence are carried into the unified payload for traceability. |
| Non-relevant | Stop. No likelihood inference, no segmentation. Return the payload with `relevance.is_relevant = false` and an empty likelihood and abnormality section. Trigger a retake prompt. |

## 11.2 Known limitations of the gate

- **Binary, not graded.** The gate answers "is this skin content" but does not assess *image quality* — focus, exposure, framing, occlusion or resolution. A blurred, dark or badly framed skin photograph passes the gate and is then analysed by models that were trained largely on clearer imagery. Quality assessment is a known gap, recorded in Section 42.
- **Negative class is not adversarial.** The non-skin training set represents accidental uploads, not deliberately confusing near-skin content (for example, skin-coloured fabric, food, or other body-adjacent textures). Behaviour on such inputs is not characterised.
- **Anatomical-site coverage is unquantified.** The dataset is described by content type rather than by anatomical site, so per-site relevance accuracy is not measured.
- **No calibration study.** The confidence value is used as a reported signal, not as a tuned operating threshold; unlike Component 2, no threshold sweep has been performed against coverage.


---

# PART III — Component 2 — Disease-Likelihood Vision Classification Model

*Complete development and evaluation record of the deployed classification model*


# 12. Model Overview


> **Incorporation note**
>
> This Part incorporates in full the dedicated *Disease-Likelihood Vision Classification Model* document, which was the only complete technical description of this component. The original Hygeia Vision Pipeline overview contained only a two-paragraph placeholder for it. Every table, figure, metric, finding and specification from the dedicated document is preserved here, with reconciliation against the pipeline-level architecture and additional derived analysis where the underlying artefacts supported it.


The deployed classification model is a **DINOv2 ViT-L/14** vision transformer adapted to the dermatological domain through a two-stage fine-tuning schedule with layer-wise learning-rate decay. It was selected from twelve independently trained configurations on validation data, then evaluated exactly once on a held-out test set of 720 images.

Within the pipeline it is the **global** analysis stage: it looks at the image as a whole and estimates visual likelihood patterns associated with each trained clinical category. It produces the abnormality score that drives escalation and the confidence value that drives human-review routing.

## 12.1 Headline results

All figures below are engineering measurements on the held-out test set (n = 720), evaluated once after model selection was final.

| Measure | Held-out test set (n = 720) | Section |
|---|---|---|
| Binary triage accuracy (Normal vs Abnormal) | 0.9931 (99.31%) | 20 |
| Abnormal detection sensitivity | 0.9950 | 20 |
| Binary ROC-AUC | 0.9955 | 20 |
| Six-way accuracy | 0.9486 (94.86%) | 19 |
| Six-way macro F1 | 0.9486 | 19 |
| Six-way macro specificity | 0.9897 | 19 |
| Six-way ROC-AUC | 0.9920 | 19 |
| Accuracy on auto-processed cases | 96.38% (95.8% coverage) | 22 |

Three headline figures are reported because they answer three different questions, and quoting any one of them alone misrepresents the system.

**Binary triage accuracy — 99.31%.** The decision that governs whether a case is escalated at all. Sensitivity to abnormal cases is 0.9950, with 3 of 600 abnormal submissions missed and zero missed in the penile cancer, syphilis and genital warts categories.

**Six-way accuracy — 94.86%.** Full categorisation, used to characterise *what* is abnormal once escalation is determined.

**Accuracy on auto-processed cases — 96.38%.** Performance on the population the deployed system acts on autonomously, after low-confidence cases are routed to human review. This is the figure that describes live automated behaviour.


*[Figure 1 — Cumulative effect of each design change on validation macro-F1. Red annotations show the gain contributed by each step, from the frozen linear probe baseline (0.8186) to the deployed configuration (0.9585).]*


## 12.2 Engineering outcomes in one page

**Domain adaptation dominates head design.** Unfreezing two transformer blocks gained 3.9 points over the best frozen-backbone configuration — more than every head-architecture and augmentation change combined.

**Layer-wise learning-rate decay is worth about 2.2 points.** Established by a controlled comparison at identical unfreeze depth and parameter count.

**Unfreeze depth must scale with backbone depth.** ViT-L/14 initially underperformed ViT-B/14 until the unfrozen fraction was matched proportionally, which produced the deployed model.

**Confidence is strongly separable.** Correct predictions average 0.906 confidence against 0.698 for incorrect ones, which is what makes the deployed confidence gate effective.

# 13. Dataset

The Disease-Likelihood model was trained on a curated dermatological image corpus of **4,844 images** spanning six clinical categories, partitioned into fixed training, validation and test splits.

## 13.1 Splits

| Split | Images | Share | Role |
|---|---|---|---|
| Training | 3,469 | 71.6% | Model fitting |
| Validation | 655 | 13.5% | Model selection, hyper-parameters, ensemble weighting, threshold derivation |
| Test | 720 | 14.9% | Held out — evaluated once, after model selection was final |
| **Total** | **4,844** | **100%** | |

The splits are fixed and disjoint: every image belongs to exactly one split, and the assignment does not change between experiments. Every configuration in Section 17 was therefore trained and compared on identical data, which is what makes the single-variable comparisons in Section 18 valid.

The test split is treated as a measurement instrument rather than as a development resource. It was not sampled from, inspected during development, or used for any tuning decision; it was evaluated exactly once, after the deployed configuration had been selected on validation data alone. Section 41 records the full evaluation protocol.

## 13.2 Class composition

| Class | Training | Validation | Test | Total |
|---|---|---|---|---|
| Normal | 1,047 | 119 | 120 | 1,286 |
| Genital warts | 722 | 112 | 120 | 954 |
| HSV | 538 | 113 | 120 | 771 |
| Penile cancer | 393 | 111 | 120 | 624 |
| Penile candidiasis | 400 | 97 | 120 | 617 |
| Syphilis | 369 | 103 | 120 | 592 |
| **Total** | **3,469** | **655** | **720** | **4,844** |

## 13.3 Balance characteristics

Two properties of this composition drive design decisions elsewhere in the pipeline.

**The training distribution is uneven.** Class sizes range from 1,047 Normal images down to 369 syphilis images, a 2.8× spread. This is addressed during training through inverse-frequency class weighting (Section 14.3) rather than through resampling or synthetic augmentation, so that no repeated or artificially generated images enter the training signal. Section 18, Finding 4 shows that the volume of genuine images in the smaller categories — not overfitting — is the binding constraint on those classes, which is why augmentation strategies that reduce effective clean signal were rejected.

**The test set is perfectly balanced** at 120 images per class. This is a deliberate evaluation-design choice with two useful consequences: macro and micro averages coincide, so accuracy and macro-F1 report the same number and cannot diverge misleadingly; and no class can dominate the headline figure, so a model that performed well only on the largest categories could not appear strong overall.

The validation split is approximately balanced (97 to 119 images per class) and is used for every selection decision — architecture, hyper-parameters, checkpoint epoch, ensemble membership and weights, and both deployed operating thresholds.

## 13.4 Category scope

The six categories cover one Normal class and five abnormal presentations. Four of the five abnormal categories are penile-specific, which bounds the anatomical scope of the trained model; this is recorded as a limitation in Section 42.1. Category definitions and the visual characteristics associated with each are given in Section 3.4.

# 14. Preprocessing and Augmentation

## 14.1 Deterministic preprocessing (training, evaluation and production)

| Step | Specification |
|---|---|
| Colour space | Convert to RGB; reject non-decodable files |
| Resize | Shorter side to 256, centre crop to 224 × 224 |
| Normalisation | ImageNet statistics — mean (0.485, 0.456, 0.406), std (0.229, 0.224, 0.225) |
| Tensor layout | float32 NCHW, channels-last memory format for inference throughput |

This specification is a **hard contract**. It must be identical in training, evaluation and production. Section 36 explains why divergence here is the most dangerous single fault available to this system, and records the current non-compliance of the legacy serving code.

## 14.2 Training-time augmentation

| Technique | Setting | Purpose |
|---|---|---|
| RandAugment | magnitude 7, 2 ops | Broad photometric and geometric variation |
| Random resized crop | scale 0.7 – 1.0 | Framing, distance and zoom robustness |
| Horizontal flip | p = 0.5 | Left/right anatomical invariance |
| Rotation | ± 12 degrees | Camera-angle robustness |
| Colour jitter | 0.2 brightness / contrast / saturation | Lighting, skin tone and white balance |
| Random erasing | p = 0.15 | Occlusion robustness (clothing, hands, artefacts) |
| Label smoothing | 0.05 | Confidence calibration; supports the deployed confidence gate |
| Class weighting | inverse frequency | Compensates the uneven training-class distribution |

Label smoothing deserves emphasis because it is doing double duty. Its conventional purpose is regularisation, but here it is also a **calibration** mechanism: by preventing the network from driving softmax outputs to saturation, it preserves the dynamic range in the confidence signal that the deployed confidence gate (Section 22) depends on. A model trained without label smoothing tends to report 0.999 confidence on both correct and incorrect predictions, which would make the gate useless.

## 14.3 Class weights

Class weights applied to the final split:

| Class | Clean train count | Weight |
|---|---|---|
| Genital warts | 722 | 0.801 |
| HSV | 538 | 1.075 |
| Normal | 1,047 | 0.552 |
| Penile cancer | 393 | 1.471 |
| Penile candidiasis | 400 | 1.445 |
| Syphilis | 369 | 1.567 |

The weights are mean-normalised inverse frequencies: `w_c = (N / C) / n_c`, where `N` = 3,469 total training images, `C` = 6 classes and `n_c` is the class count. The mean class size is 578.2, so for example Normal receives 578.2 / 1,047 = 0.552 and syphilis receives 578.2 / 369 = 1.567. All six published weights reproduce exactly under this formula, which confirms the weighting scheme and makes it re-derivable at any future retrain.

## 14.4 Techniques evaluated and rejected

MixUp (α = 0.2) and CutMix (α = 0.8) were evaluated as a controlled experiment against an otherwise identical baseline. They reduced macro-F1 by 1.5 points, with losses concentrated in the categories with the fewest images. They are excluded from the production recipe. Section 18, Finding 4 presents the comparison in full.

# 15. Model Architecture

| Component | Specification |
|---|---|
| Backbone | DINOv2 ViT-L/14 (vit_large_patch14_dinov2.lvd142m) |
| Pretraining | Self-supervised on LVD-142M; no ImageNet label supervision |
| Parameters | 304.4M total |
| Transformer blocks | 24, embedding dimension 1024 |
| Patch size / tokens | 14 × 14 patches; 257 tokens at 224 × 224 (256 patch + 1 CLS) |
| Pooling | CLS token concatenated with mean of patch tokens → 2048-dimensional feature |
| Classification head | LayerNorm → Linear 2048→512 → GELU → Dropout 0.3 → Linear 512→256 → GELU → Dropout 0.2 → Linear 256→6 |
| Precision | Automatic mixed precision (fp16 compute, fp32 master weights) |
| Memory optimisation | Gradient checkpointing during training |

## 15.1 Why DINOv2

**Self-supervised pretraining.** DINOv2 features are learned without category labels, so they encode general visual structure — texture, boundary, colour distribution — rather than ImageNet class semantics. This transfers better to dermatological imagery, which shares little with natural-image object categories.

**Dense patch-token quality.** DINOv2 patch tokens carry strong localised information, which is what makes the CLS-plus-patch fusion productive.

**Scaling behaviour.** The ViT-B and ViT-L variants share a training recipe, allowing a controlled capacity comparison (Section 18, Finding 3).

## 15.2 CLS and patch-token fusion

The classification head consumes a 2048-dimensional vector formed by concatenating the CLS token with the mean of all patch tokens. The CLS token carries a global summary; the mean patch token carries distributed local evidence such as lesion texture and surface irregularity.

Using both measurably outperformed the CLS token alone — **0.8891 against 0.8571 macro-F1** on an otherwise identical frozen-backbone configuration, an improvement of 3.2 points. This is one of the cleanest single-variable results in the programme (T02 vs T03) and it is intuitive in this domain: dermatological classification depends heavily on distributed surface texture, which the mean patch token represents directly and the CLS token summarises away.

# 16. Training Methodology

## 16.1 Staged fine-tuning

Training proceeds in two stages. The first adapts the randomly initialised head against frozen features; the second unfreezes the upper backbone so the representation itself adapts to the domain. Attempting both at once destabilises pretrained features, because an untrained head produces large, uninformative gradients that propagate into a carefully pretrained backbone and damage it before the head has learned anything worth backpropagating.

| Stage | Epochs | Unfrozen | Trainable | Head LR | Backbone LR | LLRD |
|---|---|---|---|---|---|---|
| 1 — frozen head warm-up | 12 | 0 of 24 | 2.1M | 1e-3 | — | — |
| 2 — staged unfreeze | 46 | 8 of 24 | 153M | 1e-4 | 8e-6 | 0.75 |

Note the scale of the transition: trainable parameters increase from 2.1M to 153M — a 73× increase — while the head learning rate drops by an order of magnitude and the backbone trains at 8e-6, more than 100× below the stage-1 head rate. The staging is what makes such a large capacity increase safe.

## 16.2 Layer-wise learning-rate decay

Within stage 2, each transformer block receives a learning rate scaled by 0.75 raised to its depth-from-top. The topmost unfrozen block trains at the full backbone rate; the block below it at 75% of that rate, and so on. Across the 8 unfrozen blocks the effective rate therefore spans 0.75⁷ ≈ 0.13, so the deepest unfrozen block trains roughly 7.5× more slowly than the shallowest.

The rationale: lower blocks encode general visual primitives that should be preserved; upper blocks encode task-specific abstractions that benefit from adaptation. Section 18, Finding 2 quantifies this mechanism at 2.2 points on a controlled pair.

## 16.3 Optimisation

| Setting | Value |
|---|---|
| Optimiser | AdamW |
| Weight decay | 0.05 |
| Schedule | Cosine annealing per stage, 8% linear warm-up, floor at 1% of peak |
| Effective batch size | 32 (micro-batch 8 × gradient accumulation 4) |
| Gradient clipping | 1.0 (global norm) |
| Loss | Cross-entropy with class weights and label smoothing 0.05 |
| Mixed precision | Enabled (torch.autocast, fp16) with gradient scaling |
| Model selection | Best validation macro-F1; checkpoint restored before final evaluation |
| Early stopping | Patience 14 epochs on validation macro-F1 |
| Random seed | 42 (data order, initialisation, augmentation) |

The micro-batch of 8 with 4-step gradient accumulation is a direct consequence of the training hardware: a 6 GB laptop GPU (Section 44.1) cannot hold a 304M-parameter ViT-L at batch 32 in memory. Gradient accumulation plus gradient checkpointing plus fp16 autocast is what made this model trainable at all on the available hardware.

The deployed model reached its best validation macro-F1 at epoch 36 and early-stopped at epoch 50.

# 17. Experimental Programme

Twelve configurations were trained independently and compared on validation data. Test data was not consulted at any point during this programme.

| Exp | Configuration | Backbone | Res | Val acc | Val F1 | Val AUC | +TTA F1 | Best ep. |
|---|---|---|---|---|---|---|---|---|
| **T11** | **l14 deep long** | **L/14** | **224** | **0.9588** | **0.9585** | **0.9941** | **0.9647** | **36/50** |
| T06 | b14 llrd | B/14 | 224 | 0.9450 | 0.9447 | 0.9933 | 0.9476 | 26/35 |
| T09 | b14 res336 | B/14 | 336 | 0.9435 | 0.9432 | 0.9946 | 0.9461 | 29/38 |
| T10 | b14 llrd4 long | B/14 | 224 | 0.9374 | 0.9371 | 0.9942 | 0.9431 | 47/56 |
| T08 | l14 llrd | L/14 | 224 | 0.9359 | 0.9343 | 0.9937 | 0.9406 | 35/36 |
| T07 | b14 mixup cutmix | B/14 | 224 | 0.9298 | 0.9292 | 0.9909 | 0.9290 | 24/33 |
| T04 | b14 unfreeze2 | B/14 | 224 | 0.9282 | 0.9276 | 0.9926 | 0.9286 | 33/38 |
| T05 | b14 unfreeze4 | B/14 | 224 | 0.9237 | 0.9226 | 0.9922 | 0.9220 | 27/35 |
| T03 | b14 frozen fusion | B/14 | 224 | 0.8901 | 0.8891 | 0.9876 | 0.8967 | 25/30 |
| T02 | b14 frozen mlp | B/14 | 224 | 0.8580 | 0.8571 | 0.9790 | 0.8686 | 13/15 |
| T01 | b14 frozen linear | B/14 | 224 | 0.8198 | 0.8186 | 0.9680 | 0.8315 | 9/15 |


*[Figure 2 — Validation macro-F1 across the experimental programme. The green bar (T11) is the configuration promoted to production. Engineering measurement.]*



> **Experiment count**
>
> The programme is described throughout as "twelve configurations" and Figure 2 carries that title, but eleven distinct run identifiers (T01–T11) are reported in the table and plotted in the chart. The most likely explanation is that T05 was a three-stage run whose stage 3 is counted as a separate configuration — Section 18, Finding 2 treats "T05 stage 3" as an independently comparable run. This is recorded as an open item for confirmation against the stored run logs rather than silently corrected. See Section 45, item R-2.


## 17.1 Experimental design rationale

The programme was structured as a sequence of controlled single-variable comparisons rather than an unstructured hyper-parameter search, so that each result attributes a measured effect to a specific design decision. This is the reason the findings in Section 18 can be stated as causal claims about the design rather than as observations about which run happened to score highest.

| Comparison | Variable isolated | Experiments |
|---|---|---|
| Head architecture | Linear vs MLP head, frozen backbone | T01 vs T02 |
| Token pooling | CLS only vs CLS + patch fusion | T02 vs T03 |
| Domain adaptation | Frozen vs 2 blocks unfrozen | T03 vs T04 |
| Unfreeze depth (ViT-B) | 2 vs 4 blocks | T04 vs T05 |
| Layer-wise LR decay | Flat vs decayed LR at identical depth | T05 stage 3 vs T06 stage 2 |
| Batch mixing | MixUp/CutMix on vs off | T06 vs T07 |
| Backbone capacity | ViT-B/14 vs ViT-L/14 | T06 vs T08 |
| Input resolution | 224 vs 336 pixels | T06 vs T09 |
| Schedule length | 16 vs 44 epochs in the winning regime | T06 vs T10 |
| Proportional unfreeze depth | 4 of 24 vs 8 of 24 blocks | T08 vs T11 |

# 18. Key Technical Findings

Four findings rest on controlled comparisons rather than single observations, and together they account for the difference between the initial baseline (0.8186 macro-F1) and the deployed model (0.9585 macro-F1) on validation — a total gain of 14.0 points.

## Finding 1 — Domain adaptation dominates head design

The strongest frozen-backbone configuration (T03: CLS plus patch-token fusion feeding an MLP head) reached 0.8891 macro-F1. Unfreezing just 2 of 12 transformer blocks (T04) reached 0.9276, **a gain of 3.9 points**. Every head-architecture and augmentation change across T01 to T03 was worth 7.0 points combined but plateaued firmly below 0.89.

*Interpretation.* DINOv2's self-supervised features are strong but not dermatology-specific. No classifier placed on top of frozen features can recover information the features do not encode. Allowing the representation itself to adapt is what unlocks the domain. The practical consequence for future work in this pipeline: effort spent on head architecture has a low ceiling, and effort spent on how much of the backbone is allowed to adapt has a high one.

## Finding 2 — Layer-wise learning-rate decay contributes 2.2 points

The cleanest controlled pair in the programme. T05 stage 3 and T06 stage 2 are the same configuration — 4 blocks unfrozen, 29.28M trainable parameters, identical data and schedule — differing **only** in whether layer-wise decay was applied to the backbone learning rate.

| Run / stage | Unfrozen | Trainable | LLRD | Outcome |
|---|---|---|---|---|
| T05 stage 3 | 4 blocks | 29.28M | 1.0 (disabled) | No improvement; early-stopped |
| T06 stage 2 | 4 blocks | 29.28M | 0.75 | 0.9447 — best ViT-B/14 result |

*Interpretation.* What first appeared to be capacity-driven overfitting at four blocks was in fact an artefact of applying a uniform learning rate across depth. Decaying the rate per layer allows deeper adaptation while preserving the general-purpose primitives held in lower blocks. This is a diagnostic worth generalising: an unfreeze depth that "fails" under a flat learning rate should be retried with decay before being abandoned as too much capacity.

## Finding 3 — Unfreeze depth must scale with backbone depth

ViT-L/14 initially underperformed the smaller ViT-B/14, which is counter-intuitive for a backbone with 3.5 times the parameters. The cause was proportional, not architectural: 4 of 24 blocks is half the *fraction* that 4 of 12 represents. Matching the fraction produced the deployed model.

| Run | Backbone | Unfrozen | Fraction | Val macro-F1 |
|---|---|---|---|---|
| T08 | ViT-L/14 | 4 of 24 | 1/6 | 0.9343 |
| T06 | ViT-B/14 | 4 of 12 | 1/3 | 0.9447 |
| **T11** | **ViT-L/14** | **8 of 24** | **1/3** | **0.9585** |

*Interpretation.* The quantity governing transfer is the proportion of the network permitted to adapt, not the absolute block count. This generalises to any backbone-scaling decision in this pipeline and is the single change that produced the deployed model. It is also the direct precondition for the ViT-g/14 item on the roadmap (Section 46): scaling capacity is only productive when unfreeze depth is scaled with it.

## Finding 4 — Batch mixing is counterproductive on this dataset

T07 is T06 plus MixUp and CutMix, with every other setting held constant: **0.9292 against 0.9447**. The regression concentrates in the categories with the fewest training images (syphilis −0.035, HSV −0.020).

*Interpretation.* MixUp and CutMix are regularisers that address overfitting. The binding constraint in this dataset is data volume in specific categories, not memorisation. Synthesising blended images reduces the effective quantity of clean signal in exactly the classes that can least afford it. This is a dataset-specific result, not a general one — it should be re-tested if the class balance changes materially after a future data-acquisition round.

## 18.1 Secondary findings

**Schedule length matters only where a run is schedule-limited.** T02, T03 and T08 all reached their best epoch at or near the end of their schedule and benefited from extension. T10 gave the winning regime 44 epochs instead of 16 and scored 0.9371 against 0.9447 — no benefit once converged. The operational rule: extend a schedule when the best epoch sits at the end of it, not as a matter of routine.

**Full unfreezing is resolution-dependent.** Unfreezing all blocks produced no gain at 224 pixels across three separate runs, but produced the best epoch at 336 pixels (T09). Higher input resolution appears to supply enough additional signal to justify adapting the full depth.

**Test-time augmentation benefits scale with backbone capacity.** TTA gained 1.2 to 1.3 points on frozen probes and 0.6 points on both ViT-L configurations, but nothing on mid-capacity ViT-B runs.
# 19. Final Evaluation — Six-Way Classification

Evaluated once on the held-out test set of 720 images (120 per class), after model selection had been finalised on validation data.

## 19.1 Aggregate metrics

| Metric | Value | Interpretation |
|---|---|---|
| Accuracy | 0.9486 | 683 of 720 images correct |
| 95% confidence interval | 0.9300 – 0.9625 | Wilson interval |
| Balanced accuracy | 0.9486 | Equals accuracy — test set is balanced |
| Macro precision | 0.9490 | Mean per-class positive predictive value |
| Macro recall / sensitivity | 0.9486 | Mean per-class detection rate |
| Macro F1 | 0.9486 | Harmonic mean, equally weighting all classes |
| Macro specificity | 0.9897 | Mean true-negative rate |
| Macro NPV | 0.9897 | Mean negative predictive value |
| ROC-AUC (macro OvR) | 0.9920 | Ranking quality, threshold-independent |
| PR-AUC (macro) | 0.9782 | Precision-recall area, robust to imbalance |
| Matthews correlation | 0.9384 | Balanced correlation coefficient |
| Cohen's kappa | 0.9383 | Agreement corrected for chance |

The Wilson interval is worth reading carefully: at n = 720 the true six-way accuracy is bounded at roughly 93.0% to 96.3%. Reported point estimates should always be quoted with this interval in engineering governance contexts, because differences of one point between candidate models sit well inside it.

## 19.2 Class-wise performance

| Class | Precision | Recall | Specificity | F1 | AUC | PR-AUC | n |
|---|---|---|---|---|---|---|---|
| Penile cancer | 1.0000 | 0.9750 | 1.0000 | 0.9873 | 0.9995 | 0.9980 | 120 |
| Normal | 0.9752 | 0.9833 | 0.9950 | 0.9793 | 0.9955 | 0.9924 | 120 |
| Penile candidiasis | 0.9291 | 0.9833 | 0.9850 | 0.9555 | 0.9976 | 0.9860 | 120 |
| Genital warts | 0.9573 | 0.9333 | 0.9917 | 0.9451 | 0.9927 | 0.9788 | 120 |
| Syphilis | 0.9407 | 0.9250 | 0.9883 | 0.9328 | 0.9903 | 0.9723 | 120 |
| HSV | 0.8917 | 0.8917 | 0.9783 | 0.8917 | 0.9767 | 0.9419 | 120 |


*[Figure 3 — Class-wise precision, recall and F1 on the held-out test set. Engineering measurement.]*


## 19.3 Results with direct safety significance

**Penile cancer — perfect precision and specificity.** 1.0000 precision and 1.0000 specificity across all 720 test images, at 0.9750 recall and 0.9995 AUC. For the most clinically serious category the model produced **zero false positives**: every image it labelled penile cancer was in fact from that category.

**Normal — 0.9833 recall at 0.9950 specificity.** Healthy presentations are correctly identified in 118 of 120 cases, and disease presentations are rarely absorbed into the Normal category. The high specificity on Normal is the property that limits false reassurance.

**All six categories exceed 0.89 F1 and 0.97 AUC.** Performance is consistent across the board rather than being carried by a subset of easy classes — the weakest category (HSV, 0.8917 F1) is still comfortably above the level at which a class would be considered unreliable.

## 19.4 Complete confusion matrix (test set, raw counts)


*[Figure 4 — Confusion matrix on the held-out test set (raw counts). Engineering measurement.]*



*[Figure 5 — Confusion matrix, row-normalised to per-class recall. Engineering measurement.]*


The full matrix is tabulated below because the distribution of errors, not the error count, is what determines operational impact. Rows are true categories, columns are predicted; each row totals 120.

| True ↓ / Predicted → | Genital warts | HSV | Normal | Penile cancer | Penile candidiasis | Syphilis | Total |
|---|---|---|---|---|---|---|---|
| **Genital warts** | **112** | 8 | 0 | 0 | 0 | 0 | 120 |
| **HSV** | 0 | **107** | 2 | 0 | 4 | 7 | 120 |
| **Normal** | 0 | 1 | **118** | 0 | 1 | 0 | 120 |
| **Penile cancer** | 2 | 0 | 0 | **117** | 1 | 0 | 120 |
| **Penile candidiasis** | 0 | 1 | 1 | 0 | **118** | 0 | 120 |
| **Syphilis** | 3 | 3 | 0 | 0 | 3 | **111** | 120 |
| **Predicted total** | 117 | 120 | 121 | 117 | 127 | 118 | 720 |

This table is internally consistent with every published class-wise metric. The diagonal sums to 683 (accuracy 0.9486); each row's diagonal over 120 reproduces the published recall; each diagonal over its column total reproduces the published precision exactly — for example penile candidiasis precision 118 / 127 = 0.9291 and syphilis precision 111 / 118 = 0.9407.

Two structural observations follow directly from the matrix:

- **Penile cancer is never over-predicted.** Column total 117 equals its diagonal 117 — the model assigned that label 117 times and was right on all 117 occasions. Its 3 errors are all misses (2 read as genital warts, 1 as candidiasis), never false alarms.
- **Penile candidiasis is the most over-predicted category.** Column total 127 against 120 true instances: it absorbs errors from HSV (4), syphilis (3), Normal (1) and penile cancer (1). This is the mirror image of its high recall (0.9833) and lower precision (0.9291) and is the expected behaviour of a category whose visual signature — erythema and surface change — is a component of several other presentations.


*[Figure 6 — Per-class ROC curves on the held-out test set. Engineering measurement.]*



*[Figure 7 — Per-class precision-recall curves on the held-out test set. Engineering measurement.]*



*[Figure 8 — Training and validation accuracy across the full schedule.]*



*[Figure 9 — Training and validation loss across the full schedule.]*



*[Figure 10 — Validation macro-F1 by epoch. The step change marks the stage-2 unfreeze.]*



*[Figure 11 — Learning-rate schedule showing the two-stage cosine profile.]*


# 20. Binary Triage Performance — Normal vs Abnormal

The pipeline's first and most consequential decision is binary: does this submission look normal, or does it show something abnormal warranting further assessment? The six-way classification exists to characterise *what* is abnormal; the binary determination governs whether a case is escalated at all.

This section collapses the six categories into two — Normal against all five abnormal categories combined — and evaluates the deployed model on that decision using the same held-out test set. Predictions are derived from the deployed six-way output by mapping any non-Normal prediction to Abnormal, so these figures describe **live model behaviour without modification**.

## 20.1 Binary results

| Metric | Value | Meaning in triage terms |
|---|---|---|
| Accuracy | 0.9931 (99.31%) | 715 of 720 submissions correctly routed |
| 95% confidence interval | 0.9870 – 0.9991 | Normal-approximation interval |
| Sensitivity (abnormal) | 0.9950 | Proportion of abnormal cases escalated |
| Specificity (normal) | 0.9833 | Proportion of healthy cases cleared |
| Positive predictive value | 0.9967 | When the system flags abnormal, how often right |
| Negative predictive value | 0.9752 | When the system says normal, how often right |
| F1 (abnormal class) | 0.9958 | Balance of precision and recall on escalation |
| Balanced accuracy | 0.9892 | Mean of sensitivity and specificity |
| Matthews correlation | 0.9751 | Correlation robust to the 5:1 class ratio |
| ROC-AUC | 0.9955 | Ranking quality of the abnormality score |
| PR-AUC (abnormal) | 0.9988 | Precision-recall area for escalation |

## 20.2 Binary confusion matrix

| | Predicted Normal | Predicted Abnormal | Total |
|---|---|---|---|
| **True Normal** | 118 (true negative) | 2 (false positive) | 120 |
| **True Abnormal** | 3 (false negative) | 597 (true positive) | 600 |
| **Total** | 121 | 599 | 720 |


*[Figure 12 — Binary confusion matrix for the Normal versus Abnormal triage decision. Engineering measurement.]*


This matrix is the row/column collapse of the six-way matrix in Section 19.4 and can be read directly from it: the 3 false negatives are HSV→Normal (2) and penile candidiasis→Normal (1); the 2 false positives are Normal→HSV (1) and Normal→penile candidiasis (1).

## 20.3 The three missed abnormal cases

Only 3 of 600 abnormal submissions were incorrectly cleared as Normal. Their distribution matters more than their count, because a missed abnormal case is the failure mode with genuine clinical consequence.

| Abnormal category | Missed as Normal | Total | Escalation rate |
|---|---|---|---|
| Genital warts | 0 | 120 | 1.0000 |
| HSV | 2 | 120 | 0.9833 |
| Penile cancer | 0 | 120 | 1.0000 |
| Penile candidiasis | 1 | 120 | 0.9917 |
| Syphilis | 0 | 120 | 1.0000 |


> **No missed cases in the highest-severity categories**
>
> Zero penile cancer, zero syphilis and zero genital warts cases were cleared as Normal. All 120 penile cancer submissions were escalated. The three missed cases were two HSV and one penile candidiasis — conditions that are self-limiting or routinely treatable, and whose presentations can be subtle enough to appear unremarkable in a single photograph. The severity profile of the residual error is therefore favourable. This is an engineering observation on the test set, not a clinical safety claim; see Section 2.3.


## 20.4 Tuning the escalation threshold

Because the module emits a full probability distribution, the escalation decision can be tuned independently of the six-way argmax by thresholding the summed abnormal probability, P(abnormal) = 1 − P(Normal).

| P(abnormal) threshold | Sensitivity | Specificity | NPV | Accuracy | Missed abnormal |
|---|---|---|---|---|---|
| 0.10 | 1.0000 | 0.1583 | 1.0000 | 0.8597 | 0 |
| **0.20** | **1.0000** | **0.8917** | **1.0000** | **0.9819** | **0** |
| 0.30 | 0.9983 | 0.9250 | 0.9911 | 0.9861 | 1 |
| 0.50 | 0.9950 | 0.9583 | 0.9746 | 0.9889 | 3 |
| 0.70 | 0.9950 | 0.9833 | 0.9752 | 0.9931 | 3 |


*[Figure 13 — Sensitivity, specificity and negative predictive value as the escalation threshold varies. The dotted line marks the zero-miss operating point.]*


Note that the 0.70 row reproduces the headline binary figures in Section 20.1 exactly — accuracy 0.9931, sensitivity 0.9950, specificity 0.9833. This is not a coincidence: because the six-way argmax selects Normal only when P(Normal) exceeds every other single class probability, the argmax-derived binary decision behaves equivalently to thresholding P(abnormal) at approximately 0.70 on this test set. In other words, **the default deployed behaviour is already a relatively conservative-on-specificity operating point**, and moving to the zero-miss configuration is a deliberate step towards sensitivity, not a correction of a badly chosen default.


> **Zero-miss configuration available at threshold 0.20**
>
> Lowering the escalation threshold to 0.20 on P(abnormal) achieves 100% sensitivity — every one of the 600 abnormal test submissions is escalated, with no missed cases — while retaining 89.17% specificity and 98.19% overall accuracy. The cost is 13 additional healthy cases referred out of 120. For a triage system where the asymmetry of harm strongly favours over-referral, this configuration is available as a deployment option and is recommended wherever review capacity permits.


The threshold sweep also shows why 0.20 rather than 0.10 is the right zero-miss point: both achieve 1.0000 sensitivity, but 0.10 collapses specificity to 0.1583 — referring 101 of 120 healthy cases — for no additional sensitivity benefit whatsoever. Threshold 0.20 is the specificity-maximising point among the zero-miss options on this test set.


*[Figure 14 — ROC curve for the binary abnormality decision. Engineering measurement.]*


## 20.5 Why the binary figure exceeds the six-way figure

Binary accuracy of 99.31% substantially exceeds six-way accuracy of 94.86% because the majority of residual errors are confusions **between abnormal categories** rather than across the normal/abnormal boundary. Of the 37 six-way errors, only 5 cross that boundary (3 false negatives and 2 false positives); the other 32 are abnormal-to-abnormal confusions.

This is the operationally favourable failure mode. A submission misclassified from HSV to syphilis is still escalated and still reaches a clinician; the triage outcome is unchanged. A submission misclassified from abnormal to Normal is not escalated, and that is the error the system is measured against here — 3 occurrences in 720 submissions.

# 21. Error Analysis

The deployed model misclassified 37 of 720 test images at the six-way level. Errors are not uniformly distributed: they concentrate in a specific cluster of visually adjacent categories.

| True category | Predicted as | Count | Share of all errors |
|---|---|---|---|
| Genital warts | HSV | 8 | 21.6% |
| HSV | Syphilis | 7 | 18.9% |
| HSV | Penile candidiasis | 4 | 10.8% |
| Syphilis | Penile candidiasis | 3 | 8.1% |
| Syphilis | HSV | 3 | 8.1% |
| Syphilis | Genital warts | 3 | 8.1% |
| Penile cancer | Genital warts | 2 | 5.4% |
| HSV | Normal | 2 | 5.4% |


*[Figure 15 — Most frequent confusions on the held-out test set. Engineering measurement.]*


The table above lists every confusion pair occurring twice or more, accounting for 32 of the 37 errors. The remaining 5 errors are single-instance pairs, recoverable from the full matrix in Section 19.4: Normal→HSV (1), Normal→penile candidiasis (1), penile cancer→penile candidiasis (1), penile candidiasis→HSV (1) and penile candidiasis→Normal (1).

## 21.1 The ulcerative-lesion cluster

The dominant confusions — genital warts to HSV, HSV to syphilis, HSV to candidiasis, and syphilis to several categories — all occur within the group of conditions presenting as lesions, ulceration or papular eruptions. These are genuinely difficult to distinguish from a single photograph, and clinicians differentiate them using history, serology and lesion evolution over time rather than appearance alone.

Two consequences follow. First, the triage design is correct to treat the image signal as one input among several rather than as a sufficient basis for a decision. Second, the errors are largely confined to categories that route to the same downstream action — further assessment — which materially limits their operational impact.

This cluster is also the target of roadmap item 2 (Section 46): it is where additional labelled data would have the largest measurable effect, because it accounts for the clear majority of residual error.

## 21.2 Errors involving the Normal category

Only 2 of 120 Normal images were misclassified, and no confusion pair involving Normal appears among the most frequent errors. Normal achieves 0.9950 specificity, meaning the model very seldom assigns Normal to an abnormal presentation.

## 21.3 Asymmetry in the HSV / genital warts confusion

The matrix shows a strongly one-directional error: 8 genital warts images were read as HSV, but **zero** HSV images were read as genital warts. Similarly HSV→syphilis occurs 7 times while syphilis→HSV occurs 3 times. Asymmetric confusion of this kind usually indicates a decision boundary sitting closer to one class than the other rather than genuine mutual visual ambiguity, and it is a candidate for correction through targeted data acquisition or per-class threshold adjustment at a future retrain. It is recorded here as an observation for the next training cycle rather than as an action taken.

# 22. Selective Prediction and the Deployed Operating Point

The production system does not act on every prediction unconditionally. It applies a **confidence gate**: cases whose maximum softmax probability falls below a threshold are routed to human review rather than auto-processed. This section derives the deployed threshold from measured data.

## 22.1 Confidence separation

| Prediction group | Count | Mean confidence | Median confidence |
|---|---|---|---|
| Correct | 683 | 0.906 | 0.933 |
| Incorrect | 37 | 0.698 | 0.725 |

The 0.208 gap in mean confidence between correct and incorrect predictions is what makes selective prediction viable at all. A model whose confidence did not separate its own successes from its own failures could not be gated usefully at any threshold. As noted in Section 14.2, label smoothing at 0.05 is a direct contributor to this property.


*[Figure 16 — Confidence distribution for correct and incorrect predictions. Engineering measurement.]*


## 22.2 Accuracy versus coverage

| Threshold | Coverage (auto-processed) | Accuracy on retained cases | Referred to review | Errors retained (derived) | Errors referred (derived) |
|---|---|---|---|---|---|
| 0.50 | 97.1% (699) | 95.85% | 21 | 29 | 8 |
| 0.55 | 96.8% (697) | 95.84% | 23 | 29 | 8 |
| **0.60** | **95.8% (690)** | **96.38%** | **30** | **25** | **12** |
| 0.65 | 95.0% (684) | 96.64% | 36 | 23 | 14 |
| 0.70 | 93.3% (672) | 97.02% | 48 | 20 | 17 |
| 0.80 | 89.2% (642) | 97.66% | 78 | 15 | 22 |
| 0.90 | 66.7% (480) | 98.33% | 240 | 8 | 29 |

The two right-hand columns are derived from the published coverage and accuracy figures and are added here because they express the gate's value more directly than accuracy alone. At the deployed threshold of 0.60 the gate refers 30 of 720 cases and, in doing so, captures 12 of the 37 total errors — roughly a third of all model errors are removed from the automated path by referring 4.2% of traffic.

Expressed as error density: the referred population contains 12 errors in 30 cases (40%), against 25 errors in 690 retained cases (3.6%). The gate concentrates errors into the reviewed queue at roughly **11× the density** of the auto-processed population. That enrichment is precisely what makes the human-review queue an efficient use of clinician time, and it is also why the referral queue is the highest-value source of new training labels (roadmap item 3, Section 46).


*[Figure 17 — Accuracy on retained cases against coverage as the confidence threshold varies. Engineering measurement.]*



> **Deployed operating point: confidence threshold 0.60**
>
> At a confidence threshold of 0.60 the module auto-processes 95.8% of submissions and achieves 96.38% accuracy on that population, referring 30 of 720 cases (4.2%) for human review. This threshold was selected as the point at which accuracy on auto-processed cases clears the 96% service requirement while keeping referral load below 5%. Raising the threshold to 0.70 lifts retained accuracy to 97.02% at the cost of doubling referrals to 6.7%; the setting is configurable per deployment.


## 22.3 The two thresholds are independent

The pipeline operates two distinct thresholds on the same probability distribution, and they must not be confused:

| Threshold | Applied to | Deployed value | Governs |
|---|---|---|---|
| Confidence gate | max softmax probability | 0.60 | Whether the case is auto-processed or sent to human review |
| Escalation threshold | 1 − P(Normal) | argmax-equivalent ≈ 0.70; 0.20 available for zero-miss | Whether the case is flagged abnormal and escalated for assessment |

A case can be simultaneously escalated and referred for review — high abnormality score, low confidence in which category — and this combination is the expected behaviour for a genuinely ambiguous abnormal presentation. The orchestrator must handle all four combinations of the two flags. Both thresholds are model-specific and are re-derived on validation data at every retrain (Section 39).

# 23. Test-Time Augmentation and Ensembling

Two accuracy-enhancement techniques were evaluated before the production configuration was fixed.

| Configuration | Test accuracy | Test macro-F1 | Test ROC-AUC | Inference cost |
|---|---|---|---|---|
| **Single model (deployed)** | **0.9486** | **0.9486** | **0.9920** | **1×** |
| Single model + TTA (4 views) | 0.9486 | 0.9485 | 0.9937 | 4× |
| Weighted ensemble (3 models) | 0.9486 | 0.9484 | 0.9954 | 12× |

Test-time augmentation averages softmax outputs over four deterministic views: original, horizontal flip, tight centre crop and full resize. The ensemble was constructed by Caruana greedy forward selection over the candidate models using **validation probabilities only**, yielding weights of T05 0.167, T09 0.167 and T11 0.667. Test predictions were generated only for selected members and blended in a single pass.


> **Engineering decision: single model deployed**
>
> Neither technique improved test accuracy. Both improved ranking quality — test ROC-AUC rose from 0.9920 to 0.9954 for the ensemble — without changing argmax decisions, indicating the constituent models already agreed on the cases they could classify correctly. Deploying three models at twelve times the inference cost for identical accuracy is not justified.


One nuance worth recording for future decisions: the ensemble's ROC-AUC gain is not worthless even though accuracy is unchanged. Better ranking quality means better-ordered probabilities, which in principle benefits any *threshold-based* decision — including the escalation threshold in Section 20.4 and the confidence gate in Section 22. The decision not to deploy the ensemble is therefore a cost judgement at the current operating points, not a finding that the ensemble has no value. If a future configuration became strongly threshold-sensitive, the trade-off should be re-examined. Note also that the ensemble members were trained on a single data split, so their errors are correlated; roadmap item 4 (Section 46) proposes cross-validation folds to produce genuinely decorrelated members.


*[Figure 18 — Ensemble confusion matrix on the held-out test set, row-normalised. Engineering measurement.]*


---

# PART IV — Component 3 — Visual Abnormality Instance Segmentation Model (VAIS)

*Pixel- and instance-level localisation of visible abnormalities*


# 24. Objective and Scope

**Module name:** Visual Abnormality Instance Segmentation (VAIS) Model.

VAIS is the localised visual-feature extraction component of the Hygeia Vision AI Pipeline. Where the Disease-Likelihood model answers "what does this image as a whole resemble", VAIS answers "what discrete abnormalities are visible, where are they, how many are there, how large are they and what shape do they take". It identifies individual visible abnormality instances and produces instance masks together with measurable geometric and morphology-related features.

The distinction from classification is fundamental to the pipeline's value. A classification score of 0.93 for a category tells the orchestrator nothing about whether the image shows one small lesion or fifteen clustered ones, whether the affected area is 0.2% or 12% of the visible region, or whether the abnormality is round and well-circumscribed or irregular and diffuse. Those properties bear directly on triage urgency and are exactly what VAIS supplies.

## 24.1 Target visual abnormalities

- Bumps / papule-like raised regions
- Lumps / nodular swellings
- Ulcers
- Sores / erosions
- Wart-like growths
- Skin tags / tag-like protrusions
- Redness and ulcerated regions
- Other clearly visible abnormal regions represented in the annotation taxonomy

# 25. Dataset Preparation and Annotation

The VAIS dataset contains **2,500 annotated images** collected across the available disease and condition classes in the vision dataset. The training set is intentionally **not** limited to a single disease class. The purpose is to teach the model a broader representation of visible abnormality morphology rather than the appearance of any one condition.

| Property | Value |
|---|---|
| Annotated images | 2,500 |
| Source scope | Combined multi-condition image dataset |
| Annotation method | Per-instance polygon / mask annotation |
| Annotation tool | LabelMe, in a local / private workflow |
| Training split | 80% — 2,000 images |
| Validation split | 10% — 250 images |
| Testing split | 10% — 250 images |


*[Figure V1 — VAIS annotation workflow in LabelMe. Multiple discrete lesion instances on a single image are each outlined as an independent polygon, which is what produces per-instance rather than per-image supervision.]*


## 25.1 Why multi-condition sourcing matters

Drawing the segmentation corpus across all condition classes rather than from one is a deliberate design choice with a specific consequence: the model learns *what an abnormality looks like as a visual object* — a bounded region whose texture, colour and elevation differ from surrounding skin — rather than learning what any particular disease looks like. This makes VAIS complementary to the classifier rather than a second, weaker copy of it, and it makes VAIS more robust to presentations outside the six trained categories, since abnormality morphology generalises further than disease identity.

## 25.2 Annotation taxonomy

Annotations are defined according to **observable visual morphology rather than disease names**. Depending on the available annotation confidence, the model can use either a generic `visual_abnormality` class or morphology-oriented categories such as bump/papule, lump/nodule, ulcer, sore/erosion, wart-like growth and skin tag.


> **Taxonomy discrepancy requiring confirmation**
>
> The annotation workflow evidence (Figure V1) and the inference example (Figure V2) both show polygon labels carrying DISEASE names — the label list reads "HSV" and predicted instances are rendered as "HSV 0.82" — rather than the morphology-oriented categories described above. The deployed label set of the VAIS model must therefore be confirmed against the trained artefact before the unified output contract in Section 32 is treated as final, because it determines whether the "type" field of each instance carries a morphology term or a condition name. Recorded as Section 45, item R-3.


## 25.3 Split sizing

The 80 / 10 / 10 split yields exactly 2,000 training, 250 validation and 250 test images. This is a smaller corpus than the classification dataset, but the effective supervision is considerably denser: the 250-image test set carries 1,600 annotated instances, an average of 6.4 annotated instances per image, so each image supplies many independent supervised regions rather than a single label.


# 26. Model Architecture

The VAIS component uses the **Ultralytics YOLO26L segmentation model (YOLO26L-seg)** for instance-level mask prediction. The large variant was selected to prioritise segmentation quality and localisation accuracy while retaining a single-stage inference pipeline suitable for production GPU deployment.

| Property | Specification |
|---|---|
| Framework | Ultralytics |
| Model | YOLO26L-seg |
| Task | Instance segmentation |
| Primary prediction | Mask + bounding region + confidence per instance |
| Post-processing | Mask filtering, instance counting, geometry extraction and morphology summarisation |
| Output consumer | Unified vision-output builder and Orchestrator Agent |

A single-stage architecture was chosen over a two-stage detector because the pipeline already carries a 304M-parameter transformer at the classification stage; adding a second multi-pass network would compound latency on the critical path. Single-stage instance segmentation gives masks, boxes, class labels and confidences in one forward pass.

# 27. Training Methodology

| Setting | Value |
|---|---|
| Epochs | 150 |
| Initial learning rate | 1e-4 |
| Loss design | Native multi-task instance-segmentation objectives for box/localisation, class confidence and mask prediction |
| Augmentation | Moderate scale, translation, rotation, brightness/contrast and other medically safe image transformations |
| Hardware | GPU-accelerated training on Tesla-class hardware |
| Primary evaluation metrics | Precision, Recall, mAP50 and mAP50-95 |

The augmentation constraint mirrors the policy applied to the other two components (Sections 8 and 14.2): transformations are bounded to preserve the visual properties that carry clinical meaning. For a segmentation model this is doubly important, since aggressive geometric distortion would degrade the mask boundaries that are the model's actual output.

Note that VAIS was trained on Tesla-class GPU hardware while the Disease-Likelihood model was trained on a 6 GB laptop GPU (Section 44.1). The two components have different training-environment provenance, which is recorded here for reproducibility purposes.

# 28. Evaluation Results

The VAIS model was evaluated on a held-out set containing **250 test images and 1,600 annotated abnormality instances**.

| Metric | Value |
|---|---|
| Precision | 0.895 (89.5%) |
| Recall | 0.858 (85.8%) |
| F1 (derived) | 0.876 |
| mAP50 | 0.920 |
| mAP50-95 | 0.674 |
| Test images | 250 |
| Annotated instances | 1,600 |

The precision result indicates that the majority of predicted abnormality instances corresponded to annotated regions, while the recall result shows strong coverage of the visible abnormalities present in the evaluation set. The **mAP50 score of 0.920** indicates high performance at the standard overlap threshold, and the **mAP50-95 score of 0.674** demonstrates stable performance across progressively stricter overlap thresholds.


*[Figure V2 — VAIS inference example. The input image is processed into per-instance detections with confidence scores; instances above the 0.30 confidence threshold are retained (here "HSV 0.82") and those below are discarded ("HSV 0.33"). Engineering illustration.]*


## 28.1 Instance-level error budget

The published precision and recall, applied to the 1,600 annotated test instances, resolve to the following instance counts. The derivation column states the arithmetic in full so every figure is reproducible.

| Quantity | Count | Derivation |
|---|---|---|
| Ground-truth instances | 1,600 | Annotated test set |
| True positives | 1,373 | 1,600 × 0.858 recall |
| Missed instances (false negatives) | 227 | 1,600 − 1,373 |
| Total predicted instances | 1,534 | 1,373 ÷ 0.895 precision |
| Spurious instances (false positives) | 161 | 1,534 − 1,373 |
| Instance miss rate | 14.19% | 227 ÷ 1,600 |
| Spurious prediction rate | 10.50% | 161 ÷ 1,534 |

These counts reproduce the published metrics: precision 1,373 ÷ 1,534 = 0.8951 and recall 1,373 ÷ 1,600 = 0.8581, matching the reported 0.895 and 0.858.

Read operationally: for every 100 abnormality instances present, VAIS detects 86 and additionally reports 12 that are not annotated. Instance counts passed to the orchestrator therefore **under-count by 14.19% on average**, and downstream triage logic should treat instance count as an ordinal signal (none / few / many) rather than as an exact clinical tally.

## 28.2 Interpreting the mAP50-95 gap

The gap between mAP50 (0.920) and mAP50-95 (0.674) is the expected signature of a model that finds abnormalities reliably but delineates their exact boundaries less precisely. At a 50% overlap requirement almost every abnormality is matched; as the requirement tightens towards 95% overlap, mask edges that are close to but not exactly on the annotated boundary begin to fail the match.

For this pipeline that trade-off is acceptable and arguably correct. The downstream consumer needs to know **how many** abnormalities there are, **where** they are and **roughly how large** — all of which mAP50-level performance supports well. It does not need surgical-grade boundary precision. The one consequence to note is that derived area ratios (Section 29) inherit this boundary imprecision and should be treated as estimates with meaningful tolerance, not as exact measurements.

## 28.3 Known limitations of VAIS

- **No per-class breakdown.** Precision, recall and mAP are reported in aggregate. Per-category segmentation performance is not available, so it is not known whether performance is uniform across morphology types or carried by the more visually distinct ones.
- **Instance count under-reports by 14.19% on average.** As Section 28.1 shows, 227 of 1,600 instances were missed and 161 spurious instances were reported; the emitted `instance_count` is a detection count, not a verified tally.
- **Boundary precision is moderate.** See Section 28.2; area-derived features carry corresponding uncertainty.
- **Clustered abnormalities are a known hard case.** Where many small lesions abut or overlap, instance separation is intrinsically ambiguous and the split between "one large cluster" and "many small instances" may not be stable.

# 29. Visual Feature Extraction

For each segmented abnormality instance, the production pipeline extracts a compact set of quantitative and descriptive visual features for downstream analysis.

| Feature | Description | Consumer use |
|---|---|---|
| Total abnormality instance count | Number of retained instances after confidence filtering | Ordinal burden signal (none / few / many) |
| Per-instance mask area and relative area ratio | Pixel area and its ratio to the analysed image/region | Extent of involvement |
| Bounding-box width, height and aspect ratio | Enclosing box geometry per instance | Elongation, gross size |
| Centroid / location coordinates | Instance position within the image | Distribution and clustering |
| Contour and perimeter | Traced mask boundary and its measured length | Margin regularity |
| Shape descriptors | Round, elongated, clustered or irregular, where measurable | Morphology characterisation |
| Per-instance confidence score | Model confidence for that instance | Weighting and filtering |
| Aggregated abnormality area and cluster-level summary | Combined abnormal area and cluster statistics across all instances | Global burden and spatial pattern |

These features are the mechanism by which the pipeline delivers on its stated purpose as a **visual-feature and risk-identification component** rather than a diagnostic classifier (Section 2). They describe what is visibly present in measurable terms, and leave interpretation to the orchestration layer and, ultimately, to a clinician.

# 30. Inference Thresholds and Post-Processing

## 30.1 Instance confidence threshold

VAIS applies a per-instance confidence threshold of **0.30**. Predicted instances scoring at or above this threshold are retained and contribute to the instance count and feature extraction; instances below it are discarded. Figure V2 illustrates the behaviour directly: two instances are proposed on the same image at confidence 0.82 and 0.33, and the threshold governs which are carried forward.


> **Threshold provenance**
>
> The 0.30 instance-confidence threshold is documented from the inference-flow figure (Figure V2) rather than from a threshold sweep of the kind performed for Component 2 in Sections 20.4 and 22.2. No coverage/precision trade-off curve exists for this threshold. Because instance count and total area ratio both depend directly on it, a sweep equivalent to the classifier's should be produced and the value re-derived on the VAIS validation split. Recorded as Section 45, item R-4.


## 30.2 Post-processing sequence

1. Run YOLO26L-seg inference on the relevance-accepted image.
2. Filter predicted instances by the 0.30 confidence threshold.
3. Count retained instances.
4. For each retained instance, compute mask area, relative area ratio, bounding-box geometry, centroid, contour and perimeter.
5. Assign shape descriptors where measurable.
6. Aggregate: total abnormal area, combined area ratio, cluster-level summary features.
7. Emit the structured abnormality block for payload assembly.


---

# PART V — Integration

*Unified vision output, orchestrator consumption and end-to-end behaviour*


# 31. End-to-End Inference Sequence

The production inference sequence, stated as the operational runbook:

1. **Run the Skin Relevance model on every submitted image.** No exceptions and no fast paths — the gate is the pipeline's only out-of-distribution defence.
2. **Stop the vision path when the image fails the relevance threshold.** Return a payload marked not-analysable, and trigger a retake prompt. Do not run downstream models. Do not return a normal-looking result.
3. **For accepted images, execute the Disease-Likelihood classifier and the VAIS segmentation stage.** These are independent given the accepted image and may run concurrently.
4. **Apply the classifier's two thresholds:** the confidence gate (0.60) producing `auto_processed` / `review_required`, and the escalation threshold on 1 − P(Normal) producing `escalate`.
5. **Post-process VAIS masks** and extract geometric and morphology features (Section 30.2).
6. **Merge all outputs into the standardised unified vision payload,** attaching model-version identifiers for all three components.
7. **Send the final payload to the Orchestrator Agent.**


*[Figure A2 — Inference decision flow. The relevance gate is a hard branch; beyond it the confidence gate and the escalation threshold are applied independently to the same probability distribution, so all four combinations of their outcomes are reachable. The cleared-but-low-confidence combination is the one that must never be treated as a clean result.]*


# 32. Unified Vision Output Contract

The outputs of all three models are merged into a single structured object. This keeps the vision layer modular — each component can be retrained and redeployed independently — while giving the Orchestrator Agent one stable integration interface.

## 32.1 Field reference

| Field | Type | Source | Description |
|---|---|---|---|
| image_id | string | Platform | Identifier for traceability |
| relevance.is_relevant | bool | Component 1 | Skin relevance gating result |
| relevance.confidence | float | Component 1 | Relevance confidence score |
| likelihood.category | string | Component 2 | argmax of the six-way distribution |
| likelihood.confidence | float | Component 2 | Maximum softmax probability; drives the confidence gate |
| likelihood.abnormality_score | float | Component 2 | 1 − P(Normal); drives the escalation decision |
| likelihood.distribution | object | Component 2 | Full six-way probability distribution |
| likelihood.predictions | array | Component 2 | Ranked class likelihoods (ordered view of the distribution) |
| likelihood.auto_processed | bool | Component 2 | True when confidence ≥ the deployed gate |
| likelihood.review_required | bool | Component 2 | True when the case is routed to human review |
| likelihood.escalate | bool | Component 2 | True when abnormality_score ≥ the escalation threshold |
| likelihood.visual_indicators | array | Component 2 | Structured findings consumed by the risk engine |
| abnormalities.instance_count | int | Component 3 | Total segmented abnormality instances after confidence filtering |
| abnormalities.instances[] | array | Component 3 | Per-instance label, confidence, position, area, mask summary and shape features |
| abnormalities.total_area_ratio | float | Component 3 | Combined abnormal area relative to the analysed image/region |
| model_versions | object | All | Version identifiers for all three vision components |

## 32.2 Payload states

The payload has two valid shapes, and the orchestrator must branch on `relevance.is_relevant` before reading anything else.

**State A — image rejected at the gate.** `likelihood` and `abnormalities` are absent or empty. This state means *not analysed*, and must never be interpreted as *nothing found*:

```
{
  "image_id": "img_8f21c",
  "relevance": { "is_relevant": false, "confidence": 0.97 },
  "likelihood": null,
  "abnormalities": null,
  "status": "not_analysable",
  "model_versions": {
    "relevance": "effnetv2s_skin_relevance_v1",
    "likelihood": null,
    "segmentation": null
  }
}
```

**State B — image accepted and fully analysed.** All three blocks populated:

```
{
  "image_id": "img_3a90d",
  "relevance": { "is_relevant": true, "confidence": 0.99 },
  "likelihood": {
    "category": "Genital_warts",
    "confidence": 0.9337,
    "abnormality_score": 0.9962,
    "distribution": {
      "Normal": 0.0038, "Genital_warts": 0.9337, "HSV": 0.0412,
      "Syphillis": 0.0121, "Penile_candidiasis": 0.0058,
      "Penile_cancer": 0.0034
    },
    "predictions": [
      { "class": "Genital_warts", "score": 0.9337 },
      { "class": "HSV",           "score": 0.0412 },
      { "class": "Syphillis",     "score": 0.0121 }
    ],
    "auto_processed": true,
    "review_required": false,
    "escalate": true,
    "visual_indicators": ["papillomatous_growth", "clustered_papules"]
  },
  "abnormalities": {
    "instance_count": 4,
    "total_area_ratio": 0.041,
    "instances": [
      {
        "type": "wart_like",
        "confidence": 0.91,
        "area_ratio": 0.018,
        "shape": "irregular",
        "centroid": [412, 233],
        "bbox": [388, 210, 62, 48]
      }
    ]
  },
  "status": "analysed",
  "model_versions": {
    "relevance":    "effnetv2s_skin_relevance_v1",
    "likelihood":   "T11_dinov2_l14_deep_long_final",
    "segmentation": "yolo26l_seg_vais_v1"
  }
}
```


> **The not-analysable state is a safety-critical distinction**
>
> A rejected image and a clean image produce very different payloads and must produce very different downstream behaviour. If State A is ever collapsed into "no abnormality found", the 1.07% of genuine skin images that the relevance gate rejects (Section 10.2) become silent misses with no model error recorded anywhere. State A must always drive a retake prompt.


## 32.3 Component 2 standalone inference contract

Where the Disease-Likelihood model is called directly rather than through the pipeline — for example by evaluation tooling or during migration testing — it returns its own payload, which is nested unchanged into `likelihood` above:

```
{
  "category": "Genital_warts",
  "confidence": 0.9337,
  "abnormality_score": 0.9962,
  "distribution": {
    "Normal": 0.0038, "Genital_warts": 0.9337, "HSV": 0.0412,
    "Syphillis": 0.0121, "Penile_candidiasis": 0.0058,
    "Penile_cancer": 0.0034
  },
  "auto_processed": true,
  "review_required": false,
  "escalate": true,
  "visual_indicators": ["papillomatous_growth", "clustered_papules"],
  "model_version": "T11_dinov2_l14_deep_long_final"
}
```

The module returns a structured payload rather than a bare label precisely so that downstream triage logic can reason over the full distribution rather than over a single argmax.

# 33. Orchestrator Consumption

## 33.1 Consumption rules

- **Use the relevance gate before consuming downstream visual evidence.** Branch on `is_relevant` first; treat `false` as not-analysed and prompt for a retake.
- **Combine image-level likelihood scores with VAIS instance counts and visual morphology features.** Global and local evidence are complementary; neither alone is the intended input to triage.
- **Use confidence values and structured features in application-level triage/risk logic** rather than treating the argmax category as a decision.
- **Handle all four combinations of `escalate` and `review_required`,** including the escalate-and-review case that indicates a confidently abnormal but ambiguously categorised presentation.
- **Never surface `likelihood.category` to a user as a diagnosis** (Section 2.4).
- **Store model-version identifiers** with every stored result to support traceability, audit and targeted rollback.

## 33.2 Decision combinations

| escalate | review_required | Interpretation | Expected orchestrator action |
|---|---|---|---|
| false | false | Confidently normal-appearing | Route to standard low-risk pathway; combine with questionnaire signals |
| true | false | Confidently abnormal, category confident | Escalate for assessment with the characterisation attached |
| true | true | Abnormal, but category uncertain | Escalate for assessment; flag category as unreliable; prioritise human review |
| false | true | Appears normal but confidence is low | Do not treat as cleared. Route to human review — this is the combination in which false reassurance would otherwise occur |

The bottom row deserves particular attention. A low-confidence Normal prediction is the single most dangerous output shape in the system, because it is the one that could produce false reassurance. The confidence gate exists precisely to intercept it, and the orchestrator must not short-circuit that.

# 34. End-to-End System Behaviour

## 34.1 Worked example

An image is submitted showing several raised, clustered growths.

1. **Relevance gate** — classified relevant skin content at confidence 0.99. Pipeline proceeds.
2. **Disease-Likelihood** — softmax distribution places 0.9337 on the genital warts category, 0.0412 on HSV, 0.0038 on Normal. Confidence 0.9337 ≥ 0.60, so `auto_processed = true`, `review_required = false`. Abnormality score 1 − 0.0038 = 0.9962, above any configured escalation threshold, so `escalate = true`.
3. **VAIS** — four instances retained above the 0.30 confidence threshold; the largest occupies 1.8% of the analysed region, shape descriptor `irregular`; combined area ratio 0.041.
4. **Payload assembly** — all three blocks merged, model versions attached.
5. **Orchestrator** — receives a confidently abnormal, confidently categorised submission with four discrete localised instances and a 4.1% area burden, and combines this with questionnaire and history signals to determine routing.

## 34.2 Where each component's failure would surface

| Component | Failure mode | How it presents downstream | Mitigation |
|---|---|---|---|
| Relevance gate | False reject (measured 1.07% of skin images) | `not_analysable` on a genuine submission | Retake prompt; monitor rejection rate (Section 38) |
| Relevance gate | False accept (0 observed in 571 test images) | Meaningless six-way distribution on an out-of-domain image | Not observed on the test set; monitor for anomalous distributions |
| Disease-Likelihood | Abnormal read as Normal (3 of 600) | Case not escalated | Zero-miss threshold configuration available (Section 20.4) |
| Disease-Likelihood | Abnormal-to-abnormal confusion (32 of 720) | Category wrong, escalation still correct | Limited operational impact by design (Section 20.5) |
| Disease-Likelihood | Low-confidence output | Routed to human review | Confidence gate (Section 22) |
| VAIS | Missed instance (227 of 1,600 = 14.19%) | Under-reported instance count and area | Treat count as ordinal, not exact (Section 28.1) |
| VAIS | Spurious instance (161 of 1,534 = 10.50%) | Over-reported instance count | Confidence threshold 0.30; treat count as ordinal |
| VAIS | Imprecise mask boundary | Area ratios carry tolerance | Treat area as an estimate (Section 28.2) |

## 34.3 Compound sensitivity through the full chain

Component-level metrics are measured independently, but the deployed system runs them in series, and the relevance gate can remove an image before the classifier ever sees it. The system-level abnormal-detection sensitivity is therefore the product of the gate's true-accept rate on skin images and the classifier's abnormal sensitivity:

| Configuration | Gate accept rate on skin | Classifier abnormal sensitivity | Compound sensitivity (derived) |
|---|---|---|---|
| Default escalation (argmax-equivalent) | 0.9893 | 0.9950 | **≈ 0.9843** |
| Zero-miss escalation (threshold 0.20) | 0.9893 | 1.0000 | **≈ 0.9893** |


> **The relevance gate becomes the dominant source of missed cases**
>
> Under the default configuration the classifier misses 0.50% of abnormal cases while the relevance gate rejects 1.07% of genuine skin images — more than twice as many. Under the zero-miss escalation configuration the classifier misses none, and the gate becomes the ONLY source of missed abnormal submissions in the vision path. Any programme to improve end-to-end sensitivity should therefore prioritise the relevance gate's false-rejection rate at least as highly as the classifier's threshold, which is not the conclusion component-level metrics alone would suggest. Recorded as roadmap item 7 (Section 46).


These are derived estimates under two stated assumptions: that the gate's 1.07% false-rejection rate measured on a mixed skin test set applies equally to abnormal skin images, and that the two models' errors are independent. Neither has been measured directly. The correct way to establish the true end-to-end figure is a single evaluation run of the full chain against one held-out set, which has not yet been performed and is recorded as Section 45, item R-5.

---

# PART VI — Production Deployment

*Serving architecture, preprocessing parity, migration, monitoring and governance*


# 35. Serving Architecture

## 35.1 Deployed configuration — Disease-Likelihood model

| Parameter | Production setting |
|---|---|
| Model artefact | Production checkpoint, 1.22 GB (version identifier T11_dinov2_l14_deep_long_final) |
| Framework | PyTorch with the timm backbone registry |
| Backbone identifier | vit_large_patch14_dinov2.lvd142m |
| Precision | fp16 autocast inference |
| Memory format | channels-last |
| Input | RGB image from object storage; any source resolution |
| Output | Six-way softmax distribution, predicted category, confidence, abnormality score |
| Confidence gate | 0.60 (configurable per deployment) |
| Escalation threshold | P(abnormal) ≥ 0.20 for the zero-miss configuration, where enabled |
| Batching | Supported for both single-image and batched requests |

## 35.2 Deployed configuration — supporting components

| Parameter | Skin Relevance | VAIS |
|---|---|---|
| Framework | EfficientNetV2-S backbone | Ultralytics YOLO26L-seg |
| Precision | GPU inference | GPU inference |
| Threshold | Binary gate decision | Per-instance confidence 0.30 |
| Position | Runs first, on every submission | Runs on relevance-accepted images only |
| Failure behaviour | Terminal — stops the pipeline | Non-terminal — empty instance list is a valid result |

## 35.3 Checkpoint contents

The stored classification checkpoint is **self-describing**. It contains the model state dictionary, the complete training configuration, the epoch at which it was selected, and the class-name ordering. The serving layer reconstructs the architecture from the embedded configuration rather than from a separately maintained definition, eliminating a class of version-mismatch faults in which serving code and checkpoint silently disagree about the model they represent.

```
checkpoint = {
  "model":   <state_dict>,
  "config":  <full training configuration>,
  "epoch":   36,
  "classes": ["Genital_warts", "HSV", "Normal",
              "Penile_cancer", "Penile_candidiasis", "Syphillis"]
}
```

The `classes` ordering is authoritative: index 2 is Normal, which is the index the abnormality score `1 − P(Normal)` depends on. Any serving code that hard-codes a different ordering will compute the abnormality score from the wrong class and produce a silently inverted escalation signal.

# 36. Preprocessing Parity — Critical Requirement


> **Blocking requirement for deployment**
>
> The production preprocessing path must be functionally equivalent to the evaluation path that produced every metric in Part III. Any divergence invalidates those metrics as a description of live behaviour. The legacy serving implementation does NOT currently satisfy this requirement — see Section 37.


| Step | Required (matches evaluation) | Legacy implementation | Status |
|---|---|---|---|
| Resize | Shorter side to 256, then centre crop 224 | Direct resize to (224, 224), distorting aspect ratio | MUST CHANGE |
| Normalisation | ImageNet mean (0.485, 0.456, 0.406) / std (0.229, 0.224, 0.225) | Divide by 255 only | MUST CHANGE |
| Colour space | RGB | RGB | OK |
| Input size | 224 × 224 | 224 × 224 | OK |
| Batch dimension | NCHW | NHWC (TensorFlow ordering) | MUST CHANGE |

The normalisation difference is the most consequential. A DINOv2 model trained on ImageNet-normalised inputs and served with simple [0,1] scaling receives inputs whose per-channel mean and variance differ substantially from anything seen during training. The result is **severe, silent accuracy degradation** — the model returns confident predictions that are systematically wrong, with no error raised, no exception thrown and no monitoring signal that would obviously distinguish it from correct operation.

The resize difference compounds this. Direct resize to a square distorts aspect ratio, stretching or compressing lesion morphology in a way the model never saw during training, in which the shorter-side-plus-centre-crop path preserves proportions.


> **Why this is the most dangerous fault available to this system**
>
> Most serving faults are loud: a shape mismatch throws, a missing file throws, a bad checkpoint fails to load. A preprocessing mismatch is quiet. The service stays up, latency looks normal, the response schema validates, and confidence values still look plausible. Every metric in Part III would continue to be quoted internally as though it described live behaviour, while live behaviour had in fact degraded arbitrarily. Preprocessing parity must therefore be verified by explicit test — comparing serving-path tensors against evaluation-path tensors on fixed reference images — and that test must run in CI, not as a one-off check at migration time.


# 37. Migration from the Legacy Model

The current serving implementation loads a legacy TensorFlow/Keras ViT-B16 checkpoint. This is **not** the model documented in Part III. Migrating to the DINOv2 model requires the following changes.

| # | Change | Detail |
|---|---|---|
| 1 | Replace the framework binding | TensorFlow/Keras → PyTorch with the timm backbone registry; load the production checkpoint and reconstruct the architecture from its embedded configuration |
| 2 | Correct the resize path | Replace direct resize with shorter-side-256 plus centre crop 224 to match evaluation |
| 3 | Correct normalisation | Replace division by 255 with ImageNet mean/std normalisation |
| 4 | Correct tensor ordering | NHWC → NCHW, channels-last memory format |
| 5 | Add the confidence gate | Compute maximum softmax probability and compare against the deployed threshold; emit auto_processed and review_required |
| 6 | Add the abnormality score | Compute 1 − P(Normal) and compare against the escalation threshold; emit escalate |
| 7 | Extend the response payload | Adopt the contract in Section 32, including model_version |
| 8 | Replace the development server | Flask's built-in server is not suitable for production; deploy behind a production WSGI or ASGI server with an appropriate worker model |
| 9 | Remove residual naming inherited from an unrelated template | The prediction function and its documentation carry identifiers from the project template they were derived from; rename for maintainability |
| 10 | Integrate the relevance gate and VAIS | The legacy endpoint serves classification only. The unified pipeline requires the relevance gate ahead of it and VAIS alongside it, with payload assembly per Section 32 |

Item 10 is added by this consolidation: the legacy serving module was written before the three-component architecture and implements only the classification stage.


> **Security remediation required before release**
>
> The legacy serving module contains HARD-CODED AWS ACCESS CREDENTIALS in source. These must be removed from the codebase, rotated at the provider, and replaced with environment variables or a managed secrets store before this service is released or its repository shared. If the file has ever been committed to version control, the credentials should be treated as COMPROMISED regardless of subsequent removal — rotation is mandatory, not optional, because history rewriting does not reliably erase distributed copies.


## 37.1 Migration acceptance criteria

The migration is complete when all of the following hold:

1. Serving-path preprocessing produces tensors matching the evaluation path on a fixed set of reference images, verified by an automated test in CI.
2. The service reproduces the Part III test-set metrics when run over the stored test split end-to-end.
3. Both thresholds are configurable and their deployed values are recorded in the response payload's model metadata.
4. The response conforms to the Section 32 contract, including `model_versions` for all three components.
5. No credentials appear in source; credentials have been rotated at the provider.
6. The service runs behind a production WSGI/ASGI server.
7. The relevance gate runs ahead of classification and its outcome is represented in the payload.

# 38. Operational Monitoring

| Signal | Purpose | Action on breach |
|---|---|---|
| Relevance rejection rate | Proportion of images rejected by the gate | Sustained rise indicates capture-quality or user-guidance problems; a fall may indicate the gate has stopped functioning |
| Referral rate | Proportion of cases falling below the confidence gate | Sustained rise indicates input distribution shift; trigger data review |
| Escalation rate | Proportion of cases exceeding the abnormality threshold | Divergence from clinical prior indicates data or pipeline fault |
| Confidence distribution | Mean and percentile confidence of auto-processed cases | Downward drift indicates degradation before accuracy becomes observable |
| Per-category volume | Distribution of predicted categories over time | Sudden shifts indicate upstream capture or preprocessing change |
| VAIS instance-count distribution | Distribution of instances per analysed image | Collapse towards zero indicates a segmentation or threshold fault |
| Human-review agreement | Concordance between model output and reviewer outcome | Primary ground-truth signal for retraining triggers |
| Per-component latency | Inference time for each of the three models | Standard service alerting; identifies which stage regressed |
| GPU memory and throughput | Particularly for the segmentation component | Capacity planning and saturation alerting |
| Latency and error rate | Overall serving health | Standard service alerting |

Two of these deserve emphasis as leading indicators. **Confidence distribution drift** moves before accuracy does, because a model degrading on shifted inputs becomes less certain before it becomes measurably wrong — and unlike accuracy, it is observable without ground truth. **Relevance rejection rate** is the only monitor that will catch a silent failure of the gate itself; a gate that has stopped rejecting anything looks identical to a gate operating on unusually clean traffic unless the rate is tracked.

Additionally, model and dataset version identifiers must be maintained in production logs for every prediction.

# 39. Retraining and Model Governance

**Trigger.** Accumulation of reviewer-confirmed labels from the referral queue, or a sustained shift in the monitoring signals above.

**Data hygiene.** New images are assigned to exactly one split before training begins. The existing test set is treated as an immutable reference and is never extended or resampled.

**Validation.** Candidate models must exceed the incumbent on validation macro-F1 before promotion. Confidence and escalation thresholds are re-derived on validation for the new model — **thresholds are model-specific and must never be carried across versions unexamined**. A threshold of 0.60 that yields 95.8% coverage on one model may yield materially different coverage on another with different calibration.

**Promotion.** A single held-out test evaluation confirms the candidate before it replaces the production artefact.

**Rollback.** The `model_versions` field in the response payload identifies the serving artefacts for every prediction, enabling audit and targeted rollback of any single component without disturbing the other two.

**Independence.** Because the three components have separate artefacts and separate version identifiers, they can be retrained and promoted independently. The one coupling to respect: any change to the relevance gate's operating point changes the input distribution the other two models see, and should be followed by a re-check of their monitoring signals.

# 40. Security and Data Handling

| Area | Requirement | Current status |
|---|---|---|
| Credential management | No secrets in source; environment variables or managed secret store | **NOT MET** — hard-coded AWS credentials present in the legacy serving module (Section 37) |
| Transport | TLS for all image retrieval and API traffic | Review required |
| Image retention | Defined retention period and deletion policy for submitted images | Policy to be documented |
| Access control | Least-privilege object-storage credentials scoped to the intake bucket | Review required alongside credential rotation |
| Audit trail | model_version recorded per prediction | Specified in the Section 32 contract |
| Data minimisation | Images processed in memory; no unnecessary local persistence | Legacy implementation streams from object storage without writing to disk — satisfactory |
| Annotation environment | Annotation and sensitive-image processing kept in controlled/private environments | Satisfied — LabelMe used in a local/private workflow (Section 25) |
| Log hygiene | Raw images never written to general application logs | Required; verify during migration |
| Dataset access | Role-based permissions restricting access to training and evaluation datasets | Required |


---

# PART VII — Governance and Assurance

*Methodology, limitations, safety, reproducibility, open items and roadmap*


# 41. Methodological Rigour

The evaluation protocol was designed so that reported figures describe genuine generalisation rather than measurement artefacts.

| Safeguard | Implementation |
|---|---|
| Fixed disjoint splits | Every image belongs to exactly one split; the assignment is identical across every experiment in the programme |
| Immutable test split | The test set was never modified, sampled from, or used for any tuning decision |
| Single test evaluation | Test data was evaluated once, after the deployed model had been selected on validation alone |
| Selection isolation | Architecture, hyper-parameters, checkpoint epoch, TTA configuration, ensemble membership, ensemble weights and both operating thresholds were chosen using validation data only |
| Controlled comparisons | Each headline finding isolates a single variable against an otherwise identical baseline |
| Deterministic seeding | Fixed seed (42) across data ordering, initialisation and augmentation |
| Full artefact retention | Per-image predictions, probability arrays, metrics and plots retained for all runs |

## 41.1 The validation-to-test gap

Validation macro-F1 for the deployed model was **0.9585** and test macro-F1 was **0.9486**. The 1.0-point difference is the expected optimism of selecting a model on validation data, and is reported rather than concealed. That the gap is small indicates the selection process did not overfit the validation split — a large gap would suggest that the twelve-way comparison had effectively tuned the model to validation noise.

## 41.2 Scope of these safeguards

These safeguards were applied to the **Disease-Likelihood model** (Component 2). Equivalent documentation does not currently exist for Components 1 and 3:

| Safeguard | Component 1 (Relevance) | Component 2 (Likelihood) | Component 3 (VAIS) |
|---|---|---|---|
| Fixed disjoint splits | Applied | Applied | Applied |
| Immutable test split | Not documented | Applied | Not documented |
| Single test evaluation | Not documented | Applied | Not documented |
| Controlled single-variable experiments | Not documented | Applied | Not documented |
| Deterministic seeding | Not documented | Applied (seed 42) | Not documented |
| Threshold derived by sweep | No — gate is binary | Applied (Sections 20.4, 22.2) | No — 0.30 asserted |

This is an honest statement of the current position rather than an assertion that the other two components are unsound. The engineering rigour applied to Component 2 is materially higher than what is documented for Components 1 and 3, and bringing the other two to the same standard is recorded as Section 45, items R-4 and R-6, and roadmap item 8.

# 42. Limitations

## 42.1 Dataset and domain limitations

- **Closed set of six categories.** The classifier can only express the six trained categories. Any condition outside that set will be assigned to whichever of the six it most resembles, with no mechanism to express "none of these". The relevance gate filters non-skin content but does not filter out-of-taxonomy skin conditions.
- **Skin-tone diversity is not quantified.** The datasets are described by condition and content type, not by Fitzpatrick skin type or equivalent. Performance parity across skin tones is therefore **unknown**, and this is a material limitation for a dermatological system.
- **Anatomical scope.** Four of the six categories are penile-specific. Generalisation to other anatomical sites is not established.
- **Single-image, single-timepoint.** The pipeline sees one photograph. Clinicians differentiate several of these conditions using lesion evolution over time, history and serology (Section 21.1). The pipeline structurally cannot access that information.
- **Image quality is not assessed.** No component evaluates focus, exposure, framing or resolution (Section 11.2). A poor-quality skin photograph passes the gate and is analysed as though it were clear.
- **Retrospective corpus.** Images were collected retrospectively from available sources rather than prospectively under a controlled capture protocol; the extent to which their distribution matches live user submissions is not measured.

## 42.2 Model and measurement limitations

- **Class imbalance in training.** The rarest class has 369 training images against Normal's 1,047, a 2.8× spread. Finding 4 showed the binding constraint is data volume in specific categories.
- **Test-set size.** At n = 720, the six-way accuracy confidence interval spans roughly 3.3 points (Section 19.1). Small differences between candidates are not resolvable at this sample size.
- **VAIS metrics are aggregate only.** No per-class segmentation breakdown exists (Section 28.3).
- **VAIS instance counts and areas are approximate** (Sections 28.1, 28.2).
- **Compound end-to-end performance is derived, not measured** (Section 34.3).
- **No calibration analysis beyond the threshold sweeps.** Confidence separates correct from incorrect predictions usefully (Section 22.1), but no formal calibration assessment (reliability curve, expected calibration error) has been produced.

## 42.3 Deployment limitations

- **The production classifier is not yet serving.** The legacy endpoint serves a different model entirely (Section 37).
- **Preprocessing parity is currently violated** in the legacy path (Section 36).
- **Hard-coded credentials are present** in the legacy serving module (Section 40).
- **The unified three-component payload is specified but not yet implemented** in the serving layer.

## 42.4 The overriding limitation

Everything above is an engineering limitation. The overriding limitation is the one stated in Section 2: **clinical validity has not been established.** No amount of engineering performance substitutes for the clinical trial currently in progress.

# 43. Safety Properties of the Deployed Configuration

Stated as engineering properties measured on held-out data, not as clinical claims.

**Conservative on the most serious category.** Penile cancer achieved 1.0000 precision and 1.0000 specificity on the held-out test set, and zero penile cancer submissions were cleared as Normal. All 120 were escalated.

**Low risk of false reassurance.** Binary negative predictive value is 0.9752, and only 3 of 600 abnormal submissions were cleared as Normal — none of them from the three highest-severity categories.

**Uncertainty is surfaced, not suppressed.** The confidence gate routes 4.2% of cases to human review rather than issuing a low-confidence automated result, and captures roughly a third of all model errors in doing so (Section 22.2).

**Errors are operationally clustered.** The dominant confusions occur between conditions routing to the same downstream action, limiting the practical consequence of misclassification (Section 20.5).

**A zero-miss configuration is available.** Section 20.4 documents a threshold at which no abnormal case in the test set was missed, at a specificity cost of 13 additional referrals per 120 healthy cases.

**Out-of-domain inputs are rejected rather than scored.** The relevance gate admitted zero non-skin images in 290 test cases (Section 10.1).

**The pipeline never acts alone.** Vision output is one input to the orchestrator, combined with questionnaire and history signals, and a qualified healthcare professional remains in the loop for every escalated case.

# 44. Reproducibility

Every figure in the Component 2 sections is regenerated from stored artefacts. The build script reads values directly from the metrics files produced by the evaluation pipeline, so the documentation cannot diverge from measured results.

## 44.1 Environment

| Component | Version / specification |
|---|---|
| Python | 3.11 |
| PyTorch | CUDA build with automatic mixed precision |
| timm | Backbone registry (vit_large_patch14_dinov2.lvd142m) |
| Ultralytics | YOLO26L-seg (VAIS component) |
| Classification training hardware | NVIDIA RTX 3050 6 GB (laptop) |
| Segmentation training hardware | Tesla-class GPU |
| Relevance training hardware | GPU-accelerated environment |
| Random seed | 42 |

The classification training hardware is worth noting explicitly: a 304M-parameter ViT-L was fine-tuned to the deployed result on a 6 GB laptop GPU, which was possible only through the combination of gradient checkpointing, fp16 autocast and 4-step gradient accumulation documented in Section 16.3. Anyone reproducing this work on different hardware should expect to adjust micro-batch size and accumulation steps while preserving the effective batch size of 32.

## 44.2 Reproduction procedure

Every result in Part III is reproducible from the stored configuration and the fixed splits by following three steps.

| Step | Operation | Inputs | Outputs |
|---|---|---|---|
| 1 | Train the production configuration | Production configuration file (T11_dinov2_l14_deep_long); fixed train and validation splits | Best-validation checkpoint with embedded configuration, class ordering and selected epoch |
| 2 | Evaluate the stored checkpoint | Production checkpoint; held-out test split; optional test-time augmentation | Metrics, classification report, confusion matrices, ROC and precision-recall curves, per-image predictions, probability arrays |
| 3 | Regenerate this document | Stored metrics files from step 2 | Document tables and figures, read directly from measured values |

The evaluation step is deterministic given the checkpoint and the split, and the document build reads measured values rather than transcribed ones, so the reported figures cannot drift from the artefacts they describe.

# 45. Reconciliation Register and Open Items

This consolidation merged two source documents written at different times and at different levels of detail. The following items are discrepancies, gaps or unverified assertions identified during that merge. They are recorded rather than silently resolved, because each requires confirmation against a stored artefact or a decision by the owning engineer.

| ID | Item | Detail | Action required | Priority |
|---|---|---|---|---|
| R-1 | Class-name misspelling in artefact | The checkpoint class ordering contains "Syphillis". The spelling is load-bearing across the checkpoint, all stored metrics files and the serving label map. | Do not correct in place. Map to "Syphilis" at the presentation boundary. Schedule a coordinated migration if the artefact is ever rebuilt. | Low — cosmetic, but must not be corrected casually |
| R-2 | Experiment count | Text, headline and Figure 2 title all state "twelve" configurations; eleven identifiers (T01–T11) are tabulated and plotted. Probable explanation: T05 stage 3 counted separately (it is treated as an independent run in Finding 2). | Confirm against the stored run logs and per-experiment result sets; correct the count in the next revision. | Low — does not affect any result |
| R-3 | VAIS taxonomy | Section 25.2 states annotations are morphology-based, not disease-named. Figures V1 and V2 both show disease-named labels ("HSV"). | Confirm the deployed VAIS label set against the trained artefact. It determines whether `instances[].type` carries a morphology term or a condition name, which the Section 32 contract depends on. | **High — affects the output contract** |
| R-4 | VAIS confidence threshold provenance | The 0.30 instance threshold is documented from an inference figure, not from a sweep. Instance count and area ratio both depend on it directly. | Produce a coverage/precision sweep on the VAIS validation split and re-derive the value. | Medium |
| R-5 | Compound end-to-end performance | System-level sensitivity (Section 34.3) is derived from component metrics under independence assumptions, not measured. | Run a single end-to-end evaluation of all three components against one held-out set. | **High — this is the number that describes the real system** |
| R-6 | Relevance model documentation depth | Component 1 has no experimental programme, no threshold sweep and no confidence-interval reporting, unlike Component 2. | Bring documentation and evaluation rigour to the Component 2 standard. | Medium |
| R-7 | Architecture scope in the source classification document | The dedicated classification document described the system as a six-stage pipeline beginning at intake, with no relevance gate and no segmentation stage. This consolidation supersedes that description with the nine-stage, three-component architecture in Section 3.1. | None — resolved by this document. Recorded for traceability. | Resolved |
| R-8 | Legacy serving model mismatch | The deployed endpoint serves a legacy TensorFlow ViT-B16 checkpoint, not the documented DINOv2 model. Every metric in Part III describes a model that is not currently in production. | Complete the Section 37 migration. Until then, Part III figures must be labelled as describing the intended production model, not the live one. | **Blocking for release** |
| R-9 | Hard-coded AWS credentials | Present in the legacy serving module source. | Remove, rotate at provider, replace with a managed secret store. Treat as compromised if ever committed. | **Blocking for release** |
| R-10 | Skin-tone performance parity | Not measured for any of the three components. | Stratify evaluation by skin tone; this is expected to be required for clinical validation regardless. | **High — clinical and equity significance** |
| R-11 | Image-quality assessment | No component assesses focus, exposure, framing or resolution. | Consider a quality check at the gate stage, or a quality signal in the payload. | Medium |
| R-12 | System naming | The source documents use "Hygeia"; some internal task material uses "Hygia". This document standardises on "Hygeia". | Confirm the canonical product spelling and apply consistently. | Low |

# 46. Roadmap

| Priority | Enhancement | Expected contribution |
|---|---|---|
| 1 | Complete the serving migration in Section 37 | **Blocking for release.** Preprocessing parity and credential remediation must precede any production traffic on the new model |
| 2 | Expand labelled data for HSV, syphilis and genital warts | Directly targets the ulcerative-lesion cluster in Section 21, which accounts for the majority of residual errors |
| 3 | Close the loop on reviewer-confirmed labels | The referral queue generates high-value labelled examples precisely where the model is least certain — at roughly 11× the error density of auto-processed traffic (Section 22.2), the most efficient available data acquisition channel |
| 4 | Cross-validation ensembling across folds | Produces genuinely decorrelated members, unlike blending models trained on a single split |
| 5 | Resolution escalation for low-confidence cases | T09 showed 336-pixel input supports deeper adaptation; a natural extension of the confidence gate — spend more compute only on the cases that need it |
| 6 | Larger backbone (DINOv2 ViT-g/14) | Subject to serving-hardware capacity; the ViT-B to ViT-L result establishes that capacity scales productively when unfreeze depth is matched proportionally (Finding 3) |
| 7 | Reduce relevance-gate false rejections | Under the zero-miss escalation configuration the gate becomes the only source of missed abnormal submissions in the vision path (Section 34.3) |
| 8 | Bring Components 1 and 3 to the Component 2 evidence standard | Threshold sweeps, controlled single-variable experiments and confidence intervals (items R-4, R-6) |
| 9 | End-to-end evaluation of the full three-component chain | Produces the system-level figures that currently exist only as derived estimates (item R-5) |
| 10 | Skin-tone stratified evaluation | Establishes performance parity, which is both an equity requirement and an expected clinical-validation prerequisite (item R-10) |
| 11 | Image-quality assessment at intake | Closes the gap in Section 11.2; prevents silently analysing unusable photographs |
| 12 | Formal calibration analysis | Reliability curves and expected calibration error for the confidence signal both thresholds depend on |

# 47. Retained Evaluation Artefacts

The following artefacts are retained for every training run in the programme, not only for the deployed configuration. Retention is what makes the reported figures auditable after the fact and allows any result in Part III to be re-derived without retraining.

| Artefact | Contents |
|---|---|
| Production configuration | Full training configuration for the deployed model |
| Production checkpoint | Deployed weights, 1.22 GB, with embedded configuration, selected epoch and class ordering |
| Per-run evaluation set | Aggregate and per-class metrics, classification report, raw and row-normalised confusion matrices, ROC and precision-recall curves, training and validation curves, per-image predictions and raw probability arrays |
| Ensemble record | Member selection, weights, and validation and test evaluation |
| Analysis outputs | Comparison figures and the binary triage metrics generated for this document |
| Split definition | Per-class counts and the fixed split assignment |
| Training logs | Training, orchestration and evaluation logs for every run |

Each per-run evaluation set contains the metrics file, classification report, per-class metric table, both confusion-matrix renderings, ROC and precision-recall curves, training and validation accuracy and loss curves, the macro-F1 and AUC by-epoch curves, the per-image prediction table, and the raw probability arrays used for ensembling.

# 48. Appendix A — Source Document Provenance

This document consolidates two sources. The mapping below records where each part of the content originated, for audit purposes.

| This document | Source | Notes |
|---|---|---|
| Part I, Sections 1, 3, 4 | Hygeia Vision Pipeline overview + Disease-Likelihood document | Merged; nine-stage flow is new, reconciling the overview's three-component sequence with the classification document's six-stage description (item R-7) |
| Section 2 | Disease-Likelihood document Section 24, extended | Clinical trial status added per the consolidation requirement |
| Part II (Sections 5–11) | Hygeia Vision Pipeline overview Section 2 | Reconstructed confusion matrix, error-direction analysis and limitations are new derivations |
| Part III (Sections 12–23) | Disease-Likelihood document Parts I–II, in full | Incorporated complete. Full confusion matrix table, derived error columns, threshold-equivalence analysis and gate enrichment analysis are new derivations from the source figures |
| Part IV (Sections 24–30) | Hygeia Vision Pipeline overview Section 4 | Instance error budget, mAP interpretation, threshold provenance and limitations are new derivations |
| Part V (Sections 31–34) | Both sources | Unified contract merges the overview's payload with the classification document's inference contract; payload states, decision-combination table and compound sensitivity are new |
| Part VI (Sections 35–40) | Disease-Likelihood document Part III + overview Section 6 | Merged; migration item 10 and acceptance criteria are new |
| Part VII (Sections 41–47) | Disease-Likelihood document Part IV | Extended with per-component safeguard scope, consolidated limitations and the reconciliation register |
| Section 45 | New | Produced by this consolidation |

# 49. Appendix B — Glossary

| Term | Meaning |
|---|---|
| **Abnormality score** | 1 − P(Normal). The summed probability across all five abnormal categories; drives the escalation decision. |
| **Confidence gate** | Threshold on the maximum softmax probability, below which a case is routed to human review instead of being auto-processed. Deployed at 0.60. |
| **Coverage** | The proportion of cases the system auto-processes, i.e. those at or above the confidence gate. |
| **DINOv2** | A self-supervised vision transformer pretraining method. Features are learned without category labels. |
| **Escalation threshold** | Threshold on the abnormality score, above which a case is flagged for assessment. Argmax-equivalent ≈ 0.70; 0.20 available as a zero-miss configuration. |
| **Instance segmentation** | Detecting and delineating each discrete object separately, with a pixel mask per instance — as distinct from semantic segmentation, which labels pixels without separating instances. |
| **LLRD** | Layer-wise learning-rate decay. Each transformer block trains at a rate scaled by a decay factor raised to its depth from the top. |
| **Macro F1** | F1 averaged equally across classes, regardless of class size. Equal to micro/weighted F1 on a balanced test set. |
| **mAP50 / mAP50-95** | Mean average precision at 50% intersection-over-union overlap, and averaged across overlap thresholds from 50% to 95%. The second is the stricter measure of boundary accuracy. |
| **Relevance gate** | Component 1. The binary skin/non-skin decision that determines whether an image enters the rest of the pipeline. |
| **Selective prediction** | Allowing a model to abstain on low-confidence cases, trading coverage for accuracy on the retained population. |
| **TTA** | Test-time augmentation. Averaging predictions across several deterministic views of the same image. |
| **VAIS** | Visual Abnormality Instance Segmentation — Component 3. |
| **Wilson interval** | A confidence interval for a binomial proportion that behaves correctly near 0 and 1, unlike the normal approximation. |

---

**END OF DOCUMENT**

*Hygeia Vision AI Pipeline — Consolidated Production Technical Documentation, Version 2.0, 22 August 2026. In-house production documentation. All performance figures are engineering measurements on held-out datasets; the system is undergoing clinical trial and clinical validation, and no figure in this document constitutes a clinical performance claim.*
