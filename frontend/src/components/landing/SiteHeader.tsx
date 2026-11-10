import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { openChat } from "@/lib/chat";

/** Landing page jumps between its own sections… */
const SECTION_LINKS = [
  { id: "how-it-works", label: "How it works" },
  { id: "under-the-hood", label: "Under the hood" },
  { id: "boundaries", label: "What we don't do" },
  { id: "clinic", label: "At the clinic" },
  { id: "privacy", label: "Privacy" },
  { id: "questions", label: "Questions" },
];

/** …while the inner pages need somewhere to go. */
const PAGE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "How it helps" },
  { to: "/products", label: "The assistant" },
  { to: "/contact", label: "Contact" },
];

const SiteHeader = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onLanding = pathname === "/";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goTo = (id: string) => {
    setIsMenuOpen(false);
    if (onLanding) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: id } });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-ice/90 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 text-left"
          >
            <img
              src="/hygeia-logo.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
            />
            <span className="flex flex-col leading-none">
              <span className="text-xl sm:text-2xl font-semibold tracking-tight text-royal">
                Hygeia
              </span>
              <span className="hidden sm:block mt-1 text-[11px] font-medium tracking-wide text-turquoise-deep">
                Guide one. Protect many
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {onLanding
              ? SECTION_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => goTo(link.id)}
                    className="text-sm font-medium text-ink-soft hover:text-royal transition-colors duration-200"
                  >
                    {link.label}
                  </button>
                ))
              : PAGE_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-sm font-medium transition-colors duration-200 hover:text-royal ${
                      pathname === link.to ? "text-royal" : "text-ink-soft"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
          </nav>

          <div className="hidden lg:block">
            <Button
              onClick={openChat}
              className="bg-royal hover:bg-royal-dark text-ice rounded-full px-6 font-medium shadow-sm"
            >
              Start anonymous chat
            </Button>
          </div>

          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            className="lg:hidden p-2 text-royal"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden pb-6 pt-2 space-y-1 border-t border-border">
            {onLanding
              ? SECTION_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => goTo(link.id)}
                    className="block w-full text-left py-3 px-2 text-base font-medium text-ink-soft hover:text-royal transition-colors"
                  >
                    {link.label}
                  </button>
                ))
              : PAGE_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block w-full py-3 px-2 text-base font-medium transition-colors hover:text-royal ${
                      pathname === link.to ? "text-royal" : "text-ink-soft"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                openChat();
              }}
              className="w-full mt-3 bg-royal hover:bg-royal-dark text-ice rounded-full font-medium"
            >
              Start anonymous chat
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
