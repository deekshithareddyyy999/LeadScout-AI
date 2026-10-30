import type { ReactNode } from "react";
import { BookOpen, CircleHelp, User as UserIcon, type LucideIcon } from "lucide-react";
import TopBar, { PortalBadge } from "./TopBar";
import { useToast } from "./Toast";
import { useAuth } from "../auth/AuthContext";
import { DOMAINS, type Domain } from "../domains";

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  domain: Domain;
  navItems: NavItem[];
  activeKey: string;
  profileKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}

export default function AppShell({ domain, navItems, activeKey, profileKey, onNavigate, children }: AppShellProps) {
  const { user } = useAuth();
  const { comingSoon } = useToast();
  const info = DOMAINS[domain];
  const organization = user?.organization || user?.fullName || "Account";

  return (
    <div className="app-shell">
      <TopBar badge={<PortalBadge label={info.portalLabel} />} onBrandClick={() => onNavigate(navItems[0].key)}>
        <button type="button" className="topbar__link" onClick={() => comingSoon("Docs")}>
          <BookOpen size={15} aria-hidden="true" />
          Docs
        </button>
        <button type="button" className="topbar__link" onClick={() => comingSoon("Support")}>
          <CircleHelp size={15} aria-hidden="true" />
          Support
        </button>
        <button
          type="button"
          className="topbar__avatar"
          onClick={() => onNavigate(profileKey)}
          aria-label="Open profile"
          title="Profile"
        >
          <UserIcon size={16} />
        </button>
      </TopBar>

      <div className="app-shell__body">
        <aside className="sidebar">
          <div className="sidebar__section-label">Overview</div>
          <nav className="sidebar__nav" aria-label="Workspace">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`sidebar__item${key === activeKey ? " sidebar__item--active" : ""}`}
                aria-current={key === activeKey ? "page" : undefined}
                onClick={() => onNavigate(key)}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <button type="button" className="sidebar__account" onClick={() => onNavigate(profileKey)}>
            <span className="sidebar__account-avatar" aria-hidden="true">
              {organization.charAt(0).toUpperCase()}
            </span>
            <span className="sidebar__account-text">
              <span className="sidebar__account-name">{organization}</span>
              <span className="sidebar__account-role">{info.accountLabel}</span>
            </span>
          </button>
        </aside>

        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
}
