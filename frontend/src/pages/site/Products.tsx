import { useEffect } from "react";
import { ArrowRight, BrainCircuit, Globe, Lock, MapPin, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PageHero from "@/components/landing/PageHero";
import { openChat } from "@/lib/chat";

const CAPABILITIES = [
  {
    icon: ScanLine,
    title: "Vision triage, measured not guessed",
    body: "A vision-language gate checks the photo is real, analysable skin, then a DINOv2 vision-transformer ensemble and a SAM 2.1 segmenter score and outline what is visible. 94.9% six-way accuracy on a held-out test set, every decision threshold-based with a zero-miss escalation rule.",
  },
  {
    icon: Lock,
    title: "Nothing to sign up for",
    body: "There is no registration step to abandon. You open it and start talking, and the conversation is not attached to an email address or a profile.",
  },
  {
    icon: BrainCircuit,
    title: "A second reader that explains",
    body: "A 4-bit Qwen3-VL vision-language model describes what it sees, reviews every outlined region, cross-checks the classifier and writes your plain-language note. It never overrides the measured result, and it answers your follow-up questions afterwards.",
  },
  {
    icon: MapPin,
    title: "Ends at a real clinic near you",
    body: "The conversation closes on a map of sexual health clinics near your city or your location, not a suggestion to 'see a doctor'. It works anywhere in the world.",
  },
];

const ROADMAP = [
  {
    state: "Live",
    tone: "live" as const,
    title: "Vision triage in a private chat",
    body: "Photo upload from the chat, the four-model pipeline, a plain-language result with the outlined regions, out-of-scope detection with a differential, follow-up questions, and a worldwide clinic finder. Runs on a 6 GB laptop GPU.",
  },
  {
    state: "Next",
    tone: "next" as const,
    title: "More languages in the chat",
    body: "The intake questions and the second reader's note in the person's own language, switchable mid-conversation, so the tool works for the people who need it most.",
  },
  {
    state: "Next",
    tone: "next" as const,
    title: "Clinical validation",
    body: "A prospective study against clinician assessment at partner clinics, extending the measured engineering accuracy to real-world use.",
  },
  {
    state: "Later",
    tone: "later" as const,
    title: "Partner notification help",
    body: "Wording someone can send to a recent partner without having to compose it themselves, one of the hardest asks in the whole process.",
  },
];

const TONES = {
  live: "bg-jade-tint text-jade",
  next: "bg-turquoise-tint text-turquoise-deep",
  later: "bg-mist text-ink-soft",
};

const Products = () => {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <SiteHeader />

      <main>
        <PageHero
          eyebrow="The assistant"
          title={
            <>
              One product, and it does{" "}
              <span className="marker">one thing properly.</span>
            </>
          }
          lede="Hygeia is a single private chat that looks at a photo with four AI models, tells you how urgent it looks and why, and ends at a real clinic. It is deliberately narrow, because the wording around a frightening subject is too important to get wrong."
        >
          <div className="mt-8">
            <Button
              size="lg"
              onClick={openChat}
              className="group min-h-[56px] px-8 text-base font-semibold rounded-full bg-royal hover:bg-royal-dark text-ice shadow-lg transition-all duration-300"
            >
              Try it now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>
        </PageHero>

        <section className="cool-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
                  Measured, not improvised.
                </h2>
                <div className="mt-6 space-y-5 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
                  <p>
                    The urgency level is decided by a rules engine over
                    measured classifier outputs and your answers, with every
                    reason listed. The language model describes, cross-checks
                    and explains; it is never allowed to override the measured
                    result or to invent a finding.
                  </p>
                  <p>
                    That is a deliberate constraint. A photo the gate cannot
                    read is sent back for a retake rather than reported as
                    "nothing found", and a low-confidence "normal" is never
                    shown as reassurance.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-8 rounded-full bg-electric-tint blur-3xl opacity-60 pointer-events-none" />
                <img
                  src="/hygeia-scan-illustration.webp"
                  alt="An area of skin examined alongside a privacy shield and a clinical record"
                  className="relative w-full h-auto"
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={800}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ice-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
                What it does
              </p>
              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
                Four things, done properly.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {CAPABILITIES.map((item) => (
                <div key={item.title} className="soft-card p-7 sm:p-8 flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-turquoise-deep" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cool-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
                Where this is going
              </p>
              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
                What is live, and what is not yet.
              </h2>
              <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
                Listed plainly, because a health tool that overstates what it
                can already do has picked the wrong thing to be vague about.
              </p>
            </div>

            <ol className="mt-12 space-y-5">
              {ROADMAP.map((item) => (
                <li
                  key={item.title}
                  className="soft-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6"
                >
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      TONES[item.tone]
                    }`}
                  >
                    {item.state}
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="royal-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Globe className="mx-auto w-8 h-8 text-turquoise" />
            <h2 className="mt-5 text-2xl sm:text-3xl lg:text-4xl font-semibold text-ice leading-tight tracking-tight">
              See it for yourself.
            </h2>
            <p className="mt-5 mx-auto max-w-2xl text-lg sm:text-xl text-ice/75 leading-relaxed font-light">
              The assistant is open. It costs nothing, asks for nothing, and you
              can close it at any point.
            </p>
            <div className="mt-9 flex justify-center">
              <Button
                size="lg"
                onClick={openChat}
                className="group min-h-[56px] px-8 text-base font-semibold rounded-full bg-turquoise hover:bg-turquoise/90 text-royal-dark shadow-xl transition-all duration-300"
              >
                Start anonymous chat
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Products;
