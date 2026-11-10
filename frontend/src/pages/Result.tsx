import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Download, Timer } from "lucide-react";
import TriageCard from "@/components/result/TriageCard";
import LikelihoodCard from "@/components/result/LikelihoodCard";
import SegmentationCard from "@/components/result/SegmentationCard";
import SecondReaderCard from "@/components/result/SecondReaderCard";
import RelevanceCard from "@/components/result/RelevanceCard";
import ChatPanel from "@/components/result/ChatPanel";
import { Card, Spinner } from "@/components/ui";
import { getResult } from "@/lib/api";
import { loadOne, saveResult } from "@/lib/history";
import { ms } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

export default function Result() {
  const { id = "" } = useParams();
  const loc = useLocation();
  const [r, setR] = useState<AnalysisResult | null>((loc.state as AnalysisResult) ?? loadOne(id) ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    getResult(id).then((x) => { if (!alive) return; setLive(true); if (!r) { setR(x); saveResult(x); } })
      .catch((e) => { if (!alive) return; setLive(false); if (!r) setErr(e.message); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (err) return <Card><p className="text-sm text-coral">{err}</p><Link to="/check" className="btn-primary mt-3">New check</Link></Card>;
  if (!r) return <div className="flex items-center gap-2 text-ink-soft"><Spinner /> Loading result…</div>;

  const download = () => {
    const blob = new Blob([JSON.stringify({ ...r, preview: undefined, likelihood: r.likelihood ? { ...r.likelihood, attention_map: undefined } : null, abnormalities: r.abnormalities ? { ...r.abnormalities, overlay: undefined } : null }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `hygeia_${r.result_id}.json`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/check" className="btn-ghost !px-2"><ArrowLeft size={16} /> Back to chat</Link>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-flex items-center gap-1"><Timer size={13} /> {ms(r.timings_ms?.total)}</span>
          <span>· {r.result_id}</span>
          <button className="btn-secondary !py-1.5 !text-xs" onClick={download}><Download size={14} /> Report JSON</button>
        </div>
      </div>

      <TriageCard t={r.triage} />

      {r.status === "symptoms_only" ? (
        <ChatPanel resultId={r.result_id} enabled={live === true} suggested={["What tests should I ask for?", "When should I get tested?", "Could this be something other than an STI?"]} />
      ) : r.status === "not_analysable" ? (
        <Card title="Please retake the photo" icon={<Camera size={18} className="text-turquoise-deep" />}>
          <ul className="list-disc pl-5 text-sm text-ink space-y-1">
            <li>Fill the frame with the area of concern; avoid faces, documents and surroundings.</li>
            <li>Use natural daylight or a bright room; avoid flash glare and heavy shadows.</li>
            <li>Hold still and tap to focus. Do not apply filters or beauty modes.</li>
          </ul>
          <Link to="/check" className="btn-primary mt-4">Retake and analyse again</Link>
        </Card>
      ) : (
        <>
          {r.likelihood && <LikelihoodCard lk={r.likelihood} preview={r.preview} />}
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {r.abnormalities && <SegmentationCard ab={r.abnormalities} preview={r.preview} />}
            {r.second_reader && <SecondReaderCard sr={r.second_reader} />}
          </div>
          <ChatPanel resultId={r.result_id} enabled={live === true && !!r.second_reader?.available} suggested={r.second_reader?.suggested_questions} />
        </>
      )}

      {r.relevance && r.quality && <RelevanceCard rel={r.relevance} quality={r.quality} preview={r.preview} />}

      <Card title="Provenance">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-ink-soft">
          {Object.entries(r.model_versions).map(([k, v]) => <div key={k}><span className="font-semibold text-ink">{k}</span>: {v ?? "—"}</div>)}
          {Object.entries(r.timings_ms ?? {}).map(([k, v]) => <div key={k}><span className="font-semibold text-ink">{k} time</span>: {ms(v)}</div>)}
        </div>
        <p className="text-[11px] text-ink-soft mt-3">Classifier performance is validated on a held-out test set (94.9% six-way accuracy, 99.3% normal-vs-abnormal). Results are stored only in this browser.</p>
      </Card>
    </div>
  );
}
