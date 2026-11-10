import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  MapPin,
  MessagesSquare,
  ScanLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PageHero from "@/components/landing/PageHero";
import { openChat } from "@/lib/chat";

const SERVICES = [
  {
    icon: MessagesSquare,
    title: "An anonymous conversation",
    body: "Eight short questions, asked one at a time the way a clinic would ask them. Every one of them can be skipped, and you can type in your own words instead of tapping an option.",
    points: [
      "No account, no name, no email",
      "Tap, type, or skip any question",
      "About two minutes, including the analysis",
    ],
  },
  {
    icon: ScanLine,
    title: "A photo, looked at properly (when there is something to see)",
    body: "If something is visible, share a photo straight from the chat. A gate checks it is analysable skin before any question is asked, a classifier ensemble scores it, a segmenter outlines the visible changes, and a vision-language second reader describes what it sees and cross-checks the result. Nothing visible? You get a test-focused answer from your symptoms and exposure instead.",
    points: [
      "Analysed in memory, never stored",
      "Reported as a likelihood, never as a finding",
      "You see where the models looked",
    ],
  },
  {
    icon: Compass,
    title: "A read on how urgent this is",
    body: "The most useful thing most people need is permission to stop panicking, or a nudge to stop delaying. You get one or the other, in plain language, with every reason listed, and you can ask follow-up questions grounded on your own result.",
    points: [
      "Four plain urgency levels, reasons shown",
      "The specific things worth ruling out",
      "Red-flag symptoms called out separately",
    ],
  },
  {
    icon: MapPin,
    title: "A route to a real clinic",
    body: "Every conversation ends the same way: sexual health clinics near your city or location on a map, and what actually happens once you are inside.",
    points: [
      "Works anywhere: your city or your location",
      "What to say when you arrive",
      "What the visit actually involves",
    ],
  },
];

const DOES = [
  "Listens without reacting",
  "Helps you weigh symptoms, timing and risk",
  "Tells you how urgent this looks",
  "Names a clinic and what to ask for there",
];

const DOES_NOT = [
  "Replace the test that confirms what it is",
  "Replace a doctor, nurse or clinic",
  "Prescribe or provide treatment",
  "Ask for your name, email or ID",
];

const Services = () => {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <SiteHeader />

      <main>
        <PageHero
          eyebrow="How it helps"
          title={
            <>
              Everything here exists to get you{" "}
              <span className="marker">through one door.</span>
            </>
          }
          lede="Hygeia is the short, private step between noticing something and getting it looked at — the step most people never take."
        />

        <section className="cool-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {SERVICES.map((service) => (
                <div key={service.title} className="soft-card p-7 sm:p-9">
                  <div className="w-14 h-14 rounded-2xl bg-royal flex items-center justify-center shadow-md">
                    <service.icon className="w-6 h-6 text-ice" />
                  </div>
                  <h2 className="mt-5 text-xl sm:text-2xl font-semibold text-royal-dark tracking-tight">
                    {service.title}
                  </h2>
                  <p className="mt-3 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                    {service.body}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {service.points.map((point) => (
                      <li key={point} className="flex gap-2.5 items-start">
                        <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-jade-tint flex items-center justify-center">
                          <Check
                            className="w-3 h-3 text-jade"
                            strokeWidth={3.5}
                          />
                        </span>
                        <span className="text-sm sm:text-base text-ink-soft leading-relaxed font-light">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="royal-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise">
                Being straight with you
              </p>
              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-ice leading-tight tracking-tight">
                What this is, and what it is not.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="rounded-2xl bg-ice/10 border border-ice/15 p-7 sm:p-9 backdrop-blur-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-ice tracking-tight">
                  Hygeia does
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {DOES.map((item) => (
                    <li key={item} className="flex gap-3 items-start">
                      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-turquoise flex items-center justify-center">
                        <Check
                          className="w-3.5 h-3.5 text-royal-dark"
                          strokeWidth={3}
                        />
                      </span>
                      <span className="text-base sm:text-lg text-ice/85 leading-relaxed font-light">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-royal-dark/40 border border-ice/10 p-7 sm:p-9">
                <h3 className="text-lg sm:text-xl font-semibold text-ice tracking-tight">
                  Hygeia never does
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {DOES_NOT.map((item) => (
                    <li key={item} className="flex gap-3 items-start">
                      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full border border-ice/30 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-ice/60" strokeWidth={3} />
                      </span>
                      <span className="text-base sm:text-lg text-ice/70 leading-relaxed font-light">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="ice-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
              It takes about five minutes.
            </h2>
            <p className="mt-5 mx-auto max-w-2xl text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
              No name, no account, no lecture — and a clinic at the end of it.
            </p>
            <div className="mt-9 flex justify-center">
              <Button
                size="lg"
                onClick={openChat}
                className="group min-h-[56px] px-8 text-base font-semibold rounded-full bg-royal hover:bg-royal-dark text-ice shadow-lg transition-all duration-300"
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

export default Services;
