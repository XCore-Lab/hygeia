import { useEffect } from "react";
import { AlertTriangle, ArrowRight, Building2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PageHero from "@/components/landing/PageHero";
import { openChat } from "@/lib/chat";

// TODO: hello@hygeia.lk and clinics@hygeia.lk are placeholders — these
// mailboxes do not exist yet. Replace with real addresses before promoting
// this site, or people will email into a void. Same addresses appear in
// PrivacyPolicy.tsx and TermsOfService.tsx.
const Contact = () => {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-ice overflow-x-hidden">
      <SiteHeader />

      <main>
        <PageHero
          eyebrow="Contact"
          title={
            <>
              For questions about Hygeia —{" "}
              <span className="marker">not about your symptoms.</span>
            </>
          }
          lede="If you are worried about something, the assistant is the fastest way to get an answer, and it does not ask who you are. This page is for everything else: partnerships, clinics, press and problems with the site."
        />

        <section className="cool-section py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="soft-card p-7 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-turquoise-deep" />
                </div>
                <h2 className="mt-5 text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                  Worried about symptoms?
                </h2>
                <p className="mt-3 text-base text-ink-soft leading-relaxed font-light">
                  Do not email us about it — you would be waiting, and you would
                  be giving us your name for no reason. Open the assistant
                  instead. It is anonymous and takes about five minutes.
                </p>
                <Button
                  onClick={openChat}
                  className="mt-5 w-full rounded-full bg-royal hover:bg-royal-dark text-ice font-semibold py-5"
                >
                  Start anonymous chat
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>

              <div className="soft-card p-7 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                  <Mail className="w-6 h-6 text-turquoise-deep" />
                </div>
                <h2 className="mt-5 text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                  General enquiries
                </h2>
                <p className="mt-3 text-base text-ink-soft leading-relaxed font-light">
                  Questions about the project, corrections to anything we have
                  written, or a problem with the site itself.
                </p>
                <a
                  href="mailto:hello@hygeia.lk"
                  className="tap-target mt-5 text-base font-medium text-royal hover:text-royal-dark transition-colors break-all"
                >
                  hello@hygeia.lk
                </a>
              </div>

              <div className="soft-card p-7 sm:p-8">
                <div className="w-12 h-12 rounded-xl bg-turquoise-tint flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-turquoise-deep" />
                </div>
                <h2 className="mt-5 text-lg sm:text-xl font-semibold text-royal-dark tracking-tight">
                  Clinics and partners
                </h2>
                <p className="mt-3 text-base text-ink-soft leading-relaxed font-light">
                  If you run a sexual health service and want people routed to
                  you correctly — or your listed details are wrong — we want to
                  hear from you.
                </p>
                <a
                  href="mailto:clinics@hygeia.lk"
                  className="tap-target mt-5 text-base font-medium text-royal hover:text-royal-dark transition-colors break-all"
                >
                  clinics@hygeia.lk
                </a>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-royal/15 bg-white/70 backdrop-blur-sm p-6 sm:p-8 flex gap-4 sm:gap-5">
              <AlertTriangle className="w-6 h-6 shrink-0 text-turquoise-deep" />
              <div>
                <h3 className="text-lg font-semibold text-royal-dark tracking-tight">
                  This is not an emergency service
                </h3>
                <p className="mt-2 text-base text-ink-soft leading-relaxed font-light">
                  Nobody is monitoring this inbox out of hours. If you have
                  severe pain, heavy bleeding, a high fever, difficulty passing
                  urine, or symptoms during pregnancy, contact your local
                  emergency service or go to the nearest hospital now.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Contact;
