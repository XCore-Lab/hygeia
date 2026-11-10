import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Eye, EyeOff, HelpCircle, ImagePlus, MapPin, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import StageTimeline from "@/components/StageTimeline";
import Composer from "@/components/chat/Composer";
import CropSheet from "@/components/chat/CropSheet";
import {
  BotBubble, ClinicBubble, PhotoBubble, PipelineBubble, PrivacyNote, QuickReplies, ResultBubble, TypingBubble, UserBubble, type Quick,
} from "@/components/chat/Bubbles";
import { analyzeStream, chat as chatApi, getHealth, precheck, triageOnly } from "@/lib/api";
import { loadOne, saveResult } from "@/lib/history";
import { RESTART_CHAT_EVENT } from "@/lib/chat";
import { EMPTY_Q, QUESTIONS, QUESTION_STEPS, VISIBLE_SYMPTOMS, makeThumb, nextStep, symptomLabel, type Option, type QuestionStep, type Step } from "@/lib/intake";
import type { AnalysisResult, Questionnaire, StageName, StageStatus } from "@/lib/types";

type Msg =
  | { id: string; role: "bot"; kind: "text"; text: string }
  | { id: string; role: "user"; kind: "text"; text: string }
  | { id: string; role: "user"; kind: "photo"; src: string }
  | { id: string; role: "bot"; kind: "pipeline"; snapshot?: Partial<Record<StageName, StageStatus>> }
  | { id: string; role: "bot"; kind: "result"; resultId: string }
  | { id: string; role: "bot"; kind: "clinic"; town?: string; coords?: [number, number] };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type MsgInput = DistributiveOmit<Msg, "id">;

interface Saved { messages: Msg[]; step: Step; q: Questionnaire; thumb: string | null; resultId: string | null; noPhoto?: boolean }

const KEY = "hygeia.chat.v2";
const OPTS = { likelihood_mode: "ensemble" as const, tta: false, segmentation: true, vlm: true };
const STARTERS = ["Is this serious?", "What will happen at the clinic?", "Can this be treated?", "Should I tell my partner?"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const nid = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;
const isQuestion = (s: Step): s is QuestionStep => (QUESTION_STEPS as Step[]).includes(s);

function riskFollowUp(r: AnalysisResult): string[] {
  const bits: string[] = [];
  if (r.triage.scope?.outside_trained_categories) {
    const best = r.triage.scope.best_match && r.triage.scope.best_match.toLowerCase() !== "uncertain" ? ` The closest match I can see is ${r.triage.scope.best_match}.` : "";
    bits.push(`One important thing: what I can see may be something outside the six patterns I was trained on.${best} A clinician can identify it in person, and most other genital skin conditions are common and easily treated.`);
  }
  if (r.questionnaire?.exposure === "none" && r.triage.risk_level !== "low") {
    bits.push("Since you've had no recent sexual contact, an STI is less likely but not impossible: herpes, warts and molluscum spread by skin-to-skin contact and can show up months later, and several look-alikes (thrush, balanitis, dermatitis, folliculitis) aren't sexually transmitted at all. A clinic can tell these apart quickly.");
  }
  const tail = (() => { switch (r.triage.risk_level) {
    case "urgent": return "I'd like you to be seen promptly. What I can see and what you told me together point to not waiting. I can show you where to go.";
    case "high": return "I'd suggest seeing a clinician soon rather than waiting to see how it goes. A test will tell you exactly what this is, and treatment works best early.";
    case "moderate": return "This looks worth getting checked, without panic. A clinic visit is quick, usually free or low-cost, and will give you a real answer.";
    default: return "Nothing here is shouting for attention. If it changes, becomes painful or you have other symptoms, a check-up is still a good idea, and you're always welcome back.";
  } })();
  return [...bits, tail];
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>("consent");
  const [q, setQ] = useState<Questionnaire>(EMPTY_Q);
  const [picks, setPicks] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [noPhoto, setNoPhoto] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);
  const [typing, setTyping] = useState(false);
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Partial<Record<StageName, StageStatus>>>({});
  const [warming, setWarming] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);
  const stepRef = useRef<Step>("consent");
  stepRef.current = step;
  const queue = useRef<Promise<void>>(Promise.resolve());
  const warnedWarming = useRef(false);

  // ---- helpers -------------------------------------------------------------
  const push = useCallback((m: MsgInput) => setMessages((prev) => [...prev, { ...m, id: nid() } as Msg]), []);
  /** Bot lines are queued with a short typing pause so several in a row read naturally. */
  const say = useCallback((text: string) => {
    setQueued((n) => n + 1);
    queue.current = queue.current.then(async () => {
      setTyping(true);
      await sleep(Math.min(1100, 250 + text.length * 5));
      setTyping(false);
      setMessages((prev) => [...prev, { id: nid(), role: "bot", kind: "text", text }]);
      setQueued((n) => Math.max(0, n - 1));
    });
    return queue.current;
  }, []);
  const after = useCallback((fn: () => void) => { queue.current = queue.current.then(fn); return queue.current; }, []);
  const addNote = useCallback((text: string) => setQ((prev) => ({ ...prev, notes: [prev.notes, text.trim()].filter(Boolean).join("\n") })), []);

  const start = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]); setStep("consent"); setQ(EMPTY_Q); setPicks([]); setFile(null); setThumb(null); setResult(null); setStages({}); setNoPhoto(false);
    say("Hi, I'm Hygeia. I'm here to help you work out how worried to be about a skin change, privately and without judgement.");
    say("Here's how it works: a few quick questions first, then a photo only if there's something to see. Four AI models tell you how urgent it looks, show you what they saw, and point you to a clinic near you.");
    say("Your photo is analysed in memory and never stored on our server, and nothing you say is attached to your name. Ready to begin?");
  }, [say]);

  // ---- restore / persist ---------------------------------------------------
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let saved: Saved | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { saved = null; }
    if (saved && saved.messages?.length) {
      setMessages(saved.messages); setQ(saved.q ?? EMPTY_Q); setThumb(saved.thumb ?? null); setNoPhoto(!!saved.noPhoto);
      const r = saved.resultId ? loadOne(saved.resultId) ?? null : null;
      setResult(r);
      const needsPhoto = !saved.noPhoto && ["photo", "analysing"].includes(saved.step);
      if (needsPhoto) {
        setStep("photo");
        say("Welcome back. Your photo isn't kept when the page reloads, so please share it again and we'll carry on from where we were.");
      } else if (saved.step !== "consent" && !r) {
        start();
      } else {
        setStep(saved.step);
      }
    } else {
      start();
    }
    getHealth().then((h) => setWarming(Object.values(h.models).some((m) => m.status === "not_loaded"))).catch(() => setWarming(null));
  }, [say, start]);

  useEffect(() => {
    if (!restored.current) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ messages, step, q, thumb, resultId: result?.result_id ?? null, noPhoto } satisfies Saved)); } catch { /* quota */ }
  }, [messages, step, q, thumb, result, noPhoto]);

  useEffect(() => {
    if (warming && !warnedWarming.current && step === "consent") {
      warnedWarming.current = true;
      say("Heads-up: my analysis models are still warming up on the server. You can start now and I'll wait for them when the time comes.");
    }
  }, [warming, step, say]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, typing, step, picks]);

  // "Start over" in the header. Nothing to lose at the greeting, otherwise ask first.
  useEffect(() => {
    const onRestart = () => {
      if (stepRef.current === "consent" || window.confirm("Start a new check? The current conversation will be cleared.")) start();
    };
    window.addEventListener(RESTART_CHAT_EVENT, onRestart);
    return () => window.removeEventListener(RESTART_CHAT_EVENT, onRestart);
  }, [start]);

  // ---- intake flow ---------------------------------------------------------
  const consent = () => {
    push({ role: "user", kind: "text", text: "I understand, let's start" });
    const first = QUESTION_STEPS[0] as QuestionStep;
    setStep(first); setPicks([]);
    say("Let's start with a few quick questions. Tap to answer, type in your own words, or skip any of them.");
    say(QUESTIONS[first].prompt);
  };

  /** After the last question: ask for a photo if something visible was reported, otherwise ask whether anything is visible. */
  const finishQuestions = (nq: Questionnaire) => {
    const vis = nq.symptoms.filter((x) => VISIBLE_SYMPTOMS.has(x));
    if (vis.length) {
      setQ({ ...nq, visible_change: true }); setNoPhoto(false);
      say(`Thanks, that's everything. Since you can see ${vis.map(symptomLabel).join(" and ")}, a photo will help a lot.`);
      askPhoto();
    } else {
      setStep("visible");
      say("Thanks, that's everything. One last thing: is there something you can actually see on the skin, like a bump, sore, blister, rash or a change in colour?");
    }
  };

  const askPhoto = () => {
    setStep("photo");
    say("Please share a clear photo of the area you're concerned about.");
    say("Tips: good light, no filters, and you'll get a crop box next so only the area of concern is sent. You can take a photo now or choose one from your gallery.");
  };

  const visibleYes = () => {
    push({ role: "user", kind: "text", text: "Yes, I can see something" });
    setQ((prev) => ({ ...prev, visible_change: true })); setNoPhoto(false);
    say("Good, a photo will help a lot then.");
    askPhoto();
  };

  const visibleUnsure = () => {
    push({ role: "user", kind: "text", text: "Not sure" });
    setQ((prev) => ({ ...prev, visible_change: null }));
    say("If you can see anything at all, even faint, a photo helps. If not, we can go by what you're feeling instead.");
    askPhoto();
  };

  const goBySymptoms = (fromVisible: boolean) => {
    push({ role: "user", kind: "text", text: fromVisible ? "No, nothing visible" : "Go by symptoms instead" });
    setQ((prev) => ({ ...prev, visible_change: false })); setNoPhoto(true); setFile(null); setThumb(null);
    say("Then a photo wouldn't help, and you don't need to share one. Many infections, including HIV, chlamydia and gonorrhoea, show nothing on the skin, so I'll go by what you've told me.");
    setStep("analysing");
  };

  const optionsOf = (s: QuestionStep): Option[] => QUESTIONS[s].options ?? [];

  /** A picked photo goes through the crop sheet first; the cropped (or whole) file then enters the gate. */
  const onPick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { say("That file doesn't look like an image. Please choose a JPG, PNG or WEBP photo."); return; }
    setCropping(f);
  };

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    let t: string;
    try { t = await makeThumb(f); } catch { say("I couldn't read that image. Could you try another one?"); return; }
    push({ role: "user", kind: "photo", src: t });
    // Gate first: no point asking questions about a photo that cannot be analysed.
    setTyping(true);
    let gate: Awaited<ReturnType<typeof precheck>> | null = null;
    try { gate = await precheck(f); } catch { gate = null; } finally { setTyping(false); }
    if (gate && !gate.is_relevant) {
      const seen = (gate.seen || "").trim();
      say(seen
        ? `I can't analyse this one: it looks like ${seen.charAt(0).toLowerCase() + seen.slice(1)}, not a close-up of skin I can read.`
        : "I can't analyse this one: it doesn't look like a close-up of skin I can read.");
      say("Could you try again? Fill the frame with the area of concern, use good light or daylight, keep the camera steady, and skip filters. Faces, documents and surroundings should stay out of the shot.");
      if (step !== "photo") say("Your earlier photo is still the one I'll use unless you replace it.");
      return;
    }
    setFile(f); setThumb(t);
    const blurry = gate?.warnings?.some((w) => /blur|sharp|dark|bright|low_res|small/i.test(w));
    if (step === "photo" || step === "visible") {
      setNoPhoto(false); setQ((prev) => ({ ...prev, visible_change: true }));
      if (blurry) say("Thanks, I can work with this. It's a little " + (gate!.warnings.some((w) => /blur|sharp/i.test(w)) ? "soft in focus" : "under- or over-lit") + ", so if you can take a sharper one later, even better.");
      say("Thank you. Let me take a careful look now, this usually takes a minute or two.");
      setStep("analysing");
    } else if (step === "done" || step === "failed" || step === "clinic") {
      setResult(null);
      say("New photo received. Let me take a look at this one, it usually takes a minute or two.");
      setStep("analysing");
    } else {
      say("Got it, I've swapped in the new photo.");
    }
  };

  const answer = (s: QuestionStep, p: string[], text = "") => {
    const def = QUESTIONS[s];
    const nq = def.apply(q, p, text);
    setQ(nq);
    push({ role: "user", kind: "text", text: def.summarise(p, text) });
    setPicks([]);
    const n = nextStep(s);
    if (n === "analysing") { finishQuestions(nq); return; }
    setStep(n);
    if (isQuestion(n)) { const nd = QUESTIONS[n]; say(nd.hint ? `${nd.prompt} ${nd.hint}` : nd.prompt); }
  };

  const skipAll = () => {
    push({ role: "user", kind: "text", text: "Skip the rest" });
    setPicks([]);
    finishQuestions(q);
  };

  const togglePick = (s: QuestionStep, id: string) => {
    const def = QUESTIONS[s];
    if (def.mode === "single") { answer(s, [id]); return; }
    const opts = optionsOf(s);
    const opt = opts.find((o) => o.id === id);
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (opt?.exclusive) return [id];
      return [...prev.filter((x) => !opts.find((o) => o.id === x)?.exclusive), id];
    });
  };

  // ---- analysis ------------------------------------------------------------
  useEffect(() => {
    if (step !== "analysing") return;
    if (!noPhoto && !file) { setStep("photo"); say("I need the photo first. Please share it again."); return; }
    let cancelled = false;
    const run = async () => {
      setStages({});
      const ctrl = new AbortController(); abortRef.current = ctrl;
      // Let any queued bot lines finish before the pipeline bubble / result appears, so order reads naturally.
      await after(() => { if (noPhoto) setTyping(true); else push({ role: "bot", kind: "pipeline" }); });
      try {
        const r = noPhoto
          ? await triageOnly(q, ctrl.signal)
          : await analyzeStream(file!, q, OPTS, (ev) => setStages((s) => ({ ...s, [ev.stage]: ev.status })), ctrl.signal);
        setTyping(false);
        if (cancelled) return;
        await after(() => undefined);
        if (cancelled) return;
        saveResult(r); setResult(r);
        setMessages((prev) => prev.map((m) => (m.kind === "pipeline" && !m.snapshot ? { ...m, snapshot: finalStages(r) } : m)));
        push({ role: "bot", kind: "result", resultId: r.result_id });
        setStep("done");
        if (r.status === "not_analysable") {
          say("I couldn't analyse this one, and that's about the photo, not about you. Could you take another one following the tips above?");
        } else if (r.status === "symptoms_only") {
          for (const line of riskFollowUp(r)) say(line);
          say("You can ask me anything about this, or I can help you find a clinic near you for a test.");
        } else {
          for (const line of riskFollowUp(r)) say(line);
          say(r.second_reader?.available
            ? "You can ask me anything about this result, or I can help you find a clinic near you."
            : "Follow-up chat isn't available on this server right now, but I can help you find a clinic near you.");
        }
      } catch (e: any) {
        setTyping(false);
        if (cancelled) return;
        setMessages((prev) => prev.map((m) => (m.kind === "pipeline" && !m.snapshot ? { ...m, snapshot: {} } : m)));
        setStep("failed");
        if (e?.name === "AbortError") say("Okay, I've stopped the analysis. Tap \"Try again\" whenever you're ready.");
        else say(`Something went wrong on my side: ${e?.message ?? String(e)}. Shall we try again?`);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---- follow-up chat & clinic --------------------------------------------
  const sendChat = async (text: string) => {
    if (!result) return;
    push({ role: "user", kind: "text", text });
    setBusy(true); setTyping(true);
    try {
      const r = await chatApi(result.result_id, text);
      push({ role: "bot", kind: "text", text: r.reply });
    } catch (e: any) {
      const m = e?.message ?? String(e);
      push({ role: "bot", kind: "text", text: /expired/i.test(m) ? "That result has expired on the server, so I can't go deeper on it. You can start a new check any time." : `I couldn't answer that: ${m}` });
    } finally { setBusy(false); setTyping(false); }
  };

  const askClinic = () => {
    push({ role: "user", kind: "text", text: "Find a clinic near me" });
    setStep("clinic");
    say("Sexual health clinics exist almost everywhere, and most are confidential and free or low-cost. Which city or town are you in? Type it below, or share your location and I'll open a map of clinics near you.");
  };

  const chooseTown = (town?: string, coords?: [number, number]) => {
    push({ role: "user", kind: "text", text: town || "Use my location" });
    after(() => push({ role: "bot", kind: "clinic", town, coords }));
    setStep("done");
    say("You usually don't need a referral, and many clinics take walk-ins. Anything else you'd like to ask?");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { say("Your browser can't share a location. Type your city or town instead."); return; }
    push({ role: "user", kind: "text", text: "Use my location" });
    navigator.geolocation.getCurrentPosition(
      (p) => { after(() => push({ role: "bot", kind: "clinic", coords: [p.coords.latitude, p.coords.longitude] })); setStep("done"); say("You usually don't need a referral, and many clinics take walk-ins. Anything else you'd like to ask?"); },
      () => say("I couldn't get your location. Type your city or town instead."),
      { timeout: 10000 },
    );
  };

  const onText = (text: string) => {
    switch (step) {
      case "consent": consent(); return;
      case "visible": {
        push({ role: "user", kind: "text", text });
        if (/\b(no|nothing|none|can't see|cannot see|not visible|invisible)\b/i.test(text)) goBySymptoms(true);
        else { addNote(text); say("Thanks, I've noted that."); askPhoto(); }
        return;
      }
      case "photo":
        push({ role: "user", kind: "text", text }); addNote(text);
        say("Noted. When you're ready, share the photo and we'll continue."); return;
      case "age": {
        const n = parseInt(text, 10);
        if (!Number.isFinite(n) || n < 12 || n > 110) { push({ role: "user", kind: "text", text }); say("Please type your age as a number, or tap Skip."); return; }
        answer("age", [], String(n)); return;
      }
      case "notes": answer("notes", [], text); return;
      case "analysing": return;
      case "done":
        if ((result?.status === "analysed" && result.second_reader?.available) || (result?.status === "symptoms_only" && result.options?.vlm)) sendChat(text);
        else { push({ role: "user", kind: "text", text }); say(result?.status === "not_analysable" ? "I can't go deeper without an analysable photo. Could you retake it?" : "Follow-up chat isn't available for this result, but I can help you find a clinic or start a new check."); }
        return;
      case "clinic": chooseTown(text.trim()); return;
      case "failed":
        push({ role: "user", kind: "text", text }); say("Tap \"Try again\" when you're ready, or share a different photo."); return;
      default:
        if (isQuestion(step)) {
          push({ role: "user", kind: "text", text }); addNote(text);
          say(`Noted, I'll include that. ${QUESTIONS[step].prompt}`);
        }
    }
  };

  // ---- quick replies ---------------------------------------------------------
  const quick = useMemo<Quick[]>(() => {
    // Chips belong to the latest bot line, so hold them back until the bot has finished "typing".
    if (typing || queued > 0 || messages.length === 0) return [];
    switch (step) {
      case "consent": return [{ label: "I understand, let's start", onClick: consent, variant: "go", icon: <Sparkles size={15} /> }];
      case "visible": return [
        { label: "Yes, I can see something", onClick: visibleYes, variant: "go", icon: <Eye size={15} /> },
        { label: "No, nothing visible", onClick: () => goBySymptoms(true), icon: <EyeOff size={15} /> },
        { label: "Not sure", onClick: visibleUnsure, variant: "ghost", icon: <HelpCircle size={15} /> },
      ];
      case "photo": return [
        { label: "Take a photo", onClick: () => cameraRef.current?.click(), variant: "go", icon: <Camera size={15} /> },
        { label: "Choose from gallery", onClick: () => galleryRef.current?.click(), icon: <ImagePlus size={15} /> },
        { label: "Go by symptoms instead", onClick: () => goBySymptoms(false), variant: "ghost" },
      ];
      case "analysing": return [{ label: "Cancel", onClick: () => abortRef.current?.abort(), variant: "ghost" }];
      case "failed": return [
        { label: "Try again", onClick: () => setStep("analysing"), variant: "go", icon: <RotateCcw size={15} /> },
        { label: "Change photo", onClick: () => galleryRef.current?.click(), icon: <ImagePlus size={15} /> },
        { label: "Start over", onClick: start, variant: "ghost" },
      ];
      case "clinic": return [
        { label: "Use my location", onClick: useMyLocation, variant: "go", icon: <MapPin size={15} /> },
        { label: "Not now", onClick: () => { setStep("done"); say("No problem. Anything else you'd like to ask?"); }, variant: "ghost" },
      ];
      case "done": {
        if (!result) return [{ label: "Start a new check", onClick: start, variant: "go" }];
        if (result.status === "not_analysable") return [
          { label: "Retake photo", onClick: () => cameraRef.current?.click(), variant: "go", icon: <Camera size={15} /> },
          { label: "Choose another photo", onClick: () => galleryRef.current?.click(), icon: <ImagePlus size={15} /> },
          { label: "Start over", onClick: start, variant: "ghost" },
        ];
        const asked = new Set(messages.filter((m) => m.role === "user" && m.kind === "text").map((m) => m.text));
        const hasClinic = messages.some((m) => m.kind === "clinic");
        const chatOk = result.second_reader?.available || (result.status === "symptoms_only" && result.options?.vlm);
        const starters = result.status === "symptoms_only" ? ["What tests should I ask for?", "When should I get tested?", "Could this be something other than an STI?"] : STARTERS;
        const suggestions = chatOk
          ? [...(result.second_reader?.suggested_questions ?? []).slice(0, 2), ...starters].filter((s) => !asked.has(s)).slice(0, 3)
          : [];
        return [
          ...(!hasClinic ? [{ label: "Find a clinic near me", onClick: askClinic, variant: "go" as const, icon: <MapPin size={15} /> }] : []),
          ...suggestions.map((s) => ({ label: s, onClick: () => sendChat(s), disabled: busy })),
          { label: "Start a new check", onClick: start, variant: "ghost" },
        ];
      }
      default: {
        if (!isQuestion(step)) return [];
        const def = QUESTIONS[step];
        const items: Quick[] = [];
        if (def.mode === "text") items.push({ label: "Skip", onClick: () => answer(step, [], "") });
        else {
          for (const o of optionsOf(step)) items.push({ label: o.label, onClick: () => togglePick(step, o.id), variant: picks.includes(o.id) ? "on" : "default" });
          if (def.mode === "multi") items.push(picks.length ? { label: "Continue", onClick: () => answer(step, picks), variant: "go" } : { label: "Skip", onClick: () => answer(step, []) });
        }
        items.push({ label: "Skip the rest", onClick: skipAll, variant: "ghost" });
        return items;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, picks, result, messages, busy, typing, queued, noPhoto]);

  const placeholder =
    step === "consent" ? "Tap the button above to begin…"
    : step === "photo" ? "Share a photo, or type a note…"
    : step === "analysing" ? "Analysing… please wait"
    : step === "clinic" ? "Type your city or town…"
    : step === "visible" ? "Tap an answer above, or describe it…"
    : step === "done" && (result?.second_reader?.available || result?.status === "symptoms_only") ? "Ask me anything about this result…"
    : isQuestion(step) && QUESTIONS[step].placeholder ? QUESTIONS[step].placeholder!
    : "Type a message…";

  const chatEnabled = step !== "analysing" && step !== "consent" && !busy;
  const resultsById = useMemo(() => new Map(messages.filter((m) => m.kind === "result").map((m) => [m.resultId, loadOne(m.resultId)])), [messages]);

  return (
    <div className="mx-auto max-w-6xl h-full lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:px-4">
      {/* Chat column */}
      <section className="h-full flex flex-col min-h-0" aria-label="Hygeia chat">
        <div className="flex-1 min-h-0 overflow-y-auto scroll-contain px-3 sm:px-4 pt-4" role="log" aria-live="polite">
          <div className="mx-auto max-w-3xl space-y-3 pb-3">
            <PrivacyNote />
            {messages.map((m) => {
              switch (m.kind) {
                case "text": return m.role === "bot" ? <BotBubble key={m.id} text={m.text} /> : <UserBubble key={m.id} text={m.text} />;
                case "photo": return <PhotoBubble key={m.id} src={m.src} />;
                case "pipeline": return <PipelineBubble key={m.id} stages={m.snapshot ?? stages} live={!m.snapshot} />;
                case "result": { const r = resultsById.get(m.resultId) ?? (result?.result_id === m.resultId ? result : undefined); return r ? <ResultBubble key={m.id} r={r} /> : null; }
                case "clinic": return <ClinicBubble key={m.id} town={m.town} coords={m.coords} />;
              }
            })}
            {typing && <TypingBubble />}
            <div ref={endRef} />
          </div>
        </div>
        <div className="shrink-0 pt-1">
          {isQuestion(step) && (
            <div className="mx-auto max-w-3xl px-3 sm:px-4 pb-1.5 flex items-center gap-2 text-[11px] text-ink-soft">
              <span className="font-semibold text-turquoise-deep">Question {QUESTION_STEPS.indexOf(step) + 1} of {QUESTION_STEPS.length}</span>
              <span className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-turquoise transition-all duration-500" style={{ width: `${((QUESTION_STEPS.indexOf(step) + 1) / QUESTION_STEPS.length) * 100}%` }} /></span>
              <span>all optional</span>
            </div>
          )}
          <QuickReplies items={quick} />
          <Composer
            disabled={!chatEnabled && step !== "consent"}
            placeholder={placeholder}
            inputMode={step === "age" ? "numeric" : "text"}
            allowAttach={step !== "consent" && step !== "analysing" && step !== "visible"}
            onSend={onText}
            onPickGallery={() => galleryRef.current?.click()}
            onPickCamera={() => cameraRef.current?.click()}
          />
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        {cropping && (
          <CropSheet file={cropping}
            onDone={(c) => { setCropping(null); onPhoto(c); }}
            onUseFull={() => { const f = cropping; setCropping(null); onPhoto(f); }}
            onCancel={() => setCropping(null)} />
        )}
      </section>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col gap-4 py-4 overflow-y-auto">
        <div className="card p-4">
          <h2 className="text-sm font-bold text-ink mb-2">What happens to your photo</h2>
          <StageTimeline status={step === "analysing" ? stages : lastSnapshot(messages)} />
          <p className="text-[11px] text-ink-soft mt-3 leading-relaxed">
            A photo that isn't analysable skin content stops at the second step and you're asked to retake it. That is never reported as "nothing found".
          </p>
        </div>
        <div className="card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2"><ShieldCheck size={15} className="text-jade" /> Private by design</h2>
          <ul className="text-xs text-ink-soft space-y-1.5 leading-relaxed">
            <li>No account, no name, no phone number.</li>
            <li>Your photo is analysed in memory and never written to disk.</li>
            <li>Results are kept only in this browser. Clear them any time from History.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-coral-tint text-coral p-4 text-xs leading-relaxed">
          <strong>Severe pain, heavy bleeding or fever?</strong> Don't wait for this chat. Contact your local emergency service.
        </div>
      </aside>
    </div>
  );
}

function lastSnapshot(messages: Msg[]): Partial<Record<StageName, StageStatus>> {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind === "pipeline") return m.snapshot ?? {};
  }
  return {};
}

/** Freeze the pipeline view once a result exists, so earlier runs stop animating. */
function finalStages(r: AnalysisResult): Partial<Record<StageName, StageStatus>> {
  if (r.status === "not_analysable") return { intake: "done", relevance: "done", likelihood: "skipped", segmentation: "skipped", second_reader: "skipped", triage: "done" };
  return {
    intake: "done", relevance: "done", likelihood: "done",
    segmentation: r.abnormalities?.available ? "done" : r.abnormalities?.backend === "skipped" ? "skipped" : "error",
    second_reader: r.second_reader?.available ? "done" : r.second_reader?.backend === "skipped" ? "skipped" : "error",
    triage: "done",
  };
}
