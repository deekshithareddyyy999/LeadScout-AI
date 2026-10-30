import { ArrowLeft, CircleCheck, MapPin, ShieldCheck, Sparkles, Store, UserRound, type LucideIcon } from "lucide-react";
import TopBar from "../shared/components/TopBar";
import type { Domain } from "../shared/domains";
import ChoiceArt from "./ChoiceArt";
import "./WorkspacePage.css";

interface Choice {
  domain: Domain;
  label: string;
  title: string;
  description: string;
  points: string[];
  cta: string;
  icon: LucideIcon;
}

const CHOICES: Choice[] = [
  {
    domain: "client",
    label: "Business / Client",
    title: "I have work that needs doing",
    description: "Post what you need with a budget, and compare the freelancers who apply.",
    points: ["Post work with a ₹ budget: per project, day or month", "Get proposals from freelancers on LeadScout", "Compare them with an explained AI match", "Contact the ones you shortlist"],
    cta: "Continue as a business",
    icon: Store,
  },
  {
    domain: "bi",
    label: "Seeker",
    title: "I'm a freelancer looking for clients",
    description: "Find local businesses that may need your services, and apply to work businesses post.",
    points: ["Search real businesses near any location", "See which ones need attention, and why", "Apply to work businesses have posted", "Track each lead from contact to win"],
    cta: "Continue as a freelancer",
    icon: UserRound,
  },
];

const TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: MapPin, label: "Real business listings from Google" },
  { icon: Sparkles, label: "AI explains, you decide" },
  { icon: ShieldCheck, label: "Contact details shared only when you choose" },
];

interface WorkspacePageProps {
  onChoose: (domain: Domain) => void;
  onHome: () => void;
}

export default function WorkspacePage({ onChoose, onHome }: WorkspacePageProps) {
  return (
    <div className="workspace">
      <TopBar onBrandClick={onHome}>
        <button type="button" className="topbar__link" onClick={onHome}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back to home
        </button>
      </TopBar>

      <main className="workspace__main">
        <div className="workspace__intro">
          <h1 className="workspace__title">How will you use LeadScout?</h1>
          <p className="workspace__subtitle">Choose one to sign in or create an account. Each account belongs to one side.</p>
        </div>

        <div className="workspace__choices">
          {CHOICES.map(({ domain, label, title, description, points, cta, icon: Icon }) => (
            <button key={domain} type="button" className={`choice choice--${domain}`} onClick={() => onChoose(domain)}>
              <ChoiceArt domain={domain} />
              <span className="choice__body">
                <span className="choice__label">
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </span>
                <span className="choice__title">{title}</span>
                <span className="choice__description">{description}</span>
                <span className="choice__points">
                  {points.map((point) => (
                    <span key={point} className="choice__point">
                      <CircleCheck size={15} aria-hidden="true" />
                      {point}
                    </span>
                  ))}
                </span>
                <span className="choice__cta">{cta}</span>
              </span>
            </button>
          ))}
        </div>
      </main>

      <footer className="workspace__footer">
        {TRUST.map(({ icon: Icon, label }) => (
          <span key={label} className="workspace__trust-item">
            <Icon size={14} aria-hidden="true" />
            {label}
          </span>
        ))}
      </footer>
    </div>
  );
}
