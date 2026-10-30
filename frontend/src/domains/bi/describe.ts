import { categoryLabel } from "./services/categories";
import { DATA_SOURCE_LABELS, WORK_MODE_LABELS, type HistoryEntry } from "./types";

/** Human-readable filter chips for a recorded search. */
export function describeSearch(entry: HistoryEntry): string[] {
  if (entry.source === "location") {
    const q = entry.query;
    return [
      q.location,
      `${q.radiusKm} km`,
      categoryLabel(q.category),
      ...(q.website === "none-listed" ? ["No website listed"] : q.website === "listed" ? ["Website listed"] : []),
      DATA_SOURCE_LABELS[entry.dataSource],
    ];
  }
  const f = entry.filters;
  return [f.keyword.trim() ? `“${f.keyword.trim()}”` : "All postings", f.city ? `in ${f.city}` : "Any location", f.workMode ? WORK_MODE_LABELS[f.workMode] : "Any arrangement"];
}

export const SEARCH_SOURCE_LABELS: Record<HistoryEntry["source"], string> = {
  location: "Location",
  postings: "Postings",
};
