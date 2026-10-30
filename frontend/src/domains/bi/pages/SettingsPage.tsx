import { useState, type FormEvent } from "react";
import { LogOut, Save } from "lucide-react";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import BiSelect from "../components/BiSelect";
import ConfirmDialog from "../components/ConfirmDialog";
import { useSeekerStore } from "../store";
import { RADIUS_KM, type DataSource, type SeekerSettings } from "../types";

type PendingAction = "saved" | "history" | "profile" | null;

export default function SettingsPage({ onSignOut }: { onSignOut: () => void }) {
  const store = useSeekerStore();
  const { user } = useAuth();
  const { notify } = useToast();
  const [draft, setDraft] = useState<SeekerSettings>(store.settings);
  const [pending, setPending] = useState<PendingAction>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.settings);

  function handleSave(event: FormEvent) {
    event.preventDefault();
    store.updateSettings(draft);
    notify("Settings saved.", "success");
  }

  const confirmations = {
    saved: { title: "Clear saved opportunities?", message: `This removes ${store.saved.length} saved items.`, label: "Clear saved", run: store.clearSaved, done: "Saved opportunities cleared." },
    history: { title: "Clear search history?", message: `This removes ${store.history.length} recorded searches.`, label: "Clear history", run: store.clearHistory, done: "Search history cleared." },
    profile: { title: "Clear your profile?", message: "Your title, skills, preferences and phone number will be removed.", label: "Clear profile", run: () => void store.resetProfile(), done: "Profile cleared." },
  };
  const active = pending ? confirmations[pending] : null;

  return (
    <div className="page page--narrow bi-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Search defaults and data for this workspace.</p>
        </div>
      </header>

      <form className="bi-panel bi-settings" onSubmit={handleSave}>
        <h2 className="bi-form__title">Search</h2>
        <div className="bi-form__grid">
          <label className="field">
            <span className="field__label">Default radius</span>
            <BiSelect
              value={String(draft.defaultRadiusKm)}
              options={RADIUS_KM.map((r) => ({ value: String(r), label: `${r} km` }))}
              onChange={(v) => setDraft((d) => ({ ...d, defaultRadiusKm: Number(v) }))}
            />
          </label>
          <label className="field">
            <span className="field__label">Business data source</span>
            <BiSelect
              value={draft.dataSource}
              options={[
                { value: "google", label: "Google Places — recommended" },
                { value: "osm", label: "OpenStreetMap — free, often busy" },
              ]}
              onChange={(v) => setDraft((d) => ({ ...d, dataSource: v as DataSource }))}
            />
          </label>
        </div>
        <p className="bi-notice">
          {draft.dataSource === "google"
            ? "Google Places lists websites and phone numbers more completely. Each search returns up to about 40 businesses: the nearest ones plus the most prominent across your radius."
            : "OpenStreetMap is free but runs on public servers that are often overloaded, and many local listings have no website or address recorded."}
        </p>
        <label className="bi-toggle">
          <input type="checkbox" checked={draft.recordHistory} onChange={(e) => setDraft((d) => ({ ...d, recordHistory: e.target.checked }))} />
          <span>
            <strong>Record search history</strong>
            <small>Keep a list of completed searches so you can run them again.</small>
          </span>
        </label>
        <div className="bi-settings__footer">
          <button type="button" className="btn btn--secondary" disabled={!dirty} onClick={() => setDraft(store.settings)}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!dirty}>
            <Save size={15} aria-hidden="true" />
            Save settings
          </button>
        </div>
      </form>

      <section className="bi-panel bi-settings" aria-labelledby="bi-data-title">
        <h2 id="bi-data-title" className="bi-form__title">
          Your data
        </h2>
        <p className="bi-hint">Saved items, search history and your profile are kept in this browser session only.</p>
        <ul className="bi-data-rows">
          <li>
            <span>
              <strong>Saved opportunities</strong>
              <small>{store.saved.length} saved</small>
            </span>
            <button type="button" className="btn btn--danger-outline btn--sm" disabled={!store.saved.length} onClick={() => setPending("saved")}>
              Clear
            </button>
          </li>
          <li>
            <span>
              <strong>Search history</strong>
              <small>{store.history.length} recorded</small>
            </span>
            <button type="button" className="btn btn--danger-outline btn--sm" disabled={!store.history.length} onClick={() => setPending("history")}>
              Clear
            </button>
          </li>
          <li>
            <span>
              <strong>Profile</strong>
              <small>{store.profile.title || "No title yet"}</small>
            </span>
            <button type="button" className="btn btn--danger-outline btn--sm" onClick={() => setPending("profile")}>
              Clear
            </button>
          </li>
        </ul>
      </section>

      {user && (
        <section className="bi-panel bi-settings" aria-labelledby="bi-account-title">
          <h2 id="bi-account-title" className="bi-form__title">
            Account
          </h2>
          <dl className="bi-facts">
            <div>
              <dt>Name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
          <div className="bi-settings__footer">
            <button type="button" className="btn btn--danger-outline" onClick={onSignOut}>
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>
      )}

      {active && (
        <ConfirmDialog
          title={active.title}
          message={active.message}
          confirmLabel={active.label}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            active.run();
            setPending(null);
            notify(active.done);
          }}
        />
      )}
    </div>
  );
}
