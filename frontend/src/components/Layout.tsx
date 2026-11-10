import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, Clock, Cpu, Home, MessageCircle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { RESTART_CHAT_EVENT } from "@/lib/chat";
import { getHealth } from "@/lib/api";
import type { HealthInfo } from "@/lib/types";

/** App shell for the chat, results, history and clinician pages. The public
 *  landing pages render their own header and footer. */
export default function Layout() {
  const { pathname } = useLocation();
  const isChat = pathname === "/check";
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [down, setDown] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try { const h = await getHealth(); if (alive) { setHealth(h); setDown(false); } }
      catch { if (alive) setDown(true); }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const models = health ? Object.values(health.models) : [];
  const ready = models.filter((m) => m.status === "ready").length;
  const loading = models.some((m) => m.status === "not_loaded");
  const status = down ? { dot: "bg-coral", text: "Offline" }
    : !health ? { dot: "bg-amber animate-pulse", text: "Connecting" }
    : loading ? { dot: "bg-amber animate-pulse", text: `Warming up ${ready}/${models.length}` }
    : { dot: "bg-jade", text: "Ready" };

  const nav = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-royal-tint text-royal" : "text-ink-soft hover:text-royal"}`;

  return (
    <div className={`${isChat ? "h-dvh overflow-hidden" : "min-h-dvh"} flex flex-col bg-ice`}>
      <header className="sticky top-0 z-30 bg-ice/90 backdrop-blur-xl border-b border-border shrink-0">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 h-14 lg:h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/hygeia-logo.svg" alt="" aria-hidden="true" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
            <span className="leading-none min-w-0">
              <span className="block text-lg sm:text-xl font-semibold tracking-tight text-royal">Hygeia</span>
              <span className="hidden sm:block mt-1 text-[11px] font-medium tracking-wide text-turquoise-deep truncate">Anonymous · No judgement · Private vision triage</span>
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-ink-soft mr-1" title={health ? `Device: ${String(health.gpu.device ?? health.device)}` : undefined}>
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.text}
            </span>
            {isChat ? (
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(RESTART_CHAT_EVENT))} title="Start a new check"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-royal bg-royal-tint hover:bg-royal/15 transition-colors">
                <RotateCcw size={15} /><span className="hidden sm:inline">Start over</span>
              </button>
            ) : (
              <NavLink to="/check" className={nav}><MessageCircle size={16} /><span className="hidden sm:inline">Check</span></NavLink>
            )}
            <NavLink to="/history" className={nav}><Clock size={16} /><span className="hidden sm:inline">History</span></NavLink>
            <div className="relative" ref={menuRef}>
              <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-medium text-ink-soft hover:text-royal" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="More">
                <ChevronDown size={16} className={`transition-transform ${menu ? "rotate-180" : ""}`} />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-white shadow-soft p-1.5 fade-in">
                  <div className="sm:hidden px-3 py-2 text-xs text-ink-soft flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.text}</div>
                  <Link to="/" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink hover:bg-royal-tint"><Home size={15} /> Home page</Link>
                  <div className="my-1 border-t border-border" />
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">For clinicians</div>
                  <Link to="/models" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink hover:bg-royal-tint"><Cpu size={15} /> Models & metrics</Link>
                  <Link to="/advanced" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink hover:bg-royal-tint"><SlidersHorizontal size={15} /> Advanced analysis</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isChat ? (
        <main className="flex-1 min-h-0"><Outlet /></main>
      ) : (
        <>
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:py-8"><Outlet /></main>
          <footer className="border-t border-border py-6 text-center text-xs text-ink-soft px-4">
            Private AI triage for sexual-health concerns. Photos are processed in memory and never stored on the server.
          </footer>
        </>
      )}
    </div>
  );
}
