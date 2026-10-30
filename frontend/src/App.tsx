import { NavigationProvider, useNavigation } from "./app/navigation";
import BiWorkspace from "./domains/bi/BiWorkspace";
import ClientWorkspace from "./domains/client/ClientWorkspace";
import LandingPage from "./landing/LandingPage";
import { AuthProvider, useAuth } from "./shared/auth/AuthContext";
import PlaceholderWorkspace from "./shared/components/PlaceholderWorkspace";
import { ToastProvider } from "./shared/components/Toast";
import type { Domain } from "./shared/domains";
import SignInPage from "./signin/SignInPage";
import WorkspacePage from "./workspace/WorkspacePage";

function Screens() {
  const { view, go } = useNavigation();
  const { user, ready } = useAuth();

  const openDashboard = (domain: Domain) => go({ name: "app", domain, page: "dashboard" });
  const chooseDomain = (domain: Domain) => (user?.domain === domain ? openDashboard(domain) : go({ name: "signin", domain }));
  const home = () => go({ name: "landing" });

  switch (view.name) {
    case "workspace":
      return <WorkspacePage onHome={home} onChoose={chooseDomain} />;

    case "signin":
      return (
        <SignInPage
          domain={view.domain}
          onHome={home}
          onChangeDomain={() => go({ name: "workspace" })}
          onSignedIn={() => openDashboard(view.domain)}
        />
      );

    case "app":
      // Wait for the session check so a signed-in reload doesn't flash the sign-in page.
      if (!ready) return null;
      if (user?.domain !== view.domain) {
        return (
          <SignInPage
            domain={view.domain}
            onHome={home}
            onChangeDomain={() => go({ name: "workspace" })}
            onSignedIn={() => go(view)}
          />
        );
      }
      if (view.domain === "client") return <ClientWorkspace page={view.page} requirementId={view.requirementId} />;
      if (view.domain === "bi") return <BiWorkspace page={view.page} />;
      return <PlaceholderWorkspace domain={view.domain} page={view.page} />;

    default:
      return (
        <LandingPage
          onGetStarted={() => go({ name: "workspace" })}
          onChooseDomain={chooseDomain}
          onOpenAccount={user ? () => openDashboard(user.domain) : undefined}
        />
      );
  }
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NavigationProvider>
          <Screens />
        </NavigationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
