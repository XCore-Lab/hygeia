import { ShieldCheck, ShieldX } from "lucide-react";
import { Badge, Card, Meter } from "@/components/ui";
import { ms, pct } from "@/lib/format";
import type { Quality, Relevance } from "@/lib/types";

export default function RelevanceCard({ rel, quality, preview }: { rel: Relevance; quality: Quality; preview: string }) {
  return (
    <Card title="Relevance gate & capture quality" icon={rel.is_relevant ? <ShieldCheck size={18} className="text-jade" /> : <ShieldX size={18} className="text-coral" />}
      aside={<Badge tone={rel.is_relevant ? "ok" : "bad"}>{rel.is_relevant ? "accepted" : "rejected"}</Badge>}>
      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        <img src={preview} alt="Submitted" className="rounded-xl w-full aspect-square object-cover border border-border" />
        <div className="space-y-3">
          <Meter value={rel.p_relevant} color={rel.is_relevant ? "bg-jade" : "bg-coral"} label={`P(analysable skin content) = ${pct(rel.p_relevant, 1)} · threshold ${pct(rel.threshold)} · ${ms(rel.latency_ms)}`} />
          {rel.evidence.length > 0 && (
            <div className="text-xs text-ink-soft">Closest prompts: {rel.evidence.map((e) => `"${e.prompt}" (${pct(e.p)})`).join(", ")}</div>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge>{quality.width}×{quality.height}px</Badge>
            <Badge>sharpness {quality.sharpness}</Badge>
            <Badge>brightness {quality.brightness}</Badge>
            {quality.warnings.map((w) => <Badge key={w} tone="warn">{w.replace(/_/g, " ")}</Badge>)}
          </div>
          <p className="text-[11px] text-ink-soft">{rel.model_version}</p>
        </div>
      </div>
    </Card>
  );
}
