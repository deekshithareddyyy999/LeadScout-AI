import { CloudOff, FolderOpen, LayoutGrid, ListChecks, LoaderCircle, LogOut, Store } from "lucide-react";
import { useNavigation } from "../../app/navigation";
import { useAuth } from "../../shared/auth/AuthContext";
import AppShell, { type NavItem } from "../../shared/components/AppShell";
import ApplicationsPage from "./pages/ApplicationsPage";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import ClientDashboardPage from "./pages/ClientDashboardPage";
import MyRequirementsPage from "./pages/MyRequirementsPage";
import PostRequirementPage from "./pages/PostRequirementPage";
import { ClientDataProvider, useClientStore } from "./store";

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "requirements", label: "My Requirements", icon: ListChecks },
  { key: "applications", label: "Applications", icon: FolderOpen },
  { key: "profile", label: "Business Profile", icon: Store },
  { key: "signout", label: "Sign Out", icon: LogOut },
];

const ACTIVE_NAV: Record<string, string> = {
  "post-requirement": "requirements",
};

function ClientPages({ page, requirementId }: { page: string; requirementId?: string }) {
  const { go } = useNavigation();
  const { logout } = useAuth();
  const { requirements, summaries, status, loadError, refresh } = useClientStore();
  const signOut = () => {
    logout();
    go({ name: "workspace" });
  };

  const open = (nextPage: string, nextRequirementId?: string) =>
    go({ name: "app", domain: "client", page: nextPage, requirementId: nextRequirementId });

  const defaultRequirementId =
    [...requirements]
      .filter((r) => r.status !== "closed" && summaries[r.id]?.applicationCount > 0)
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0]?.id ?? requirements[0]?.id;

  let content;
  if (status !== "ready") {
    content = (
      <div className="page">
        <div className="card empty-state" role={status === "error" ? "alert" : undefined}>
          {status === "loading" ? (
            <>
              <LoaderCircle size={22} className="spin" aria-hidden="true" />
              <div className="empty-state__title">Loading your workspace…</div>
            </>
          ) : (
            <>
              <CloudOff size={22} aria-hidden="true" />
              <div className="empty-state__title">Your workspace couldn't be loaded</div>
              <p>{loadError}</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={refresh}>
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  } else
    switch (page) {
      case "requirements":
        content = (
          <MyRequirementsPage
            onDashboard={() => open("dashboard")}
            onPostRequirement={() => open("post-requirement")}
            onReview={(id) => open("applications", id)}
          />
        );
        break;
      case "applications":
        content = (
          <ApplicationsPage
            requirementId={requirementId && summaries[requirementId] ? requirementId : defaultRequirementId}
            onSelectRequirement={(id) => open("applications", id)}
            onDashboard={() => open("dashboard")}
            onRequirements={() => open("requirements")}
            onPostRequirement={() => open("post-requirement")}
          />
        );
        break;
      case "post-requirement":
        content = (
          <PostRequirementPage
            onDashboard={() => open("dashboard")}
            onRequirements={() => open("requirements")}
            onPublished={() => open("requirements")}
            onProfile={() => open("profile")}
          />
        );
        break;
      case "profile":
        content = <BusinessProfilePage onSignedOut={() => go({ name: "workspace" })} />;
        break;
      default:
        content = (
          <ClientDashboardPage onPostRequirement={() => open("post-requirement")} onReview={(id) => open("applications", id)} onProfile={() => open("profile")} />
        );
    }

  return (
    <AppShell domain="client" navItems={NAV_ITEMS} activeKey={ACTIVE_NAV[page] ?? page} profileKey="profile" onNavigate={(key) => (key === "signout" ? signOut() : open(key))}>
      {content}
    </AppShell>
  );
}

export default function ClientWorkspace({ page, requirementId }: { page: string; requirementId?: string }) {
  return (
    <ClientDataProvider>
      <ClientPages page={page} requirementId={requirementId} />
    </ClientDataProvider>
  );
}
