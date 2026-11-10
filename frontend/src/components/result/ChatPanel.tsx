import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Card, Spinner } from "@/components/ui";
import { chat } from "@/lib/api";

const STARTERS = ["Is this serious?", "What will happen at the clinic?", "Can this be treated?", "Should I tell my partner?"];

export default function ChatPanel({ resultId, enabled, suggested }: { resultId: string; enabled: boolean; suggested?: string[] }) {
  const [history, setHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history, busy]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setDraft(""); setError(null);
    setHistory((h) => [...h, { role: "user", text: msg }]);
    setBusy(true);
    try {
      const r = await chat(resultId, msg);
      setHistory((h) => [...h, { role: "assistant", text: r.reply }]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  };

  const chips = [...(suggested ?? []).slice(0, 2), ...STARTERS].slice(0, 4);

  return (
    <Card title="Ask about this result" icon={<MessageCircle size={18} className="text-turquoise-deep" />}>
      {!enabled ? (
        <p className="text-sm text-ink-soft">Follow-up chat needs the second reader enabled on the server and a result that is still in server memory.</p>
      ) : (
        <>
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {history.length === 0 && <p className="text-xs text-ink-soft">Private, anonymous, grounded on the findings above. Nothing you type is stored after the session.</p>}
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-royal text-white rounded-br-md" : "bg-muted text-ink rounded-bl-md"}`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-ink-soft"><Spinner /> thinking…</div>}
            {error && <div className="text-xs text-coral">{error}</div>}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {chips.map((c) => <button key={c} className="chip bg-white border-border text-ink-soft hover:border-royal/50" onClick={() => send(c)} disabled={busy}>{c}</button>)}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
            <input className="input" placeholder="Type a question…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} maxLength={2000} />
            <button className="btn-primary !px-3" type="submit" disabled={busy || !draft.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
        </>
      )}
    </Card>
  );
}
