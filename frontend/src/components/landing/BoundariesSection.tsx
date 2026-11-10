import { Check, X } from "lucide-react";

const DOES = [
  "Listens, in plain language, without reacting",
  "Looks at a photo with four AI models and shows you where it looked",
  "Helps you make sense of symptoms, timing and risk",
  "Tells you how urgent this looks right now",
  "Finds the nearest clinic that can actually test you",
  "Tells you what to ask for and what the visit involves",
];

const DOES_NOT = [
  "Replace the test that confirms what it is",
  "Replace a doctor, nurse or clinic",
  "Prescribe, treat, or hand out medication",
  "Ask for your name, email, or ID — or keep your photo",
  "Decide anything for you",
];

const BoundariesSection = () => {
  return (
    <section id="boundaries" className="royal-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise">
            Being straight with you
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-ice leading-tight tracking-tight">
            Being straight about what Hygeia is.
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-ice/75 leading-relaxed font-light">
            We're not trying to automate a doctor. A test and a clinician
            confirm what something is. What Hygeia does is get you from "I'm
            scared to look this up" to standing in the right waiting room,
            knowing how urgent it is and what to ask for.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="rounded-2xl bg-ice/10 border border-ice/15 p-7 sm:p-9 backdrop-blur-sm">
            <h3 className="text-xl sm:text-2xl font-semibold text-ice tracking-tight">
              What Hygeia does
            </h3>
            <ul className="mt-6 space-y-4">
              {DOES.map((item) => (
                <li key={item} className="flex gap-3.5 items-start">
                  <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-turquoise flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-royal-dark" strokeWidth={3} />
                  </span>
                  <span className="text-base sm:text-lg text-ice/85 leading-relaxed font-light">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-royal-dark/40 border border-ice/10 p-7 sm:p-9">
            <h3 className="text-xl sm:text-2xl font-semibold text-ice tracking-tight">
              What Hygeia never does
            </h3>
            <ul className="mt-6 space-y-4">
              {DOES_NOT.map((item) => (
                <li key={item} className="flex gap-3.5 items-start">
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
  );
};

export default BoundariesSection;
