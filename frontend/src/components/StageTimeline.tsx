import { Check, Loader2, Minus, X } from "lucide-react";
import type { StageName, StageStatus } from "@/lib/types";

export const STAGES: { id: StageName; label: string; detail: string }[] = [
  { id: "intake", label: "Checking the photo", detail: "Orientation and capture quality" },
  { id: "relevance", label: "Is it analysable?", detail: "Making sure this is a skin photo we can read" },
  { id: "likelihood", label: "Pattern analysis", detail: "Comparing against six trained categories" },
  { id: "segmentation", label: "Finding the areas of concern", detail: "Outlining visible changes on the photo" },
  { id: "second_reader", label: "Second look", detail: "An AI reader describes and cross-checks" },
  { id: "triage", label: "Working out urgency", detail: "Putting the findings and your answers together" },
];

export default function StageTimeline({ status, compact = false }: { status: Partial<Record<StageName, StageStatus>>; compact?: boolean }) {
  return (
    <ol className={compact ? "space-y-1" : "space-y-2"}>
      {STAGES.map((s) => {
        const st = status[s.id] ?? "pending";
        const icon = st === "done" ? <Check size={14} /> : st === "running" ? <Loader2 size={14} className="animate-spin" />
          : st === "skipped" ? <Minus size={14} /> : st === "error" ? <X size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />;
        const tone = st === "done" ? "bg-jade text-white" : st === "running" ? "bg-royal text-white pulse-ring"
          : st === "skipped" ? "bg-muted text-ink-soft" : st === "error" ? "bg-coral text-white" : "bg-muted text-ink-soft";
        return (
          <li key={s.id} className={`flex items-center gap-3 rounded-xl ${compact ? "px-2 py-1.5" : "px-3 py-2"} ${st === "running" ? "bg-royal-tint" : ""}`}>
            <span className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-xs ${tone}`}>{icon}</span>
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${st === "pending" ? "text-ink-soft" : "text-ink"}`}>{s.label}</div>
              {!compact && <div className="text-[11px] text-ink-soft truncate">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
