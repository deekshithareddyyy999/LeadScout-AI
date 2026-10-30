// Match scores are worked out on the server (backend/src/services/applicantMatch.ts); this only maps a score to its tier.
export function matchTier(score: number): "strong" | "good" | "partial" {
  if (score >= 90) return "strong";
  if (score >= 80) return "good";
  return "partial";
}
