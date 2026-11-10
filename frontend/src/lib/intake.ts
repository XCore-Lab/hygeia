import type { Questionnaire } from "./types";

/** Conversational intake: the questionnaire asked one message at a time. */
export type Step =
  | "consent" | "visible" | "photo" | "symptoms" | "duration" | "character" | "exposure"
  | "history" | "sex" | "age" | "notes" | "analysing" | "done" | "clinic" | "failed";

export const QUESTION_STEPS: Step[] = ["symptoms", "duration", "character", "exposure", "history", "sex", "age", "notes"];

export interface Option { id: string; label: string; exclusive?: boolean }

export interface Question {
  step: Step;
  prompt: string;
  hint?: string;
  mode: "single" | "multi" | "text";
  options?: Option[];
  placeholder?: string;
  apply: (q: Questionnaire, picks: string[], text: string) => Questionnaire;
  summarise: (picks: string[], text: string) => string;
}

const labelOf = (opts: Option[], ids: string[]) => ids.map((i) => opts.find((o) => o.id === i)?.label ?? i);

const SYMPTOMS: Option[] = [
  { id: "bumps", label: "Bumps or growths" }, { id: "ulcer_sore", label: "Ulcer or open sore" },
  { id: "blister", label: "Blisters" }, { id: "rash", label: "Rash or redness" },
  { id: "itching", label: "Itching" }, { id: "pain", label: "Pain or burning" },
  { id: "discharge", label: "Discharge" }, { id: "pain_urination", label: "Pain when urinating" },
  { id: "bleeding", label: "Bleeding" }, { id: "swelling", label: "Swelling" },
  { id: "fever", label: "Fever / feeling unwell" },
  { id: "none", label: "No symptoms, just a worry", exclusive: true },
];
/** Symptoms that mean there is something to photograph. Anything else triggers the "can you see it?" question. */
export const VISIBLE_SYMPTOMS = new Set(["bumps", "ulcer_sore", "blister", "rash"]);
export const symptomLabel = (id: string) => SYMPTOMS.find((o) => o.id === id)?.label.toLowerCase() ?? id;
/** Symptom chips for the "nothing visible" path: what the person feels, not what they see. */
export const SYMPTOMS_FELT: Option[] = [
  { id: "itching", label: "Itching" }, { id: "pain", label: "Pain or burning" },
  { id: "pain_urination", label: "Pain when urinating" }, { id: "discharge", label: "Discharge" },
  { id: "swelling", label: "Swelling or a lump I can feel" }, { id: "bleeding", label: "Bleeding" },
  { id: "fever", label: "Fever / feeling unwell" },
  { id: "none", label: "No symptoms, just worried after an exposure", exclusive: true },
];
export const SYMPTOMS_FELT_PROMPT = "What are you experiencing? Tap everything that applies.";

const DURATION: Option[] = [
  { id: "<1w", label: "Under a week" }, { id: "1-4w", label: "1–4 weeks" }, { id: ">4w", label: "Over 4 weeks" }, { id: "unknown", label: "Not sure" },
];
const CHARACTER: Option[] = [
  { id: "pain", label: "It's painful" }, { id: "changed", label: "It's changing or growing" }, { id: "neither", label: "Neither", exclusive: true },
];
const EXPOSURE: Option[] = [
  { id: "none", label: "None recently" }, { id: "protected", label: "Yes, protected" }, { id: "unprotected", label: "Yes, unprotected" }, { id: "unknown", label: "Prefer not to say" },
];
const HISTORY: Option[] = [
  { id: "partner_sti", label: "A partner was diagnosed with an STI" }, { id: "prior_sti", label: "I've had an STI before" }, { id: "neither", label: "Neither", exclusive: true },
];
const SEX: Option[] = [
  { id: "male", label: "Male" }, { id: "female", label: "Female" }, { id: "intersex", label: "Intersex" }, { id: "prefer_not_to_say", label: "Prefer not to say" },
];

export type QuestionStep = Exclude<Step, "consent" | "visible" | "photo" | "analysing" | "done" | "clinic" | "failed">;
export const QUESTIONS: Record<QuestionStep, Question> = {
  symptoms: {
    step: "symptoms", mode: "multi", options: SYMPTOMS,
    prompt: "What have you noticed? Tap everything that applies.",
    apply: (q, p) => ({ ...q, symptoms: p.filter((x) => x !== "none" && x !== "pain"), itching: p.includes("itching"), fever: p.includes("fever"), pain: q.pain || p.includes("pain") }),
    summarise: (p) => (p.length ? labelOf([...SYMPTOMS, ...SYMPTOMS_FELT], p).join(", ") : "Skipped"),
  },
  duration: {
    step: "duration", mode: "single", options: DURATION,
    prompt: "How long has it been there?",
    apply: (q, p) => ({ ...q, duration: (p[0] as Questionnaire["duration"]) ?? null }),
    summarise: (p) => (p.length ? labelOf(DURATION, p)[0] : "Skipped"),
  },
  character: {
    step: "character", mode: "multi", options: CHARACTER,
    prompt: "Is it painful, or has it been changing?",
    apply: (q, p) => ({ ...q, pain: p.includes("pain"), changed: p.includes("changed") }),
    summarise: (p) => (p.length ? labelOf(CHARACTER, p).join(", ") : "Skipped"),
  },
  exposure: {
    step: "exposure", mode: "single", options: EXPOSURE,
    prompt: "Any sexual contact in the last few weeks?",
    hint: "This stays private and only shapes the advice.",
    apply: (q, p) => ({ ...q, exposure: (p[0] as Questionnaire["exposure"]) ?? null }),
    summarise: (p) => (p.length ? labelOf(EXPOSURE, p)[0] : "Skipped"),
  },
  history: {
    step: "history", mode: "multi", options: HISTORY,
    prompt: "Does either of these apply to you?",
    apply: (q, p) => ({ ...q, partner_sti: p.includes("partner_sti"), prior_sti: p.includes("prior_sti") }),
    summarise: (p) => (p.length ? labelOf(HISTORY, p).join(", ") : "Skipped"),
  },
  sex: {
    step: "sex", mode: "single", options: SEX,
    prompt: "What was your sex at birth?",
    apply: (q, p) => ({ ...q, sex_at_birth: (p[0] as Questionnaire["sex_at_birth"]) ?? null }),
    summarise: (p) => (p.length ? labelOf(SEX, p)[0] : "Skipped"),
  },
  age: {
    step: "age", mode: "text", placeholder: "Type your age…",
    prompt: "And how old are you? Type a number, or skip.",
    apply: (q, _p, t) => { const n = parseInt(t, 10); return { ...q, age: Number.isFinite(n) && n >= 12 && n <= 110 ? n : null }; },
    summarise: (_p, t) => (t.trim() ? t.trim() : "Skipped"),
  },
  notes: {
    step: "notes", mode: "text", placeholder: "Describe it in your own words…",
    prompt: "Last one: anything else you'd like me to know? Describe it in your own words, or skip.",
    hint: "No names or contact details are needed.",
    apply: (q, _p, t) => ({ ...q, notes: [q.notes, t.trim()].filter(Boolean).join("\n") }),
    summarise: (_p, t) => (t.trim() ? t.trim() : "Skipped"),
  },
};

export const EMPTY_Q: Questionnaire = {
  visible_change: null, age: null, sex_at_birth: null, symptoms: [], duration: null, pain: false, itching: false,
  changed: false, fever: false, exposure: null, partner_sti: false, prior_sti: false, notes: "",
};

export function nextStep(s: Step): Step {
  const i = QUESTION_STEPS.indexOf(s);
  if (i < 0) return s;
  return i + 1 < QUESTION_STEPS.length ? QUESTION_STEPS[i + 1] : "analysing";
}

/** Downscaled JPEG data URL for the chat thumbnail (small enough for sessionStorage). */
export function makeThumb(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
    img.src = url;
  });
}
