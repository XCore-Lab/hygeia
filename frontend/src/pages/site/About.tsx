import { useEffect } from "react";
import { ArrowRight, EyeOff, Milestone, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PageHero from "@/components/landing/PageHero";
import { openChat } from "@/lib/chat";

const PRINCIPLES = [
  {
    icon: EyeOff,
    title: "Anonymity before anything else",
    body: "No account, no name, no email. The thing standing between someone and a test is almost never information — it is the fear of being known. So we ask for nothing.",
  },
  {
    icon: ShieldCheck,
    title: "We do not diagnose",
    body: "An STI is identified by a test and a clinician, not by a description or a photograph. We say what something is likely to be, we say how confident that is, and we say plainly that it is not a finding.",
  },
  {
    icon: Milestone,
    title: "Every path ends at a clinic",
    body: "Hygeia is a bridge, not a destination. A conversation that ends with someone still sitting at home worrying has failed, however reassuring it was.",
  },
  {
    icon: Users,
    title: "Nobody is lectured",
    body: "No moralising about how this happened, no implied verdict about the person asking. Shame is the problem we are trying to solve, so we refuse to add to it.",
  },
];

const About = () => {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <SiteHeader />

      <main>
        <PageHero
          eyebrow="About Hygeia"
          title={
            <>
              Shame is the reason people wait.{" "}
              <span className="marker">Waiting is the dangerous part.</span>
            </>
          }
          lede="Hygeia exists for the gap between noticing something and doing something about it — the weeks people spend searching in private, too embarrassed to walk into a clinic. We are trying to make that gap as short as possible."
        />

        <section className="cool-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
                The problem is not access. It is the doorway.
              </h2>
              <div className="mt-6 space-y-5 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
                <p>
                  Most countries already have confidential sexual-health
                  clinics, many of them free. The testing exists, the treatment
                  exists, and the staff are used to exactly this. What is
                  missing is the thing that gets a frightened person from their
                  phone to that front door.
                </p>
                <p>
                  Most people in that position do the same three things: they
                  search their symptoms, they read something terrifying, and
                  then they wait. Waiting is the only part of this that reliably
                  makes it worse — for them, and for everyone they are close to.
                </p>
                <p>
                  So Hygeia does the unglamorous middle bit. It listens without
                  reacting, helps someone judge how urgent this actually is, and
                  tells them where to go and what to expect when they get there.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="ice-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
                What we hold to
              </p>
              <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-royal-dark leading-tight tracking-tight">
                Four rules we would rather lose users than break.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {PRINCIPLES.map((item) => (
                <div key={item.title} className="soft-card p-7 sm:p-8">
                  <div className="w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-turquoise-deep" />
                  </div>
                  <h3 className="mt-5 text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="royal-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-ice leading-tight tracking-tight">
                Why one conversation matters more than it looks.
              </h2>
              <p className="mt-6 text-lg sm:text-xl text-ice/75 leading-relaxed font-light">
                Someone who gets tested and treated this week is a chain of
                transmission that never starts. That is the whole argument, and
                it is why a tool aimed squarely at one anxious person is also a
                public health tool.
              </p>
              <p className="mt-10 text-3xl sm:text-4xl lg:text-5xl font-light leading-tight tracking-tight text-ice/90">
                Guide one.{" "}
                <span className="text-turquoise font-medium">Protect many</span>
              </p>

              <div className="mt-10">
                <Button
                  size="lg"
                  onClick={openChat}
                  className="group min-h-[56px] px-8 text-base font-semibold rounded-full bg-turquoise hover:bg-turquoise/90 text-royal-dark shadow-lg transition-all duration-300"
                >
                  Start anonymous chat
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default About;
