export type Domain = "client" | "provider" | "bi";

interface DomainInfo {
  label: string;
  accountLabel: string;
  portalLabel: string;
  organizationLabel: string;
  workspaceNoun: string;
}

export const DOMAINS: Record<Domain, DomainInfo> = {
  client: {
    label: "Business / Client",
    accountLabel: "Client Account",
    portalLabel: "Client Portal",
    organizationLabel: "Company name",
    workspaceNoun: "project dashboard",
  },
  provider: {
    label: "Solution Provider",
    accountLabel: "Provider Account",
    portalLabel: "Provider Portal",
    organizationLabel: "Business or team name",
    workspaceNoun: "solutions workspace",
  },
  // Domain key stays "bi" for compatibility; the workspace is the individual "Seeker" (freelancer) workspace.
  bi: {
    label: "Seeker",
    accountLabel: "Seeker Account",
    portalLabel: "Seeker Workspace",
    organizationLabel: "Professional title",
    workspaceNoun: "seeker workspace",
  },
};
