export type RiskLevel = "low" | "moderate" | "high" | "urgent";

export interface Questionnaire {
  visible_change?: boolean | null;
  age?: number | null;
  sex_at_birth?: "male" | "female" | "intersex" | "prefer_not_to_say" | null;
  symptoms: string[];
  duration?: "<1w" | "1-4w" | ">4w" | "unknown" | null;
  pain: boolean;
  itching: boolean;
  changed: boolean;
  fever: boolean;
  exposure?: "none" | "protected" | "unprotected" | "unknown" | null;
  partner_sti: boolean;
  prior_sti: boolean;
  notes: string;
}

export interface AnalyzeOptions {
  likelihood_mode?: "single" | "ensemble";
  tta?: boolean;
  segmentation: boolean;
  vlm: boolean;
}

export interface Relevance {
  is_relevant: boolean;
  confidence: number;
  p_relevant: number;
  threshold: number;
  evidence: { prompt: string; p: number }[];
  backend: string;
  model_version: string;
  latency_ms: number;
}

export interface Prediction { class: string; display: string; score: number }

export interface Likelihood {
  category: string;
  category_display: string;
  confidence: number;
  abnormality_score: number;
  distribution: Record<string, number>;
  predictions: Prediction[];
  auto_processed: boolean;
  review_required: boolean;
  escalate: boolean;
  visual_indicators: string[];
  thresholds: { confidence_gate: number; escalation: number };
  mode: string;
  tta: boolean;
  members: Record<string, { weight: number; img_size: number; backbone: string; probs: Record<string, number>; argmax: string }>;
  members_agree: boolean;
  attention_map: string | null;
  model_version: string;
  latency_ms: number;
}

export interface InstanceReview { is_abnormal: boolean; label: string; note: string; disputed: boolean }

export interface Instance {
  id: number; type: string; label: string; raw_label: string; confidence: number; mask_quality: number | null;
  area_px: number; area_ratio: number; bbox: number[]; aspect_ratio: number; centroid: number[];
  perimeter_px: number; circularity: number; solidity: number; shape: string; source: string;
  sources: string[]; source_scores?: Record<string, number>; agreement: number; polygon?: number[][];
  classifier_attention?: number; review?: InstanceReview;
}

export interface SegProvenance {
  sources_requested?: string[]; sources_used?: string[]; proposals?: Record<string, number>; fused?: number;
  fallback?: string; vlm_skipped?: string; vlm_grounding?: { model_id?: string; boxes?: number; raw?: string; error?: string };
}

export interface SegReview {
  applied: boolean; reviewed: number; confirmed: number; disputed: number;
  removed: { id: number; label: string; confidence: number; reviewer_label: string; note: string }[];
}

export interface Abnormalities {
  available: boolean; backend: string; error?: string;
  instance_count: number; total_area_ratio: number; instances: Instance[];
  summary: { instance_count: number; total_area_ratio: number; largest_area_ratio: number; burden: string; spatial_pattern: string; dominant_shape: string | null; types: Record<string, number>; labels?: Record<string, number>; multi_source?: number };
  overlay: string | null; proposals?: number; source?: string; analysed_size?: number[];
  provenance?: SegProvenance; review?: SegReview; mask_model?: string; timings_ms?: Record<string, number>;
  confidence_threshold?: number; model_version: string | null; latency_ms: number;
  localisation_reliable?: boolean; localisation_verdict?: string | null;
  correction?: { added: number; replaced: boolean; hidden_reason?: string | null };
  heatmap?: string | null; heatmap_source?: string; heatmap_boxes?: number;
}

export interface ReviewItem { id: number; is_abnormal: boolean; label: string; note: string }

export interface SecondReader {
  available: boolean; backend: string; model_id?: string; quantized_4bit?: boolean; parsed?: boolean; raw?: string | null; refused?: boolean;
  error?: string; latency_ms?: number; reviewed_instances?: boolean;
  visual_description?: string; observed_features?: string[]; image_quality?: string; image_quality_note?: string;
  consistency?: string; consistency_rationale?: string; alternative_considerations?: string[]; red_flags?: string[];
  patient_summary?: string; suggested_questions?: string[]; instance_review?: ReviewItem[];
  outside_trained_categories?: boolean; best_match?: string; transmission_note?: string;
  outlines_verdict?: string | null; missed_lesions?: { box: number[]; label: string }[];
}

export interface Triage {
  status: "analysed" | "not_analysable" | "symptoms_only";
  risk_level: RiskLevel; urgency_score: number; headline: string; summary: string;
  reasons: string[]; actions: string[]; testing: string[];
  notes?: string[];
  scope?: { outside_trained_categories: boolean; best_match?: string | null; differential: string[] };
  flags: { escalate: boolean; review_required: boolean; not_analysable: boolean };
  decision_combination?: string;
}

export interface Quality { width: number; height: number; sharpness: number; brightness: number; contrast: number; warnings: string[] }

export interface AnalysisResult {
  result_id: string; image_id: string | null; status: "analysed" | "not_analysable" | "symptoms_only";
  quality: Quality | null; questionnaire: Partial<Questionnaire>;
  options: { likelihood_mode: string; tta: boolean; segmentation: boolean; vlm: boolean };
  model_versions: Record<string, string | null>;
  preview: string;
  relevance: Relevance | null;
  likelihood: Likelihood | null;
  abnormalities: Abnormalities | null;
  second_reader: SecondReader | null;
  triage: Triage;
  timings_ms: Record<string, number>;
}

export type StageName = "intake" | "relevance" | "likelihood" | "segmentation" | "second_reader" | "triage";
export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";
export interface StageEvent { type: "stage"; stage: StageName; status: StageStatus; data: unknown }

export interface HealthInfo {
  ok: boolean; device: string; gpu: Record<string, unknown>;
  models: Record<string, { status: string; policy: string; error: string | null; load_seconds: number | null }>;
  config: Record<string, unknown>; model_versions: Record<string, string | null>;
}
