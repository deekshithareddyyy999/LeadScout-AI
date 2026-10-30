// Business categories for location search. Each maps to OpenStreetMap tag selectors (Overpass QL).
// A Google Places provider would map the same ids to Places "includedTypes" on the backend.

export interface BusinessCategory {
  id: string;
  label: string;
  /** Overpass tag selectors, e.g. ["amenity"~"^(cafe|restaurant)$"]. */
  osm: string[];
}

export const CATEGORIES: BusinessCategory[] = [
  { id: "food", label: "Restaurants & cafés", osm: ['["amenity"~"^(restaurant|cafe|fast_food|ice_cream|food_court)$"]', '["shop"~"^(bakery|confectionery|pastry)$"]'] },
  { id: "retail", label: "Shops & retail", osm: ['["shop"]'] },
  { id: "health", label: "Clinics & pharmacies", osm: ['["amenity"~"^(clinic|doctors|dentist|pharmacy|hospital)$"]', '["healthcare"]'] },
  { id: "beauty", label: "Salons & beauty", osm: ['["shop"~"^(hairdresser|beauty|cosmetics|massage|tattoo)$"]'] },
  { id: "fitness", label: "Gyms & fitness", osm: ['["leisure"~"^(fitness_centre|sports_centre|dance)$"]'] },
  { id: "stay", label: "Hotels & stays", osm: ['["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"]'] },
  { id: "education", label: "Schools & coaching", osm: ['["amenity"~"^(school|college|kindergarten|language_school|driving_school|music_school|training)$"]'] },
  { id: "services", label: "Offices & local services", osm: ['["office"]', '["craft"]'] },
  { id: "auto", label: "Auto services", osm: ['["shop"~"^(car|car_repair|car_parts|tyres|motorcycle|motorcycle_repair)$"]', '["amenity"="car_wash"]'] },
];

export const ALL_CATEGORY_SELECTORS = CATEGORIES.flatMap((c) => c.osm);

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "All categories";

const TAG_PRIORITY = ["amenity", "shop", "healthcare", "office", "craft", "tourism", "leisure"];

/** Human-readable category from OSM tags, e.g. { shop: "car_repair" } → "Car repair". */
export function categoryFromTags(tags: Record<string, string>): string {
  for (const key of TAG_PRIORITY) {
    const value = tags[key];
    if (value && value !== "yes") {
      const text = value.replace(/_/g, " ").split(";")[0];
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
    if (value === "yes") return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return "Business";
}
