import {
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  FileText,
  IndianRupee,
  Layers,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Phone,
  RotateCcw,
  UserRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatDate } from "../../../shared/utils/dates";
import { matchTier } from "../matching";
import { APPLICATION_STATUS_LABELS, type Application } from "../types";

interface ApplicationCardProps {
  application: Application;
  expanded: boolean;
  onToggle: () => void;
  onToggleShortlist: () => void;
  onToggleDecline: () => void;
  /** Runs the AI match for this application only. */
  onRunMatch: () => void;
  matching: boolean;
}

function SignalTile({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="signal-tile">
      <div className="signal-tile__title">
        <Icon size={15} aria-hidden="true" />
        {title}
      </div>
      <div className="signal-tile__body">{children}</div>
    </div>
  );
}

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function ApplicationCard({ application, expanded, onToggle, onToggleShortlist, onToggleDecline, onRunMatch, matching }: ApplicationCardProps) {
  const runButton = (label: string, className = "btn btn--soft btn--sm") => (
    <button type="button" className={className} onClick={onRunMatch} disabled={matching}>
      {matching ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <WandSparkles size={14} aria-hidden="true" />}
      {matching ? "Running AI match…" : label}
    </button>
  );
  const { match, status, applicant } = application;
  const shortlisted = status === "shortlisted";
  const declined = status === "declined";
  const panelId = `analysis-${application.id}`;
  const tagline = [applicant.title, applicant.experience].filter(Boolean).join(" · ") || "Freelancer on LeadScout";

  return (
    <article className={`card app-card${declined ? " app-card--declined" : ""}`}>
      <div className="app-card__head">
        <span className="icon-tile icon-tile--lg" aria-hidden="true">
          <UserRound size={18} />
        </span>

        <div className="app-card__summary">
          <div className="app-card__name-row">
            <h2 className="app-card__name">{applicant.name}</h2>
            {match && <span className={`match-badge match-badge--${matchTier(match.score)}`}>{match.score}% Match</span>}
            <span className={`status status--${status}`}>{APPLICATION_STATUS_LABELS[status]}</span>
            <span className="app-card__submitted">Applied {formatDate(application.submittedAt)}</span>
          </div>
          <div className="app-card__tagline">{tagline}</div>
          <p className="app-card__top">
            {match ? (
              <>
                <strong>Top Matched Capability:</strong> {match.topCapability}
              </>
            ) : (
              <span className="app-card__pending">Not evaluated yet. Run the AI match for this applicant when you want to compare them.</span>
            )}
          </p>
        </div>

        <div className="app-card__actions">
          {!match && runButton("Run AI match")}
          <button type="button" className="btn btn--soft btn--sm" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId}>
            {expanded ? "Details" : "View Details"}
            {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
          <button type="button" className={`btn btn--sm ${shortlisted ? "btn--secondary" : "btn--primary"}`} onClick={onToggleShortlist} disabled={declined}>
            {shortlisted ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="app-card__panel" id={panelId}>
          <div className="app-card__proposal">
            <h3 className="app-card__proposal-title">
              <MessageSquareText size={15} aria-hidden="true" /> Their proposal
            </h3>
            <p>{application.proposal}</p>
          </div>

          <div className="app-card__panel-head">
            <h3 className="app-card__panel-title">
              <ChartColumn size={16} aria-hidden="true" />
              AI Match Analysis &amp; Supporting Signals
            </h3>
            <span className="app-card__panel-note">Objective criteria to support your review. The decision stays with you.</span>
          </div>

          {match ? (
            <>
              <div className="signal-grid">
                <SignalTile icon={CircleCheck} title="Matched Capabilities">
                  {match.matchedCapabilities.length ? (
                    <div className="chip-list">
                      {match.matchedCapabilities.map((capability) => (
                        <span key={capability} className="chip chip--primary">
                          {capability}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "No skills listed in their profile."
                  )}
                </SignalTile>
                <SignalTile icon={BriefcaseBusiness} title="Relevant Experience">
                  {match.experience}
                </SignalTile>
                <SignalTile icon={IndianRupee} title="Quote & Timeline">
                  {match.projects}
                </SignalTile>
                <SignalTile icon={Layers} title="Portfolio">
                  {applicant.portfolioUrl ? (
                    <a href={withScheme(applicant.portfolioUrl)} target="_blank" rel="noopener noreferrer">
                      {applicant.portfolioUrl}
                    </a>
                  ) : (
                    match.portfolio
                  )}
                </SignalTile>
                <SignalTile icon={Clock} title="Potential Considerations">
                  {match.considerations}
                </SignalTile>
                <SignalTile icon={FileText} title="Objective Synthesis">
                  {match.synthesis}
                  {match.model && <span className="app-card__ai-note">Written by AI ({match.model}) from the facts shown.</span>}
                </SignalTile>
              </div>
              <div className="app-card__rerun">{runButton("Run AI match again", "app-card__rerun-btn")}</div>
              {match.breakdown && (
                <details className="app-card__breakdown">
                  <summary>How the {match.score}% was worked out</summary>
                  <ul>
                    {match.breakdown.map((b) => (
                      <li key={b.label}>
                        <span>{b.label}</span>
                        <span>
                          {b.points} / {b.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <div className="app-card__panel-empty">
              <span>This application hasn't been evaluated yet. The AI match runs only for the applicants you choose.</span>
              {runButton("Run AI match for this applicant")}
            </div>
          )}

          <div className="app-card__panel-footer">
            <div className="app-card__decision">
              <button type="button" className={`btn btn--sm ${shortlisted ? "btn--secondary" : "btn--primary"}`} onClick={onToggleShortlist} disabled={declined}>
                <Check size={14} aria-hidden="true" />
                {shortlisted ? "Remove from Shortlist" : "Shortlist Applicant"}
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={onToggleDecline}>
                {declined && <RotateCcw size={14} aria-hidden="true" />}
                {declined ? "Restore" : "Decline"}
              </button>
            </div>
            {shortlisted && (applicant.email || applicant.phone) ? (
              <span className="app-card__contact">
                {applicant.phone && (
                  <a href={`tel:${applicant.phone.replace(/\s/g, "")}`}>
                    <Phone size={14} aria-hidden="true" /> {applicant.phone}
                  </a>
                )}
                {applicant.email && (
                  <a href={`mailto:${applicant.email}`}>
                    <Mail size={14} aria-hidden="true" /> {applicant.email}
                  </a>
                )}
              </span>
            ) : (
              <span className="app-card__contact-note">Contact details are shared once you shortlist.</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
