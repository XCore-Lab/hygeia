import { Camera, MessagesSquare, MapPin } from "lucide-react";

const STEPS = [
  {
    icon: MessagesSquare,
    title: "Answer a few taps",
    body:
      "Eight short questions, asked one at a time the way a clinic would ask them. Tap an answer, type in your own words, or skip any of them. Nothing stalls if you would rather not say.",
  },
  {
    icon: Camera,
    title: "A photo, only if there is something to see",
    body:
      "If you reported a bump, sore, blister or rash, you are asked for a photo at the end; it is checked on the spot, analysed in memory and discarded the moment the check is done. Itching, pain, discharge or a worrying exposure with nothing visible are handled from your answers alone.",
  },
  {
    icon: MapPin,
    title: "Get your bearings, then a clinic",
    body:
      "You get an honest urgency level with the reasons shown, a picture of where the AI looked, what to ask for, and sexual health clinics near you on a map. Then you can ask it anything.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="ice-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
              How it works
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
              Three steps, and the last one is a real front door.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
              Hygeia is a bridge, not a destination. Every conversation is built
              to end in the same place: you, knowing how worried to be, where to
              go, and what to expect when you get there.
            </p>
            <p className="mt-5 text-base text-ink-soft/85 leading-relaxed font-light">
              The whole check takes about a minute on our hardware. A photo that
              is not analysable skin is stopped at the gate and you are asked to
              retake it; that is never reported as "nothing found".
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-8 rounded-full bg-electric-tint blur-3xl opacity-60 pointer-events-none" />
            <img
              src="/hygeia-scan-illustration.webp"
              alt="An area of skin is examined against a privacy shield and a clinical record, showing how a shared photo is handled"
              className="relative w-full h-auto"
              loading="lazy"
              decoding="async"
              width={1200}
              height={800}
            />
          </div>
        </div>

        <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              {index < STEPS.length - 1 && (
                <span className="hidden md:block absolute top-8 left-[calc(4rem+1rem)] right-[-2rem] h-px bg-gradient-to-r from-turquoise/70 to-transparent" />
              )}

              <div className="relative w-16 h-16 rounded-2xl bg-royal flex items-center justify-center shadow-md">
                <step.icon className="w-7 h-7 text-ice" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-turquoise text-royal-dark text-sm font-bold flex items-center justify-center shadow-sm">
                  {index + 1}
                </span>
              </div>

              <h3 className="mt-6 text-xl sm:text-2xl font-semibold text-royal-dark tracking-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
