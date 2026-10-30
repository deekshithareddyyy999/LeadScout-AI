import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { DOMAINS } from "../domains";
import { formatDate } from "../utils/dates";
import "./ProfilePage.css";

export default function ProfilePage({ onSignedOut }: { onSignedOut: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const rows = [
    { label: "Full name", value: user.fullName },
    { label: "Email", value: user.email },
    { label: DOMAINS[user.domain].organizationLabel, value: user.organization || "—" },
    { label: "Domain", value: DOMAINS[user.domain].label },
    { label: "Member since", value: formatDate(user.createdAt) },
  ];

  return (
    <div className="page page--narrow">
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your account details for this workspace.</p>
        </div>
      </header>

      <section className="card profile-card">
        <div className="profile-card__head">
          <span className="profile-card__avatar" aria-hidden="true">
            {(user.fullName || user.email).charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="profile-card__name">{user.fullName}</div>
            <div className="profile-card__role">{DOMAINS[user.domain].accountLabel}</div>
          </div>
        </div>

        <dl className="profile-card__rows">
          {rows.map((row) => (
            <div key={row.label} className="profile-card__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="profile-card__footer">
          <button
            type="button"
            className="btn btn--danger-outline"
            onClick={() => {
              logout();
              onSignedOut();
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
}
