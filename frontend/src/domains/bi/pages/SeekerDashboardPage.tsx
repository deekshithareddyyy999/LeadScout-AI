import { ArrowRight, BriefcaseBusiness, MapPinned, Play } from "lucide-react";
import { formatDate } from "../../../shared/utils/dates";
import { describeSearch, SEARCH_SOURCE_LABELS } from "../describe";
import { useSeekerStore } from "../store";
import type { HistoryEntry } from "../types";

export default function SeekerDashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const store = useSeekerStore();
  const firstName = store.profile.fullName.split(" ")[0];
  const recentSaved = store.saved.slice(0, 4);
  const recentSearches = store.history.slice(0, 4);

  function runAgain(entry: HistoryEntry) {
    if (entry.source === "location") {
      store.queueSearch({ location: entry.query });
      onNavigate("location");
    } else {
      store.queueSearch({ postings: entry.filters });
      onNavigate("postings");
    }
  }

  return (
    <div className="page bi-page">
      <header className="bi-hero">
        <p className="bi-hero__greeting">{firstName ? `Welcome back, ${firstName}` : "Welcome"}</p>
        <h1 className="bi-hero__title">Discover opportunities to grow your business.</h1>
        <p className="bi-hero__sub">Find local businesses that could use your services, or pick up work that businesses have posted on LeadScout.</p>
      </header>

      {store.profile.skills.length === 0 && (
        <p className="bi-notice bi-notice--row">
          <span>Add your skills so postings can show which of them they ask for.</span>
          <button type="button" className="bi-textbtn" onClick={() => onNavigate("profile")}>
            Complete your profile <ArrowRight size={13} aria-hidden="true" />
          </button>
        </p>
      )}

      <div className="bi-entries">
        <button type="button" className="bi-entry" onClick={() => onNavigate("location")}>
          <span className="bi-entry__icon" aria-hidden="true">
            <MapPinned size={20} />
          </span>
          <span className="bi-entry__text">
            <span className="bi-entry__title">Explore by location</span>
            <span className="bi-entry__desc">Search real businesses around any area on a live map — for example, ones with no website listed.</span>
          </span>
          <ArrowRight size={18} className="bi-entry__arrow" aria-hidden="true" />
        </button>
        <button type="button" className="bi-entry" onClick={() => onNavigate("postings")}>
          <span className="bi-entry__icon" aria-hidden="true">
            <BriefcaseBusiness size={20} />
          </span>
          <span className="bi-entry__text">
            <span className="bi-entry__title">Explore business postings</span>
            <span className="bi-entry__desc">Browse work businesses have posted on LeadScout and are actively looking to get done.</span>
          </span>
          <ArrowRight size={18} className="bi-entry__arrow" aria-hidden="true" />
        </button>
      </div>

      <div className="bi-columns">
        <section className="bi-panel" aria-labelledby="bi-saved-title">
          <div className="bi-panel__head">
            <h2 id="bi-saved-title" className="bi-panel__title">
              Saved opportunities
            </h2>
            {store.saved.length > 0 && (
              <button type="button" className="bi-textbtn" onClick={() => onNavigate("saved")}>
                View all ({store.saved.length})
              </button>
            )}
          </div>
          {recentSaved.length === 0 ? (
            <p className="bi-empty-line">Nothing saved yet. Bookmark a business or posting to follow up later.</p>
          ) : (
            <ul className="bi-rows bi-rows--compact">
              {recentSaved.map((item) => (
                <li key={item.id} className="bi-row">
                  <span className="bi-row__main bi-row__main--static">
                    <span className="bi-row__title">{item.kind === "business" ? item.business.name : item.posting.title}</span>
                    <span className="bi-row__sub">
                      {item.kind === "business" ? `${item.business.category}${item.business.website ? "" : " · No website listed"}` : "Business posting"}
                    </span>
                  </span>
                  <span className="bi-row__date">{formatDate(item.savedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bi-panel" aria-labelledby="bi-recent-title">
          <div className="bi-panel__head">
            <h2 id="bi-recent-title" className="bi-panel__title">
              Recent searches
            </h2>
            {store.history.length > 0 && (
              <button type="button" className="bi-textbtn" onClick={() => onNavigate("history")}>
                View all
              </button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <p className="bi-empty-line">Your completed searches will appear here so you can run them again.</p>
          ) : (
            <ul className="bi-rows bi-rows--compact">
              {recentSearches.map((entry) => (
                <li key={entry.id} className="bi-row">
                  <span className="bi-row__main bi-row__main--static">
                    <span className="bi-row__title">{describeSearch(entry).slice(0, 2).join(" · ")}</span>
                    <span className="bi-row__sub">
                      {SEARCH_SOURCE_LABELS[entry.source]} · {entry.resultCount} results
                    </span>
                  </span>
                  <button type="button" className="icon-btn" aria-label="Run this search again" title="Run again" onClick={() => runAgain(entry)}>
                    <Play size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
