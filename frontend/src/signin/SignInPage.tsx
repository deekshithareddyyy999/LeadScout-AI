import { useState, type FormEvent } from "react";
import { ArrowLeft, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useAuth } from "../shared/auth/AuthContext";
import BrandMark from "../shared/components/BrandMark";
import { DOMAINS, type Domain } from "../shared/domains";
import ChoiceArt from "../workspace/ChoiceArt";
import "./SignInPage.css";

type Mode = "login" | "register";

interface SignInPageProps {
  domain: Domain;
  onSignedIn: () => void;
  onChangeDomain: () => void;
  onHome: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What each side gets, shown beside the form. Matches the workspace picker. */
const SIDE: Partial<Record<Domain, { who: string; heading: string; points: string[]; orgPlaceholder: string }>> = {
  client: {
    who: "business",
    heading: "Get your work done by freelancers nearby.",
    points: ["Post work with a ₹ budget", "Compare applicants with an explained match", "Contact the ones you shortlist"],
    orgPlaceholder: "e.g., Sunrise Bakery",
  },
  bi: {
    who: "freelancer",
    heading: "Find the businesses that need your skills.",
    points: ["Search real businesses near any location", "See who needs attention, and why", "Apply to work businesses post"],
    orgPlaceholder: "e.g., Freelance web developer",
  },
};

export default function SignInPage({ domain, onSignedIn, onChangeDomain, onHome }: SignInPageProps) {
  const { login, register } = useAuth();
  const info = DOMAINS[domain];
  const side = SIDE[domain];

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (mode === "register" && (!fullName.trim() || !organization.trim())) {
      setError(`Enter your full name and ${info.organizationLabel.toLowerCase()}.`);
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result =
      mode === "login"
        ? await login(email, password, domain, remember)
        : await register({ email, password, fullName, organization, domain }, remember);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSignedIn();
  }

  return (
    <div className="signin">
      <aside className="signin__side">
        <div className="signin__side-top">
          <button type="button" className="signin__brand" onClick={onHome} aria-label="LeadScout AI home">
            <BrandMark />
          </button>
          <button type="button" className="signin__back" onClick={onHome}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to home
          </button>
        </div>

        <div className="signin__pitch">
          <p className="signin__as">Signing in as a {side?.who ?? info.label.toLowerCase()}</p>
          <h2 className="signin__heading">{side?.heading ?? `Welcome to your ${info.workspaceNoun}.`}</h2>
          {side && (
            <ul className="signin__points">
              {side.points.map((point) => (
                <li key={point}>
                  <CircleCheck size={16} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          )}
          {(domain === "client" || domain === "bi") && (
            <div className="signin__art">
              <ChoiceArt domain={domain} />
            </div>
          )}
        </div>

        <p className="signin__switch">
          Not a {side?.who ?? info.label.toLowerCase()}?{" "}
          <button type="button" className="signin__switch-link" onClick={onChangeDomain}>
            Choose a different side
          </button>
        </p>
      </aside>

      <main className="signin__main">
        <div className="signin__column">
          <h1 className="signin__title">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="signin__subtitle">
            {mode === "login" ? `Sign in to your ${info.workspaceNoun}.` : `Set up your ${info.label} account. It takes a minute.`}
          </p>

          <div className="segmented" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`segmented__option${mode === "login" ? " segmented__option--active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Log In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`segmented__option${mode === "register" ? " segmented__option--active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          <form className="signin__form" onSubmit={handleSubmit} noValidate>
            {mode === "register" && (
              <>
                <label className="field">
                  <span className="field__label">Full name</span>
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="Your name" />
                </label>
                <label className="field">
                  <span className="field__label">{info.organizationLabel}</span>
                  <input
                    className="input"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    autoComplete="organization"
                    placeholder={side?.orgPlaceholder ?? ""}
                  />
                </label>
              </>
            )}

            <label className="field">
              <span className="field__label">Email</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
            </label>

            <div className="field">
              <label className="field__label" htmlFor="signin-password">
                Password
              </label>
              <div className="signin__password">
                <input
                  id="signin-password"
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                />
                <button type="button" className="signin__reveal" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep signed in for 30 days
            </label>

            {error && (
              <p className="signin__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block signin__submit" disabled={submitting} aria-busy={submitting}>
              {submitting && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
              {submitting ? (mode === "login" ? "Signing in…" : "Creating account…") : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="signin__alt">
            {mode === "login" ? "New to LeadScout? " : "Already have an account? "}
            <button type="button" className="signin__switch-link signin__switch-link--dark" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
