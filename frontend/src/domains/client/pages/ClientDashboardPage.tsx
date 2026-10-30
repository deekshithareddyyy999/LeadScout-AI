import type { ReactNode } from "react";
import { CircleCheck, FolderOpen, Inbox, Plus, ScanEye, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { daysAgo } from "../../../shared/utils/dates";
import RequirementsTable from "../components/RequirementsTable";
import { useClientStore } from "../store";
import "./ClientPages.css";

interface StatCardProps {
  label: string;
  icon: LucideIcon;
  value: number;
  unit: string;
  meta: ReactNode;
  progress: number;
}

function StatCard({ label, icon: Icon, value, unit, meta, progress }: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-card__head">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon" aria-hidden="true">
          <Icon size={15} />
        </span>
      </div>
      <div className="stat-card__body">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__unit">{unit}</span>
        <span className="stat-card__meta">{meta}</span>
      </div>
      <div className="stat-card__bar" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
      </div>
    </div>
  );
}

interface ClientDashboardPageProps {
  onPostRequirement: () => void;
  onReview: (requirementId: string) => void;
  onProfile: () => void;
}

export default function ClientDashboardPage({ onPostRequirement, onReview, onProfile }: ClientDashboardPageProps) {
  const { requirements, applications, profile } = useClientStore();

  const active = requirements.filter((r) => r.status !== "closed");
  const postedThisWeek = requirements.filter((r) => daysAgo(r.postedAt) < 7).length;
  const pending = applications.filter((a) => a.status === "new" || a.status === "in_review");
  const unreviewed = applications.filter((a) => a.status === "new").length;
  const inReview = applications.filter((a) => a.status === "in_review").length;
  const scored = applications.filter((a) => a.match);
  const topRanked = scored.filter((a) => a.match!.score >= 90).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <h1 className="page-title">Client Dashboard</h1>
            <span className="pill pill--primary">Workspace Active</span>
          </div>
          <p className="page-subtitle">
            {profile.businessName ? `${profile.businessName} · ` : ""}Post work with a budget, track freelancer applications, and review explained AI matches.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onPostRequirement}>
          <Plus size={16} aria-hidden="true" />
          Post New Requirement
        </button>
      </header>

      {!profile.businessName && (
        <div className="notice notice--row">
          <span>Complete your business profile so freelancers know who they would work with.</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onProfile}>
            Complete business profile
          </button>
        </div>
      )}

      <div className="stat-grid">
        <StatCard
          label="Total Requirements"
          icon={FolderOpen}
          value={active.length}
          unit="Active"
          meta={
            <span className="stat-card__trend">
              <TrendingUp size={13} aria-hidden="true" />+{postedThisWeek} this week
            </span>
          }
          progress={requirements.length ? active.length / requirements.length : 0}
        />
        <StatCard
          label="Pending Applications"
          icon={Inbox}
          value={pending.length}
          unit="Submissions"
          meta={unreviewed > 0 ? <span className="tag tag--info">{unreviewed} unreviewed</span> : "All reviewed"}
          progress={applications.length ? pending.length / applications.length : 0}
        />
        <StatCard
          label="Under Review"
          icon={ScanEye}
          value={inReview}
          unit="In Evaluation"
          meta={`${active.length} open briefs`}
          progress={pending.length ? inReview / pending.length : 0}
        />
        <StatCard
          label="Top Matches"
          icon={Sparkles}
          value={topRanked}
          unit="Top-Ranked"
          meta={
            <span className="stat-card__trend">
              <CircleCheck size={13} aria-hidden="true" />
              ≥90% Fit
            </span>
          }
          progress={scored.length ? topRanked / scored.length : 0}
        />
      </div>

      <RequirementsTable onReview={onReview} onPostRequirement={onPostRequirement} />
    </div>
  );
}
