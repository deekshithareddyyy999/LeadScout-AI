import { Request, Response, Router } from "express";
import { defaultDataSource } from "../controllers/authController";
import { rest } from "../db/supabase";
import { analyzeOpportunity, quickPriority, type AnalysisBusiness, type OpportunityAnalysis } from "../services/opportunity";
import { requireAuth, requireDomain } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

// Seeker workspace data: profile + settings, saved opportunities, search history.
// Every query is scoped to the signed-in user's id from the auth cookie, never to an id sent by the browser.

const router = Router();
router.use(requireAuth, requireDomain("bi"));

const HISTORY_LIMIT = 50;
const RADII = [5, 10, 25, 50];
const DATA_SOURCES = ["osm", "google"];

interface ProfileRow {
  user_id: number;
  full_name: string;
  title: string;
  skills: string[];
  experience: string;
  portfolio_url: string;
  preferred_locations: string[];
  preferred_categories: string[];
  phone: string;
  default_radius_km: number;
  data_source: "osm" | "google";
  record_history: boolean;
}

interface SavedRow {
  item_id: string;
  kind: "business" | "posting";
  snapshot: unknown;
  saved_at: string;
  // Lead tracker columns (migration 0003). Absent until that migration has been run.
  status?: LeadStatus;
  notes?: string;
  follow_up_on?: string | null;
}

const LEAD_STATUSES = ["new", "contacted", "replied", "won", "lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

interface HistoryRow {
  id: number;
  source: "location" | "postings";
  query: Record<string, unknown>;
  resolved_label: string | null;
  data_source: "osm" | "google" | null;
  result_count: number;
  searched_at: string;
}

const userId = (req: Request) => req.auth!.userId;

const toProfile = (r: ProfileRow) => ({
  fullName: r.full_name,
  title: r.title,
  skills: r.skills,
  experience: r.experience,
  portfolioUrl: r.portfolio_url,
  preferredLocations: r.preferred_locations,
  preferredCategories: r.preferred_categories,
  phone: r.phone,
});
const toSettings = (r: ProfileRow) => ({ defaultRadiusKm: r.default_radius_km, dataSource: r.data_source, recordHistory: r.record_history });
const toSaved = (r: SavedRow) => ({
  kind: r.kind,
  id: r.item_id,
  savedAt: r.saved_at,
  [r.kind]: r.snapshot,
  status: r.status ?? "new",
  notes: r.notes ?? "",
  followUpOn: r.follow_up_on ?? null,
});
const toHistory = (r: HistoryRow) =>
  r.source === "location"
    ? { id: String(r.id), at: r.searched_at, source: r.source, query: r.query, resolvedLabel: r.resolved_label ?? "", resultCount: r.result_count, dataSource: r.data_source ?? "osm" }
    : { id: String(r.id), at: r.searched_at, source: r.source, filters: r.query, resultCount: r.result_count };

// ---------- validation helpers ----------
const isText = (v: unknown, max = 300): v is string => typeof v === "string" && v.length <= max;
const isTextList = (v: unknown, maxItems = 50): v is string[] => Array.isArray(v) && v.length <= maxItems && v.every((s) => isText(s, 120));
const badRequest = (res: Response, message: string) => res.status(400).json({ error: "bad-request", message });

async function loadProfile(id: number): Promise<ProfileRow> {
  const rows = await rest<ProfileRow[]>(`seeker_profiles?user_id=eq.${id}&select=*`);
  if (rows[0]) return rows[0];
  // Accounts created before profiles existed: seed one from the account.
  const [user] = await rest<{ full_name: string; organization: string | null }[]>(`users?id=eq.${id}&select=full_name,organization`);
  const created = await rest<ProfileRow[]>("seeker_profiles?select=*", {
    method: "POST",
    prefer: "return=representation",
    body: { user_id: id, full_name: user?.full_name ?? "", title: user?.organization ?? "", data_source: defaultDataSource() },
  });
  return created[0];
}

/** Everything the workspace needs on load. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const id = userId(req);
    const [profile, saved, history] = await Promise.all([
      loadProfile(id),
      rest<SavedRow[]>(`saved_opportunities?user_id=eq.${id}&select=*&order=saved_at.desc`),
      rest<HistoryRow[]>(`search_history?user_id=eq.${id}&select=*&order=searched_at.desc&limit=${HISTORY_LIMIT}`),
    ]);
    res.json({ profile: toProfile(profile), settings: toSettings(profile), saved: saved.map(toSaved), history: history.map(toHistory) });
  })
);

router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const p = req.body ?? {};
    const valid =
      isText(p.fullName, 120) && p.fullName.trim() !== "" && isText(p.title, 120) && isTextList(p.skills) && isText(p.experience, 40) &&
      isText(p.portfolioUrl, 300) && isTextList(p.preferredLocations, 10) && isTextList(p.preferredCategories, 20) && isText(p.phone, 40);
    if (!valid) return badRequest(res, "Profile has missing or invalid fields.");
    await loadProfile(userId(req));
    const [row] = await rest<ProfileRow[]>(`seeker_profiles?user_id=eq.${userId(req)}&select=*`, {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        full_name: p.fullName.trim(),
        title: p.title,
        skills: p.skills,
        experience: p.experience,
        portfolio_url: p.portfolioUrl,
        preferred_locations: p.preferredLocations,
        preferred_categories: p.preferredCategories,
        phone: p.phone,
        updated_at: new Date().toISOString(),
      },
    });
    res.json(toProfile(row));
  })
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const s = req.body ?? {};
    if (!RADII.includes(s.defaultRadiusKm) || !DATA_SOURCES.includes(s.dataSource) || typeof s.recordHistory !== "boolean") {
      return badRequest(res, "Settings have missing or invalid fields.");
    }
    await loadProfile(userId(req));
    const [row] = await rest<ProfileRow[]>(`seeker_profiles?user_id=eq.${userId(req)}&select=*`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { default_radius_km: s.defaultRadiusKm, data_source: s.dataSource, record_history: s.recordHistory, updated_at: new Date().toISOString() },
    });
    res.json(toSettings(row));
  })
);

// ---------- saved opportunities ----------
router.post(
  "/saved",
  asyncHandler(async (req, res) => {
    const { kind, id, snapshot } = req.body ?? {};
    if ((kind !== "business" && kind !== "posting") || !isText(id, 200) || !id || typeof snapshot !== "object" || snapshot === null) {
      return badRequest(res, "Expected { kind, id, snapshot }.");
    }
    if (JSON.stringify(snapshot).length > 20_000) return badRequest(res, "Saved record is too large.");
    // Saving something already saved is a no-op rather than an error.
    const rows = await rest<SavedRow[]>("saved_opportunities?on_conflict=user_id,item_id&select=*", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: { user_id: userId(req), kind, item_id: id, snapshot },
    });
    res.status(201).json(rows[0] ? toSaved(rows[0]) : null);
  })
);

// Lead tracker: pipeline status, private notes and a follow-up date for one saved opportunity.
router.patch(
  "/saved/:itemId",
  asyncHandler(async (req, res) => {
    const { status, notes, followUpOn } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!LEAD_STATUSES.includes(status)) return badRequest(res, `Status must be one of: ${LEAD_STATUSES.join(", ")}.`);
      patch.status = status;
    }
    if (notes !== undefined) {
      if (!isText(notes, 4000)) return badRequest(res, "Notes must be text under 4,000 characters.");
      patch.notes = notes;
    }
    if (followUpOn !== undefined) {
      if (followUpOn !== null && !(typeof followUpOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(followUpOn) && !Number.isNaN(Date.parse(followUpOn)))) {
        return badRequest(res, "Follow-up date must be YYYY-MM-DD or empty.");
      }
      patch.follow_up_on = followUpOn;
    }
    if (Object.keys(patch).length === 0) return badRequest(res, "Nothing to update.");
    patch.updated_at = new Date().toISOString();

    const rows = await rest<SavedRow[]>(`saved_opportunities?user_id=eq.${userId(req)}&item_id=eq.${encodeURIComponent(req.params.itemId)}&select=*`, {
      method: "PATCH",
      prefer: "return=representation",
      body: patch,
    });
    if (!rows[0]) return res.status(404).json({ error: "not-found", message: "That saved opportunity no longer exists." });
    res.json(toSaved(rows[0]));
  })
);

router.delete(
  "/saved/:itemId",
  asyncHandler(async (req, res) => {
    await rest(`saved_opportunities?user_id=eq.${userId(req)}&item_id=eq.${encodeURIComponent(req.params.itemId)}`, { method: "DELETE" });
    res.status(204).send();
  })
);

router.delete(
  "/saved",
  asyncHandler(async (req, res) => {
    await rest(`saved_opportunities?user_id=eq.${userId(req)}`, { method: "DELETE" });
    res.status(204).send();
  })
);

// ---------- search history ----------
router.post(
  "/history",
  asyncHandler(async (req, res) => {
    const e = req.body ?? {};
    const isLocation = e.source === "location";
    const query = isLocation ? e.query : e.filters;
    if ((e.source !== "location" && e.source !== "postings") || typeof query !== "object" || query === null || !Number.isInteger(e.resultCount) || e.resultCount < 0) {
      return badRequest(res, "Expected a location or postings search entry.");
    }
    if (JSON.stringify(query).length > 2_000) return badRequest(res, "Search entry is too large.");

    const id = userId(req);
    const profile = await loadProfile(id);
    if (!profile.record_history) return res.status(204).send(); // the Seeker turned history off

    const [row] = await rest<HistoryRow[]>("search_history?select=*", {
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: id,
        source: e.source,
        query,
        resolved_label: isLocation && isText(e.resolvedLabel, 300) ? e.resolvedLabel : null,
        data_source: isLocation && DATA_SOURCES.includes(e.dataSource) ? e.dataSource : null,
        result_count: e.resultCount,
      },
    });

    // Keep only the newest HISTORY_LIMIT entries.
    const stale = await rest<{ id: number }[]>(`search_history?user_id=eq.${id}&select=id&order=searched_at.desc&offset=${HISTORY_LIMIT}`);
    if (stale.length) await rest(`search_history?user_id=eq.${id}&id=in.(${stale.map((s) => s.id).join(",")})`, { method: "DELETE" });

    res.status(201).json(toHistory(row));
  })
);

router.delete(
  "/history/:id",
  asyncHandler(async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return badRequest(res, "Invalid history id.");
    await rest(`search_history?user_id=eq.${userId(req)}&id=eq.${req.params.id}`, { method: "DELETE" });
    res.status(204).send();
  })
);

// ---------- AI opportunity analysis ----------
// Runs only when the Seeker asks. Results are cached per user + business + profile for an hour, and each user is
// limited to ANALYSIS_LIMIT fresh analyses per hour, so repeated clicks never spend extra AI tokens.
const ANALYSIS_TTL_MS = 60 * 60 * 1000;
const ANALYSIS_LIMIT = 30;
const analysisCache = new Map<string, { at: number; result: OpportunityAnalysis }>();
const analysisLog = new Map<number, number[]>();

const nullableText = (v: unknown, max: number) => v === null || v === undefined || isText(v, max);
const nullableNumber = (v: unknown) => v === null || v === undefined || (typeof v === "number" && Number.isFinite(v) && v >= 0);

/** Validates a business as shown in the results list; null when it's malformed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBusiness(b: any): AnalysisBusiness | null {
  const valid =
    b && isText(b.id, 200) && b.id !== "" && (b.source === "osm" || b.source === "google") && isText(b.name, 200) && b.name.trim() !== "" &&
    isText(b.category, 120) && nullableText(b.address, 400) && nullableText(b.website, 500) && nullableText(b.phone, 60) &&
    nullableText(b.openingHours, 1000) && nullableNumber(b.rating) && nullableNumber(b.reviewCount);
  if (!valid) return null;
  return {
    id: b.id,
    source: b.source,
    name: b.name.trim(),
    category: b.category,
    address: b.address ?? null,
    website: b.website?.trim() || null,
    phone: b.phone ?? null,
    openingHours: b.openingHours ?? null,
    rating: b.rating ?? null,
    reviewCount: b.reviewCount ?? null,
  };
}

// Quick priority for a whole result list: the same rules on listing facts only (no website check, no AI), so it's free.
const QUICK_LIMIT = 80;
router.post(
  "/quick-priority",
  asyncHandler(async (req, res) => {
    const list = (req.body ?? {}).businesses;
    if (!Array.isArray(list) || list.length > QUICK_LIMIT) return badRequest(res, `Expected { businesses } with at most ${QUICK_LIMIT} items.`);
    const businesses = list.map(parseBusiness);
    if (businesses.some((b) => b === null)) return badRequest(res, "One of the businesses has missing or invalid fields.");
    const profile = await loadProfile(userId(req));
    const seeker = { title: profile.title, skills: profile.skills };
    res.json((businesses as AnalysisBusiness[]).map((b) => quickPriority(b, seeker)));
  })
);

router.post(
  "/analyze",
  asyncHandler(async (req, res) => {
    const business = parseBusiness((req.body ?? {}).business);
    if (!business) return badRequest(res, "Expected { business } with the fields shown in the results list.");

    const id = userId(req);
    const profile = await loadProfile(id);
    const seeker = { title: profile.title, skills: profile.skills };
    const cacheKey = JSON.stringify([id, business, seeker]);
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.at < ANALYSIS_TTL_MS) return res.json(cached.result);

    const recent = (analysisLog.get(id) ?? []).filter((t) => Date.now() - t < ANALYSIS_TTL_MS);
    if (recent.length >= ANALYSIS_LIMIT) {
      return res.status(429).json({ error: "rate-limit", message: `You've run ${ANALYSIS_LIMIT} analyses in the last hour. Try again a little later.` });
    }
    analysisLog.set(id, [...recent, Date.now()]);

    const result = await analyzeOpportunity(business, seeker);
    if (result.ai) analysisCache.set(cacheKey, { at: Date.now(), result }); // don't cache AI failures, so a retry can succeed
    res.json(result);
  })
);

router.delete(
  "/history",
  asyncHandler(async (req, res) => {
    await rest(`search_history?user_id=eq.${userId(req)}`, { method: "DELETE" });
    res.status(204).send();
  })
);

export default router;
