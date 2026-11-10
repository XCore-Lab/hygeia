import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { clearAll, loadAll, removeResult } from "@/lib/history";
import { RISK, pct } from "@/lib/format";

export default function History() {
  const [items, setItems] = useState(loadAll());
  if (items.length === 0) return <Card title="History"><p className="text-sm text-ink-soft">No analyses yet. Results are kept only in this browser.</p><Link to="/check" className="btn-primary mt-3">Start a check</Link></Card>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold text-ink">History (this browser only)</h1>
        <button className="btn-ghost !text-xs" onClick={() => { clearAll(); setItems([]); }}><Trash2 size={14} /> Clear all</button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => {
          const risk = RISK[r.triage.risk_level];
          return (
            <div key={r.result_id} className="card overflow-hidden fade-in">
              <Link to={`/result/${r.result_id}`}>{r.preview ? <img src={r.preview} alt="" className="w-full aspect-[4/3] object-cover" /> : <div className="w-full aspect-[4/3] bg-royal-tint grid place-items-center text-xs font-semibold text-royal">Answers only · no photo</div>}</Link>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${risk.bg} ${risk.text}`}>{risk.label}</span>
                  <button className="text-ink-soft hover:text-coral" onClick={() => { removeResult(r.result_id); setItems(loadAll()); }} aria-label="Delete"><Trash2 size={15} /></button>
                </div>
                <div className="text-sm font-semibold text-ink mt-2">{r.triage.headline}</div>
                <div className="text-xs text-ink-soft mt-1">
                  {r.status === "analysed" && r.likelihood ? <>{r.likelihood.category_display} · {pct(r.likelihood.confidence)} · abnormality {pct(r.likelihood.abnormality_score)}</> : r.status === "symptoms_only" ? "Symptoms only, no photo" : "Not analysable"}
                </div>
                <div className="flex gap-1 mt-2">{r.triage.flags.escalate && <Badge tone="bad">escalated</Badge>}{r.triage.flags.review_required && <Badge tone="warn">review</Badge>}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
