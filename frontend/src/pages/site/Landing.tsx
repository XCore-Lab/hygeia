import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import SiteHeader from "@/components/landing/SiteHeader";
import HeroSection from "@/components/landing/HeroSection";
import NotAloneSection from "@/components/landing/NotAloneSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TechSection from "@/components/landing/TechSection";
import BoundariesSection from "@/components/landing/BoundariesSection";
import ClinicSection from "@/components/landing/ClinicSection";
import PrivacySection from "@/components/landing/PrivacySection";
import QuestionsSection from "@/components/landing/QuestionsSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import SiteFooter from "@/components/landing/SiteFooter";

const Index = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { state } = useLocation();

  // Arriving from an inner page's nav: scroll to the section it asked for,
  // once the sections have actually rendered.
  useEffect(() => {
    const target = (state as { scrollTo?: string } | null)?.scrollTo;
    if (!target) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [state]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document
      .querySelectorAll(".reveal-on-scroll")
      .forEach((section) => observerRef.current?.observe(section));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <SiteHeader />

      <main>
        <HeroSection />

        {/* Reassure, then explain, then be honest about the limits, then
            demystify the clinic — the order the anxiety actually unwinds in. */}
        <div className="reveal-on-scroll">
          <NotAloneSection />
        </div>
        <div className="reveal-on-scroll">
          <HowItWorksSection />
        </div>
        <div className="reveal-on-scroll">
          <TechSection />
        </div>
        <div className="reveal-on-scroll">
          <BoundariesSection />
        </div>
        <div className="reveal-on-scroll">
          <ClinicSection />
        </div>
        <div className="reveal-on-scroll">
          <PrivacySection />
        </div>
        <div className="reveal-on-scroll">
          <QuestionsSection />
        </div>
        <FinalCtaSection />
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
