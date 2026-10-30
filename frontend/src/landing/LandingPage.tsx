import { useEffect, useRef, useState } from "react";
import { LayoutGrid, MapPin, Store, UserRound } from "lucide-react";
import type { Domain } from "../shared/domains";
import RadarMark from "../shared/components/RadarMark";
import ScoutScene from "./ScoutScene";
import "./LandingPage.css";

interface LandingPageProps {
  onGetStarted: () => void;
  onChooseDomain: (domain: Domain) => void;
  /** Present only when someone is signed in; opens their workspace. */
  onOpenAccount?: () => void;
}

type SectionId = "how" | "businesses" | "freelancers";

const BUSINESS_STEPS = [
  { title: "Describe the work and your budget", text: "A whole-project price, a day rate or a monthly retainer, in rupees. Not sure what to write? AI drafts it from a few lines." },
  { title: "Freelancers nearby apply", text: "Each one sends a proposal, a quote and a timeline, alongside their skills and portfolio." },
  { title: "Compare, shortlist, talk", text: "Run an explained match on the applicants you choose. Contact details are shared only when you shortlist." },
];

const FREELANCER_STEPS = [
  { title: "Search an area", text: "Real businesses from Google around any location, with the low-information listings filtered out." },
  { title: "See who needs attention, and why", text: "No website listed, a site that isn't set up for phones, few reviews. Every reason shows its evidence." },
  { title: "Reach out, or apply to posted work", text: "Copy a drafted first message, apply to jobs businesses post, and track each lead from contact to win." },
];

const AI_RULES = [
  { title: "Rules set the priority", text: "From facts you can check: what the listing shows and a quick look at the business's homepage." },
  { title: "AI writes the explanation", text: "A short summary and a first draft message, using only those facts. It never invents prices or reviews." },
  { title: "You make every call", text: "Who to contact, who to shortlist, what to ignore. AI only runs when you ask it to." },
];

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function Wordmark() {
  return (
    <span className="landing-wordmark">
      <RadarMark />
      <span className="landing-wordmark__name">LeadScout</span>
      <span className="landing-wordmark__badge">AI</span>
    </span>
  );
}

export default function LandingPage({ onGetStarted, onChooseDomain, onOpenAccount }: LandingPageProps) {
  const sections = {
    how: useRef<HTMLElement>(null),
    businesses: useRef<HTMLDivElement>(null),
    freelancers: useRef<HTMLDivElement>(null),
  };
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);
  const [flash, setFlash] = useState<SectionId | null>(null);

  // The header gains a hairline once the page moves, and the nav marks the section in view.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // The two "For …" columns sit side by side, so scrolling alone can only tell whether "How it works" is in view;
    // a clicked link stays marked while that section is on screen.
    const observer = new IntersectionObserver(
      ([entry]) => setActive((current) => (entry.isIntersecting ? (current ?? "how") : null)),
      { rootMargin: "-35% 0px -45% 0px" }
    );
    if (sections.how.current) observer.observe(sections.how.current);
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
    // Refs are stable; observe once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id: SectionId) => {
    sections[id].current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    setActive(id);
    // Briefly highlight the column you jumped to (it shares a row with the other one on wide screens).
    if (id !== "how") {
      setFlash(id);
      window.setTimeout(() => setFlash(null), 1400);
    }
  };
  const navLink = (id: SectionId, label: string) => (
    <button type="button" className={`landing-nav__link${active === id ? " landing-nav__link--active" : ""}`} aria-current={active === id ? "true" : undefined} onClick={() => scrollTo(id)}>
      {label}
    </button>
  );

  return (
    <div className="landing">
      <header className={`landing-header${scrolled ? " landing-header--scrolled" : ""}`}>
        <div className="landing-container landing-header__inner">
          <button type="button" className="landing-header__home" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} aria-label="LeadScout AI, back to top">
            <Wordmark />
          </button>
          <nav className="landing-nav" aria-label="Sections">
            {navLink("how", "How it works")}
            {navLink("businesses", "For businesses")}
            {navLink("freelancers", "For freelancers")}
          </nav>
          <div className="landing-header__right">
            {onOpenAccount ? (
              <button type="button" className="landing-btn landing-btn--dark landing-btn--sm" onClick={onOpenAccount}>
                <LayoutGrid size={16} aria-hidden="true" />
                Open my workspace
              </button>
            ) : (
              // "Get started" leads to the workspace picker, where people sign in or create an account.
              <button type="button" className="landing-btn landing-btn--dark landing-btn--sm" onClick={onGetStarted}>
                Get started
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-container landing-hero__grid">
            <div className="landing-hero__copy">
              <h1 id="landing-hero-title" className="landing-hero__title">
                <span className="landing-hero__line">Where businesses</span>
                <span className="landing-hero__line">and freelancers</span>
                <span className="landing-hero__line">find each other.</span>
              </h1>
              <p className="landing-hero__lead">
                Freelancers spot nearby businesses that may need a website, better listings or marketing, with the reasons laid out. Businesses post the work
                they need, with a budget, and compare who applies.
              </p>
              <div className="landing-hero__actions">
                <button type="button" className="landing-btn landing-btn--light" onClick={() => onChooseDomain("bi")}>
                  <MapPin size={17} aria-hidden="true" />
                  Find businesses near me
                </button>
                <button type="button" className="landing-btn landing-btn--on-dark" onClick={() => onChooseDomain("client")}>
                  <Store size={17} aria-hidden="true" />
                  Post work as a business
                </button>
              </div>
              <p className="landing-hero__note">AI explains. You decide.</p>
            </div>
            <ScoutScene />
          </div>
        </section>

        <section ref={sections.how} data-section="how" className="landing-section" aria-labelledby="landing-how-title">
          <div className="landing-container">
            <h2 id="landing-how-title" className="landing-section__title">
              How it works
            </h2>
            <p className="landing-section__lead">Two sides, one place. Pick the one that sounds like you.</p>

            <div className="landing-sides">
              <div ref={sections.businesses} data-section="businesses" className={`landing-side${flash === "businesses" ? " landing-side--flash" : ""}`} aria-labelledby="landing-businesses-title">
                <div className="landing-side__head">
                  <span className="landing-side__icon" aria-hidden="true">
                    <Store size={20} />
                  </span>
                  <h3 id="landing-businesses-title" className="landing-side__title">
                    For businesses
                  </h3>
                </div>
                <ol className="landing-steps">
                  {BUSINESS_STEPS.map((s) => (
                    <li key={s.title} className="landing-step">
                      <h4 className="landing-step__title">{s.title}</h4>
                      <p className="landing-step__text">{s.text}</p>
                    </li>
                  ))}
                </ol>
                <button type="button" className="landing-textlink" onClick={() => onChooseDomain("client")}>
                  Post your first requirement
                </button>
              </div>

              <div ref={sections.freelancers} data-section="freelancers" className={`landing-side${flash === "freelancers" ? " landing-side--flash" : ""}`} aria-labelledby="landing-freelancers-title">
                <div className="landing-side__head">
                  <span className="landing-side__icon" aria-hidden="true">
                    <UserRound size={20} />
                  </span>
                  <h3 id="landing-freelancers-title" className="landing-side__title">
                    For freelancers
                  </h3>
                </div>
                <ol className="landing-steps">
                  {FREELANCER_STEPS.map((s) => (
                    <li key={s.title} className="landing-step">
                      <h4 className="landing-step__title">{s.title}</h4>
                      <p className="landing-step__text">{s.text}</p>
                    </li>
                  ))}
                </ol>
                <button type="button" className="landing-textlink" onClick={() => onChooseDomain("bi")}>
                  Start scouting an area
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--paper" aria-labelledby="landing-ai-title">
          <div className="landing-container">
            <h2 id="landing-ai-title" className="landing-section__title">
              How the AI is used
            </h2>
            <div className="landing-rules">
              {AI_RULES.map((rule) => (
                <div key={rule.title} className="landing-rule">
                  <h3 className="landing-rule__title">{rule.title}</h3>
                  <p className="landing-rule__text">{rule.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-closing" aria-labelledby="landing-closing-title">
          <div className="landing-container landing-closing__inner">
            <h2 id="landing-closing-title" className="landing-closing__title">
              Start with one search.
            </h2>
            <div className="landing-hero__actions">
              <button type="button" className="landing-btn landing-btn--light" onClick={() => onChooseDomain("bi")}>
                <MapPin size={17} aria-hidden="true" />
                Find businesses near me
              </button>
              <button type="button" className="landing-btn landing-btn--on-dark" onClick={() => onChooseDomain("client")}>
                <Store size={17} aria-hidden="true" />
                Post work as a business
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <Wordmark />
          <p className="landing-footer__copyright">© {new Date().getFullYear()} LeadScout AI</p>
        </div>
      </footer>
    </div>
  );
}
