const FACTS = [
  {
    stat: "1 million+",
    label: "new STIs are acquired every single day, worldwide.",
    source: "World Health Organization",
  },
  {
    stat: "Most",
    label: "cause no symptoms at all — feeling fine tells you very little.",
    source: "World Health Organization",
  },
  {
    stat: "Curable",
    label:
      "The most common bacterial STIs are curable, and the rest are treatable.",
    source: "World Health Organization",
  },
];

const NotAloneSection = () => {
  return (
    <section id="not-alone" className="cool-section py-16 sm:py-24 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
            You are not the only one
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
            Not even close to the only one.
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
            The feeling that you're the only person this has happened to is the
            single most common thing people tell us. It isn't true, and it's
            the reason so many people sit on a worry for weeks instead of
            spending twenty minutes finding out.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {FACTS.map((fact, index) => (
            <div
              key={fact.stat}
              className={`soft-card p-7 sm:p-8 animate-fade-in-up animate-stagger-${
                index + 1
              }`}
            >
              <p className="text-3xl sm:text-4xl font-semibold text-royal tracking-tight">
                {fact.stat}
              </p>
              <p className="mt-3 text-base sm:text-lg text-ink-soft leading-relaxed font-light">
                {fact.label}
              </p>
              <p className="mt-5 text-xs uppercase tracking-wider text-ink-soft/70">
                {fact.source}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-3xl text-xl sm:text-2xl lg:text-3xl text-royal-dark leading-snug font-light">
          Embarrassment is why people wait.{" "}
          <span className="font-medium">
            Waiting is the only part that's genuinely dangerous.
          </span>
        </p>
      </div>
    </section>
  );
};

export default NotAloneSection;
