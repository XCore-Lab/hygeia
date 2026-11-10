import { ArrowRight, EyeOff, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openChat } from "@/lib/chat";
import HeroPhone from "./HeroPhone";

const REASSURANCES = [
  { icon: EyeOff, text: "No name, no account, photo never stored" },
  { icon: Heart, text: "No judgement, ever" },
  { icon: MapPin, text: "A real clinic at the end" },
];

const HeroSection = () => {
  return (
    <section className="relative hero-cool grain overflow-hidden pt-24 pb-14 sm:pt-32 sm:pb-20 lg:pt-44 lg:pb-32">
      {/* Soft light blooms keep the top of the page from feeling like a form */}
      <div className="absolute -top-24 -left-24 w-[18rem] h-[18rem] sm:w-[28rem] sm:h-[28rem] bg-turquoise/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-[20rem] h-[20rem] sm:w-[32rem] sm:h-[32rem] bg-royal/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] gap-12 lg:gap-16 items-center">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-royal/15 bg-white/70 px-4 py-1.5 text-xs sm:text-sm font-medium text-royal backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-turquoise" />
              Anonymous · Free · A photo and a two-minute chat
            </p>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold text-royal-dark leading-[1.1] tracking-tight">
              The hardest part is
              <br className="hidden sm:block" />{" "}
              <span className="marker">saying it out loud.</span>
              <br />
              Say it here first.
            </h1>

            <p className="mt-6 text-lg sm:text-xl lg:text-2xl text-ink-soft leading-relaxed font-light max-w-2xl">
              Hygeia is an anonymous first step for anyone worried about an STI.
              Share a photo in a private chat, answer a few taps, and four AI
              models tell you how urgent it looks, show you what they saw, and
              point you to a clinic near you that can test and treat you.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={openChat}
                className="group min-h-[56px] px-8 text-base font-semibold rounded-full bg-royal hover:bg-royal-dark text-ice shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start anonymous chat
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="min-h-[56px] px-8 text-base font-semibold rounded-full border-2 border-royal/25 bg-transparent text-royal hover:bg-royal/5 hover:border-royal/40 transition-all duration-300"
              >
                See how it works
              </Button>
            </div>

            <ul className="mt-10 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8">
              {REASSURANCES.map((item) => (
                <li
                  key={item.text}
                  className="flex items-center gap-2.5 text-sm sm:text-base text-ink-soft"
                >
                  <item.icon className="w-5 h-5 text-turquoise-deep shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* The product itself, as a phone: a photo goes in, an honest
              result with outlined regions comes out, and it ends at a clinic. */}
          <div className="mt-4 lg:mt-0">
            <HeroPhone />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
