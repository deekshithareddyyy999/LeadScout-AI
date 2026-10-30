import { api, ApiError } from "../../../shared/api";
import { formatBudget } from "../../../shared/utils/money";
import type { MyApplication, Posting, PostingFilters, SeekerProfile } from "../types";
import { ServiceError } from "./errors";

// Postings are requirements businesses publish on LeadScout AI (GET /api/postings). Seekers apply with a proposal,
// an optional quote and a timeline (POST /api/postings/:id/apply). No sample postings are ever shown.

type RawPosting = Omit<Posting, "budget">;

export async function fetchPostings(): Promise<Posting[]> {
  try {
    const { postings } = await api<{ postings: RawPosting[] }>("/postings?status=open");
    return postings.map((p) => ({
      ...p,
      budget: p.budgetType ? formatBudget({ budgetType: p.budgetType, budgetMin: p.budgetMin ?? null, budgetMax: p.budgetMax ?? null, budgetOpen: Boolean(p.budgetOpen) }) : null,
    }));
  } catch (error) {
    if (error instanceof ApiError && (error.code === "not-configured" || error.code === "unreachable")) throw new ServiceError("setup", error.message);
    throw new ServiceError("network", error instanceof Error ? error.message : "Postings couldn't be loaded.");
  }
}

/** Cities that have open postings, busiest first, for the location dropdown. */
export function postingCities(postings: Posting[]): { city: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of postings) if (p.city) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  return [...counts.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export function applyToPosting(postingId: string, body: { proposal: string; quoteAmount: number | null; timeline: string }): Promise<MyApplication> {
  return api<MyApplication>(`/postings/${postingId}/apply`, { method: "POST", body });
}

export function filterPostings(postings: Posting[], filters: PostingFilters): Posting[] {
  const words = filters.keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const place = filters.city?.trim().toLowerCase() ?? "";
  return postings.filter((p) => {
    if (!place) return false; // a location must be chosen first
    // A typed location matches the posting's city, area or location text, e.g. "Hyderabad" or "Banjara Hills".
    const inCity = [p.city, p.area, p.location].some((v) => (v ?? "").toLowerCase().includes(place));
    if (!inCity && !(filters.includeRemote !== false && p.workMode === "remote")) return false;
    if (filters.workMode && p.workMode !== filters.workMode) return false;
    const text = `${p.title} ${p.organization ?? ""} ${p.summary} ${p.description} ${p.skills.join(" ")} ${p.location ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Skills a posting asks for that also appear in the seeker's profile (case-insensitive). Evidence, not a score. */
export function matchingSkills(posting: Posting, profile: SeekerProfile): string[] {
  const mine = new Set(profile.skills.map((s) => s.trim().toLowerCase()));
  return posting.skills.filter((s) => mine.has(s.trim().toLowerCase()));
}
