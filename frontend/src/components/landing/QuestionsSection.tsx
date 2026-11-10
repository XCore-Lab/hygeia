import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const QUESTIONS = [
  {
    q: "Will Hygeia tell me what I have?",
    a: "Hygeia tells you how closely a photo resembles the patterns it was trained on, how confident that is, how urgent it looks, what else it could be, and where to get tested. STIs are confirmed by tests, so every conversation ends at a clinic that can run one.",
  },
  {
    q: "What happens to my photo?",
    a: "It is sent over an encrypted connection, analysed in memory on our server, and discarded when the check finishes. It is never written to disk, never attached to a name, and never used for training. The report is kept only in your own browser.",
  },
  {
    q: "Do I have to give my name?",
    a: "No. There's no sign-up, no email field, and no ID. You open the chat and start.",
  },
  {
    q: "What does the AI actually look at?",
    a: "In order: the vision-language model first checks the photo is a real, analysable skin photo, then a classifier ensemble that scores six trained categories, a segmenter that outlines the visible changes, and a vision-language second reader that describes what it sees in plain language and cross-checks the classifier. You can see every stage, and where the models looked, in the full report.",
  },
  {
    q: "I'm too embarrassed to walk into a clinic.",
    a: "That's the most common thing we hear, and it's exactly what the clinic section above is for. Knowing the room, the questions and the time it takes removes most of the dread. You can also ask Hygeia to walk you through the visit step by step before you go.",
  },
  {
    q: "What if I can't afford it?",
    a: "Public sexual-health services in most countries test free or on a sliding scale, and many take walk-ins without a referral. Hygeia opens a map of clinics near your city or location so you can see what is close.",
  },
  {
    q: "Is this an emergency?",
    a: "Sometimes it is. Severe pain, a high fever, heavy bleeding, difficulty passing urine, or symptoms during pregnancy all need same-day medical care rather than a chat. If any of that applies, contact your local emergency service or urgent care now.",
  },
  {
    q: "Is Hygeia a doctor?",
    a: "No. Hygeia is an AI assistant. It doesn't practise medicine or prescribe anything. Treat it as a well-informed friend who happens to know where the clinics are.",
  },
];

const QuestionsSection = () => {
  return (
    <section id="questions" className="cool-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep text-center">
            Questions people are afraid to ask
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight text-center">
            Ask them here instead.
          </h2>

          <Accordion type="single" collapsible className="mt-12 space-y-4">
            {QUESTIONS.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`item-${index}`}
                className="rounded-2xl border border-border bg-white px-6 sm:px-7 data-[state=open]:border-turquoise/60 transition-colors"
              >
                <AccordionTrigger className="py-5 text-left text-base sm:text-lg font-medium text-royal-dark hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default QuestionsSection;
