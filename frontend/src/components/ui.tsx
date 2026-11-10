import type { ReactNode } from "react";

export function Card({ title, icon, children, className = "", aside }: { title?: string; icon?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`card p-5 sm:p-6 fade-in ${className}`}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 mb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">{icon}{title}</h2>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" }) {
  const cls = {
    neutral: "bg-muted text-ink-soft", ok: "bg-jade-tint text-jade", warn: "bg-amber-tint text-amber",
    bad: "bg-coral-tint text-coral", info: "bg-royal-tint text-royal",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export function Meter({ value, color = "bg-royal", label }: { value: number; color?: string; label?: string }) {
  return (
    <div className="w-full">
      {label && <div className="text-xs text-ink-soft mb-1">{label}</div>}
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">{label}</div>
      <div className="text-lg font-bold text-ink leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-ink-soft mt-0.5">{hint}</div>}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 rounded-full border-2 border-royal/30 border-t-royal animate-spin ${className}`} />;
}
