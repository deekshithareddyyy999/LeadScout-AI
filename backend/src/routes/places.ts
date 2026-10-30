import { Router } from "express";
import { config } from "../config";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Google Places API (New) — Nearby Search. https://developers.google.com/maps/documentation/places/web-service/nearby-search
const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const MAX_RESULTS = 20; // Nearby Search's per-request maximum.
const MAX_RADIUS_METERS = 50_000;

// Only the fields the Seeker UI shows. Google bills by the most expensive field requested
// (website, phone and opening hours are in the Enterprise tier), so keep this list tight.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryTypeDisplayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.rating", // same Enterprise tier as website/phone, so no extra cost; used by the opportunity analysis
  "places.userRatingCount",
  "places.addressComponents", // lower tier than the fields above, so no extra cost; gives the neighbourhood for the Areas view
].join(",");

// Same category ids as frontend/src/domains/bi/services/categories.ts, mapped to Places "Table A" types.
const CATEGORY_TYPES: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bakery", "bar", "meal_takeaway"],
  retail: ["clothing_store", "convenience_store", "supermarket", "electronics_store", "furniture_store", "hardware_store", "jewelry_store", "shoe_store", "book_store", "home_goods_store"],
  health: ["doctor", "dentist", "pharmacy", "hospital", "physiotherapist"],
  beauty: ["beauty_salon", "hair_care", "spa"],
  fitness: ["gym"],
  stay: ["lodging"],
  education: ["school", "primary_school", "secondary_school", "university"],
  services: ["accounting", "lawyer", "real_estate_agency", "travel_agency", "insurance_agency", "electrician", "plumber", "locksmith", "painter", "laundry"],
  auto: ["car_repair", "car_wash", "car_dealer"],
};
const ALL_TYPES = Object.values(CATEGORY_TYPES).flat(); // 42 types; Nearby Search allows up to 50.

/** Mirrors BusinessResult in frontend/src/domains/bi/types.ts. */
interface BusinessResult {
  id: string;
  source: "google";
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  sourceUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  area: string | null;
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  primaryTypeDisplayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  googleMapsUri?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  addressComponents?: { longText?: string; types?: string[] }[];
}

/** The neighbourhood a place sits in, most specific first (e.g. "Zahara Nagar", then "Banjara Hills"). */
function areaOf(p: GooglePlace): string | null {
  const parts = p.addressComponents ?? [];
  for (const type of ["neighborhood", "sublocality_level_2", "sublocality_level_1", "sublocality", "locality"]) {
    const match = parts.find((c) => c.types?.includes(type) && c.longText);
    if (match) return match.longText!;
  }
  return null;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const h = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

router.post(
  "/search",
  asyncHandler(async (req, res) => {
    if (!config.googlePlacesKey) {
      res.status(503).json({
        error: "not-configured",
        message: "Google Places isn't connected yet. Add GOOGLE_PLACES_API_KEY to backend/.env and restart the backend.",
      });
      return;
    }

    const { lat, lng, radiusMeters, categoryId = "" } = req.body ?? {};
    const valid =
      typeof lat === "number" && Math.abs(lat) <= 90 &&
      typeof lng === "number" && Math.abs(lng) <= 180 &&
      typeof radiusMeters === "number" && radiusMeters > 0 && radiusMeters <= MAX_RADIUS_METERS &&
      typeof categoryId === "string" && (categoryId === "" || categoryId in CATEGORY_TYPES);
    if (!valid) {
      res.status(400).json({ error: "bad-request", message: "Expected { lat, lng, radiusMeters (1–50000), categoryId }." });
      return;
    }

    // Nearby Search returns at most 20 places. Ranked by distance, those can all sit within a few hundred metres
    // of the centre in a busy area, so we also ask for the most prominent places across the whole radius and merge.
    const key = config.googlePlacesKey;
    const nearby = async (rankPreference: "DISTANCE" | "POPULARITY"): Promise<{ places: GooglePlace[] } | { status: number }> => {
      try {
        const response = await fetch(NEARBY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
          body: JSON.stringify({
            includedTypes: categoryId ? CATEGORY_TYPES[categoryId] : ALL_TYPES,
            maxResultCount: MAX_RESULTS,
            rankPreference,
            locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          console.error(`Google Places (${rankPreference}) returned ${response.status}:`, detail?.error?.message ?? "(no detail)");
          return { status: response.status };
        }
        return { places: ((await response.json()) as { places?: GooglePlace[] }).places ?? [] };
      } catch (error) {
        console.error(`Google Places (${rankPreference}) request failed:`, (error as Error).message);
        return { status: 0 };
      }
    };

    const answers = await Promise.all([nearby("DISTANCE"), nearby("POPULARITY")]);
    const succeeded = answers.filter((a): a is { places: GooglePlace[] } => "places" in a);
    if (succeeded.length === 0) {
      const status = (answers[0] as { status: number }).status;
      if (status === 429) {
        res.status(429).json({ error: "rate-limit", message: "Google Places quota reached. Wait a moment or raise the quota in Google Cloud." });
      } else if (status === 400 || status === 403) {
        res.status(502).json({
          error: "google-rejected",
          message: "Google rejected the request. Check that Places API (New) is enabled, billing is on, and the key is allowed to call it.",
        });
      } else if (status === 0) {
        res.status(502).json({ error: "unreachable", message: "Couldn't reach Google Places. Try again in a moment." });
      } else {
        res.status(502).json({ error: "upstream", message: "Google Places didn't respond properly. Try again in a moment." });
      }
      return;
    }

    const seen = new Set<string>();
    const places = succeeded.flatMap((a) => a.places).filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    const results: BusinessResult[] = places
      // Closed businesses (temporarily or permanently) aren't opportunities.
      .filter((p) => (!p.businessStatus || p.businessStatus === "OPERATIONAL") && p.displayName?.text)
      .map((p) => {
        const pLat = p.location?.latitude ?? null;
        const pLng = p.location?.longitude ?? null;
        return {
          id: `google:${p.id}`,
          source: "google",
          name: p.displayName!.text,
          category: p.primaryTypeDisplayName?.text ?? "Business",
          address: p.formattedAddress ?? null,
          lat: pLat,
          lng: pLng,
          distanceKm: pLat !== null && pLng !== null ? haversineKm(lat, lng, pLat, pLng) : null,
          website: p.websiteUri ?? null,
          phone: p.nationalPhoneNumber ?? null,
          openingHours: p.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
          sourceUrl: p.googleMapsUri ?? null,
          rating: p.rating ?? null,
          reviewCount: p.userRatingCount ?? null,
          area: areaOf(p),
        };
      });

    // Either ranking hitting the cap means more businesses exist in the area than we were given.
    res.json({ results, truncated: succeeded.some((a) => a.places.length >= MAX_RESULTS) });
  })
);

export default router;
