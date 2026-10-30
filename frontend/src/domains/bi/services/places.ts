import type { BusinessResult, DataSource, ResolvedPlace } from "../types";
import { ALL_CATEGORY_SELECTORS, CATEGORIES, categoryFromTags } from "./categories";
import { ServiceError } from "./errors";
import { haversineKm, isValidCoordinate } from "./geo";

export interface PlaceSearchParams {
  center: ResolvedPlace;
  radiusKm: number;
  /** Category id, or "" for all categories. */
  categoryId: string;
}

export interface PlaceSearchResponse {
  results: BusinessResult[];
  /** True when the source stopped at its result limit, so more businesses may exist in the area. */
  truncated: boolean;
  attribution: string;
}

/** Contract every business-data provider implements. Results must already be limited to the requested radius. */
type PlaceProvider = (params: PlaceSearchParams, signal?: AbortSignal) => Promise<PlaceSearchResponse>;

const RESULT_LIMIT = 300;
const MAX_ALL_CATEGORY_RADIUS_KM = 10;

// ---------- OpenStreetMap (Overpass API) — live, no key ----------
// Free, fair-use public servers that are often overloaded, so we try a few in turn.
// Set VITE_OVERPASS_URL to use one dedicated instance instead (recommended for production).
const OVERPASS_URLS = import.meta.env.VITE_OVERPASS_URL
  ? [import.meta.env.VITE_OVERPASS_URL]
  : ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const ATTEMPT_TIMEOUT_MS = 18_000;

interface OverpassResponse {
  elements: OverpassElement[];
  /** Set when the server gave up part-way, e.g. "runtime error: Query timed out". The elements are then incomplete. */
  remark?: string;
}

/** Tries each Overpass server until one returns a complete answer. Busy, slow or failed servers fall through to the next. */
async function queryOverpass(query: string, signal?: AbortSignal): Promise<OverpassResponse> {
  for (const url of OVERPASS_URLS) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const attempt = new AbortController();
    const onAbort = () => attempt.abort();
    signal?.addEventListener("abort", onAbort);
    const timer = setTimeout(() => attempt.abort(), ATTEMPT_TIMEOUT_MS);
    try {
      const response = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), signal: attempt.signal });
      if (response.status === 400) throw new ServiceError("network", "OpenStreetMap couldn't read this search. Try a different category.");
      if (!response.ok) continue; // 429 rate-limited, 502/504 at capacity, etc. — try the next server
      const data = (await response.json()) as OverpassResponse;
      if (data.remark && /runtime error|timed out|out of memory/i.test(data.remark)) continue; // incomplete answer
      return data;
    } catch (error) {
      if (signal?.aborted) throw error; // the user started a new search
      if (error instanceof ServiceError) throw error;
      // Timed out or unreachable — try the next server.
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  throw new ServiceError(
    "timeout",
    `OpenStreetMap's free search servers are overloaded right now (${OVERPASS_URLS.length > 1 ? `tried ${OVERPASS_URLS.length} servers` : "no response"}). Try again in a few minutes, or pick one category and a smaller radius.`
  );
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function osmAddress(tags: Record<string, string>): string | null {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [tags["addr:full"] ?? street, tags["addr:suburb"] ?? tags["addr:neighbourhood"], tags["addr:city"], tags["addr:postcode"]].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.length ? parts.join(", ") : null;
}

const searchOpenStreetMap: PlaceProvider = async ({ center, radiusKm, categoryId }, signal) => {
  if (!categoryId && radiusKm > MAX_ALL_CATEGORY_RADIUS_KM) {
    throw new ServiceError(
      "too-broad",
      `Choose a category to search beyond ${MAX_ALL_CATEGORY_RADIUS_KM} km. Searching every business over a large area is too heavy for the free OpenStreetMap service.`
    );
  }
  const selectors = categoryId ? (CATEGORIES.find((c) => c.id === categoryId)?.osm ?? []) : ALL_CATEGORY_SELECTORS;
  const around = `(around:${Math.round(radiusKm * 1000)},${center.lat.toFixed(6)},${center.lng.toFixed(6)})`;
  const query = `[out:json][timeout:15];(${selectors.map((s) => `nwr["name"]${s}${around};`).join("")});out center tags ${RESULT_LIMIT};`;
  const data = await queryOverpass(query, signal);
  const seen = new Set<string>();
  const results: BusinessResult[] = [];

  for (const element of data.elements) {
    const tags = element.tags ?? {};
    const id = `osm:${element.type}/${element.id}`;
    if (!tags.name || seen.has(id)) continue;
    seen.add(id);

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const hasCoords = isValidCoordinate(lat, lng);
    const distanceKm = hasCoords ? haversineKm(center, { lat: lat as number, lng: lng as number }) : null;
    // Overpass matches a way if any of its nodes is inside the radius; keep only records whose position is inside it.
    if (distanceKm !== null && distanceKm > radiusKm) continue;

    results.push({
      id,
      source: "osm",
      name: tags.name,
      category: categoryFromTags(tags),
      address: osmAddress(tags),
      lat: hasCoords ? (lat as number) : null,
      lng: hasCoords ? (lng as number) : null,
      distanceKm,
      website: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      openingHours: tags.opening_hours ?? null,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      area: tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? tags["addr:city_district"] ?? null,
    });
  }

  return { results, truncated: data.elements.length >= RESULT_LIMIT, attribution: "© OpenStreetMap contributors (ODbL)" };
};

// ---------- Google Places — via the LeadScout backend, which holds the API key ----------
// Endpoint: POST /api/places/search (backend/src/routes/places.ts)
//   body:     { lat, lng, radiusMeters, categoryId }
//   response: { results: BusinessResult[], truncated: boolean }  ·  errors: { error, message }
// The key must stay on the server; the browser never calls Google directly.
const searchGooglePlaces: PlaceProvider = async ({ center, radiusKm, categoryId }, signal) => {
  const setupError = new ServiceError(
    "setup",
    "Google Places isn't connected yet. The LeadScout backend isn't running — start it with npm run dev in the backend folder."
  );
  let response: Response;
  try {
    response = await fetch("/api/places/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: center.lat, lng: center.lng, radiusMeters: Math.round(radiusKm * 1000), categoryId }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw setupError;
  }
  // A non-JSON reply means the request never reached the backend (the dev proxy answers when it's down).
  if (!response.headers.get("content-type")?.includes("application/json")) throw setupError;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!body?.message) throw setupError;
    const kind = response.status === 429 ? "rate-limit" : body.error === "unreachable" || body.error === "upstream" ? "network" : "setup";
    throw new ServiceError(kind, body.message);
  }
  const data = (await response.json()) as { results: BusinessResult[]; truncated?: boolean };
  return { results: data.results, truncated: Boolean(data.truncated), attribution: "Google Places" };
};

const PROVIDERS: Record<DataSource, PlaceProvider> = { osm: searchOpenStreetMap, google: searchGooglePlaces };

export function searchBusinesses(source: DataSource, params: PlaceSearchParams, signal?: AbortSignal): Promise<PlaceSearchResponse> {
  return PROVIDERS[source](params, signal);
}
