import { useState } from "react";
import { BarChart3, Eye } from "lucide-react";
import { Badge, Card, Stat } from "@/components/ui";
import { CLASS_COLORS, ms, pct } from "@/lib/format";
import type { Likelihood } from "@/lib/types";

export default function LikelihoodCard({ lk, preview }: { lk: Likelihood; preview: string }) {
  const [showCam, setShowCam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const top = lk.predictions[0];
  return (
    <Card title="Visual likelihood (six trained categories)" icon={<BarChart3 size={18} className="text-turquoise-deep" />}
      aside={<div className="flex gap-1.5"><Badge tone="info">{lk.mode}{lk.tta ? " + TTA" : ""}</Badge>{lk.members_agree ? <Badge tone="ok">members agree</Badge> : <Badge tone="warn">members disagree</Badge>}</div>}>
      <p className="text-xs text-ink-soft mb-4">
        How closely the image resembles each of the six categories the classifier was trained on. Appearances outside these six are flagged by the second reader and shown in the triage card.
      </p>
      <div className="grid sm:grid-cols-[1fr_200px] gap-5">
        <div>
          <ol className="space-y-2.5">
            {lk.predictions.map((p) => (
              <li key={p.class}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={`font-medium ${p.class === top.class ? "text-ink" : "text-ink-soft"}`}>{p.display}</span>
                  <span className="tabular-nums font-semibold text-ink">{pct(p.score, 1)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1">
                  <div className={`h-full rounded-full ${CLASS_COLORS[p.class] ?? "bg-royal"} transition-all duration-700`} style={{ width: `${p.score * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 content-start">
          <Stat label="Abnormality score" value={pct(lk.abnormality_score, 1)} hint={`1 − P(normal) · escalate at ≥ ${pct(lk.thresholds.escalation)}`} />
          <Stat label="Confidence" value={pct(lk.confidence, 1)} hint={`gate ${pct(lk.thresholds.confidence_gate)} · ${lk.review_required ? "review" : "auto-processed"}`} />
          <Stat label="Latency" value={ms(lk.latency_ms)} hint={lk.model_version} />
        </div>
      </div>

      {lk.visual_indicators.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="text-xs text-ink-soft mr-1 self-center">Trained visual indicators for this category:</span>
          {lk.visual_indicators.map((v) => <Badge key={v}>{v.replace(/_/g, " ")}</Badge>)}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {lk.attention_map && <button className="btn-secondary !py-1.5 !text-xs" onClick={() => setShowCam((s) => !s)}><Eye size={14} /> {showCam ? "Hide" : "Show"} where the classifier looked</button>}
        <button className="btn-ghost !py-1.5 !text-xs" onClick={() => setShowMembers((s) => !s)}>{showMembers ? "Hide" : "Show"} ensemble members</button>
      </div>
      {showCam && lk.attention_map && (
        <div className="mt-3 grid grid-cols-2 gap-3 fade-in">
          <img src={preview} alt="Original (centre crop)" className="rounded-xl w-full object-cover aspect-square" />
          <img src={lk.attention_map} alt="Classifier attention map" className="rounded-xl w-full object-cover aspect-square" />
          <p className="col-span-2 text-[11px] text-ink-soft">Gradient-weighted token activation of the ViT-L/14 production model for the leading category (warm = stronger contribution). An explanation aid, not a localisation result.</p>
        </div>
      )}
      {showMembers && (
        <div className="mt-3 overflow-x-auto fade-in">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-ink-soft"><th className="py-1 pr-2">Member</th><th className="py-1 pr-2">Weight</th><th className="py-1 pr-2">Input</th><th className="py-1 pr-2">Top class</th>{Object.keys(lk.distribution).map((c) => <th key={c} className="py-1 pr-2">{c.replace(/_/g, " ")}</th>)}</tr></thead>
            <tbody>
              {Object.entries(lk.members).map(([name, m]) => (
                <tr key={name} className="border-t border-border">
                  <td className="py-1 pr-2 font-medium whitespace-nowrap">{name}</td>
                  <td className="py-1 pr-2">{m.weight}</td>
                  <td className="py-1 pr-2">{m.img_size}px</td>
                  <td className="py-1 pr-2">{m.argmax.replace(/_/g, " ")}</td>
                  {Object.keys(lk.distribution).map((c) => <td key={c} className="py-1 pr-2 tabular-nums">{pct(m.probs[c], 1)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
