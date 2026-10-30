import { ChevronRight } from "lucide-react";
import type { BusinessResult, OpportunityPriority } from "../types";

export const AREA_UNKNOWN = "Area not listed";

interface AreaRow {
  area: string;
  total: number;
  noWebsite: number;
  needsAttention: number;
}

interface AreaSummaryProps {
  /** The businesses in the current search (after the quality and website filters). */
  businesses: BusinessResult[];
  priorityOf: (business: BusinessResult) => OpportunityPriority | null;
  onPick: (area: string) => void;
}

/** Groups the current results by neighbourhood to show where the gaps cluster. Counts only what this search returned. */
export default function AreaSummary({ businesses, priorityOf, onPick }: AreaSummaryProps) {
  const groups = new Map<string, AreaRow>();
  for (const b of businesses) {
    const area = b.area ?? AREA_UNKNOWN;
    const row = groups.get(area) ?? { area, total: 0, noWebsite: 0, needsAttention: 0 };
    row.total += 1;
    if (!b.website) row.noWebsite += 1;
    if (priorityOf(b) === "high") row.needsAttention += 1;
    groups.set(area, row);
  }
  const rows = [...groups.values()].sort(
    (a, b) => Number(a.area === AREA_UNKNOWN) - Number(b.area === AREA_UNKNOWN) || b.needsAttention - a.needsAttention || b.noWebsite - a.noWebsite || b.total - a.total
  );
  const most = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="bi-areas">
      <p className="bi-areas__intro">
        Where the gaps are, by neighbourhood. Based on the {businesses.length} {businesses.length === 1 ? "business" : "businesses"} in this search, not every
        business in each area.
      </p>
      <ul className="bi-areas__list">
        {rows.map((r) => (
          <li key={r.area}>
            <button type="button" className="bi-area" onClick={() => onPick(r.area)} title={`Show businesses in ${r.area}`}>
              <span className="bi-area__head">
                <span className="bi-area__name">{r.area}</span>
                <span className="bi-area__count">{r.total}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </span>
              {/* Bar length = businesses found here relative to the busiest area; the filled part = those that need attention. */}
              <span className="bi-area__bar" aria-hidden="true">
                <span className="bi-area__bar-total" style={{ width: `${(r.total / most) * 100}%` }}>
                  <span className="bi-area__bar-gap" style={{ width: `${(r.needsAttention / r.total) * 100}%` }} />
                </span>
              </span>
              <span className="bi-area__meta">
                {r.needsAttention > 0 ? <strong>{r.needsAttention} need attention</strong> : <span>None need attention</span>}
                <span> · {r.noWebsite} with no website listed</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
