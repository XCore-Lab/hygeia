import { UserX, Trash2, ShieldOff, Share2 } from "lucide-react";

const PROMISES = [
  {
    icon: UserX,
    title: "No account, no name",
    body: "You don't sign up. There is no field asking who you are, and the chat never asks.",
  },
  {
    icon: Trash2,
    title: "The photo is never stored",
    body: "It is analysed in memory and discarded when the check finishes. Nothing is written to disk on our side.",
  },
  {
    icon: ShieldOff,
    title: "Results stay in your browser",
    body: "Your report lives only on your device. Clear it from History whenever you like, and it is gone.",
  },
  {
    icon: Share2,
    title: "Never sold or shared",
    body: "Your conversation is not advertising data, not training data, and never will be.",
  },
];

const PrivacySection = () => {
  return (
    <section id="privacy" className="ice-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
              Privacy
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
              Anonymity isn't a feature here. It's the whole point.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
              People don't avoid getting checked because they can't find a
              clinic. They avoid it because of who might find out. So we built
              Hygeia to need as little from you as possible, and to keep
              nothing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PROMISES.map((promise) => (
              <div
                key={promise.title}
                className="rounded-2xl border border-border bg-white p-6"
              >
                <promise.icon className="w-6 h-6 text-royal" />
                <h3 className="mt-4 text-base sm:text-lg font-semibold text-royal-dark">
                  {promise.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-ink-soft leading-relaxed font-light">
                  {promise.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;
