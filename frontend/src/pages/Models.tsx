import { useEffect, useState } from "react";
import { Badge, Card, Spinner, Stat } from "@/components/ui";
import { getModels } from "@/lib/api";
import { pct } from "@/lib/format";
import type { HealthInfo } from "@/lib/types";

export default function Models() {
  const [data, setData] = useState<{ card: any; runtime: HealthInfo } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getModels().then(setData).catch((e) => setErr(e.message)); }, []);
  if (err) return <Card><p className="text-sm text-coral">{err}</p></Card>;
  if (!data) return <div className="flex items-center gap-2 text-ink-soft"><Spinner /> Loading model card…</div>;
  const { card, runtime } = data;
  const lk = card.components.find((c: any) => c.id === "likelihood");
  const m = lk.documented_metrics;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{card.system}</h1>
        <p className="text-sm text-ink-soft mt-1">{card.clinical_status}</p>
        <p className="text-sm text-ink-soft">{card.intended_use}</p>
      </div>

      <Card title="Measured engineering performance (held-out test set, n = 720)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Six-way accuracy" value={pct(m.test_accuracy, 2)} hint={`95% CI ${pct(m.accuracy_ci95[0], 1)}–${pct(m.accuracy_ci95[1], 1)}`} />
          <Stat label="Macro F1" value={m.macro_f1.toFixed(4)} />
          <Stat label="ROC-AUC (macro)" value={m.roc_auc_macro.toFixed(4)} hint={`ensemble ${lk.ensemble.test_roc_auc.toFixed(4)}`} />
          <Stat label="Specificity (macro)" value={pct(m.specificity_macro, 2)} />
          <Stat label="Normal vs abnormal" value={pct(m.binary_normal_vs_abnormal.accuracy, 2)} hint={`sensitivity ${pct(m.binary_normal_vs_abnormal.sensitivity, 1)}`} />
          <Stat label="Zero-miss threshold" value={pct(m.zero_miss_threshold.threshold)} hint={`sens. ${pct(m.zero_miss_threshold.sensitivity)} · spec. ${pct(m.zero_miss_threshold.specificity, 1)}`} />
          <Stat label="Confidence gate" value={pct(m.confidence_gate.threshold)} hint={`${pct(m.confidence_gate.coverage, 1)} auto-processed at ${pct(m.confidence_gate.accuracy_on_retained, 1)}`} />
          <Stat label="MCC" value={m.mcc.toFixed(4)} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-ink-soft"><th className="py-1 pr-3">Class</th><th className="py-1 pr-3">Precision</th><th className="py-1 pr-3">Recall</th><th className="py-1 pr-3">F1</th><th className="py-1 pr-3">AUC</th></tr></thead>
            <tbody>{Object.entries(lk.per_class_test).map(([c, v]: any) => (
              <tr key={c} className="border-t border-border"><td className="py-1 pr-3 font-medium">{c.replace(/_/g, " ")}</td><td className="py-1 pr-3 tabular-nums">{v.precision.toFixed(3)}</td><td className="py-1 pr-3 tabular-nums">{v.recall.toFixed(3)}</td><td className="py-1 pr-3 tabular-nums">{v.f1.toFixed(3)}</td><td className="py-1 pr-3 tabular-nums">{v.auc.toFixed(4)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-soft mt-3">{lk.ensemble.note}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        {card.components.map((c: any) => {
          const rt = Object.entries(runtime.models).filter(([k]) => k.startsWith(c.id));
          return (
            <Card key={c.id} title={c.name} aside={<div className="flex gap-1">{rt.map(([k, v]) => <Badge key={k} tone={v.status === "ready" ? "ok" : v.status === "error" ? "bad" : "warn"}>{k.split(":").pop()}: {v.status}</Badge>)}</div>}>
              <dl className="text-xs space-y-1.5">
                {c.documented_model && <div><dt className="font-semibold text-ink inline">Documented model: </dt><dd className="inline text-ink-soft">{c.documented_model}</dd></div>}
                {c.training && <div><dt className="font-semibold text-ink inline">Training: </dt><dd className="inline text-ink-soft">{Object.entries(c.training).map(([k, v]) => `${k} ${v}`).join(" · ")}</dd></div>}
                {c.documented_metrics && c.id !== "likelihood" && <div><dt className="font-semibold text-ink inline">Documented metrics: </dt><dd className="inline text-ink-soft">{Object.entries(c.documented_metrics).map(([k, v]) => `${k.replace(/_/g, " ")} ${typeof v === "number" && v <= 1 ? pct(v, 1) : String(v)}`).join(" · ")}</dd></div>}
                <div><dt className="font-semibold text-ink inline">Deployed here: </dt><dd className="inline text-ink-soft">{c.deployed_here}</dd></div>
                {c.role && <div><dt className="font-semibold text-ink inline">Role: </dt><dd className="inline text-ink-soft">{c.role}</dd></div>}
              </dl>
            </Card>
          );
        })}
      </div>

      <Card title="Limitations">
        <ul className="list-disc pl-5 text-sm text-ink-soft space-y-1">{card.limitations.map((l: string, i: number) => <li key={i}>{l}</li>)}</ul>
      </Card>

      <Card title="Runtime">
        <div className="text-xs text-ink-soft grid sm:grid-cols-2 gap-1">
          <div>Device: <span className="text-ink font-medium">{String(runtime.gpu.device ?? runtime.device)}</span></div>
          {runtime.gpu.total_mb != null && <div>VRAM: <span className="text-ink font-medium">{String(runtime.gpu.allocated_mb)} / {String(runtime.gpu.total_mb)} MB allocated</span></div>}
          {Object.entries(runtime.config).map(([k, v]) => <div key={k}>{k.replace(/_/g, " ")}: <span className="text-ink font-medium">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span></div>)}
        </div>
      </Card>
    </div>
  );
}
