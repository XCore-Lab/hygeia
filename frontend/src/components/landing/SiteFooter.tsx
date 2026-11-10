import { Link } from "react-router-dom";

const SiteFooter = () => {
  return (
    <footer className="ice-section border-t border-border py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          <div className="max-w-md">
            <div className="flex items-center gap-2 text-xl font-semibold tracking-tight text-royal">
              <img
                src="/hygeia-logo.svg"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 shrink-0"
              />
              Hygeia
            </div>
            <p className="mt-4 text-base text-ink-soft leading-relaxed font-light">
              An anonymous first step for anyone worried about an STI. Hygeia
              does not diagnose, prescribe, or replace a clinician.
            </p>
          </div>

          <nav className="flex flex-col sm:flex-row gap-8 sm:gap-14">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-royal-dark">
                Explore
              </h3>
              <ul className="mt-4 space-y-2.5">
                {[
                  { to: "/", label: "Home" },
                  { to: "/about", label: "About" },
                  { to: "/services", label: "How it helps" },
                  { to: "/products", label: "The assistant" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="tap-target text-base text-ink-soft hover:text-royal transition-colors font-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-royal-dark">
                Legal
              </h3>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="tap-target text-base text-ink-soft hover:text-royal transition-colors font-light"
                  >
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="tap-target text-base text-ink-soft hover:text-royal transition-colors font-light"
                  >
                    Terms of service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="tap-target text-base text-ink-soft hover:text-royal transition-colors font-light"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft/80">
            © {new Date().getFullYear()} Hygeia. All rights reserved.
          </p>
          <p className="text-sm text-ink-soft/80">
            Not a medical device. Not a substitute for professional care.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
