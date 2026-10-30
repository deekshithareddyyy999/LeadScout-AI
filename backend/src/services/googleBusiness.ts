import { config } from "../config";

// Google Places lookups for "Verified on Google": a business finds its own listing by name, and the server reads the
// listing's rating and review count straight from Google (never from the browser), so the badge can't be faked.

export interface GoogleListing {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
}

interface PlaceJson {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

const FIELDS = ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "googleMapsUri"];

export class GoogleUnavailableError extends Error {}

const toListing = (p: PlaceJson): GoogleListing => ({
  placeId: p.id,
  name: p.displayName?.text ?? "",
  address: p.formattedAddress ?? null,
  rating: p.rating ?? null,
  reviewCount: p.userRatingCount ?? null,
  mapsUrl: p.googleMapsUri ?? null,
});

async function call<T>(url: string, init: RequestInit, fieldMask: string): Promise<T> {
  if (!config.googlePlacesKey) throw new GoogleUnavailableError("Google Places isn't set up on the server.");
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": config.googlePlacesKey, "X-Goog-FieldMask": fieldMask },
    signal: AbortSignal.timeout(15_000),
  }).catch((error: Error) => {
    throw new GoogleUnavailableError(`Couldn't reach Google Places (${error.message}).`);
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    console.error(`Google Places returned ${response.status}:`, detail?.error?.message ?? "(no detail)");
    throw new GoogleUnavailableError(response.status === 404 ? "That Google listing wasn't found." : "Google Places didn't respond properly. Try again in a moment.");
  }
  return (await response.json()) as T;
}

/** Up to 5 listings matching a business name and city. */
export async function searchListings(query: string): Promise<GoogleListing[]> {
  const data = await call<{ places?: PlaceJson[] }>(
    "https://places.googleapis.com/v1/places:searchText",
    { method: "POST", body: JSON.stringify({ textQuery: query, pageSize: 5 }) },
    FIELDS.map((f) => `places.${f}`).join(",")
  );
  return (data.places ?? []).map(toListing);
}

/** One listing by place ID, read from Google. */
export async function getListing(placeId: string): Promise<GoogleListing> {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) throw new GoogleUnavailableError("That doesn't look like a Google place ID.");
  return toListing(await call<PlaceJson>(`https://places.googleapis.com/v1/places/${placeId}`, { method: "GET" }, FIELDS.join(",")));
}
