import { Clock, Users, Wallet, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openChat } from "@/lib/chat";

const TRUTHS = [
  {
    icon: Clock,
    title: "It's shorter than you think",
    body:
      "A routine screen is usually a urine sample, a swab you often take yourself, or a small blood draw. Most visits are done well inside half an hour.",
  },
  {
    icon: Users,
    title: "Nobody asks why you're there",
    body:
      "Not at the desk, not in the waiting room. Sexual health clinics are built around discretion, because everyone walking in feels the way you do.",
  },
  {
    icon: Wallet,
    title: "It's usually free or low-cost",
    body:
      "Public sexual-health services in most countries test free or on a sliding scale, and you rarely need a referral. Many take walk-ins.",
  },
  {
    icon: HeartHandshake,
    title: "They have seen this before",
    body:
      "Today. Several times. The thing you've been rehearsing how to say is the most ordinary sentence in that building.",
  },
];

const ClinicSection = () => {
  return (
    <section id="clinic" className="cool-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
            Where this ends up
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
            What actually happens at a clinic.
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
            Most of the dread is about the unknown rather than the test. So
            here is the unglamorous reality, before you ever talk to us.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {TRUTHS.map((truth, index) => (
            <div
              key={truth.title}
              className={`soft-card p-7 sm:p-8 flex gap-5 animate-fade-in-up animate-stagger-${
                index + 1
              }`}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                <truth.icon className="w-6 h-6 text-turquoise-deep" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                  {truth.title}
                </h3>
                <p className="mt-2.5 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                  {truth.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-royal/15 bg-white/70 backdrop-blur-sm p-7 sm:p-9 flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
          <p className="text-lg sm:text-xl text-royal-dark leading-relaxed font-light max-w-2xl">
            Hygeia opens a map of sexual health clinics near you at the end of
            the chat, from your city or your location, with a plain account of
            what the visit involves, so nothing is a surprise.
          </p>
          <Button
            size="lg"
            onClick={openChat}
            className="shrink-0 min-h-[52px] px-7 rounded-full bg-royal hover:bg-royal-dark text-ice font-semibold shadow-md"
          >
            Find my nearest clinic
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ClinicSection;
