import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, errorMessage } from "../../shared/api";
import { useToast } from "../../shared/components/Toast";
import { removeKey } from "../../shared/utils/storage";
import type { Application, ApplicationStatus, BusinessProfile, GoogleListing, Requirement, RequirementStatus } from "./types";

// Client workspace data from /api/client: the business profile, its posted requirements and the Seekers who applied.
// Status changes update the screen first and save in the background; on failure the user is told and data re-syncs.

export type NewRequirement = Omit<Requirement, "id" | "status" | "postedAt">;

/** What "Help me write this" fills in. */
export interface RequirementDraft {
  title: string;
  businessProblem: string;
  description: string;
  expectedOutcome: string;
  skills: string[];
  service: Requirement["service"];
}

interface ClientData {
  profile: BusinessProfile;
  requirements: Requirement[];
  applications: Application[];
}

interface RequirementSummary {
  applicationCount: number;
  newCount: number;
  recommendedCount: number;
  topMatch: { score: number; applicantName: string } | null;
}

type LoadStatus = "loading" | "ready" | "error";

interface ClientStore extends ClientData {
  status: LoadStatus;
  loadError: string | null;
  refreshedAt: string;
  summaries: Record<string, RequirementSummary>;
  addRequirement: (input: NewRequirement) => Promise<Requirement>;
  setRequirementStatus: (id: string, status: RequirementStatus) => void;
  setApplicationStatus: (id: string, status: ApplicationStatus) => void;
  /** AI match for ONE application, only when the business asks — never for everyone at once. */
  runMatching: (applicationId: string) => Promise<void>;
  saveProfile: (profile: Omit<BusinessProfile, "email" | "google">) => Promise<void>;
  searchGoogle: (query: string) => Promise<GoogleListing[]>;
  linkGoogle: (placeId: string) => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  draftRequirement: (idea: string) => Promise<RequirementDraft>;
  refresh: () => void;
}

const EMPTY_PROFILE: BusinessProfile = { businessName: "", category: "", area: "", city: "", website: "", contactName: "", phone: "", about: "", email: "", google: null };
const ClientStoreContext = createContext<ClientStore | null>(null);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ClientData>({ profile: EMPTY_PROFILE, requirements: [], applications: [] });
  const [refreshedAt, setRefreshedAt] = useState(() => new Date().toISOString());
  const loadSeq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const seq = ++loadSeq.current;
    if (!quiet) setStatus("loading");
    try {
      const next = await api<ClientData>("/client");
      if (seq !== loadSeq.current) return;
      setData(next);
      setRefreshedAt(new Date().toISOString());
      setStatus("ready");
      setLoadError(null);
    } catch (error) {
      if (seq !== loadSeq.current || quiet) return;
      setLoadError(errorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    removeKey(sessionStorage, "ls.client.v1"); // the old browser-only demo data
    void load();
  }, [load]);

  const persist = useCallback(
    (request: Promise<unknown>) => {
      request.catch((error) => {
        notify(`Couldn't save that change: ${errorMessage(error)}`);
        void load(true);
      });
    },
    [notify, load]
  );

  const summaries = useMemo(() => {
    const result: Record<string, RequirementSummary> = {};
    for (const requirement of data.requirements) {
      const apps = data.applications.filter((a) => a.requirementId === requirement.id);
      const scored = apps.filter((a) => a.match).sort((a, b) => b.match!.score - a.match!.score);
      result[requirement.id] = {
        applicationCount: apps.length,
        newCount: apps.filter((a) => a.status === "new").length,
        recommendedCount: scored.filter((a) => a.match!.score >= 90).length,
        topMatch: scored[0] ? { score: scored[0].match!.score, applicantName: scored[0].applicant.name } : null,
      };
    }
    return result;
  }, [data]);

  const addRequirement = useCallback(async (input: NewRequirement) => {
    const created = await api<Requirement>("/client/requirements", { method: "POST", body: input });
    setData((d) => ({ ...d, requirements: [created, ...d.requirements] }));
    return created;
  }, []);

  const setRequirementStatus = useCallback(
    (id: string, next: RequirementStatus) => {
      setData((d) => ({ ...d, requirements: d.requirements.map((r) => (r.id === id ? { ...r, status: next } : r)) }));
      persist(api(`/client/requirements/${id}`, { method: "PATCH", body: { status: next } }));
    },
    [persist]
  );

  const setApplicationStatus = useCallback(
    (id: string, next: ApplicationStatus) => {
      setData((d) => {
        const application = d.applications.find((a) => a.id === id);
        return {
          ...d,
          applications: d.applications.map((a) => (a.id === id ? { ...a, status: next } : a)),
          requirements:
            next === "shortlisted" && application
              ? d.requirements.map((r) => (r.id === application.requirementId && r.status === "open" ? { ...r, status: "reviewing" } : r))
              : d.requirements,
        };
      });
      // The server returns the application with contact details once shortlisted.
      persist(
        api<Application>(`/client/applications/${id}`, { method: "PATCH", body: { status: next } }).then((saved) =>
          setData((d) => ({ ...d, applications: d.applications.map((a) => (a.id === id ? saved : a)) }))
        )
      );
    },
    [persist]
  );

  const runMatching = useCallback(async (applicationId: string) => {
    const updated = await api<Application>(`/client/applications/${applicationId}/match`, { method: "POST" });
    setData((d) => ({ ...d, applications: d.applications.map((a) => (a.id === applicationId ? updated : a)) }));
  }, []);

  const saveProfile = useCallback(async (profile: Omit<BusinessProfile, "email" | "google">) => {
    const saved = await api<BusinessProfile>("/client/profile", { method: "PUT", body: profile });
    setData((d) => ({ ...d, profile: saved }));
  }, []);

  const searchGoogle = useCallback((query: string) => api<GoogleListing[]>("/client/google/search", { method: "POST", body: { query } }), []);

  const linkGoogle = useCallback(async (placeId: string) => {
    const google = await api<GoogleListing>("/client/google/link", { method: "POST", body: { placeId } });
    setData((d) => ({ ...d, profile: { ...d.profile, google } }));
  }, []);

  const unlinkGoogle = useCallback(async () => {
    await api("/client/google/link", { method: "DELETE" });
    setData((d) => ({ ...d, profile: { ...d.profile, google: null } }));
  }, []);

  const draftRequirement = useCallback((idea: string) => api<RequirementDraft>("/client/draft", { method: "POST", body: { idea } }), []);

  return (
    <ClientStoreContext.Provider
      value={{
        ...data,
        status,
        loadError,
        refreshedAt,
        summaries,
        addRequirement,
        setRequirementStatus,
        setApplicationStatus,
        runMatching,
        saveProfile,
        searchGoogle,
        linkGoogle,
        unlinkGoogle,
        draftRequirement,
        refresh: () => void load(true),
      }}
    >
      {children}
    </ClientStoreContext.Provider>
  );
}

export function useClientStore(): ClientStore {
  const ctx = useContext(ClientStoreContext);
  if (!ctx) throw new Error("useClientStore must be used inside ClientDataProvider");
  return ctx;
}
