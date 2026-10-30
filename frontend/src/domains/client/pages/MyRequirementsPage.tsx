import { Plus } from "lucide-react";
import Breadcrumbs from "../../../shared/components/Breadcrumbs";
import RequirementsTable from "../components/RequirementsTable";
import "./ClientPages.css";

interface MyRequirementsPageProps {
  onDashboard: () => void;
  onPostRequirement: () => void;
  onReview: (requirementId: string) => void;
}

export default function MyRequirementsPage({ onDashboard, onPostRequirement, onReview }: MyRequirementsPageProps) {
  return (
    <div className="page">
      <Breadcrumbs items={[{ label: "Dashboard", onClick: onDashboard }, { label: "Requirements" }]} />
      <header className="page-header">
        <div>
          <h1 className="page-title">My Requirements</h1>
          <p className="page-subtitle">Every requirement you have published, with its budget, applicant count and AI match signals.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onPostRequirement}>
          <Plus size={16} aria-hidden="true" />
          Post New Requirement
        </button>
      </header>

      <RequirementsTable onReview={onReview} onPostRequirement={onPostRequirement} />
    </div>
  );
}
