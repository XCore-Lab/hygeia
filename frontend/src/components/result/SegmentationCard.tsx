import { useMemo, useState } from "react";
import { Check, Layers, ScanSearch, X } from "lucide-react";
import { Badge, Card, Stat } from "@/components/ui";
import { ms, pct, titleCase } from "@/lib/format";
import type { Abnormalities, Instance } from "@/lib/types";

// Same palette as the backend overlay renderer, so numbers match across views.
const PALETTE = ["#40E0D0", "#1434A4", "#00A36C", "#FF8C00", "#DC143C", "#9400D3", "#FFD700", "#00BFFF"];
const SOURCE_LABEL: Record<string, { label: string; title: string }> = {
  vlm: { label: "VLM", title: "Proposed and named by the vision-language model (Qwen3-VL grounding)" },
  vlm_review: { label: "Reader", title: "Added by the second reader when it reviewed the outlined photo" },
  gdino: { label: "Detector", title: "Proposed by the open-vocabulary detector (Grounding DINO)" },
  cam: { label: "Attention", title: "Proposed from the classifier's own attention map" },
  yolo: { label: "YOLO", title: "Trained VAIS instance segmenter" },
};

const chip = (on: boolean) => `chip ${on ? "bg-royal text-white border-royal" : "bg-white text-ink-soft border-border hover:border-royal/50"}`;

function ReviewBadge({ i }: { i: Instance }) {
  if (!i.review) return <span className="text-ink-soft">–</span>;
  if (i.review.disputed) return <Badge tone="warn">disputed</Badge>;
  return i.review.is_abnormal ? <Badge tone="ok">confirmed</Badge> : <Badge tone="bad">rejected</Badge>;
}

export default function SegmentationCard({ ab, preview }: { ab: Abnormalities; preview?: string }) {
  const [view, setView] = useState<"interactive" | "masks" | "heatmap">("interactive");
  const [active, setActive] = useState<number | null>(null);
  const size = ab.analysed_size ?? [1000, 1000];
  const hasPolys = useMemo(() => ab.available && ab.instances.some((i) => i.polygon && i.polygon.length > 2), [ab]);

  if (!ab.available) {
    return (
      <Card title="Localised findings" icon={<ScanSearch size={18} className="text-turquoise-deep" />}>
        <p className="text-sm text-ink-soft">{ab.backend === "skipped" ? "Localisation was switched off for this run." : `Localisation unavailable${ab.error ? `: ${ab.error}` : "."}`}</p>
      </Card>
    );
  }
  const s = ab.summary;
  const prov = ab.provenance;
  const rv = ab.review;
  const showInteractive = view === "interactive" && hasPolys && preview;

  return (
    <Card title="Localised findings" icon={<ScanSearch size={18} className="text-turquoise-deep" />}
      aside={<div className="flex items-center gap-1.5">
        {ab.localisation_reliable === false && <Badge tone="bad">outlines judged wrong · hidden in chat</Badge>}
        {ab.correction?.added ? <Badge tone="ok">{`second reader ${ab.correction.replaced ? "replaced with" : "added"} ${ab.correction.added}`}</Badge> : null}
        {rv?.applied && <Badge tone="info">{`reviewed: ${rv.confirmed} confirmed${rv.disputed ? `, ${rv.disputed} disputed` : ""}${rv.removed.length ? `, ${rv.removed.length} removed` : ""}`}</Badge>}
        <Badge tone={ab.instance_count ? "info" : "ok"}>{ab.instance_count ? `${ab.instance_count} instance${ab.instance_count > 1 ? "s" : ""}` : "none detected"}</Badge>
      </div>}>
      <p className="text-xs text-ink-soft mb-3">
        Discrete visible abnormalities: proposals from up to three independent sources are fused into instances, outlined pixel-wise by SAM 2.1, and each numbered region is reviewed by the second reader.
        Counts are ordinal signals (none / few / several / many), not an exact tally.
        {ab.source === "classifier_attention" && " These regions were proposed by the classifier's own attention because no source found a discrete instance."}
      </p>

      {ab.instances.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <button className={chip(!!showInteractive)} onClick={() => setView("interactive")} disabled={!hasPolys || !preview}>
            <Layers size={12} /> Interactive outlines
          </button>
          <button className={chip(!showInteractive && view !== "heatmap")} onClick={() => setView("masks")}>Mask overlay</button>
          {ab.heatmap && <button className={chip(view === "heatmap")} onClick={() => setView("heatmap")}>Reader heat map</button>}
          <span className="text-ink-soft ml-auto hidden sm:inline">Hover a row or a region</span>
        </div>
      )}

      {ab.localisation_reliable === false && (
        <div className="mb-3 rounded-xl bg-coral-tint text-coral text-sm px-4 py-3">
          {ab.correction?.hidden_reason ?? "The second reader judged these outlines unreliable."} They are listed below for the reviewer but were not shown to the patient and did not influence the triage level.
        </div>
      )}
      {view === "heatmap" && ab.heatmap ? (
        <div>
          <img src={ab.heatmap} alt="Second reader heat map" className="w-full rounded-xl border border-border" />
          <p className="text-[11px] text-ink-soft mt-1">Soft map built from the second reader's own lesion boxes ({ab.heatmap_boxes}); an orientation aid, not a measurement.</p>
        </div>
      ) : ab.instances.length === 0 ? (
        ab.heatmap ? (
          <div>
            <img src={ab.heatmap} alt="Second reader heat map" className="w-full rounded-xl border border-border" />
            <p className="text-[11px] text-ink-soft mt-1">No reliable outline could be drawn; this soft map shows where the second reader saw changes ({ab.heatmap_boxes} area{ab.heatmap_boxes === 1 ? "" : "s"}).</p>
          </div>
        ) : (
          <div className="rounded-xl bg-jade-tint text-jade text-sm px-4 py-6 text-center">No discrete abnormality instance above the {pct(ab.confidence_threshold ?? 0.3)} confidence threshold.</div>
        )
      ) : showInteractive ? (
        <div className="relative w-full rounded-xl overflow-hidden border border-border bg-black/5">
          <img src={preview} alt="Analysed photo" className="w-full block select-none" draggable={false} />
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {ab.instances.map((i, k) => {
              const color = PALETTE[k % PALETTE.length];
              const pts = (i.polygon ?? []).map(([x, y]) => `${(x * 1000).toFixed(1)},${(y * 1000).toFixed(1)}`).join(" ");
              const on = active === i.id;
              const dim = active != null && !on;
              return (
                <polygon key={i.id} points={pts} fill={color} fillOpacity={on ? 0.42 : dim ? 0.08 : 0.2}
                  stroke={color} strokeWidth={on ? 7 : 4} strokeOpacity={dim ? 0.35 : 1} vectorEffect="non-scaling-stroke"
                  style={{ cursor: "pointer", transition: "fill-opacity .15s" }}
                  onMouseEnter={() => setActive(i.id)} onMouseLeave={() => setActive(null)} onClick={() => setActive(on ? null : i.id)}
                  className={i.review?.disputed ? "[stroke-dasharray:8_6]" : ""} />
              );
            })}
          </svg>
          {ab.instances.map((i, k) => {
            const color = PALETTE[k % PALETTE.length];
            const [bx, by] = i.bbox;
            const left = (bx / size[0]) * 100, top = (by / size[1]) * 100;
            const on = active === i.id;
            return (
              <div key={i.id} className="absolute -translate-y-full pointer-events-none" style={{ left: `${left}%`, top: `${Math.max(top, 4)}%` }}>
                <span className="inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold w-4 h-4 shadow"
                  style={{ background: color, opacity: active != null && !on ? 0.45 : 1 }}>
                  {i.id}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        ab.overlay && <img src={ab.overlay} alt="Segmentation overlay" className="w-full rounded-xl border border-border" />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <Stat label="Burden" value={titleCase(s.burden)} />
        <Stat label="Pattern" value={titleCase(s.spatial_pattern)} />
        <Stat label="Affected area" value={pct(s.total_area_ratio, 1)} hint="of the analysed image" />
        <Stat label="Latency" value={ms(ab.latency_ms)} hint={ab.timings_ms?.vlm_grounding ? `incl. ${ms(ab.timings_ms.vlm_grounding)} VLM grounding` : ab.backend} />
      </div>

      {ab.instances.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-ink-soft">
              <th className="py-1 pr-2">#</th><th className="py-1 pr-2">What</th><th className="py-1 pr-2">Conf.</th><th className="py-1 pr-2">Sources</th>
              <th className="py-1 pr-2">Reviewer</th><th className="py-1 pr-2">Area</th><th className="py-1 pr-2">Shape</th><th className="py-1 pr-2">Circ.</th><th className="py-1 pr-2">Solid.</th>
              {ab.instances[0].classifier_attention != null && <th className="py-1 pr-2">Clf. attn</th>}
            </tr></thead>
            <tbody>
              {ab.instances.map((i, k) => (
                <tr key={i.id} className={`border-t border-border cursor-default ${active === i.id ? "bg-turquoise-tint/50" : ""}`}
                  onMouseEnter={() => setActive(i.id)} onMouseLeave={() => setActive(null)}>
                  <td className="py-1.5 pr-2"><span className="inline-block w-5 h-5 rounded-full text-white text-[10px] font-bold text-center leading-5" style={{ background: PALETTE[k % PALETTE.length] }}>{i.id}</span></td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    <div className="font-semibold text-ink">{titleCase(i.label)}</div>
                    <div className="text-[10px] text-ink-soft">{titleCase(i.type)}{i.review?.label && i.review.label.toLowerCase() !== i.label.toLowerCase() ? ` · reviewer: ${i.review.label}` : ""}</div>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{i.confidence.toFixed(2)}{i.agreement > 1 && <span className="text-[10px] text-jade ml-1">×{i.agreement}</span>}</td>
                  <td className="py-1.5 pr-2"><div className="flex gap-1">{(i.sources ?? [i.source]).map((src) => <span key={src} title={SOURCE_LABEL[src]?.title ?? src} className="rounded px-1 py-0.5 bg-white border border-border text-[10px]">{SOURCE_LABEL[src]?.label ?? src}</span>)}</div></td>
                  <td className="py-1.5 pr-2"><ReviewBadge i={i} /></td>
                  <td className="py-1.5 pr-2 tabular-nums">{pct(i.area_ratio, 2)}</td>
                  <td className="py-1.5 pr-2">{titleCase(i.shape)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{i.circularity.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{i.solidity.toFixed(2)}</td>
                  {i.classifier_attention != null && <td className="py-1.5 pr-2 tabular-nums">{i.classifier_attention.toFixed(2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {active != null && ab.instances.find((i) => i.id === active)?.review?.note && (
            <p className="text-[11px] text-ink-soft mt-1">Reviewer note on #{active}: {ab.instances.find((i) => i.id === active)?.review?.note}</p>
          )}
        </div>
      )}

      {(prov || rv) && (
        <div className="mt-4 rounded-xl bg-white border border-border p-3 text-[11px] text-ink-soft space-y-1">
          {prov && (
            <p>
              <span className="font-semibold text-ink">How these were found: </span>
              {["vlm", "gdino", "cam"].filter((k) => prov.proposals && k in prov.proposals).map((k) => `${SOURCE_LABEL[k].label} ${prov.proposals![k]}`).join(" · ") || "no proposals"}
              {prov.fused != null && ` → ${prov.fused} fused`} → {ab.instance_count} instance{ab.instance_count === 1 ? "" : "s"}.
              {prov.vlm_skipped === "confident_normal" && " VLM grounding skipped because the classifier read the image as confidently normal."}
              {prov.vlm_skipped === "no_grounding_capable_vlm" && " VLM grounding needs a grounding-capable VLM (Qwen3-VL); the active second reader cannot emit boxes."}
              {prov.vlm_grounding?.error && ` VLM grounding failed: ${prov.vlm_grounding.error}`}
              {ab.mask_model && ` Masks: ${ab.mask_model.split("/").pop()}.`}
            </p>
          )}
          {rv?.applied && (
            <p className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-ink">Second-reader review:</span>
              <span className="inline-flex items-center gap-0.5 text-jade"><Check size={12} /> {rv.confirmed} confirmed</span>
              {rv.disputed > 0 && <span className="text-amber">{rv.disputed} disputed (kept: several sources agreed)</span>}
              {rv.removed.length > 0 && <span className="inline-flex items-center gap-0.5 text-coral"><X size={12} /> {rv.removed.length} removed: {rv.removed.map((r) => `#${r.id} ${r.label} → ${r.reviewer_label || "not abnormal"}`).join("; ")}</span>}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
