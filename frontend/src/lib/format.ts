import type { RiskLevel } from "./types";

export const pct = (x: number | undefined | null, d = 0) => (x == null ? "–" : `${(100 * x).toFixed(d)}%`);
export const ms = (x: number | undefined) => (x == null ? "–" : x >= 1000 ? `${(x / 1000).toFixed(1)} s` : `${x} ms`);
export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const RISK: Record<RiskLevel, { label: string; bg: string; text: string; ring: string; bar: string }> = {
  low: { label: "Low priority", bg: "bg-jade-tint", text: "text-jade", ring: "ring-jade/30", bar: "bg-jade" },
  moderate: { label: "Worth checking", bg: "bg-amber-tint", text: "text-amber", ring: "ring-amber/30", bar: "bg-amber" },
  high: { label: "See a clinician soon", bg: "bg-coral-tint", text: "text-coral", ring: "ring-coral/30", bar: "bg-coral" },
  urgent: { label: "Prompt assessment", bg: "bg-coral-tint", text: "text-coral", ring: "ring-coral/40", bar: "bg-coral" },
};

export const CLASS_COLORS: Record<string, string> = {
  Normal: "bg-jade",
  Genital_warts: "bg-royal",
  HSV: "bg-turquoise-deep",
  Syphillis: "bg-amber",
  Penile_candidiasis: "bg-royal-light",
  Penile_cancer: "bg-coral",
};
