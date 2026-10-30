import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useToast } from "../../../shared/components/Toast";
import BiSelect from "../components/BiSelect";
import BusinessDrawer from "../components/BusinessDrawer";
import { DEFAULT_CENTER } from "../services/geo";
import { CATEGORIES, categoryLabel } from "../services/categories";
import { isAbort, toServiceError, type ServiceError } from "../services/errors";
import { formatKm } from "../services/geo";
import { geocode } from "../services/geocode";
import { searchBusinesses } from "../services/places";
import { cachedAnalysis, quickPriorities } from "../services/analysis";
import AreaSummary, { AREA_UNKNOWN } from "../components/AreaSummary";
import { useSeekerStore } from "../store";
import {
  DATA_SOURCE_LABELS,
  RADIUS_KM,
  type BusinessResult,
  type BusinessSort,
  type LocationQuery,
  type OpportunityPriority,
  type QuickPriority,
  type ResolvedPlace,
  type WebsiteFilter,
} from "../types";

// Leaflet is only needed on this page; load it as a separate chunk.
const OpportunityMap = lazy(() => import("../components/OpportunityMap"));
// Google Places results must be displayed on a Google map (Google Maps Platform terms).
const GoogleOpportunityMap = lazy(() => import("../components/GoogleOpportunityMap"));
const GOOGLE_MAP_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY);

type Status = "idle" | "loading" | "done" | "error";

interface SearchOutcome {
  center: ResolvedPlace;
  query: LocationQuery;
  results: BusinessResult[];
  truncated: boolean;
}

// Google listings with almost no public footprint (no rating, a handful of reviews, no address) are usually not
// worth a Seeker's time, so they're hidden by default. OpenStreetMap has no ratings, so this applies to Google only.
const MIN_REVIEWS = 5;
const isLowInformation = (r: BusinessResult) => r.source === "google" && (r.rating == null || (r.reviewCount ?? 0) < MIN_REVIEWS || !r.address);

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = { high: "Needs attention", medium: "Worth a look", low: "Low priority" };
const PRIORITY_RANK: Record<OpportunityPriority, number> = { high: 0, medium: 1, low: 2 };

const WEBSITE_OPTIONS: { value: WebsiteFilter; label: string }[] = [
  { value: "any", label: "Any website status" },
  { value: "none-listed", label: "No website listed" },
  { value: "listed", label: "Website listed" },
];

export default function LocationOpportunitiesPage() {
  const store = useSeekerStore();
  const { notify } = useToast();
  const source = store.settings.dataSource;

  const initialQuery: LocationQuery = store.pending.location ?? {
    location: store.profile.preferredLocations[0] ?? "",
    radiusKm: store.settings.defaultRadiusKm,
    category: "",
    website: "any",
  };
  const [draft, setDraft] = useState<LocationQuery>(initialQuery);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ServiceError | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [sort, setSort] = useState<BusinessSort>("distance");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLowInfo, setShowLowInfo] = useState(false);
  const [quick, setQuick] = useState<Map<string, QuickPriority>>(() => new Map());
  const [view, setView] = useState<"list" | "areas">("list");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const update = <K extends keyof LocationQuery>(field: K, value: LocationQuery[K]) => setDraft((d) => ({ ...d, [field]: value }));

  const runSearch = useCallback(
    async (query: LocationQuery) => {
      if (!query.location.trim()) {
        setLocationError("Enter a city, neighbourhood or address.");
        return;
      }
      setLocationError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);
      setSelectedId(null);
      try {
        const center = await geocode(query.location, controller.signal);
        const response = await searchBusinesses(source, { center, radiusKm: query.radiusKm, categoryId: query.category }, controller.signal);
        setOutcome({ center, query, results: response.results, truncated: response.truncated });
        setQuick(new Map());
        setAreaFilter(null);
        setView("list");
        setStatus("done");
        store.recordSearch({ source: "location", query, resolvedLabel: center.label, resultCount: response.results.length, dataSource: source });
        // Rules-only priority badges for every result (free; no website check, no AI). Badges are an extra, so a failure is silent.
        quickPriorities(response.results)
          .then((map) => !controller.signal.aborted && setQuick(map))
          .catch(() => undefined);
      } catch (err) {
        if (isAbort(err)) return;
        setError(toServiceError(err));
        setStatus("error");
      }
    },
    // store.recordSearch is stable; source changes are picked up on the next search.
    [source, store.recordSearch]
  );

  // Run a queued search ("Run again" from history) once, on mount.
  const { clearPending } = store;
  const pending = useRef(store.pending.location);
  useEffect(() => {
    if (pending.current) {
      void runSearch(pending.current);
      clearPending("location");
    }
    return () => abortRef.current?.abort();
  }, [runSearch, clearPending]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch(draft);
  }

  function handleClear() {
    abortRef.current?.abort();
    setDraft({ location: "", radiusKm: store.settings.defaultRadiusKm, category: "", website: "any" });
    setOutcome(null);
    setQuick(new Map());
    setAreaFilter(null);
    setView("list");
    setStatus("idle");
    setError(null);
    setSelectedId(null);
    setLocationError(null);
  }

  /** The full analysis (with website check) when the Seeker has run one, otherwise the quick, listing-only priority. */
  const priorityOf = (r: BusinessResult): { priority: OpportunityPriority; full: boolean; reasons: string[] } | null => {
    const full = cachedAnalysis(r.id);
    if (full) return { priority: full.priority, full: true, reasons: full.reasons.map((x) => x.label) };
    const q = quick.get(r.id);
    return q ? { priority: q.priority, full: false, reasons: q.reasons } : null;
  };

  // Website status and sort apply to the returned results immediately; area, radius and category need a new search.
  const established = useMemo(() => (outcome ? (showLowInfo ? outcome.results : outcome.results.filter((r) => !isLowInformation(r))) : []), [outcome, showLowInfo]);
  const lowInfoCount = outcome ? outcome.results.filter(isLowInformation).length : 0;
  const websiteMatched = useMemo(
    () => established.filter((r) => (draft.website === "any" ? true : draft.website === "listed" ? Boolean(r.website) : !r.website)),
    [established, draft.website]
  );
  // Memoized so the map only redraws its markers when the visible set actually changes.
  const visible = useMemo(() => {
    const byDistance = (a: BusinessResult, b: BusinessResult) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
    const rank = (r: BusinessResult) => {
      const p = cachedAnalysis(r.id)?.priority ?? quick.get(r.id)?.priority;
      return p ? PRIORITY_RANK[p] : 3;
    };
    return websiteMatched
      .filter((r) => areaFilter === null || (r.area ?? AREA_UNKNOWN) === areaFilter)
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "priority" ? rank(a) - rank(b) || byDistance(a, b) : byDistance(a, b)));
  }, [websiteMatched, areaFilter, sort, quick]);
  const withoutCoords = visible.filter((r) => r.lat === null).length;
  const noWebsiteCount = established.filter((r) => !r.website).length;

  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(`bi-result-${id}`)?.scrollIntoView({ block: "nearest" });
  };

  function toggleSave(business: BusinessResult) {
    const saved = store.toggleSaveBusiness(business);
    notify(saved ? `Saved “${business.name}”.` : `Removed “${business.name}” from saved.`, saved ? "success" : "info");
  }

  const closeDrawer = useCallback(() => setOpenId(null), []);
  const openBusiness = visible.find((r) => r.id === openId) ?? outcome?.results.find((r) => r.id === openId);
  const mapCenter = outcome?.center ?? DEFAULT_CENTER;
  // The map follows the source of the results on screen (or the chosen source before any search).
  const mapSource = outcome?.results[0]?.source ?? source;
  const MapView = mapSource === "google" ? GoogleOpportunityMap : OpportunityMap;
  // Google data can't go on the OpenStreetMap map; without the optional Google map key, show the list on its own.
  const showMap = mapSource !== "google" || GOOGLE_MAP_CONFIGURED;

  return (
    <div className="bi-locate">
      <header className="bi-locate__head">
        <div>
          <h1 className="page-title">Location-Based Opportunities</h1>
          <p className="page-subtitle">Find real businesses around a location and spot the ones that may need your services.</p>
        </div>
        <p className="bi-source-pill">
          Business data: <strong>{DATA_SOURCE_LABELS[source]}</strong>
          {source === "osm" && <span> · free, sometimes busy</span>}
        </p>
      </header>

      <form className="bi-searchbar" role="search" aria-label="Search businesses by location" onSubmit={handleSubmit} noValidate>
        <label className="bi-searchbar__field bi-searchbar__field--location">
          <span className="bi-searchbar__label">Location</span>
          <span className="bi-input-icon">
            <MapPin size={15} aria-hidden="true" />
            <input
              className={`input${locationError ? " input--invalid" : ""}`}
              type="text"
              placeholder="City, area or address — e.g. Banjara Hills, Hyderabad"
              value={draft.location}
              onChange={(e) => update("location", e.target.value)}
              aria-invalid={Boolean(locationError)}
              aria-describedby={locationError ? "bi-location-error" : undefined}
            />
          </span>
        </label>
        <label className="bi-searchbar__field">
          <span className="bi-searchbar__label">Radius</span>
          <BiSelect value={String(draft.radiusKm)} options={RADIUS_KM.map((r) => ({ value: String(r), label: `${r} km` }))} onChange={(v) => update("radiusKm", Number(v))} />
        </label>
        <label className="bi-searchbar__field bi-searchbar__field--wide">
          <span className="bi-searchbar__label">Category</span>
          <BiSelect
            value={draft.category}
            options={[{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
            onChange={(v) => update("category", v)}
          />
        </label>
        <label className="bi-searchbar__field bi-searchbar__field--wide">
          <span className="bi-searchbar__label">Website</span>
          <BiSelect value={draft.website} options={WEBSITE_OPTIONS} onChange={(v) => update("website", v as WebsiteFilter)} />
        </label>
        <div className="bi-searchbar__actions">
          <button type="submit" className="btn btn--primary" disabled={status === "loading"}>
            {status === "loading" ? <LoaderCircle size={15} className="bi-spin" aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
            Search
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleClear} aria-label="Clear search" title="Clear search">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </form>
      {locationError && (
        <p id="bi-location-error" className="bi-field-error" role="alert">
          {locationError}
        </p>
      )}
      {store.profile.preferredLocations.length > 0 && (
        <div className="bi-quickpicks" aria-label="Your preferred locations">
          <span>Your locations:</span>
          {store.profile.preferredLocations.map((place) => (
            <button key={place} type="button" className="bi-quickpick" onClick={() => update("location", place)}>
              {place}
            </button>
          ))}
        </div>
      )}

      <div className={`bi-locate__body${showMap ? "" : " bi-locate__body--list"}`}>
        <section className="bi-results" aria-label="Businesses" aria-busy={status === "loading"}>
          <div className="bi-results__head">
            {status === "done" && outcome ? (
              <>
                <div className="bi-results__summary">
                  <strong>
                    {visible.length}
                    {outcome.truncated && draft.website === "any" ? "+" : ""} {visible.length === 1 ? "business" : "businesses"}
                  </strong>
                  <span>
                    within {outcome.query.radiusKm} km · {categoryLabel(outcome.query.category)}
                  </span>
                </div>
                <BiSelect
                  ariaLabel="Sort results"
                  value={sort}
                  options={[
                    { value: "distance", label: "Nearest first" },
                    { value: "priority", label: "Highest priority" },
                    { value: "name", label: "Name A–Z" },
                  ]}
                  onChange={(v) => setSort(v as BusinessSort)}
                />
              </>
            ) : (
              <div className="bi-results__summary">
                <strong>Results</strong>
              </div>
            )}
          </div>

          {status === "done" && outcome && (
            <p className="bi-results__context" title={outcome.center.label}>
              Around <strong>{outcome.center.label}</strong>
              {noWebsiteCount > 0 && ` · ${noWebsiteCount} with no website listed`}
            </p>
          )}
          {status === "done" && lowInfoCount > 0 && (
            <p className="bi-results__quality">
              <span>
                {showLowInfo
                  ? `Including ${lowInfoCount} low-information ${lowInfoCount === 1 ? "listing" : "listings"}.`
                  : `${lowInfoCount} low-information ${lowInfoCount === 1 ? "listing" : "listings"} hidden (fewer than ${MIN_REVIEWS} Google reviews, no rating or no address).`}
              </span>
              <button type="button" className="bi-textbtn" onClick={() => setShowLowInfo((v) => !v)}>
                {showLowInfo ? "Hide them" : "Show them"}
              </button>
            </p>
          )}
          {status === "done" && established.length > 0 && (
            <div className="bi-results__tools">
              <div className="bi-viewtabs" role="tablist" aria-label="Result view">
                <button type="button" role="tab" aria-selected={view === "list"} className={`bi-viewtab${view === "list" ? " bi-viewtab--on" : ""}`} onClick={() => setView("list")}>
                  Businesses
                </button>
                <button type="button" role="tab" aria-selected={view === "areas"} className={`bi-viewtab${view === "areas" ? " bi-viewtab--on" : ""}`} onClick={() => setView("areas")}>
                  Areas
                </button>
              </div>
              {areaFilter !== null && (
                <button type="button" className="bi-areachip" onClick={() => setAreaFilter(null)} title="Show all areas">
                  {areaFilter} <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className="bi-results__body">
            {status === "idle" && (
              <div className="bi-state">
                <MapPin size={22} aria-hidden="true" />
                <p className="bi-state__title">Search an area to see real businesses</p>
                <p>
                  Enter a location, pick a radius and, optionally, a category. Filter by <em>No website listed</em> to find businesses that may need a
                  website.
                </p>
              </div>
            )}

            {status === "loading" && (
              <div className="bi-state">
                <LoaderCircle size={22} className="bi-spin" aria-hidden="true" />
                <p className="bi-state__title">Searching {DATA_SOURCE_LABELS[source]}…</p>
                <p>Finding the location, then businesses inside the radius.</p>
              </div>
            )}

            {status === "error" && error && (
              <div className={`bi-state bi-state--${error.kind === "setup" ? "setup" : "error"}`} role="alert">
                <p className="bi-state__title">{error.kind === "setup" ? "Data source not set up" : "Search didn't complete"}</p>
                <p>{error.message}</p>
                {error.kind === "setup" && <p className="bi-hint">Switch the business data source to OpenStreetMap in Settings to search now.</p>}
              </div>
            )}

            {status === "done" && outcome && view === "list" && visible.length === 0 && (
              <div className="bi-state">
                <p className="bi-state__title">No businesses found</p>
                <p>
                  {established.length > 0
                    ? "None of the results match the website filter. Change it to “Any website status”."
                    : lowInfoCount > 0
                      ? `Every business found has little public information (fewer than ${MIN_REVIEWS} Google reviews). Show them above, or try a larger radius.`
                      : "Nothing in this area matches. Try a larger radius or another category."}
                </p>
              </div>
            )}

            {status === "done" && view === "areas" && established.length > 0 && (
              <AreaSummary
                businesses={websiteMatched}
                priorityOf={(r) => priorityOf(r)?.priority ?? null}
                onPick={(area) => {
                  setAreaFilter(area);
                  setView("list");
                }}
              />
            )}

            {status === "done" && view === "list" && visible.length > 0 && (
              <ul className="bi-result-list">
                {visible.map((r) => {
                  const saved = store.isSaved(r.id);
                  const p = priorityOf(r);
                  const isEstablished = quick.get(r.id)?.established ?? false;
                  return (
                    <li key={r.id} id={`bi-result-${r.id}`} className={`bi-result${r.id === selectedId ? " bi-result--selected" : ""}`}>
                      <button type="button" className="bi-result__main" onClick={() => setSelectedId(r.id)} onDoubleClick={() => setOpenId(r.id)}>
                        <span className="bi-result__name">{r.name}</span>
                        <span className="bi-result__meta">
                          {r.category} · {r.lat === null ? "No map position" : formatKm(r.distanceKm)}
                        </span>
                        <span className="bi-result__addr">{r.address ?? "Address not listed"}</span>
                        {(p || isEstablished) && (
                          <span className="bi-result__tags">
                            {p && (
                              <span
                                className={`bi-priority bi-priority--sm bi-priority--${p.priority}`}
                                title={`${p.full ? "Full analysis" : "Quick priority from the listing — Analyze adds the website check"}${p.reasons.length ? `: ${p.reasons.join(", ")}` : ""}`}
                              >
                                {PRIORITY_LABELS[p.priority]}
                              </span>
                            )}
                            {isEstablished && (
                              <span className="bi-established" title="50 or more Google reviews">
                                Established · {r.reviewCount} reviews
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                      <div className="bi-result__side">
                        <span className={`bi-web${r.website ? "" : " bi-web--none"}`}>{r.website ? "Website listed" : "No website listed"}</span>
                        <div className="bi-result__actions">
                          <button
                            type="button"
                            className={`icon-btn bi-save${saved ? " bi-save--on" : ""}`}
                            aria-pressed={saved}
                            aria-label={saved ? `Remove ${r.name} from saved` : `Save ${r.name}`}
                            title={saved ? "Saved" : "Save"}
                            onClick={() => toggleSave(r)}
                          >
                            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </button>
                          <button type="button" className="bi-textbtn" onClick={() => setOpenId(r.id)}>
                            Details
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {status === "done" && outcome && (
            <div className="bi-results__foot">
              {outcome.truncated && <span>Showing the first results returned — narrow the radius or pick a category for a complete list. </span>}
              {withoutCoords > 0 && <span>{withoutCoords} without a map position. </span>}
              <span>Distances are straight-line.{outcome.results[0]?.source === "osm" ? " Data © OpenStreetMap contributors." : ""}</span>
            </div>
          )}
        </section>

        {showMap && <section className="bi-mapbox" aria-label="Map">
          <Suspense fallback={<div className="bi-map bi-map--loading">Loading map…</div>}>
            <MapView
              center={mapCenter}
              radiusKm={outcome?.query.radiusKm ?? draft.radiusKm}
              showRadius={Boolean(outcome)}
              results={status === "done" ? visible : []}
              selectedId={selectedId}
              onSelect={select}
              fitRequest={fitRequest}
            />
          </Suspense>
          {outcome && (
            <button type="button" className="bi-mapbox__fit" onClick={() => setFitRequest((n) => n + 1)} title="Fit map to search area">
              <LocateFixed size={15} aria-hidden="true" />
              Fit to area
            </button>
          )}
          <div className="bi-mapbox__legend" aria-hidden="true">
            <span>
              <i className="bi-dot bi-dot--listed" /> Website listed
            </span>
            <span>
              <i className="bi-dot bi-dot--none" /> No website listed
            </span>
          </div>
          {status === "loading" && (
            <div className="bi-mapbox__loading">
              <LoaderCircle size={18} className="bi-spin" aria-hidden="true" /> Searching…
            </div>
          )}
        </section>}
      </div>

      {openBusiness && (
        <BusinessDrawer business={openBusiness} saved={store.isSaved(openBusiness.id)} onToggleSave={() => toggleSave(openBusiness)} onClose={closeDrawer} />
      )}
    </div>
  );
}
