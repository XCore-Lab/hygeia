import { Camera, CheckCircle2, MapPin, ScanSearch } from "lucide-react";

/** A static mock of the real chat, framed as a phone, for the hero. */
const HeroPhone = () => {
  return (
    <div className="relative mx-auto w-[17rem] sm:w-[19rem] lg:w-[21rem] animate-float">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-turquoise/30 via-electric/20 to-royal/10 blur-2xl pointer-events-none" />
      <div className="relative rounded-[2.4rem] bg-royal-dark p-2 shadow-2xl ring-1 ring-black/10">
        <div className="rounded-[2rem] bg-ice overflow-hidden">
          {/* status bar + header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 bg-ice/95 border-b border-border">
            <div className="flex items-center gap-2">
              <img src="/hygeia-logo.svg" alt="" className="h-5 w-5" />
              <span className="text-sm font-semibold text-royal">Hygeia</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-jade" /> Ready</span>
          </div>

          <div className="px-3 py-3 space-y-2.5 text-[11.5px] leading-snug">
            <div className="flex items-end gap-1.5">
              <span className="h-5 w-5 shrink-0 rounded-full bg-white border border-turquoise/60 grid place-items-center"><img src="/hygeia-logo.svg" alt="" className="h-3 w-3" /></span>
              <div className="rounded-2xl rounded-bl-md bg-white border border-border px-3 py-2 text-ink shadow-sm max-w-[85%]">
                Hi, I'm Hygeia. Share a photo and I'll tell you how urgent it looks and where to go.
              </div>
            </div>

            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-md overflow-hidden border border-border bg-white shadow-sm w-[58%]">
                <div className="h-20 bg-gradient-to-br from-[#f3d2c1] via-[#e9b9a3] to-[#d8a08a] relative">
                  <span className="absolute left-7 top-5 h-5 w-5 rounded-full bg-[#c9736a]/70 blur-[1px]" />
                  <span className="absolute left-12 top-9 h-3.5 w-3.5 rounded-full bg-[#c9736a]/60 blur-[1px]" />
                  <span className="absolute inset-0 grid place-items-center"><Camera size={18} className="text-white/80" /></span>
                </div>
                <div className="px-2 py-1 text-[9px] text-ink-soft">Your photo · in memory only</div>
              </div>
            </div>

            <div className="flex justify-end"><div className="rounded-2xl rounded-br-md bg-royal text-white px-3 py-1.5">Bumps, 1–4 weeks, not painful</div></div>

            <div className="flex items-end gap-1.5">
              <span className="h-5 w-5 shrink-0 rounded-full bg-white border border-turquoise/60 grid place-items-center"><img src="/hygeia-logo.svg" alt="" className="h-3 w-3" /></span>
              <div className="rounded-2xl rounded-bl-md bg-white border border-border p-3 shadow-sm w-full">
                <span className="inline-flex rounded-full bg-amber-tint text-amber px-2 py-0.5 text-[10px] font-semibold">Worth getting checked</span>
                <p className="mt-1.5 font-semibold text-royal-dark text-[12px] leading-tight">A pattern that resembles genital warts</p>
                <div className="mt-2 rounded-lg border border-border bg-ice p-1.5 flex items-center gap-2">
                  <span className="relative h-9 w-12 shrink-0 rounded bg-gradient-to-br from-[#f3d2c1] to-[#d8a08a] overflow-hidden">
                    <span className="absolute left-2.5 top-2 h-4 w-4 rounded-full border-2 border-turquoise" />
                    <span className="absolute left-6 top-4 h-3 w-3 rounded-full border-2 border-royal" />
                  </span>
                  <span className="text-[10px] text-ink-soft leading-tight"><ScanSearch size={11} className="inline mr-0.5 text-turquoise-deep" />2 areas outlined, both reviewed</span>
                </div>
                <ul className="mt-2 space-y-1 text-[10.5px] text-ink">
                  <li className="flex gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-jade" />Book a confidential check within 1–2 weeks</li>
                  <li className="flex gap-1.5"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-jade" />Spreads by skin contact; very treatable</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-turquoise text-royal-dark px-2.5 py-1 text-[10px] font-semibold"><MapPin size={11} /> Find a clinic near me</span>
              <span className="inline-flex items-center rounded-full border border-royal/25 bg-white text-royal px-2.5 py-1 text-[10px] font-medium">Is this serious?</span>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="rounded-full border border-border bg-white px-3 py-1.5 text-[10px] text-ink-soft flex items-center justify-between">
              Ask me anything…
              <span className="h-5 w-5 rounded-full bg-royal/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroPhone;
