import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type LeadTracking } from "../types";

interface LeadTrackerPanelProps {
  tracking: LeadTracking;
  onChange: (patch: Partial<LeadTracking>) => void;
}

/** Status, follow-up date and private notes for one saved opportunity. Status and date save at once; notes on "Save notes". */
export default function LeadTrackerPanel({ tracking, onChange }: LeadTrackerPanelProps) {
  const [notes, setNotes] = useState(tracking.notes);
  useEffect(() => setNotes(tracking.notes), [tracking.notes]);
  const notesChanged = notes !== tracking.notes;

  return (
    <section className="bi-tracker" aria-label="Lead tracking">
      <p className="bi-analysis__heading">
        <ClipboardList size={15} aria-hidden="true" /> Lead tracking
      </p>
      <div className="bi-tracker__status" role="radiogroup" aria-label="Status">
        {LEAD_STATUSES.map((s: LeadStatus) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={tracking.status === s}
            className={`bi-status bi-status--${s}${tracking.status === s ? " bi-status--on" : ""}`}
            onClick={() => tracking.status !== s && onChange({ status: s })}
          >
            {LEAD_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <label className="field bi-tracker__field">
        <span className="field__label">Follow up on</span>
        <span className="bi-tracker__date">
          <input className="input" type="date" value={tracking.followUpOn ?? ""} onChange={(e) => onChange({ followUpOn: e.target.value || null })} />
          {tracking.followUpOn && (
            <button type="button" className="bi-textbtn" onClick={() => onChange({ followUpOn: null })}>
              Clear
            </button>
          )}
        </span>
      </label>
      <label className="field bi-tracker__field">
        <span className="field__label">Notes</span>
        <textarea
          className="textarea"
          rows={3}
          maxLength={4000}
          placeholder="Who you spoke to, what they need, what you quoted…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {notesChanged && (
        <div className="bi-tracker__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setNotes(tracking.notes)}>
            Discard
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onChange({ notes })}>
            Save notes
          </button>
        </div>
      )}
    </section>
  );
}

/** "Follow up today", "Follow-up overdue · 2 Nov", "Follow up 5 Nov" — and how urgent it is. */
export function followUpLabel(date: string | null | undefined): { text: string; tone: "overdue" | "today" | "later" } | null {
  if (!date) return null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const day = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (date < todayKey) return { text: `Follow-up overdue · ${day}`, tone: "overdue" };
  if (date === todayKey) return { text: "Follow up today", tone: "today" };
  return { text: `Follow up ${day}`, tone: "later" };
}
