import { Bookmark, BriefcaseBusiness, CloudOff, History, LayoutGrid, LoaderCircle, LogOut, MapPinned, Settings, UserRound } from "lucide-react";
import { useNavigation } from "../../app/navigation";
import { useAuth } from "../../shared/auth/AuthContext";
import AppShell, { type NavItem } from "../../shared/components/AppShell";
import LocationOpportunitiesPage from "./pages/LocationOpportunitiesPage";
import MyProfilePage from "./pages/MyProfilePage";
import PostingsOpportunitiesPage from "./pages/PostingsOpportunitiesPage";
import SavedOpportunitiesPage from "./pages/SavedOpportunitiesPage";
import SearchHistoryPage from "./pages/SearchHistoryPage";
import SeekerDashboardPage from "./pages/SeekerDashboardPage";
import SettingsPage from "./pages/SettingsPage";
import { SeekerDataProvider, useSeekerStore } from "./store";
import "./BiPages.css";

// Seeker workspace (domain key "bi"): individual professionals finding businesses that may need their services.
const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "location", label: "Location Opportunities", icon: MapPinned },
  { key: "postings", label: "Posted Opportunities", icon: BriefcaseBusiness },
  { key: "saved", label: "Saved Opportunities", icon: Bookmark },
  { key: "profile", label: "My Profile", icon: UserRound },
  { key: "history", label: "Search History", icon: History },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "signout", label: "Sign Out", icon: LogOut },
];

const PAGES = new Set(NAV_ITEMS.map((item) => item.key).filter((key) => key !== "signout"));

function SeekerPages({ page }: { page: string }) {
  const { go } = useNavigation();
  const { logout } = useAuth();
  const { status, loadError, reload } = useSeekerStore();
  const current = PAGES.has(page) ? page : "dashboard";

  const signOut = () => {
    logout();
    go({ name: "workspace" });
  };
  const navigate = (key: string) => (key === "signout" ? signOut() : go({ name: "app", domain: "bi", page: key }));

  let content;
  if (status !== "ready") {
    content = (
      <div className="page">
        {status === "loading" ? (
          <div className="bi-panel bi-state">
            <LoaderCircle size={22} className="bi-spin" aria-hidden="true" />
            <p className="bi-state__title">Loading your workspace…</p>
          </div>
        ) : (
          <div className="bi-panel bi-state bi-state--error" role="alert">
            <CloudOff size={22} aria-hidden="true" />
            <p className="bi-state__title">Your workspace couldn't be loaded</p>
            <p>{loadError}</p>
            <div className="bi-state__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={reload}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } else switch (current) {
    case "location":
      content = <LocationOpportunitiesPage />;
      break;
    case "postings":
      content = <PostingsOpportunitiesPage />;
      break;
    case "saved":
      content = <SavedOpportunitiesPage onNavigate={navigate} />;
      break;
    case "profile":
      content = <MyProfilePage />;
      break;
    case "history":
      content = <SearchHistoryPage onNavigate={navigate} />;
      break;
    case "settings":
      content = <SettingsPage onSignOut={signOut} />;
      break;
    default:
      content = <SeekerDashboardPage onNavigate={navigate} />;
  }

  return (
    <AppShell domain="bi" navItems={NAV_ITEMS} activeKey={current} profileKey="profile" onNavigate={navigate}>
      {/* key remounts the page on each visit so it starts from its defaults (or a queued "Run again" search). */}
      <div key={current} className={`bi-page-host${current === "location" ? " bi-page-host--full" : ""}`}>
        {content}
      </div>
    </AppShell>
  );
}

export default function BiWorkspace({ page }: { page: string }) {
  const { user } = useAuth();
  return (
    <SeekerDataProvider fullName={user?.fullName ?? ""}>
      <SeekerPages page={page} />
    </SeekerDataProvider>
  );
}
