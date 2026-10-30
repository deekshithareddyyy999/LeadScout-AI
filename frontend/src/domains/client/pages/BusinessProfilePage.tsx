import { useState, type FormEvent, type ReactNode } from "react";
import { BadgeCheck, ExternalLink, LoaderCircle, LogOut, Save, Search, Star } from "lucide-react";
import { errorMessage } from "../../../shared/api";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { formatDate } from "../../../shared/utils/dates";
import { useClientStore } from "../store";
import type { BusinessProfile, GoogleListing } from "../types";
import "./ClientPages.css";

type Editable = Omit<BusinessProfile, "email" | "google">;

function Section({ step, title, description, children }: { step: number | string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <header className="form-section__head">
        <span className="form-section__step">{step}</span>
        <div className="form-section__heading">
          <h2 className="form-section__title">{title}</h2>
          <p className="form-section__description">{description}</p>
        </div>
      </header>
      <div className="form-section__body">{children}</div>
    </section>
  );
}

const pick = (p: BusinessProfile): Editable => ({
  businessName: p.businessName,
  category: p.category,
  area: p.area,
  city: p.city,
  website: p.website,
  contactName: p.contactName,
  phone: p.phone,
  about: p.about,
});

export default function BusinessProfilePage({ onSignedOut }: { onSignedOut: () => void }) {
  const store = useClientStore();
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState<Editable>(() => ({ ...pick(store.profile), businessName: store.profile.businessName || user?.organization || "" }));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [query, setQuery] = useState(() => [store.profile.businessName || user?.organization, store.profile.city].filter(Boolean).join(", "));
  const [results, setResults] = useState<GoogleListing[] | null>(null);
  const [googleBusy, setGoogleBusy] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const update = <K extends keyof Editable>(key: K, value: Editable[K]) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(store.profile));

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!form.businessName.trim()) {
      setNameError("Add your business name.");
      document.getElementById("bp-name")?.focus();
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await store.saveProfile(form);
      notify("Business profile saved.", "success");
    } catch (error) {
      notify(`Couldn't save: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  async function search() {
    setGoogleBusy("search");
    setGoogleError(null);
    try {
      setResults(await store.searchGoogle(query));
    } catch (error) {
      setGoogleError(errorMessage(error));
    } finally {
      setGoogleBusy(null);
    }
  }

  async function link(placeId: string) {
    setGoogleBusy(placeId);
    setGoogleError(null);
    try {
      await store.linkGoogle(placeId);
      setResults(null);
      notify("Google listing linked. Your posts now show “Verified on Google”.", "success");
    } catch (error) {
      setGoogleError(errorMessage(error));
    } finally {
      setGoogleBusy(null);
    }
  }

  const google = store.profile.google;

  return (
    <div className="page page--form">
      <header className="page-header">
        <div>
          <h1 className="page-title">Business Profile</h1>
          <p className="page-subtitle">Freelancers see these details on every requirement you post. A linked Google listing adds a “Verified on Google” badge.</p>
        </div>
      </header>

      <form className="card req-form" onSubmit={handleSave} noValidate>
        <Section step={1} title="About Your Business" description="Who you are and where you work.">
          <div className="form-grid">
            <label className="field form-grid__full">
              <span className="field__label">
                Business name<span className="field__required">*</span>
              </span>
              <input id="bp-name" className={`input${nameError ? " input--invalid" : ""}`} maxLength={120} value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="e.g., Grand Maa Bakers" />
              {nameError && <span className="field__error">{nameError}</span>}
            </label>
            <label className="field">
              <span className="field__label">Category</span>
              <input className="input" maxLength={80} value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="e.g., Bakery, Salon, Dental clinic" />
            </label>
            <label className="field">
              <span className="field__label">Website</span>
              <input className="input" maxLength={300} value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="Leave blank if you don't have one" />
            </label>
            <label className="field">
              <span className="field__label">Area</span>
              <input className="input" maxLength={120} value={form.area} onChange={(e) => update("area", e.target.value)} placeholder="e.g., Banjara Hills" />
            </label>
            <label className="field">
              <span className="field__label">City</span>
              <input className="input" maxLength={80} value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g., Hyderabad" />
            </label>
            <label className="field form-grid__full">
              <span className="field__label">About the business</span>
              <textarea className="textarea" rows={3} maxLength={1500} value={form.about} onChange={(e) => update("about", e.target.value)} placeholder="What you do, who your customers are, what makes you different…" />
            </label>
          </div>
        </Section>

        <Section step={2} title="Contact Details" description="Shared with a freelancer only after you shortlist them.">
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Contact person</span>
              <input className="input" maxLength={120} value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Your name" />
            </label>
            <label className="field">
              <span className="field__label">Phone / WhatsApp</span>
              <input className="input" maxLength={40} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 …" />
            </label>
            <label className="field form-grid__full">
              <span className="field__label">Email</span>
              <input className="input" value={store.profile.email || user?.email || ""} readOnly aria-readonly="true" />
              <span className="field__hint">Your sign-in email. Shared only with freelancers you shortlist.</span>
            </label>
          </div>
        </Section>

        <Section step={3} title="Verified on Google (optional)" description="Link your Google Business listing so freelancers can see your rating and reviews.">
          {google ? (
            <div className="bp-google bp-google--linked">
              <BadgeCheck size={18} aria-hidden="true" />
              <div className="bp-google__text">
                <strong>{google.name}</strong>
                <span>
                  {google.rating !== null ? (
                    <>
                      <Star size={12} aria-hidden="true" /> {google.rating.toFixed(1)} from {google.reviewCount ?? 0} reviews
                    </>
                  ) : (
                    "No rating yet"
                  )}
                  {google.mapsUrl && (
                    <>
                      {" · "}
                      <a href={google.mapsUrl} target="_blank" rel="noopener noreferrer">
                        View on Google Maps <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={async () => {
                  try {
                    await store.unlinkGoogle();
                    notify("Google listing unlinked.");
                  } catch (error) {
                    notify(`Couldn't unlink: ${errorMessage(error)}`);
                  }
                }}
              >
                Unlink
              </button>
            </div>
          ) : (
            <div className="bp-google">
              <div className="bp-google__search">
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void search();
                    }
                  }}
                  placeholder="Business name and city"
                  aria-label="Search Google for your business"
                />
                <button type="button" className="btn btn--secondary" onClick={search} disabled={googleBusy !== null || query.trim().length < 3}>
                  {googleBusy === "search" ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
                  Find on Google
                </button>
              </div>
              {googleError && <span className="field__error">{googleError}</span>}
              {results && results.length === 0 && <p className="field__hint">No listings found. Try the exact name shown on Google Maps, with your area.</p>}
              {results && results.length > 0 && (
                <ul className="bp-google__results">
                  {results.map((r) => (
                    <li key={r.placeId}>
                      <div className="bp-google__text">
                        <strong>{r.name}</strong>
                        <span>
                          {r.address}
                          {r.rating !== null && ` · ${r.rating.toFixed(1)}★ (${r.reviewCount ?? 0})`}
                        </span>
                      </div>
                      <button type="button" className="btn btn--soft btn--sm" onClick={() => link(r.placeId)} disabled={googleBusy !== null}>
                        {googleBusy === r.placeId ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <BadgeCheck size={14} aria-hidden="true" />}
                        This is my business
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        <footer className="req-form__footer">
          <span className="req-form__note">Changes show on your posts as soon as you save.</span>
          <div className="req-form__buttons">
            <button type="submit" className="btn btn--primary" disabled={saving || !dirty}>
              {saving ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
              Save Profile
            </button>
          </div>
        </footer>
      </form>

      <section className="card bp-account" aria-label="Account">
        <div className="bp-account__text">
          <h2 className="bp-account__title">Account</h2>
          <p>
            Signed in as <strong>{store.profile.email || user?.email}</strong>
            {user?.createdAt ? ` · Member since ${formatDate(user.createdAt)}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--danger-outline"
          onClick={() => {
            logout();
            onSignedOut();
          }}
        >
          <LogOut size={15} aria-hidden="true" />
          Sign out
        </button>
      </section>
    </div>
  );
}
