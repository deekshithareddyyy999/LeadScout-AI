import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgeCheck, Bookmark, BookmarkCheck, LoaderCircle, MapPin, PlugZap, RotateCcw, Search } from "lucide-react";
import { useToast } from "../../../shared/components/Toast";
import { formatDate } from "../../../shared/utils/dates";
import BiSelect from "../components/BiSelect";
import PostingDrawer from "../components/PostingDrawer";
import { toServiceError, type ServiceError } from "../services/errors";
import { applyToPosting, fetchPostings, filterPostings, matchingSkills, postingCities } from "../services/postings";
import { useSeekerStore } from "../store";
import { MY_APPLICATION_LABELS, WORK_MODE_LABELS, type Posting, type PostingFilters, type WorkMode } from "../types";

const EMPTY: PostingFilters = { keyword: "", workMode: "", city: "", includeRemote: true };

export default function PostingsOpportunitiesPage() {
  const store = useSeekerStore();
  const { notify } = useToast();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<ServiceError | null>(null);
  const [postings, setPostings] = useState<Posting[]>([]);
  const [draft, setDraft] = useState<PostingFilters>({ ...EMPTY, ...store.pending.postings });
  const [applied, setApplied] = useState<PostingFilters>({ ...EMPTY, ...store.pending.postings });
  const [openId, setOpenId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { clearPending } = store;
  useEffect(() => clearPending("postings"), [clearPending]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchPostings()
      .then((list) => {
        if (cancelled) return;
        setPostings(list);
        setStatus("done");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toServiceError(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  async function apply(posting: Posting, body: { proposal: string; quoteAmount: number | null; timeline: string }) {
    const myApplication = await applyToPosting(posting.id, body);
    setPostings((list) => list.map((p) => (p.id === posting.id ? { ...p, myApplication } : p)));
    notify(`Application sent to ${posting.organization ?? "the business"}.`, "success");
  }

  const visible = useMemo(() => filterPostings(postings, applied), [postings, applied]);
  const cities = useMemo(() => postingCities(postings), [postings]);
  const remoteCount = postings.filter((p) => p.workMode === "remote").length;

  function runSearch(filters: PostingFilters) {
    setDraft(filters);
    setApplied(filters);
    if (filters.city) store.recordSearch({ source: "postings", filters, resultCount: filterPostings(postings, filters).length });
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    runSearch(draft);
  }

  // Picking a suggested location (or a chip) shows its postings straight away; typed text applies on Search / Enter.
  const chooseCity = (city: string) => runSearch({ ...draft, city });

  function toggleSave(posting: Posting) {
    const saved = store.toggleSavePosting(posting);
    notify(saved ? `Saved “${posting.title}”.` : `Removed “${posting.title}” from saved.`, saved ? "success" : "info");
  }

  const closeDrawer = useCallback(() => setOpenId(null), []);
  const open = postings.find((p) => p.id === openId);
  const canSearch = status === "done";

  return (
    <div className="page bi-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Postings-Based Opportunities</h1>
          <p className="page-subtitle">Work that businesses have posted on LeadScout AI and are actively looking for someone to do.</p>
        </div>
      </header>

      <form className="bi-filterline" role="search" aria-label="Search postings" onSubmit={handleSearch}>
        <span className="bi-input-icon bi-filterline__location">
          <MapPin size={15} aria-hidden="true" />
          <input
            className="input"
            list="bi-posting-locations"
            placeholder="Type a city or area"
            aria-label="Location"
            value={draft.city ?? ""}
            disabled={!canSearch}
            onChange={(e) => {
              const value = e.target.value;
              if (cities.some((c) => c.city === value)) chooseCity(value);
              else setDraft((d) => ({ ...d, city: value }));
            }}
          />
          <datalist id="bi-posting-locations">
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.count} {c.count === 1 ? "posting" : "postings"}
              </option>
            ))}
          </datalist>
        </span>
        <span className="bi-input-icon bi-filterline__search">
          <Search size={15} aria-hidden="true" />
          <input
            className="input"
            type="search"
            placeholder="Search by skill, service or keyword"
            aria-label="Keyword"
            value={draft.keyword}
            disabled={!canSearch}
            onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
          />
        </span>
        <BiSelect
          ariaLabel="Work arrangement"
          value={draft.workMode}
          options={[{ value: "", label: "Any arrangement" }, ...(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((m) => ({ value: m, label: WORK_MODE_LABELS[m] }))]}
          onChange={(v) => setDraft((d) => ({ ...d, workMode: v as PostingFilters["workMode"] }))}
        />
        <button type="submit" className="btn btn--primary" disabled={!canSearch || !draft.city?.trim()}>
          Search
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={!canSearch || (JSON.stringify(draft) === JSON.stringify(EMPTY) && JSON.stringify(applied) === JSON.stringify(EMPTY))}
          onClick={() => {
            setDraft(EMPTY);
            setApplied(EMPTY);
          }}
          aria-label="Clear filters"
          title="Clear filters"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </form>
      {applied.city && (
        <label className="checkbox bi-remote-toggle">
          <input type="checkbox" checked={applied.includeRemote !== false} onChange={(e) => runSearch({ ...applied, includeRemote: e.target.checked })} />
          Also show remote work from other cities
        </label>
      )}

      {status === "loading" && (
        <div className="bi-panel bi-state">
          <LoaderCircle size={22} className="bi-spin" aria-hidden="true" />
          <p className="bi-state__title">Loading postings…</p>
        </div>
      )}

      {status === "error" && error && (
        <div className={`bi-panel bi-state bi-state--${error.kind === "setup" ? "setup" : "error"}`} role="alert">
          <PlugZap size={22} aria-hidden="true" />
          <p className="bi-state__title">{error.kind === "setup" ? "Postings aren't connected yet" : "Postings couldn't be loaded"}</p>
          <p>{error.message}</p>
          {error.kind === "setup" && <p className="bi-hint">No sample postings are shown in the meantime.</p>}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {status === "done" && postings.length === 0 && (
        <div className="bi-panel bi-state">
          <p className="bi-state__title">No open postings right now</p>
          <p>When businesses post work on LeadScout AI, it will appear here.</p>
        </div>
      )}

      {status === "done" && postings.length > 0 && !applied.city && (
        <div className="bi-panel bi-state">
          <MapPin size={22} aria-hidden="true" />
          <p className="bi-state__title">Type a location to see opportunities</p>
          <p>
            Businesses have posted work in {cities.length} {cities.length === 1 ? "location" : "locations"}
            {remoteCount > 0 ? `, and ${remoteCount} ${remoteCount === 1 ? "posting is" : "postings are"} remote` : ""}.
          </p>
          {cities.length > 0 && (
            <div className="bi-quickpicks bi-quickpicks--center" aria-label="Locations with postings">
              {cities.slice(0, 8).map((c) => (
                <button key={c.city} type="button" className="bi-quickpick" onClick={() => chooseCity(c.city)}>
                  {c.city} · {c.count}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {status === "done" && postings.length > 0 && applied.city && (
        <section className="bi-panel bi-list-panel" aria-label="Postings">
          <div className="bi-list-panel__head">
            <strong>
              {visible.length} {visible.length === 1 ? "posting" : "postings"} in {applied.city}
              {applied.includeRemote !== false ? " (including remote)" : ""}
            </strong>
          </div>
          {visible.length === 0 ? (
            <div className="bi-state">
              <p className="bi-state__title">No postings match these filters in {applied.city}</p>
            </div>
          ) : (
            <ul className="bi-rows">
              {visible.map((p) => {
                const matched = matchingSkills(p, store.profile);
                const saved = store.isSaved(`posting:${p.id}`);
                return (
                  <li key={p.id} className="bi-row">
                    <button type="button" className="bi-row__main" onClick={() => setOpenId(p.id)}>
                      <span className="bi-row__title">{p.title}</span>
                      {(p.business?.google || p.myApplication) && (
                        <span className="bi-row__badges">
                          {p.business?.google && (
                            <span className="bi-verified">
                              <BadgeCheck size={12} aria-hidden="true" /> Verified on Google
                            </span>
                          )}
                          {p.myApplication && (
                            <span className={`bi-appstatus bi-appstatus--${p.myApplication.status}`}>{MY_APPLICATION_LABELS[p.myApplication.status]}</span>
                          )}
                        </span>
                      )}
                      <span className="bi-row__sub">
                        {[p.organization, p.location, p.workMode ? WORK_MODE_LABELS[p.workMode] : null, p.budget].filter(Boolean).join(" · ")}
                      </span>
                      {matched.length > 0 && <span className="bi-row__match">Matches your skills: {matched.join(", ")}</span>}
                    </button>
                    <span className="bi-row__date">{p.deadline ? `Due ${formatDate(p.deadline)}` : `Posted ${formatDate(p.postedAt)}`}</span>
                    <button
                      type="button"
                      className={`icon-btn bi-save${saved ? " bi-save--on" : ""}`}
                      aria-pressed={saved}
                      aria-label={saved ? `Remove ${p.title} from saved` : `Save ${p.title}`}
                      onClick={() => toggleSave(p)}
                    >
                      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {open && (
        <PostingDrawer
          posting={open}
          matched={matchingSkills(open, store.profile)}
          saved={store.isSaved(`posting:${open.id}`)}
          onToggleSave={() => toggleSave(open)}
          onClose={closeDrawer}
          onApply={(body) => apply(open, body)}
        />
      )}
    </div>
  );
}
