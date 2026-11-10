import { BrainCircuit, Cpu, Gauge, ScanSearch, ShieldCheck, Workflow } from "lucide-react";

const STAGES = [
  {
    icon: ShieldCheck,
    name: "1 · Relevance gate",
    model: "Qwen3-VL-4B, strict yes/no verdict",
    body: "Is this a real photograph of analysable skin at all? It runs the moment a photo is attached, before any question is asked. Graphics, screenshots and non-skin photos are sent back for a retake, never reported as \"nothing found\".",
  },
  {
    icon: Gauge,
    name: "2 · Likelihood",
    model: "DINOv2 ViT-L/14 + two ViT-B/14, ensembled",
    body: "Three fine-tuned vision transformers vote on six trained categories. Every decision is threshold-based with a zero-miss escalation rule, so a low-confidence \"normal\" is never shown as reassurance.",
  },
  {
    icon: ScanSearch,
    name: "3 · Localisation",
    model: "Qwen3-VL grounding + Grounding DINO → SAM 2.1",
    body: "Three independent sources propose regions, agreement raises confidence, and SAM 2.1 draws pixel-level outlines. You see exactly where the models looked.",
  },
  {
    icon: BrainCircuit,
    name: "4 · Second reader",
    model: "Qwen3-VL-4B-Instruct, 4-bit",
    body: "A vision-language model describes what is visible, reviews every outlined region, cross-checks the classifier and writes your plain-language note. It never overrides the measured result.",
  },
  {
    icon: Workflow,
    name: "5 · Triage",
    model: "Rules engine, every reason shown",
    body: "Findings and your answers are combined into one of four urgency levels, with the reasons listed. Explainable by construction, not by a disclaimer.",
  },
];

const STATS = [
  { value: "94.9%", label: "six-way accuracy on a held-out test set" },
  { value: "0.995", label: "ROC-AUC of the deployed ensemble" },
  { value: "~45 s", label: "for the whole pipeline on a 6 GB laptop GPU" },
  { value: "0", label: "photos stored, accounts created, names asked" },
];

const TechSection = () => {
  return (
    <section id="under-the-hood" className="cool-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-10 lg:gap-16 items-start">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
              Under the hood
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
              Four models, one honest answer.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
              Hygeia Vision AI is not a chatbot guessing from a description.
              It is a measured pipeline: a gate, a classifier, a segmenter and a
              second reader, each with a specific job and a specific limit, all
              running on hardware a clinic could actually own.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="soft-card p-5">
                <dt className="text-2xl sm:text-3xl font-semibold text-royal tracking-tight">{s.value}</dt>
                <dd className="mt-1.5 text-xs sm:text-sm text-ink-soft leading-snug font-light">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ol className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {STAGES.map((st) => (
            <li key={st.name} className="soft-card p-6 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-royal flex items-center justify-center shadow-sm">
                <st.icon className="w-5 h-5 text-ice" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-royal-dark tracking-tight">{st.name}</h3>
              <p className="mt-1 text-xs font-medium text-turquoise-deep">{st.model}</p>
              <p className="mt-3 text-sm text-ink-soft leading-relaxed font-light">{st.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-2xl border border-royal/15 bg-white/70 backdrop-blur-sm p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
            <Cpu className="w-6 h-6 text-turquoise-deep" />
          </div>
          <p className="text-base sm:text-lg text-royal-dark leading-relaxed font-light">
            Every stage is explainable: the gate's score, the ensemble's per-member votes, the outlined regions with
            their sources, the second reader's review of each region and every triage reason are all in the full report.
            <span className="font-medium"> Appearances outside the six trained patterns are flagged</span>, with a plain-language list of
            look-alikes a clinician would consider, and "no sexual contact" is reasoned about explicitly rather than ignored.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TechSection;
