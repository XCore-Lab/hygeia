import { AlertCircle, CheckCircle2, ClipboardList, FlaskConical, Info } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { RISK } from "@/lib/format";
import type { Triage } from "@/lib/types";

export default function TriageCard({ t }: { t: Triage }) {
  const r = RISK[t.risk_level];
  return (
    <Card className={`ring-2 ${r.ring}`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className={`shrink-0 rounded-2xl ${r.bg} ${r.text} px-4 py-3 text-center min-w-[140px]`}>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Priority</div>
          <div className="text-xl font-extrabold leading-tight">{r.label}</div>
          <div className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden"><div className={`h-full ${r.bar}`} style={{ width: `${t.urgency_score}%` }} /></div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-ink">{t.headline}</h2>
          <p className="text-sm text-ink-soft mt-1">{t.summary}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {t.flags.not_analysable && <Badge tone="warn">Not analysable</Badge>}
            {t.flags.escalate && <Badge tone="bad">Escalated for assessment</Badge>}
            {t.flags.review_required && <Badge tone="warn">Human review required</Badge>}
            {!t.flags.escalate && !t.flags.review_required && !t.flags.not_analysable && <Badge tone="ok">Confidently normal-appearing</Badge>}
            {t.scope?.outside_trained_categories && <Badge tone="warn">Possibly outside the six trained patterns</Badge>}
            {t.decision_combination && <Badge>{t.decision_combination.replace(/_/g, " ")}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2"><ClipboardList size={15} /> What to do next</h3>
          <ul className="space-y-1.5">
            {t.actions.map((a, i) => <li key={i} className="flex gap-2 text-sm text-ink"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-jade" />{a}</li>)}
          </ul>
          {t.testing.length > 0 && (
            <div className="mt-3 rounded-xl bg-royal-tint p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-royal mb-1"><FlaskConical size={13} /> Tests a clinic may suggest</h4>
              <ul className="text-xs text-ink list-disc pl-4 space-y-0.5">{t.testing.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2"><Info size={15} /> Why this level</h3>
          <ul className="space-y-1.5">
            {t.reasons.map((x, i) => <li key={i} className="flex gap-2 text-xs text-ink-soft"><AlertCircle size={13} className="mt-0.5 shrink-0 text-royal" />{x}</li>)}
          </ul>
          {t.scope?.differential && t.scope.differential.length > 0 && (
            <div className="mt-3">
              <h3 className="text-sm font-bold text-ink mb-1">Other things a clinician would consider{t.scope.best_match && t.scope.best_match.toLowerCase() !== "uncertain" ? ` · closest match: ${t.scope.best_match}` : ""}</h3>
              <ul className="list-disc pl-4 text-xs text-ink-soft space-y-0.5">{t.scope.differential.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
          {t.notes && t.notes.length > 0 && (
            <div className="mt-3 rounded-xl bg-jade-tint p-3 space-y-1.5">
              <h4 className="text-xs font-bold text-jade">Good to know</h4>
              {t.notes.map((n, i) => <p key={i} className="text-xs text-ink leading-relaxed">{n}</p>)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
