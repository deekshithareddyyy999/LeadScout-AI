import { Router } from "express";
import { rest } from "../db/supabase";
import { requireAuth, requireDomain } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";
import { toGoogle, toRequirement, type ApplicationRow, type BusinessRow, type PostingRow } from "./client";

// Posted Opportunities for Seekers: open requirements from businesses on LeadScout, and applying to them.

const router = Router();
router.use(requireAuth, requireDomain("bi"));

const idList = (ids: number[]) => `(${[...new Set(ids)].join(",")})`;

/** The city a posting belongs to: the business profile's city, else the last part of the posting's location ("Banjara Hills, Hyderabad"). */
function cityOf(p: PostingRow, b: BusinessRow | undefined): string | null {
  const fromLocation = p.location.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  const city = (b?.city || fromLocation || "").trim();
  return city ? city.charAt(0).toUpperCase() + city.slice(1) : null;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = req.auth!.userId;
    // Closed requirements no longer take applications; "reviewing" ones still do.
    const postings = await rest<PostingRow[]>("postings?status=in.(open,reviewing)&select=*&order=created_at.desc&limit=100");
    if (postings.length === 0) return res.json({ postings: [] });

    const clientIds = idList(postings.map((p) => p.client_id));
    const [businesses, users, mine] = await Promise.all([
      rest<BusinessRow[]>(`business_profiles?user_id=in.${clientIds}&select=*`),
      rest<{ id: number; organization: string | null; email: string }[]>(`users?id=in.${clientIds}&select=id,organization,email`),
      rest<ApplicationRow[]>(`applications?seeker_id=eq.${me}&posting_id=in.${idList(postings.map((p) => p.id))}&select=*`),
    ]);
    const businessOf = new Map(businesses.map((b) => [b.user_id, b]));
    const userOf = new Map(users.map((u) => [u.id, u]));
    const appOf = new Map(mine.map((a) => [a.posting_id, a]));

    res.json({
      postings: postings.map((p) => {
        const b = businessOf.get(p.client_id);
        const u = userOf.get(p.client_id);
        const app = appOf.get(p.id);
        const r = toRequirement(p);
        return {
          id: r.id,
          title: r.title,
          organization: b?.business_name || u?.organization || null,
          summary: r.businessProblem,
          description: [r.description, r.expectedOutcome && `Expected outcome: ${r.expectedOutcome}`, r.additionalInfo].filter(Boolean).join("\n\n"),
          skills: r.skills,
          service: r.service,
          experience: r.experience,
          budgetType: r.budgetType,
          budgetMin: r.budgetMin,
          budgetMax: r.budgetMax,
          budgetOpen: r.budgetOpen,
          deadline: r.deadline || null,
          location: r.location || [b?.area, b?.city].filter(Boolean).join(", ") || null,
          city: cityOf(p, b),
          area: b?.area || null,
          workMode: r.workMode,
          postedAt: r.postedAt,
          business: b
            ? { name: b.business_name, category: b.category, area: b.area, city: b.city, website: b.website, about: b.about, google: toGoogle(b) }
            : null,
          myApplication: app
            ? {
                status: app.status,
                quoteAmount: app.quote_amount,
                timeline: app.timeline,
                submittedAt: app.created_at,
                // Contact details are shared both ways once the business shortlists the Seeker.
                contact:
                  app.status === "shortlisted"
                    ? { name: b?.contact_name || b?.business_name || null, phone: b?.phone || null, email: u?.email ?? null }
                    : null,
              }
            : null,
        };
      }),
    });
  })
);

router.post(
  "/:id/apply",
  asyncHandler(async (req, res) => {
    const { proposal, quoteAmount, timeline } = req.body ?? {};
    if (typeof proposal !== "string" || proposal.trim().length < 30 || proposal.length > 3000) {
      return res.status(400).json({ error: "bad-request", message: "Write a proposal of at least 30 characters (up to 3,000)." });
    }
    if (!(quoteAmount === null || (Number.isInteger(quoteAmount) && quoteAmount >= 0 && quoteAmount <= 1_000_000_000))) {
      return res.status(400).json({ error: "bad-request", message: "The quote must be a whole number of rupees, or empty." });
    }
    if (!(typeof timeline === "string" && timeline.length <= 120)) return res.status(400).json({ error: "bad-request", message: "Timeline must be under 120 characters." });
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "bad-request", message: "Invalid posting id." });

    const [posting] = await rest<PostingRow[]>(`postings?id=eq.${req.params.id}&select=id,status`);
    if (!posting) return res.status(404).json({ error: "not-found", message: "That posting no longer exists." });
    if (posting.status === "closed") return res.status(409).json({ error: "closed", message: "This posting is closed to new applications." });

    const rows = await rest<ApplicationRow[]>("applications?on_conflict=posting_id,seeker_id&select=*", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: { posting_id: posting.id, seeker_id: req.auth!.userId, proposal: proposal.trim(), quote_amount: quoteAmount, timeline: timeline.trim() },
    });
    if (!rows[0]) return res.status(409).json({ error: "exists", message: "You've already applied to this posting." });
    const a = rows[0];
    res.status(201).json({ status: a.status, quoteAmount: a.quote_amount, timeline: a.timeline, submittedAt: a.created_at, contact: null });
  })
);

export default router;
