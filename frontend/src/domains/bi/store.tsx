import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, errorMessage } from "../../shared/api";
import { useToast } from "../../shared/components/Toast";
import type { BusinessResult, HistoryEntry, LeadTracking, LocationQuery, Posting, PostingFilters, SavedItem, SeekerProfile, SeekerSettings } from "./types";

// Seeker workspace state, stored per account in the database via /api/seeker: profile, settings,
// saved opportunities (snapshots of records the user actually saved) and their real search history.
// Actions update the screen immediately and save in the background; if a save fails, the user is told
// and the workspace reloads what the server actually has.

interface PendingSearch {
  location?: LocationQuery;
  postings?: PostingFilters;
}

interface SeekerData {
  profile: SeekerProfile;
  settings: SeekerSettings;
  saved: SavedItem[];
  history: HistoryEntry[];
}

type LoadStatus = "loading" | "ready" | "error";
type NewHistoryEntry = Omit<Extract<HistoryEntry, { source: "location" }>, "id" | "at"> | Omit<Extract<HistoryEntry, { source: "postings" }>, "id" | "at">;

interface SeekerStore extends SeekerData {
  status: LoadStatus;
  loadError: string | null;
  reload: () => void;
  pending: PendingSearch;
  isSaved: (id: string) => boolean;
  toggleSaveBusiness: (business: BusinessResult) => boolean;
  toggleSavePosting: (posting: Posting) => boolean;
  removeSaved: (id: string) => void;
  clearSaved: () => void;
  /** Lead tracker: change a saved opportunity's status, notes or follow-up date. */
  updateLead: (id: string, patch: Partial<LeadTracking>) => void;
  updateProfile: (profile: SeekerProfile) => void;
  resetProfile: () => SeekerProfile;
  updateSettings: (settings: SeekerSettings) => void;
  recordSearch: (entry: NewHistoryEntry) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  /** Hands a search to another page ("Run again"); the page reads `pending` once on mount, then clears it. */
  queueSearch: (pending: PendingSearch) => void;
  clearPending: (key: keyof PendingSearch) => void;
}

const HISTORY_LIMIT = 50;
const DEFAULT_SETTINGS: SeekerSettings = { defaultRadiusKm: 5, dataSource: "osm", recordHistory: true };

function emptyProfile(fullName: string): SeekerProfile {
  return { fullName, title: "", skills: [], experience: "", portfolioUrl: "", preferredLocations: [], preferredCategories: [], phone: "" };
}

const SeekerStoreContext = createContext<SeekerStore | null>(null);

export function SeekerDataProvider({ fullName, children }: { fullName: string; children: ReactNode }) {
  const { notify } = useToast();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<SeekerData>(() => ({ profile: emptyProfile(fullName), settings: DEFAULT_SETTINGS, saved: [], history: [] }));
  const [pending, setPending] = useState<PendingSearch>({});
  const loadSeq = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const seq = ++loadSeq.current;
    if (!quiet) setStatus("loading");
    try {
      const next = await api<SeekerData>("/seeker");
      if (seq !== loadSeq.current) return;
      setData(next);
      setStatus("ready");
      setLoadError(null);
    } catch (error) {
      if (seq !== loadSeq.current) return;
      if (quiet) return; // keep showing what we have; the failed save was already reported
      setLoadError(errorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs a background save; on failure, tells the user and re-syncs with the server. */
  const persist = useCallback(
    <T,>(request: Promise<T>, onSuccess?: (result: T) => void) => {
      request.then(onSuccess).catch((error) => {
        notify(`Couldn't save that change: ${errorMessage(error)}`);
        void load(true);
      });
    },
    [notify, load]
  );

  const isSaved = useCallback((id: string) => data.saved.some((s) => s.id === id), [data.saved]);

  const toggle = useCallback(
    (item: SavedItem, snapshot: BusinessResult | Posting) => {
      const willSave = !data.saved.some((s) => s.id === item.id);
      setData((d) => ({ ...d, saved: willSave ? [item, ...d.saved] : d.saved.filter((s) => s.id !== item.id) }));
      persist(
        willSave
          ? api("/seeker/saved", { method: "POST", body: { kind: item.kind, id: item.id, snapshot } })
          : api(`/seeker/saved/${encodeURIComponent(item.id)}`, { method: "DELETE" })
      );
      return willSave;
    },
    [data.saved, persist]
  );

  const toggleSaveBusiness = useCallback(
    (business: BusinessResult) => toggle({ kind: "business", id: business.id, savedAt: new Date().toISOString(), business }, business),
    [toggle]
  );
  const toggleSavePosting = useCallback(
    (posting: Posting) => toggle({ kind: "posting", id: `posting:${posting.id}`, savedAt: new Date().toISOString(), posting }, posting),
    [toggle]
  );

  const removeSaved = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, saved: d.saved.filter((s) => s.id !== id) }));
      persist(api(`/seeker/saved/${encodeURIComponent(id)}`, { method: "DELETE" }));
    },
    [persist]
  );
  const clearSaved = useCallback(() => {
    setData((d) => ({ ...d, saved: [] }));
    persist(api("/seeker/saved", { method: "DELETE" }));
  }, [persist]);
  const updateLead = useCallback(
    (id: string, patch: Partial<LeadTracking>) => {
      setData((d) => ({ ...d, saved: d.saved.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
      persist(api(`/seeker/saved/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }));
    },
    [persist]
  );

  const updateProfile = useCallback(
    (profile: SeekerProfile) => {
      setData((d) => ({ ...d, profile }));
      persist(api("/seeker/profile", { method: "PUT", body: profile }));
    },
    [persist]
  );
  const resetProfile = useCallback(() => {
    const profile = emptyProfile(data.profile.fullName || fullName);
    setData((d) => ({ ...d, profile }));
    persist(api("/seeker/profile", { method: "PUT", body: profile }));
    return profile;
  }, [data.profile.fullName, fullName, persist]);
  const updateSettings = useCallback(
    (settings: SeekerSettings) => {
      setData((d) => ({ ...d, settings }));
      persist(api("/seeker/settings", { method: "PUT", body: settings }));
    },
    [persist]
  );

  const recordSearch = useCallback(
    (entry: NewHistoryEntry) => {
      if (!data.settings.recordHistory) return;
      const tempId = `pending-${Date.now()}`;
      setData((d) => ({ ...d, history: [{ ...entry, id: tempId, at: new Date().toISOString() } as HistoryEntry, ...d.history].slice(0, HISTORY_LIMIT) }));
      // Swap the temporary entry for the stored one so it can be removed later by its real id.
      persist(api<HistoryEntry | undefined>("/seeker/history", { method: "POST", body: entry }), (saved) =>
        setData((d) => ({ ...d, history: saved ? d.history.map((h) => (h.id === tempId ? saved : h)) : d.history.filter((h) => h.id !== tempId) }))
      );
    },
    [data.settings.recordHistory, persist]
  );

  const removeHistory = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, history: d.history.filter((h) => h.id !== id) }));
      if (!id.startsWith("pending-")) persist(api(`/seeker/history/${encodeURIComponent(id)}`, { method: "DELETE" }));
    },
    [persist]
  );
  const clearHistory = useCallback(() => {
    setData((d) => ({ ...d, history: [] }));
    persist(api("/seeker/history", { method: "DELETE" }));
  }, [persist]);

  const queueSearch = useCallback((next: PendingSearch) => setPending((p) => ({ ...p, ...next })), []);
  const clearPending = useCallback((key: keyof PendingSearch) => setPending((p) => (p[key] ? { ...p, [key]: undefined } : p)), []);

  return (
    <SeekerStoreContext.Provider
      value={{
        ...data,
        status,
        loadError,
        reload: () => void load(),
        pending,
        isSaved,
        toggleSaveBusiness,
        toggleSavePosting,
        removeSaved,
        clearSaved,
        updateLead,
        updateProfile,
        resetProfile,
        updateSettings,
        recordSearch,
        removeHistory,
        clearHistory,
        queueSearch,
        clearPending,
      }}
    >
      {children}
    </SeekerStoreContext.Provider>
  );
}

export function useSeekerStore(): SeekerStore {
  const ctx = useContext(SeekerStoreContext);
  if (!ctx) throw new Error("useSeekerStore must be used inside SeekerDataProvider");
  return ctx;
}
