import SiteHeader from "@/components/landing/SiteHeader";
import WhyItMattersSection from "@/components/landing/WhyItMattersSection";
import SiteFooter from "@/components/landing/SiteFooter";

const WhyItMatters = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <WhyItMattersSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default WhyItMatters;