import type { ResolvedPlace } from "../types";
import { ServiceError } from "./errors";

// Geocoding via OpenStreetMap Nominatim. Usage policy: light use only (max ~1 request/second), no autocomplete-as-you-type,
// attribution required. Queries run only when the user presses Search, and results are cached for the session.
// Override with VITE_GEOCODER_URL to point at a self-hosted or commercial Nominatim-compatible service.
const GEOCODER_URL = import.meta.env.VITE_GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";

const cache = new Map<string, ResolvedPlace>();

export async function geocode(query: string, signal?: AbortSignal): Promise<ResolvedPlace> {
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const url = `${GEOCODER_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query.trim())}`;
  const response = await fetch(url, { signal, headers: { "Accept-Language": "en" } });
  if (response.status === 429) throw new ServiceError("rate-limit", "The location service is busy. Wait a few seconds and search again.");
  if (!response.ok) throw new ServiceError("network", "The location service didn't respond. Try again in a moment.");

  const data = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  if (!data.length) throw new ServiceError("not-found", `We couldn't find “${query.trim()}”. Try a city, neighbourhood or full address.`);

  const place: ResolvedPlace = { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name };
  cache.set(key, place);
  return place;
}
