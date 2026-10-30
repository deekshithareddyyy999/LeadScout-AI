import { LayoutGrid, UserRound } from "lucide-react";
import { useNavigation } from "../../app/navigation";
import ProfilePage from "../account/ProfilePage";
import { DOMAINS, type Domain } from "../domains";
import AppShell, { type NavItem } from "./AppShell";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "profile", label: "Profile", icon: UserRound },
];

// Stands in for the Provider and BI workspaces until their Stitch designs are ready.
export default function PlaceholderWorkspace({ domain, page }: { domain: Domain; page: string }) {
  const { go } = useNavigation();
  const info = DOMAINS[domain];

  return (
    <AppShell
      domain={domain}
      navItems={NAV_ITEMS}
      activeKey={page === "profile" ? "profile" : "dashboard"}
      profileKey="profile"
      onNavigate={(key) => go({ name: "app", domain, page: key })}
    >
      {page === "profile" ? (
        <ProfilePage onSignedOut={() => go({ name: "workspace" })} />
      ) : (
        <div className="page">
          <header className="page-header">
            <div>
              <h1 className="page-title">{info.label} Dashboard</h1>
              <p className="page-subtitle">You're signed in. This workspace is waiting on its Stitch design.</p>
            </div>
          </header>
          <div className="card empty-state">
            <div className="empty-state__title">Screens coming next</div>
            Share the {info.label} designs and they'll be built here. Use Profile in the sidebar to review your account or sign out.
          </div>
        </div>
      )}
    </AppShell>
  );
}
