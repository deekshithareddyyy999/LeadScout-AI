import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, CircleHelp, Menu, User as UserIcon, X, type LucideIcon } from "lucide-react";
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
  // On narrow screens the sidebar is a slide-in panel opened from the top bar (hidden by CSS on wide screens).
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function go(key: string) {
    setMenuOpen(false);
    onNavigate(key);
  }

  return (
    <div className="app-shell">
      <TopBar
        leading={
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="workspace-sidebar"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        }
        badge={<PortalBadge label={info.portalLabel} />}
        onBrandClick={() => go(navItems[0].key)}
      >
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
          onClick={() => go(profileKey)}
          aria-label="Open profile"
          title="Profile"
        >
          <UserIcon size={16} />
        </button>
      </TopBar>

      <div className="app-shell__body">
        {menuOpen && <button type="button" className="app-shell__scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
        <aside id="workspace-sidebar" className={`sidebar${menuOpen ? " sidebar--open" : ""}`}>
          <div className="sidebar__section-label">Overview</div>
          <nav className="sidebar__nav" aria-label="Workspace">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`sidebar__item${key === activeKey ? " sidebar__item--active" : ""}`}
                aria-current={key === activeKey ? "page" : undefined}
                onClick={() => go(key)}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <button type="button" className="sidebar__account" onClick={() => go(profileKey)}>
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
