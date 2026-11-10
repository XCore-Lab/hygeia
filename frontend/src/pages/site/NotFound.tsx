import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

const NotFound = () => (
  <div className="min-h-screen bg-ice flex flex-col">
    <SiteHeader />
    <main className="flex-1 hero-cool grain relative flex items-center justify-center px-4 pt-24 pb-16">
      <div className="text-center max-w-md relative z-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-turquoise-deep">404</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-royal-dark tracking-tight">That page isn't here.</h1>
        <p className="mt-4 text-lg text-ink-soft font-light">Nothing was lost on your side. Head back home, or go straight to a private check.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex items-center justify-center rounded-full border-2 border-royal/25 px-6 py-3 text-sm font-semibold text-royal hover:bg-royal/5">Home</Link>
          <Link to="/check" className="inline-flex items-center justify-center gap-2 rounded-full bg-royal px-6 py-3 text-sm font-semibold text-ice hover:bg-royal-dark">Start a check <ArrowRight size={16} /></Link>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default NotFound;
