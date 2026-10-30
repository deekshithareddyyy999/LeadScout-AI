import { api } from "../../../shared/api";
import type { BusinessResult, OpportunityAnalysis, QuickPriority } from "../types";

// Opportunity analyses already fetched this session, so reopening a business doesn't call the server (or the AI) again.
const cache = new Map<string, OpportunityAnalysis>();

export const cachedAnalysis = (businessId: string) => cache.get(businessId) ?? null;

/** The listing fields the server's rules read. */
const listingFacts = ({ id, source, name, category, address, website, phone, openingHours, rating = null, reviewCount = null }: BusinessResult) => ({
  id,
  source,
  name,
  category,
  address,
  website,
  phone,
  openingHours,
  rating,
  reviewCount,
});

export async function analyzeBusiness(business: BusinessResult): Promise<OpportunityAnalysis> {
  const result = await api<OpportunityAnalysis>("/seeker/analyze", { method: "POST", body: { business: listingFacts(business) } });
  if (result.ai) cache.set(business.id, result);
  return result;
}

/** Rules-only priority for every result (no website check, no AI): free, so it runs after each search. */
export async function quickPriorities(businesses: BusinessResult[]): Promise<Map<string, QuickPriority>> {
  if (businesses.length === 0) return new Map();
  const list = await api<QuickPriority[]>("/seeker/quick-priority", { method: "POST", body: { businesses: businesses.slice(0, 80).map(listingFacts) } });
  return new Map(list.map((q) => [q.id, q]));
}
