import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openChat } from "@/lib/chat";

const FinalCtaSection = () => {
  return (
    <section className="royal-section relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="absolute -top-24 right-0 w-[20rem] h-[20rem] sm:w-[30rem] sm:h-[30rem] bg-turquoise/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-ice leading-tight tracking-tight">
            You've already done the hardest part by reading this far.
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-ice/75 leading-relaxed font-light">
            No name. No account. No lecture. Just a conversation, and a clinic
            at the end of it.
          </p>

          <div className="mt-10 flex justify-center">
            <Button
              size="lg"
              onClick={openChat}
              className="group min-h-[58px] px-9 text-base sm:text-lg font-semibold rounded-full bg-turquoise hover:bg-turquoise/90 text-royal-dark shadow-xl transition-all duration-300"
            >
              Start anonymous chat
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>

          <p className="mt-8 text-sm text-ice/50">
            If you're in severe pain, bleeding heavily, or feverish, contact
            your local emergency service instead.
          </p>

          {/* The reason any of this exists: one person routed today is a
              chain of transmission that never starts. */}
          <div className="mt-14 pt-10 border-t border-ice/15">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight tracking-tight text-ice/90">
              Guide one.{" "}
              <span className="text-turquoise font-medium">Protect many</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
