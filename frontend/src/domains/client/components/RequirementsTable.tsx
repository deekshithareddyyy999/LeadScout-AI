import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown, Eye, Filter, Lock, LockOpen, RefreshCw, Search, Sparkles } from "lucide-react";
import RowMenu from "../../../shared/components/RowMenu";
import SelectPill from "../../../shared/components/SelectPill";
import { useToast } from "../../../shared/components/Toast";
import { formatDate, formatRelativeDay } from "../../../shared/utils/dates";
import { formatBudget } from "../../../shared/utils/money";
import { ICONS } from "../icons";
import { useClientStore } from "../store";
import { REQUIREMENT_STATUS_LABELS, SERVICE_ICONS, SERVICE_LABELS, type RequirementStatus } from "../types";
import "./RequirementsTable.css";

type StatusFilter = "all" | RequirementStatus;
type SortKey = "recent" | "oldest" | "applications" | "match";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Requirements" },
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently Posted" },
  { value: "oldest", label: "Oldest First" },
  { value: "applications", label: "Most Applications" },
  { value: "match", label: "Top AI Match" },
];

export default function RequirementsTable({ onReview, onPostRequirement }: { onReview: (requirementId: string) => void; onPostRequirement: () => void }) {
  const { requirements, summaries, refreshedAt, refresh, setRequirementStatus } = useClientStore();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = requirements.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return [r.title, r.businessProblem, ...r.skills].some((text) => text.toLowerCase().includes(q));
    });
    return filtered.sort((a, b) => {
      if (sort === "oldest") return a.postedAt.localeCompare(b.postedAt);
      if (sort === "applications") return summaries[b.id].applicationCount - summaries[a.id].applicationCount;
      if (sort === "match") return (summaries[b.id].topMatch?.score ?? 0) - (summaries[a.id].topMatch?.score ?? 0);
      return b.postedAt.localeCompare(a.postedAt);
    });
  }, [requirements, summaries, query, status, sort]);

  const minutesSinceRefresh = Math.floor((Date.now() - new Date(refreshedAt).getTime()) / 60000);

  return (
    <section className="card req-table">
      <div className="req-table__toolbar">
        <div className="search-input">
          <Search size={15} />
          <input
            className="input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requirements by title, keyword..."
            aria-label="Search requirements"
          />
        </div>
        <div className="req-table__controls">
          <SelectPill icon={Filter} label="Status:" value={status} options={STATUS_OPTIONS} onChange={setStatus} ariaLabel="Filter by status" />
          <SelectPill icon={ArrowUpDown} label="Sort:" value={sort} options={SORT_OPTIONS} onChange={setSort} ariaLabel="Sort requirements" />
          <button
            type="button"
            className="icon-btn icon-btn--bordered"
            aria-label="Refresh"
            title="Refresh"
            onClick={() => {
              refresh();
              notify("Requirements refreshed.");
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="req-table__meta">
        <span>
          Showing <strong>{rows.length}</strong> {rows.length === 1 ? "requirement" : "requirements"} · Updated{" "}
          {minutesSinceRefresh < 1 ? "just now" : `${minutesSinceRefresh} min ago`}
        </span>
        <span className="req-table__pipeline">
          <span className="req-table__pipeline-dot" aria-hidden="true" />
          Scout Pipeline Active
        </span>
      </div>

      {requirements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">No requirements yet</div>
          Post your first requirement, with a budget, and freelancers on LeadScout can apply.
          <div>
            <button type="button" className="btn btn--primary btn--sm" onClick={onPostRequirement}>
              Post a requirement
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">No requirements match these filters</div>
          Try a different search term or status.
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th className="req-table__col-title">Requirement Title</th>
              <th className="req-table__col-status">Status</th>
              <th className="req-table__col-apps">Applications &amp; AI Match</th>
              <th className="req-table__col-date">Posted Date</th>
              <th className="req-table__col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((requirement) => {
              const summary = summaries[requirement.id];
              const Icon = ICONS[SERVICE_ICONS[requirement.service]];
              return (
                <tr key={requirement.id}>
                  <td>
                    <div className="req-row__title-cell">
                      <span className="icon-tile" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      <div className="req-row__text">
                        <button type="button" className="req-row__title" onClick={() => onReview(requirement.id)}>
                          {requirement.title}
                        </button>
                        <div className="req-row__problem">{requirement.businessProblem}</div>
                        <div className="req-row__budget">
                          {SERVICE_LABELS[requirement.service]} · {formatBudget(requirement)}
                        </div>
                        <div className="chip-list">
                          {requirement.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="chip">
                              {skill}
                            </span>
                          ))}
                          {requirement.skills.length > 4 && <span className="chip">+{requirement.skills.length - 4}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status status--${requirement.status}`}>{REQUIREMENT_STATUS_LABELS[requirement.status]}</span>
                  </td>
                  <td>
                    <div className="req-row__apps">
                      <span className="req-row__app-count">
                        {summary.applicationCount} {summary.applicationCount === 1 ? "application" : "applications"}
                      </span>
                      {summary.newCount > 0 ? (
                        <span className="tag tag--success">{summary.newCount} new</span>
                      ) : summary.recommendedCount > 0 ? (
                        <span className="req-row__ai-tag">
                          <Sparkles size={11} aria-hidden="true" />
                          {summary.recommendedCount} AI recommended
                        </span>
                      ) : null}
                    </div>
                    <div className="req-row__top-match">
                      {summary.topMatch ? (
                        <>
                          <strong>{summary.topMatch.score}% Top Match</strong> · {summary.topMatch.applicantName}
                        </>
                      ) : (
                        "No AI match yet"
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="req-row__date">{formatDate(requirement.postedAt)}</div>
                    <div className="req-row__relative">{formatRelativeDay(requirement.postedAt)}</div>
                  </td>
                  <td>
                    <div className="req-row__actions">
                      <button type="button" className="btn btn--soft btn--sm" onClick={() => onReview(requirement.id)}>
                        Review ({summary.applicationCount})
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                      <RowMenu
                        ariaLabel={`More actions for ${requirement.title}`}
                        items={[
                          { label: "View applications", icon: Eye, onSelect: () => onReview(requirement.id) },
                          requirement.status === "closed"
                            ? {
                                label: "Reopen requirement",
                                icon: LockOpen,
                                onSelect: () => {
                                  setRequirementStatus(requirement.id, "open");
                                  notify(`“${requirement.title}” reopened.`, "success");
                                },
                              }
                            : {
                                label: "Close requirement",
                                icon: Lock,
                                onSelect: () => {
                                  setRequirementStatus(requirement.id, "closed");
                                  notify(`“${requirement.title}” closed to new applications.`, "success");
                                },
                              },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
