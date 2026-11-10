import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Camera, CheckCircle2, ExternalLink, HeartHandshake, Lightbulb, Lock, MapPin, ShieldCheck, Stethoscope, Wallet } from "lucide-react";
import StageTimeline from "@/components/StageTimeline";
import { RISK } from "@/lib/format";
import type { AnalysisResult, StageName, StageStatus } from "@/lib/types";

export function BotAvatar({ small = false }: { small?: boolean }) {
  return (
    <span className={`${small ? "h-7 w-7" : "h-8 w-8"} shrink-0 rounded-full bg-white border border-turquoise/60 grid place-items-center shadow-sm`} aria-hidden="true">
      <img src="/hygeia-logo.svg" alt="" className={small ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

export function BotRow({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex items-end gap-2 fade-in">
      <BotAvatar small />
      <div className={wide ? "w-full max-w-[94%] sm:max-w-[82%]" : "contents"}>{children}</div>
    </div>
  );
}

/** Minimal markdown for model replies: **bold**, and "- " / "* " bullet lines. Everything else is plain text. */
function inline(line: string, key: string): ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : <span key={`${key}-${i}`}>{p}</span>));
}

export function renderLite(text: string): ReactNode {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    out.push(<ul key={`ul-${out.length}`} className="list-disc pl-5 my-1 space-y-0.5">{bullets.map((b, i) => <li key={i}>{inline(b, `b${out.length}-${i}`)}</li>)}</ul>);
    bullets = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const m = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (m) { bullets.push(m[1]); return; }
    flush();
    if (line.trim() === "") { if (out.length) out.push(<div key={`sp-${i}`} className="h-2" />); return; }
    out.push(<p key={`p-${i}`}>{inline(line.replace(/^#+\s*/, ""), `l${i}`)}</p>);
  });
  flush();
  return out;
}

export function BotBubble({ text }: { text: string }) {
  return <BotRow><div className="bubble-bot">{renderLite(text)}</div></BotRow>;
}

export function UserBubble({ text }: { text: string }) {
  return <div className="flex justify-end fade-in"><div className="bubble-user whitespace-pre-line">{text}</div></div>;
}

export function PhotoBubble({ src }: { src: string }) {
  return (
    <div className="flex justify-end fade-in">
      <div className="rounded-2xl rounded-br-md overflow-hidden border border-border bg-white shadow-sm max-w-[70%] sm:max-w-[320px]">
        <img src={src} alt="Your photo" className="block w-full max-h-[320px] object-cover" />
        <div className="px-3 py-1.5 text-[11px] text-ink-soft flex items-center gap-1"><Camera size={12} /> Your photo · analysed in memory only</div>
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <BotRow>
      <div className="bubble-bot !py-3 inline-flex items-center gap-1" aria-label="Hygeia is typing">
        <span className="typing-dot h-2 w-2 rounded-full bg-royal/60" /><span className="typing-dot h-2 w-2 rounded-full bg-royal/60" /><span className="typing-dot h-2 w-2 rounded-full bg-royal/60" />
      </div>
    </BotRow>
  );
}

export function PipelineBubble({ stages, live }: { stages: Partial<Record<StageName, StageStatus>>; live: boolean }) {
  return (
    <BotRow wide>
      <div className="rounded-2xl rounded-bl-md border border-border bg-white shadow-sm p-3">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-turquoise-deep">{live ? "Analysing your photo" : "Analysis complete"}</span>
          {live && <span className="text-[11px] text-ink-soft">usually about a minute</span>}
        </div>
        <StageTimeline status={stages} compact />
      </div>
    </BotRow>
  );
}

const RETAKE_TIPS = [
  "Fill the frame with the area of concern; keep faces, documents and surroundings out.",
  "Use daylight or a bright room; avoid flash glare and heavy shadows.",
  "Hold still and tap to focus. No filters or beauty modes.",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] uppercase tracking-wider text-ink-soft/70">{title}</p>
      {children}
    </div>
  );
}

export function ResultBubble({ r }: { r: AnalysisResult }) {
  if (r.status === "not_analysable") {
    return (
      <BotRow wide>
        <div className="rounded-2xl rounded-bl-md border border-border bg-white shadow-sm p-4 sm:p-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-tint text-amber">Couldn't analyse this photo</span>
          <h4 className="mt-3 text-lg font-semibold leading-snug text-royal-dark">{r.triage.headline}</h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.triage.summary}</p>
          <Section title="For a better photo">
            <ul className="mt-1.5 space-y-1.5">{RETAKE_TIPS.map((t) => <li key={t} className="flex gap-2 text-sm text-ink-soft"><span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-royal/40" />{t}</li>)}</ul>
          </Section>
        </div>
      </BotRow>
    );
  }
  const risk = RISK[r.triage.risk_level];
  const sr = r.second_reader;
  const scope = r.triage.scope;
  const notes = r.triage.notes ?? [];
  const actions = r.triage.actions.slice(0, 3);
  return (
    <BotRow wide>
      <div className="rounded-2xl rounded-bl-md border border-border bg-white shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${risk.bg} ${risk.text}`}>{risk.label}</span>
          {scope?.outside_trained_categories && <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-tint text-amber">Possibly not one of the six trained patterns</span>}
          {r.status === "symptoms_only" && <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-royal-tint text-royal">Based on your answers, no photo needed</span>}
        </div>
        <h4 className="mt-3 text-lg font-semibold leading-snug text-royal-dark">{r.triage.headline}</h4>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.triage.summary}</p>

        {r.abnormalities?.available && r.abnormalities.localisation_reliable !== false && r.abnormalities.overlay && r.abnormalities.instance_count > 0 && (
          <div className="mt-4 rounded-xl overflow-hidden border border-border bg-ice">
            <img src={r.abnormalities.overlay} alt="Your photo with the areas the models outlined" className="block w-full max-h-[280px] object-contain bg-black/5" />
            <p className="px-3 py-1.5 text-[11px] text-ink-soft">
              Where the models looked: {r.abnormalities.instance_count} outlined {r.abnormalities.instance_count === 1 ? "area" : "areas"}, each checked by the second reader
              {r.abnormalities.correction?.added ? `, which ${r.abnormalities.correction.replaced ? "replaced the outlines with" : "added"} ${r.abnormalities.correction.added} it could see` : ""}.
            </p>
          </div>
        )}
        {r.abnormalities?.available && (r.abnormalities.localisation_reliable === false || !r.abnormalities.instance_count) && r.abnormalities.heatmap && (
          <div className="mt-4 rounded-xl overflow-hidden border border-border bg-ice">
            <img src={r.abnormalities.heatmap} alt="Soft heat map of where the second reader saw changes" className="block w-full max-h-[280px] object-contain bg-black/5" />
            <p className="px-3 py-1.5 text-[11px] text-ink-soft">
              {r.abnormalities.localisation_reliable === false ? "The crisp outlines didn't pass the second reader's check, so instead this is " : "No reliable outline could be drawn, so this is "}
              a soft map of where the second reader saw the changes ({r.abnormalities.heatmap_boxes} {r.abnormalities.heatmap_boxes === 1 ? "area" : "areas"}). An orientation aid, not a measurement.
            </p>
          </div>
        )}
        {r.abnormalities?.available && r.abnormalities.localisation_reliable === false && !r.abnormalities.heatmap && (
          <p className="mt-4 rounded-xl border border-border bg-ice px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
            The outlines the segmenter drew did not pass the second reader's check, so I'm not showing that markup. The assessment above does not rely on it.
          </p>
        )}

        {sr?.available && sr.patient_summary && (
          <div className="mt-4 rounded-xl border border-border bg-ice p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft/70">What the second look saw</p>
            <p className="mt-1 text-sm leading-relaxed text-royal-dark">{sr.patient_summary}</p>
            {scope?.best_match && scope.best_match.toLowerCase() !== "uncertain" && (
              <p className="mt-2 text-xs text-ink-soft">Closest visual match: <span className="font-semibold text-royal-dark">{scope.best_match}</span>{sr.transmission_note ? ` · ${sr.transmission_note}` : ""}</p>
            )}
          </div>
        )}

        {actions.length > 0 && (
          <Section title="What to do next">
            <ul className="mt-2 space-y-1.5">
              {actions.map((a) => <li key={a} className="flex gap-2 text-sm leading-relaxed text-ink"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-jade" />{a}</li>)}
            </ul>
          </Section>
        )}

        {scope?.differential && scope.differential.length > 0 && (
          <Section title="Other things a clinician would consider">
            <ul className="mt-2 space-y-1">
              {scope.differential.map((d) => <li key={d} className="flex gap-2 text-sm leading-relaxed text-ink-soft"><Stethoscope size={15} className="mt-0.5 shrink-0 text-royal/60" />{d}</li>)}
            </ul>
          </Section>
        )}

        {notes.length > 0 && (
          <div className="mt-4 rounded-xl bg-jade-tint p-3.5 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-jade"><Lightbulb size={15} /> Good to know</p>
            {notes.map((n) => <p key={n} className="text-sm leading-relaxed text-royal-dark/85">{n}</p>)}
          </div>
        )}

        {r.triage.testing.length > 0 && (
          <div className="mt-3 rounded-xl bg-turquoise-tint p-3.5">
            <p className="text-sm font-medium text-royal-dark">At the clinic you can ask about</p>
            <p className="mt-1 text-sm leading-relaxed text-royal-dark/80">{r.triage.testing.join(" · ")}</p>
          </div>
        )}

        <Link to={`/result/${r.result_id}`} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-royal/25 px-4 py-2.5 text-sm font-semibold text-royal hover:bg-royal/5 hover:border-royal/40 transition-colors">
          See the full report <ArrowRight size={16} />
        </Link>
      </div>
    </BotRow>
  );
}

export function clinicMapUrl(town?: string, coords?: [number, number]): string {
  if (coords) return `https://www.google.com/maps/search/sexual+health+clinic/@${coords[0].toFixed(5)},${coords[1].toFixed(5)},13z`;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`sexual health clinic ${town ?? "near me"}`);
}

export function ClinicBubble({ town, coords }: { town?: string; coords?: [number, number] }) {
  const url = clinicMapUrl(town, coords);
  const where = coords ? "near your location" : town ? `near ${town}` : "near you";
  const assurances = [
    { icon: Wallet, text: "Public sexual-health services test free or low-cost in most countries, and you rarely need a referral." },
    { icon: Lock, text: "Confidential. Sexual-health clinics are built around discretion; in many places you can give a name of your choice." },
    { icon: HeartHandshake, text: "Staff see this every day. The sentence you've been rehearsing is the most ordinary one in that building." },
  ];
  return (
    <BotRow wide>
      <div className="rounded-2xl rounded-bl-md border border-border bg-white shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-turquoise-deep"><MapPin size={14} /> Where to go</div>
        <h4 className="mt-2.5 text-lg font-semibold leading-snug text-royal-dark">Sexual health clinics {where}</h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">A visit usually means a short conversation, an examination and a test, with results explained to you. Most visits are done well inside half an hour.</p>
        <ul className="mt-4 space-y-2.5">
          {assurances.map((a) => <li key={a.text} className="flex items-start gap-2.5"><a.icon size={16} className="mt-0.5 shrink-0 text-royal" /><span className="text-sm leading-relaxed text-ink-soft">{a.text}</span></li>)}
        </ul>
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-royal px-4 py-3 text-sm font-semibold text-ice hover:bg-royal-dark transition-colors">
          <MapPin size={16} /> Open clinics on Google Maps <ExternalLink size={14} />
        </a>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-soft/70">
          Search terms that work: "sexual health clinic", "STI testing", "GUM clinic" (UK), "STD clinic" or "Planned Parenthood" (US). A GP or dermatologist can also look at skin changes.
        </p>
      </div>
    </BotRow>
  );
}

export interface Quick { label: string; onClick: () => void; variant?: "default" | "on" | "go" | "ghost"; icon?: ReactNode; disabled?: boolean }

export function QuickReplies({ items }: { items: Quick[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mx-auto max-w-3xl w-full px-3 sm:px-4 pb-2 flex flex-wrap gap-2 fade-in">
      {items.map((it) => (
        <button key={it.label} type="button" onClick={it.onClick} disabled={it.disabled}
          className={`quick ${it.variant === "on" ? "quick-on" : it.variant === "go" ? "quick-go" : it.variant === "ghost" ? "!border-transparent !bg-transparent text-ink-soft hover:!bg-muted" : ""}`}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  );
}

export function PrivacyNote() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-soft/80 py-3">
      <ShieldCheck size={13} className="text-jade" /> Anonymous · processed in memory · nothing stored on the server
    </div>
  );
}
