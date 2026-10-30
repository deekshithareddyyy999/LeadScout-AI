import { useCallback, useState } from "react";
import { CalendarClock, StickyNote, Trash2 } from "lucide-react";
import { useToast } from "../../../shared/components/Toast";
import { formatDate } from "../../../shared/utils/dates";
import BiSelect from "../components/BiSelect";
import BusinessDrawer from "../components/BusinessDrawer";
import ConfirmDialog from "../components/ConfirmDialog";
import LeadTrackerPanel, { followUpLabel } from "../components/LeadTrackerPanel";
import PostingDrawer from "../components/PostingDrawer";
import { formatKm } from "../services/geo";
import { matchingSkills } from "../services/postings";
import { useSeekerStore } from "../store";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type LeadTracking, type SavedItem } from "../types";

type KindFilter = "" | SavedItem["kind"];
type StatusFilter = "" | LeadStatus;

const trackingOf = (item: SavedItem): LeadTracking => ({ status: item.status ?? "new", notes: item.notes ?? "", followUpOn: item.followUpOn ?? null });

export default function SavedOpportunitiesPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const store = useSeekerStore();
  const { notify } = useToast();
  const [kind, setKind] = useState<KindFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const ofKind = store.saved.filter((s) => !kind || s.kind === kind);
  const countFor = (s: LeadStatus) => ofKind.filter((item) => trackingOf(item).status === s).length;
  const visible = ofKind.filter((s) => !status || trackingOf(s).status === status);
  const open = store.saved.find((s) => s.id === openId);
  const closeDrawer = useCallback(() => setOpenId(null), []);

  function remove(item: SavedItem) {
    store.removeSaved(item.id);
    if (openId === item.id) setOpenId(null);
    notify(`Removed “${item.kind === "business" ? item.business.name : item.posting.title}” from saved.`);
  }

  const tracker = open && <LeadTrackerPanel tracking={trackingOf(open)} onChange={(patch) => store.updateLead(open.id, patch)} />;

  return (
    <div className="page bi-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Saved Opportunities</h1>
          <p className="page-subtitle">Your leads, from first contact to a win. Set a status, a follow-up date and notes for each one.</p>
        </div>
        {store.saved.length > 0 && (
          <button type="button" className="btn btn--danger-outline" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" />
            Clear all
          </button>
        )}
      </header>

      {store.saved.length === 0 ? (
        <div className="bi-panel bi-state">
          <p className="bi-state__title">Nothing saved yet</p>
          <p>Use the bookmark on a business or posting to keep it here.</p>
          <div className="bi-state__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate("location")}>
              Explore by location
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onNavigate("postings")}>
              Explore business postings
            </button>
          </div>
        </div>
      ) : (
        <section className="bi-panel bi-list-panel" aria-label="Saved opportunities">
          <div className="bi-list-panel__head">
            <div className="bi-viewtabs" role="tablist" aria-label="Filter by status">
              <button type="button" role="tab" aria-selected={status === ""} className={`bi-viewtab${status === "" ? " bi-viewtab--on" : ""}`} onClick={() => setStatus("")}>
                All <span className="bi-viewtab__count">{ofKind.length}</span>
              </button>
              {LEAD_STATUSES.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={status === s} className={`bi-viewtab${status === s ? " bi-viewtab--on" : ""}`} onClick={() => setStatus(s)}>
                  {LEAD_STATUS_LABELS[s]} <span className="bi-viewtab__count">{countFor(s)}</span>
                </button>
              ))}
            </div>
            <BiSelect
              ariaLabel="Filter saved items"
              value={kind}
              options={[
                { value: "", label: "All saved" },
                { value: "business", label: "Businesses" },
                { value: "posting", label: "Postings" },
              ]}
              onChange={(v) => setKind(v as KindFilter)}
            />
          </div>
          {visible.length === 0 ? (
            <div className="bi-state">
              <p className="bi-state__title">{status ? `No leads marked “${LEAD_STATUS_LABELS[status]}”` : `No saved ${kind === "business" ? "businesses" : "postings"} yet`}</p>
            </div>
          ) : (
            <ul className="bi-rows">
              {visible.map((item) => {
                const t = trackingOf(item);
                const follow = followUpLabel(t.followUpOn);
                return (
                  <li key={item.id} className="bi-row">
                    <span className="bi-tag">{item.kind === "business" ? "Business" : "Posting"}</span>
                    <button type="button" className="bi-row__main" onClick={() => setOpenId(item.id)}>
                      {item.kind === "business" ? (
                        <>
                          <span className="bi-row__title">{item.business.name}</span>
                          <span className="bi-row__sub">
                            {[item.business.category, item.business.address, item.business.distanceKm !== null ? formatKm(item.business.distanceKm) + " from search centre" : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="bi-row__title">{item.posting.title}</span>
                          <span className="bi-row__sub">{[item.posting.organization, item.posting.location, item.posting.budget].filter(Boolean).join(" · ")}</span>
                        </>
                      )}
                      {(follow || t.notes) && (
                        <span className="bi-row__lead">
                          {follow && (
                            <span className={`bi-followup bi-followup--${follow.tone}`}>
                              <CalendarClock size={12} aria-hidden="true" /> {follow.text}
                            </span>
                          )}
                          {t.notes && (
                            <span className="bi-row__note" title={t.notes}>
                              <StickyNote size={12} aria-hidden="true" /> Notes
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    {item.kind === "business" && (
                      <span className={`bi-web${item.business.website ? "" : " bi-web--none"}`}>{item.business.website ? "Website listed" : "No website listed"}</span>
                    )}
                    <span className="bi-row__status">
                      <BiSelect
                        ariaLabel={`Status for ${item.kind === "business" ? item.business.name : item.posting.title}`}
                        value={t.status}
                        options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))}
                        onChange={(v) => store.updateLead(item.id, { status: v as LeadStatus })}
                      />
                    </span>
                    <span className="bi-row__date">Saved {formatDate(item.savedAt)}</span>
                    <button type="button" className="bi-textbtn" onClick={() => remove(item)}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {open?.kind === "business" && <BusinessDrawer business={open.business} saved onToggleSave={() => remove(open)} onClose={closeDrawer} extra={tracker} />}
      {open?.kind === "posting" && (
        <PostingDrawer
          posting={open.posting}
          matched={matchingSkills(open.posting, store.profile)}
          saved
          onToggleSave={() => remove(open)}
          onClose={closeDrawer}
          extra={tracker}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Clear all saved opportunities?"
          message={`This removes ${store.saved.length} saved ${store.saved.length === 1 ? "item" : "items"}, with their status and notes.`}
          confirmLabel="Clear saved"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            store.clearSaved();
            setConfirming(false);
            notify("Saved opportunities cleared.");
          }}
        />
      )}
    </div>
  );
}
