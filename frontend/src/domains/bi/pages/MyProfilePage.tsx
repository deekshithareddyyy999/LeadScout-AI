import { useState, type FormEvent } from "react";
import { RotateCcw, Save } from "lucide-react";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import BiSelect from "../components/BiSelect";
import ConfirmDialog from "../components/ConfirmDialog";
import TagInput from "../components/TagInput";
import { CATEGORIES } from "../services/categories";
import { useSeekerStore } from "../store";
import { EXPERIENCE_OPTIONS, type SeekerProfile } from "../types";

type FieldErrors = Partial<Record<"fullName" | "portfolioUrl", string>>;

function validate(profile: SeekerProfile): FieldErrors {
  const errors: FieldErrors = {};
  if (!profile.fullName.trim()) errors.fullName = "Enter your name.";
  const url = profile.portfolioUrl.trim();
  if (url && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(url)) errors.portfolioUrl = "Enter a valid web address, e.g. yourname.com.";
  return errors;
}

export default function MyProfilePage() {
  const store = useSeekerStore();
  const { user } = useAuth();
  const { notify } = useToast();
  const [draft, setDraft] = useState<SeekerProfile>(store.profile);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(store.profile);
  const errors = submitted ? validate(draft) : {};
  const update = <K extends keyof SeekerProfile>(field: K, value: SeekerProfile[K]) => setDraft((d) => ({ ...d, [field]: value }));

  function toggleCategory(id: string) {
    update("preferredCategories", draft.preferredCategories.includes(id) ? draft.preferredCategories.filter((c) => c !== id) : [...draft.preferredCategories, id]);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(draft);
    if (Object.keys(found).length) {
      document.getElementById(found.fullName ? "bi-profile-name" : "bi-profile-portfolio")?.focus();
      return;
    }
    const cleaned: SeekerProfile = {
      ...draft,
      fullName: draft.fullName.trim(),
      title: draft.title.trim(),
      portfolioUrl: draft.portfolioUrl.trim(),
      phone: draft.phone.trim(),
    };
    store.updateProfile(cleaned);
    setDraft(cleaned);
    setSubmitted(false);
    notify("Profile saved.", "success");
  }

  return (
    <div className="page bi-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Tell LeadScout what you do and where you like to work. No company details needed.</p>
        </div>
      </header>

      <div className="bi-profile">
        <form className="bi-panel bi-form" onSubmit={handleSave} noValidate>
          <section className="bi-form__section">
            <h2 className="bi-form__title">About you</h2>
            <div className="bi-form__grid">
              <label className="field">
                <span className="field__label">
                  Full name<span className="field__required">*</span>
                </span>
                <input
                  id="bi-profile-name"
                  className={`input${errors.fullName ? " input--invalid" : ""}`}
                  value={draft.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                />
                {errors.fullName && <span className="field__error">{errors.fullName}</span>}
              </label>
              <label className="field">
                <span className="field__label">Professional title</span>
                <input className="input" value={draft.title} placeholder="e.g. Freelance web developer" onChange={(e) => update("title", e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Experience</span>
                <BiSelect
                  value={draft.experience}
                  options={EXPERIENCE_OPTIONS.map((o) => ({ value: o, label: o || "Prefer not to say" }))}
                  onChange={(v) => update("experience", v)}
                />
              </label>
              <label className="field">
                <span className="field__label">Portfolio or website</span>
                <input
                  id="bi-profile-portfolio"
                  className={`input${errors.portfolioUrl ? " input--invalid" : ""}`}
                  value={draft.portfolioUrl}
                  placeholder="e.g. yourname.dev"
                  onChange={(e) => update("portfolioUrl", e.target.value)}
                />
                {errors.portfolioUrl && <span className="field__error">{errors.portfolioUrl}</span>}
              </label>
            </div>
          </section>

          <section className="bi-form__section">
            <h2 className="bi-form__title">Skills & services</h2>
            <div className="field">
              <label className="field__label" htmlFor="bi-profile-skills">
                What you offer
              </label>
              <TagInput
                id="bi-profile-skills"
                value={draft.skills}
                onChange={(skills) => update("skills", skills)}
                placeholder="e.g. Website design, SEO, Social media — press Enter after each"
              />
              <span className="field__hint">Postings show which of these skills they ask for.</span>
            </div>
          </section>

          <section className="bi-form__section">
            <h2 className="bi-form__title">Where and what you look for</h2>
            <div className="field">
              <label className="field__label" htmlFor="bi-profile-locations">
                Preferred locations
              </label>
              <TagInput
                id="bi-profile-locations"
                value={draft.preferredLocations}
                onChange={(places) => update("preferredLocations", places)}
                placeholder="e.g. Gachibowli, Hyderabad — press Enter after each"
                splitOnComma={false}
              />
              <span className="field__hint">Shown as one-click choices on Location-Based Opportunities. The first one is pre-filled.</span>
            </div>
            <fieldset className="bi-fieldset">
              <legend className="field__label">Business categories you're interested in</legend>
              <div className="bi-checks">
                {CATEGORIES.map((c) => (
                  <label key={c.id} className={`bi-check${draft.preferredCategories.includes(c.id) ? " bi-check--on" : ""}`}>
                    <input type="checkbox" checked={draft.preferredCategories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="bi-form__section">
            <h2 className="bi-form__title">Contact</h2>
            <div className="bi-form__grid">
              <label className="field">
                <span className="field__label">Email</span>
                <input className="input" value={user?.email ?? ""} readOnly disabled />
                <span className="field__hint">From your account.</span>
              </label>
              <label className="field">
                <span className="field__label">Phone</span>
                <input className="input" type="tel" value={draft.phone} placeholder="Optional" onChange={(e) => update("phone", e.target.value)} />
              </label>
            </div>
          </section>

          <div className="bi-form__footer">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmingReset(true)}>
              <RotateCcw size={14} aria-hidden="true" />
              Clear profile
            </button>
            <div className="bi-form__buttons">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={!dirty}
                onClick={() => {
                  setDraft(store.profile);
                  setSubmitted(false);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={!dirty}>
                <Save size={15} aria-hidden="true" />
                Save profile
              </button>
            </div>
          </div>
        </form>

        <aside className="bi-panel bi-aside" aria-labelledby="bi-aside-title">
          <h2 id="bi-aside-title" className="bi-form__title">
            How your profile is used
          </h2>
          <ul className="bi-aside__list">
            <li>
              <strong>Skills</strong> — postings highlight the skills they ask for that you offer.
            </li>
            <li>
              <strong>Preferred locations</strong> — one-click locations on the map search.
            </li>
            <li>
              <strong>Categories</strong> — a reminder of the kinds of businesses you target.
            </li>
          </ul>
          <p className="bi-hint">Your profile is kept in this browser session until accounts are stored on the server.</p>
        </aside>
      </div>

      {confirmingReset && (
        <ConfirmDialog
          title="Clear your profile?"
          message="Your title, skills, preferences and phone number will be removed. Your name is kept from your account."
          confirmLabel="Clear profile"
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setDraft(store.resetProfile());
            setConfirmingReset(false);
            setSubmitted(false);
            notify("Profile cleared.");
          }}
        />
      )}
    </div>
  );
}
