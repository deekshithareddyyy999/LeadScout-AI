import { useState, type ReactNode } from "react";
import { BadgeCheck, Bookmark, BookmarkCheck, ExternalLink, LoaderCircle, Mail, Phone, Send, Star } from "lucide-react";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/utils/dates";
import { inr } from "../../../shared/utils/money";
import { MY_APPLICATION_LABELS, WORK_MODE_LABELS, type MyApplication, type Posting } from "../types";
import Drawer from "./Drawer";

interface PostingDrawerProps {
  posting: Posting;
  matched: string[];
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  /** Extra panel shown first, e.g. lead tracking on the Saved page. */
  extra?: ReactNode;
  /** When given, the Seeker can apply from the drawer. */
  onApply?: (body: { proposal: string; quoteAmount: number | null; timeline: string }) => Promise<void>;
}

const PER = { project: "for the project", daily: "per day", monthly: "per month" } as const;

function ApplicationStatus({ application }: { application: MyApplication }) {
  return (
    <section className={`bi-apply bi-apply--${application.status}`} aria-label="Your application">
      <p className="bi-analysis__heading">Your application</p>
      <p className="bi-apply__status">
        <strong>{MY_APPLICATION_LABELS[application.status]}</strong> · applied {formatDate(application.submittedAt)}
        {application.quoteAmount !== null && ` · quoted ${inr(application.quoteAmount)}`}
      </p>
      {application.contact ? (
        <div className="bi-apply__contact">
          <span>The business shortlisted you. Get in touch:</span>
          {application.contact.name && <strong>{application.contact.name}</strong>}
          {application.contact.phone && (
            <a href={`tel:${application.contact.phone.replace(/\s/g, "")}`}>
              <Phone size={13} aria-hidden="true" /> {application.contact.phone}
            </a>
          )}
          {application.contact.email && (
            <a href={`mailto:${application.contact.email}`}>
              <Mail size={13} aria-hidden="true" /> {application.contact.email}
            </a>
          )}
        </div>
      ) : (
        application.status !== "declined" && <p className="bi-hint">The business's contact details appear here if they shortlist you.</p>
      )}
    </section>
  );
}

function ApplyForm({ posting, onApply }: { posting: Posting; onApply: NonNullable<PostingDrawerProps["onApply"]> }) {
  const [proposal, setProposal] = useState("");
  const [quote, setQuote] = useState("");
  const [timeline, setTimeline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const amount = quote.trim() === "" ? null : Number(quote.replace(/[,\s₹]/g, ""));
    if (proposal.trim().length < 30) return setError("Write at least a few sentences: what you'd do and why you're a good fit.");
    if (amount !== null && !(Number.isInteger(amount) && amount >= 0)) return setError("Enter your quote as a whole rupee amount, e.g. 25000.");
    setBusy(true);
    setError(null);
    try {
      await onApply({ proposal: proposal.trim(), quoteAmount: amount, timeline: timeline.trim() });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bi-apply" aria-label="Apply">
      <p className="bi-analysis__heading">Apply to this posting</p>
      <label className="field">
        <span className="field__label">Your proposal</span>
        <textarea
          className="textarea"
          rows={4}
          maxLength={3000}
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          placeholder="What you'd deliver, how you'd approach it, and similar work you've done…"
        />
      </label>
      <div className="bi-apply__row">
        <label className="field">
          <span className="field__label">Your quote (₹){posting.budgetType ? ` ${PER[posting.budgetType]}` : ""}</span>
          <input className="input" inputMode="numeric" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Optional" />
        </label>
        <label className="field">
          <span className="field__label">Timeline</span>
          <input className="input" maxLength={120} value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g., 2 weeks" />
        </label>
      </div>
      {error && <p className="bi-field-error">{error}</p>}
      <p className="bi-hint">The business sees your proposal with your profile (title, skills, experience, portfolio). Your phone and email are shared only if they shortlist you.</p>
      <div className="bi-apply__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={submit} disabled={busy}>
          {busy ? <LoaderCircle size={14} className="bi-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          Send application
        </button>
      </div>
    </section>
  );
}

export default function PostingDrawer({ posting, matched, saved, onToggleSave, onClose, extra, onApply }: PostingDrawerProps) {
  const business = posting.business;
  const google = business?.google;
  return (
    <Drawer
      label={<span className="bi-tag">Posted on LeadScout</span>}
      title={posting.title}
      onClose={onClose}
      footer={
        <button type="button" className={`btn ${saved ? "btn--secondary" : "btn--primary"}`} onClick={onToggleSave}>
          {saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
          {saved ? "Saved" : "Save opportunity"}
        </button>
      }
    >
      {extra}
      {posting.myApplication ? <ApplicationStatus application={posting.myApplication} /> : onApply && <ApplyForm posting={posting} onApply={onApply} />}
      <p className="bi-drawer__text">{posting.description || posting.summary}</p>
      <dl className="bi-facts">
        <div>
          <dt>Posted by</dt>
          <dd>
            {posting.organization ?? <span className="bi-muted">Not shown</span>}
            {google && (
              <span className="bi-verified" title="This business linked its Google listing">
                <BadgeCheck size={13} aria-hidden="true" /> Verified on Google
                {google.rating !== null && (
                  <>
                    {" · "}
                    <Star size={11} aria-hidden="true" /> {google.rating.toFixed(1)} ({google.reviewCount ?? 0})
                  </>
                )}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{posting.budget ?? <span className="bi-muted">Not stated</span>}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{posting.deadline ? formatDate(posting.deadline) : <span className="bi-muted">Not stated</span>}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {[posting.location, posting.workMode ? WORK_MODE_LABELS[posting.workMode] : null].filter(Boolean).join(" · ") || (
              <span className="bi-muted">Not stated</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Posted</dt>
          <dd>{formatDate(posting.postedAt)}</dd>
        </div>
        {business?.about && (
          <div>
            <dt>About them</dt>
            <dd>{business.about}</dd>
          </div>
        )}
        {google?.mapsUrl && (
          <div>
            <dt>On Google</dt>
            <dd>
              <a className="bi-ext" href={google.mapsUrl} target="_blank" rel="noopener noreferrer">
                View their listing <ExternalLink size={12} aria-hidden="true" />
              </a>
            </dd>
          </div>
        )}
      </dl>
      <div className="bi-drawer__section">
        <h3 className="bi-label">Skills requested</h3>
        <div className="chip-list">
          {posting.skills.map((skill) => (
            <span key={skill} className={`chip${matched.includes(skill) ? " bi-chip--match" : ""}`}>
              {skill}
            </span>
          ))}
        </div>
        {matched.length > 0 && <p className="bi-hint">Highlighted skills are also in your profile.</p>}
      </div>
    </Drawer>
  );
}
