import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../shared/components/Breadcrumbs";
import SelectPill from "../../../shared/components/SelectPill";
import { useToast } from "../../../shared/components/Toast";
import ApplicationCard from "../components/ApplicationCard";
import { errorMessage } from "../../../shared/api";
import { formatBudget } from "../../../shared/utils/money";
import { useClientStore } from "../store";
import type { Application } from "../types";
import "./ClientPages.css";

type MatchFilter = "all" | "strong" | "good" | "partial" | "pending";
type SortKey = "score-desc" | "score-asc" | "recent";

const MATCH_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "All Match Scores" },
  { value: "strong", label: "90% and above" },
  { value: "good", label: "80–89%" },
  { value: "partial", label: "Below 80%" },
  { value: "pending", label: "Not yet evaluated" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score-desc", label: "AI Match Score (High to Low)" },
  { value: "score-asc", label: "AI Match Score (Low to High)" },
  { value: "recent", label: "Most Recent" },
];

function passesFilter(app: Application, filter: MatchFilter): boolean {
  const score = app.match?.score;
  switch (filter) {
    case "strong":
      return score !== undefined && score >= 90;
    case "good":
      return score !== undefined && score >= 80 && score < 90;
    case "partial":
      return score !== undefined && score < 80;
    case "pending":
      return score === undefined;
    default:
      return true;
  }
}

interface ApplicationsPageProps {
  requirementId: string;
  onSelectRequirement: (requirementId: string) => void;
  onDashboard: () => void;
  onRequirements: () => void;
  onPostRequirement: () => void;
}

export default function ApplicationsPage({ requirementId, onSelectRequirement, onDashboard, onRequirements, onPostRequirement }: ApplicationsPageProps) {
  const { requirements, applications, summaries, setApplicationStatus, runMatching } = useClientStore();
  const { notify } = useToast();
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [sort, setSort] = useState<SortKey>("score-desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);

  const requirement = requirements.find((r) => r.id === requirementId);
  const all = useMemo(() => applications.filter((a) => a.requirementId === requirementId), [applications, requirementId]);

  const visible = useMemo(() => {
    const byScore = (a: Application) => a.match?.score ?? -1;
    return all
      .filter((a) => passesFilter(a, filter))
      .sort((a, b) => {
        if (a.status === "declined" && b.status !== "declined") return 1;
        if (b.status === "declined" && a.status !== "declined") return -1;
        if (sort === "score-asc") return byScore(a) - byScore(b);
        if (sort === "recent") return b.submittedAt.localeCompare(a.submittedAt);
        return byScore(b) - byScore(a);
      });
  }, [all, filter, sort]);

  // Open the best-ranked application by default each time a different requirement is shown.
  if (expandedFor !== requirementId) {
    setExpandedFor(requirementId);
    setExpanded(new Set(visible[0] ? [visible[0].id] : []));
  }

  if (!requirement) {
    return (
      <div className="page">
        <div className="card empty-state">
          <div className="empty-state__title">No requirements yet</div>
          Post a requirement to start receiving applications from freelancers.
          <div>
            <button type="button" className="btn btn--primary btn--sm" onClick={onPostRequirement}>
              Post a requirement
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleRunMatch(applicationId: string, name: string) {
    setMatchingId(applicationId);
    try {
      await runMatching(applicationId);
      setExpanded((current) => new Set(current).add(applicationId));
      notify(`AI match ready for ${name}.`, "success");
    } catch (error) {
      notify(`AI match didn’t run: ${errorMessage(error)}`);
    } finally {
      setMatchingId(null);
    }
  }

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="page">
      <Breadcrumbs
        items={[{ label: "Dashboard", onClick: onDashboard }, { label: "Requirements", onClick: onRequirements }, { label: "Applications" }]}
      />

      <div className="apps-context">
        <label className="apps-context__picker">
          <select value={requirementId} onChange={(e) => onSelectRequirement(e.target.value)} aria-label="Choose requirement">
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
        <span className="apps-context__sep">/</span>
        <span className="pill pill--primary">
          {summaries[requirementId].applicationCount} {summaries[requirementId].applicationCount === 1 ? "Application" : "Applications"} Received
        </span>
      </div>

      <header className="page-header">
        <div>
          <h1 className="page-title">Applications — {requirement.title}</h1>
          <p className="page-subtitle">
            {formatBudget(requirement)} · Review the freelancers who applied, compare explained match signals, and shortlist the ones you want to talk to.
          </p>
        </div>
        <div className="apps-controls">
          <SelectPill value={filter} options={MATCH_OPTIONS} onChange={setFilter} ariaLabel="Filter by match score" />
          <SelectPill icon={ArrowUpDown} label="Sort by:" value={sort} options={SORT_OPTIONS} onChange={setSort} ariaLabel="Sort applications" />
        </div>
      </header>

      {requirement.status === "closed" && (
        <div className="notice">This requirement is closed to new applications. You can still review and shortlist existing applicants.</div>
      )}

      {all.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state__title">No applications yet</div>
          Freelancers who apply on LeadScout will appear here.
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state__title">No applications match this filter</div>
          Choose “All Match Scores” to see every applicant.
        </div>
      ) : (
        <div className="app-list">
          {visible.map((application) => {
            const name = application.applicant.name;
            return (
              <ApplicationCard
                key={application.id}
                application={application}
                expanded={expanded.has(application.id)}
                onToggle={() => toggle(application.id)}
                onRunMatch={() => handleRunMatch(application.id, name)}
                matching={matchingId === application.id}
                onToggleShortlist={() => {
                  const next = application.status === "shortlisted" ? "in_review" : "shortlisted";
                  setApplicationStatus(application.id, next);
                  notify(next === "shortlisted" ? `${name} added to your shortlist. Their contact details are now shown.` : `${name} removed from your shortlist.`, "success");
                }}
                onToggleDecline={() => {
                  const next = application.status === "declined" ? (application.match ? "in_review" : "new") : "declined";
                  setApplicationStatus(application.id, next);
                  notify(next === "declined" ? `${name} declined.` : `${name} restored.`);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
