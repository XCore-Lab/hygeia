import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  children?: ReactNode;
}

/** Shared masthead for the inner pages, so they share the landing page's rhythm. */
const PageHero = ({ eyebrow, title, lede, children }: PageHeroProps) => {
  return (
    <section className="hero-cool grain relative overflow-hidden pt-28 pb-14 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-24">
      <div className="absolute -top-24 -left-24 w-[18rem] h-[18rem] sm:w-[28rem] sm:h-[28rem] bg-turquoise/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-[20rem] h-[20rem] sm:w-[32rem] sm:h-[32rem] bg-royal/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-royal-dark leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-ink-soft leading-relaxed font-light">
            {lede}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
