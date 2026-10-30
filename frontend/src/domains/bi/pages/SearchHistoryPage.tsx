import { useState } from "react";
import { Play, Trash2, X } from "lucide-react";
import { useToast } from "../../../shared/components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { describeSearch, SEARCH_SOURCE_LABELS } from "../describe";
import { useSeekerStore } from "../store";
import type { HistoryEntry } from "../types";

const formatWhen = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function SearchHistoryPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const store = useSeekerStore();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);

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
      <header className="page-header">
        <div>
          <h1 className="page-title">Search History</h1>
          <p className="page-subtitle">Searches you've completed. Running one again fetches fresh results.</p>
        </div>
        {store.history.length > 0 && (
          <button type="button" className="btn btn--danger-outline" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" />
            Clear history
          </button>
        )}
      </header>

      {!store.settings.recordHistory && (
        <p className="bi-notice">
          Search history is turned off, so new searches aren't recorded.{" "}
          <button type="button" className="bi-textbtn" onClick={() => onNavigate("settings")}>
            Turn it on in Settings
          </button>
        </p>
      )}

      {store.history.length === 0 ? (
        <div className="bi-panel bi-state">
          <p className="bi-state__title">No searches yet</p>
          <p>Completed searches on Location-Based or Postings-Based Opportunities are listed here.</p>
        </div>
      ) : (
        <section className="bi-panel bi-table-wrap">
          <table className="bi-table">
            <thead>
              <tr>
                <th className="bi-table__when">When</th>
                <th className="bi-table__type">Type</th>
                <th>Search</th>
                <th className="bi-table__num">Results</th>
                <th className="bi-table__actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {store.history.map((entry) => (
                <tr key={entry.id}>
                  <td className="bi-mono">{formatWhen(entry.at)}</td>
                  <td>{SEARCH_SOURCE_LABELS[entry.source]}</td>
                  <td>
                    <div className="chip-list">
                      {describeSearch(entry).map((label, i) => (
                        <span key={`${label}-${i}`} className="chip">
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="bi-mono bi-table__num">{entry.resultCount}</td>
                  <td>
                    <div className="bi-table__btns">
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => runAgain(entry)}>
                        <Play size={13} aria-hidden="true" />
                        Run again
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Remove this search"
                        title="Remove"
                        onClick={() => {
                          store.removeHistory(entry.id);
                          notify("Search removed.");
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {confirming && (
        <ConfirmDialog
          title="Clear search history?"
          message={`This removes all ${store.history.length} recorded ${store.history.length === 1 ? "search" : "searches"}.`}
          confirmLabel="Clear history"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            store.clearHistory();
            setConfirming(false);
            notify("Search history cleared.");
          }}
        />
      )}
    </div>
  );
}
