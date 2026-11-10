import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Lock, Sparkles, Wand2 } from "lucide-react";
import Uploader from "@/components/Uploader";
import QuestionnaireForm, { EMPTY_Q } from "@/components/QuestionnaireForm";
import StageTimeline from "@/components/StageTimeline";
import { Card } from "@/components/ui";
import { analyzeStream } from "@/lib/api";
import { saveResult } from "@/lib/history";
import type { AnalyzeOptions, Questionnaire, StageName, StageStatus } from "@/lib/types";

export default function Analyze() {
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [q, setQ] = useState<Questionnaire>(EMPTY_Q);
  const [opts, setOpts] = useState<AnalyzeOptions>({ likelihood_mode: "ensemble", tta: false, segmentation: true, vlm: true });
  const [consent, setConsent] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Partial<Record<StageName, StageStatus>>>({});
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = async () => {
    if (!file) return;
    setError(null); setRunning(true); setStatus({});
    abortRef.current = new AbortController();
    try {
      const result = await analyzeStream(file, q, opts, (ev) => setStatus((s) => ({ ...s, [ev.stage]: ev.status })), abortRef.current.signal);
      saveResult(result);
      nav(`/result/${result.result_id}`, { state: result });
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">Check a skin concern privately</h1>
          <p className="text-ink-soft mt-1 max-w-2xl text-sm sm:text-base">
            Upload a photo and answer a few optional questions. Four models look at it in sequence and you get a plain-language
            risk assessment, what was seen and where, and what to do next. <strong>This is not a diagnosis.</strong>
          </p>
        </div>

        <Card title="1 · Photo" icon={<Sparkles size={18} className="text-turquoise-deep" />}>
          <Uploader file={file} onFile={setFile} />
        </Card>

        <Card title="2 · A few questions (optional, improves the triage)" icon={<Wand2 size={18} className="text-turquoise-deep" />}>
          <QuestionnaireForm value={q} onChange={setQ} />
        </Card>

        <Card title="3 · Analysis settings" icon={<Lock size={18} className="text-turquoise-deep" />}>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
              <input type="checkbox" className="mt-1" checked={opts.likelihood_mode === "ensemble"} onChange={(e) => setOpts({ ...opts, likelihood_mode: e.target.checked ? "ensemble" : "single" })} />
              <span><span className="font-semibold">Ensemble classifier</span><br /><span className="text-ink-soft text-xs">ViT-L/14 + two ViT-B/14 members with validation-selected weights (best ranking quality). Off = single production model.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
              <input type="checkbox" className="mt-1" checked={!!opts.tta} onChange={(e) => setOpts({ ...opts, tta: e.target.checked })} />
              <span><span className="font-semibold">Test-time augmentation</span><br /><span className="text-ink-soft text-xs">Averages four views (original, flip, tight crop, full resize). Slower; slightly better-ordered probabilities.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
              <input type="checkbox" className="mt-1" checked={opts.segmentation} onChange={(e) => setOpts({ ...opts, segmentation: e.target.checked })} />
              <span><span className="font-semibold">Localise abnormalities</span><br /><span className="text-ink-soft text-xs">Instance masks, size, shape and distribution of visible findings.</span></span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50">
              <input type="checkbox" className="mt-1" checked={opts.vlm} onChange={(e) => setOpts({ ...opts, vlm: e.target.checked })} />
              <span><span className="font-semibold">Second reader (MedGemma)</span><br /><span className="text-ink-soft text-xs">A medical vision-language model describes the image, cross-checks the classifier and writes your note. Adds ~30–60 s on a laptop GPU.</span></span>
            </label>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-ink-soft">I understand this tool supports triage and is <strong>not a medical diagnosis</strong>; the photo is processed in memory for this analysis only and I am not uploading anyone else's image without consent.</span>
          </label>
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-coral-tint text-coral px-3 py-2 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button className="btn-primary" disabled={!file || !consent || running} onClick={submit}>
              {running ? "Analysing…" : "Run analysis"}
            </button>
            {running && <button className="btn-ghost" onClick={() => abortRef.current?.abort()}>Cancel</button>}
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card title="Pipeline" className="lg:sticky lg:top-24">
          <StageTimeline status={status} />
          <p className="text-[11px] text-ink-soft mt-4 leading-relaxed">
            The relevance gate is terminal: a photo that is not analysable skin content stops here and you are asked to retake it. That outcome is never reported as "nothing found".
          </p>
        </Card>
      </aside>
    </div>
  );
}
