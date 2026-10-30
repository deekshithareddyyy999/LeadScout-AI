// Seeker workspace (domain key "bi"): an individual professional discovering businesses that may need their services.

/** Where business records come from. OpenStreetMap needs no key; Google Places needs a backend endpoint + API key. */
export type DataSource = "osm" | "google";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A geocoded search centre. */
export interface ResolvedPlace extends GeoPoint {
  label: string;
}

/** A real business record returned by the configured data source. Fields are null when the source doesn't list them. */
export interface BusinessResult {
  /** Source-prefixed id, e.g. "osm:node/123" or "google:<placeId>". */
  id: string;
  source: DataSource;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Straight-line distance from the search centre; null when coordinates are missing. */
  distanceKm: number | null;
  /** Website as listed by the source. null means "none listed", not "has no website". */
  website: string | null;
  phone: string | null;
  openingHours: string | null;
  /** Link to the record at the source (e.g. the OpenStreetMap object). */
  sourceUrl: string | null;
  /** Google rating and review count (Google results only; absent on older saved records). */
  rating?: number | null;
  reviewCount?: number | null;
  /** Neighbourhood from the listing's address, for the Areas view (absent on older saved records). */
  area?: string | null;
}

/** Result of POST /api/seeker/quick-priority: the analysis rules on listing facts only (no website check, no AI). */
export interface QuickPriority {
  id: string;
  priority: OpportunityPriority;
  reasons: string[];
  established: boolean;
  websiteChecked: boolean;
}

export type ServiceKind = "website" | "website-upgrade" | "seo" | "marketing";
export type OpportunityPriority = "high" | "medium" | "low";

export interface AnalysisFinding {
  id: string;
  service: ServiceKind;
  label: string;
  detail: string;
}

export type WebsiteCheck =
  | {
      checked: true;
      reachable: true;
      finalUrl: string;
      https: boolean;
      mobileViewport: boolean;
      title: string | null;
      metaDescription: string | null;
      responseMs: number;
      whatsappLink: boolean;
      phoneLink: boolean;
      bookingLink: boolean;
      orderingLink: boolean;
      socialLinks: string[];
      copyrightYear: number | null;
    }
  | { checked: true; reachable: false; reason: string }
  | { checked: false; reason: string };

/** Result of POST /api/seeker/analyze. Priority comes from transparent rules; `ai` is Gemini's explanation of them. */
export interface OpportunityAnalysis {
  businessId: string;
  priority: OpportunityPriority;
  reasons: AnalysisFinding[];
  otherFindings: AnalysisFinding[];
  services: { kind: ServiceKind; label: string; matchesProfile: boolean | null }[];
  website: WebsiteCheck | null;
  profileHasSkills: boolean;
  established: boolean;
  ai: { summary: string; outreachDraft: string; model: string } | null;
  aiError: string | null;
  generatedAt: string;
}

export type WebsiteFilter = "any" | "none-listed" | "listed";
export type BusinessSort = "distance" | "name" | "priority";

export interface LocationQuery {
  location: string;
  radiusKm: number;
  /** Category id from services/categories.ts, or "" for all. */
  category: string;
  website: WebsiteFilter;
}

export type WorkMode = "remote" | "onsite" | "hybrid";

export type ApplicationStatus = "new" | "in_review" | "shortlisted" | "declined";

/** Shown to the Seeker for their own application (business wording, not the internal status). */
export const MY_APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  new: "Applied",
  in_review: "Being reviewed",
  shortlisted: "Shortlisted",
  declined: "Not selected",
};

export interface MyApplication {
  status: ApplicationStatus;
  quoteAmount: number | null;
  timeline: string;
  submittedAt: string;
  /** The business shares its contact details once it shortlists you. */
  contact: { name: string | null; phone: string | null; email: string | null } | null;
}

export interface PostingBusiness {
  name: string;
  category: string;
  area: string;
  city: string;
  website: string;
  about: string;
  google: { placeId: string; name: string; rating: number | null; reviewCount: number | null; mapsUrl: string | null } | null;
}

/** A requirement a business posted on LeadScout AI (GET /api/postings). */
export interface Posting {
  id: string;
  title: string;
  organization: string | null;
  summary: string;
  description: string;
  skills: string[];
  /** Formatted budget, e.g. "₹20,000–₹30,000 for the project". */
  budget: string | null;
  deadline: string | null;
  location: string | null;
  workMode: WorkMode | null;
  postedAt: string;
  service?: string;
  budgetType?: "project" | "daily" | "monthly";
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetOpen?: boolean;
  business?: PostingBusiness | null;
  myApplication?: MyApplication | null;
  /** City the work is in (from the business profile or the posting's location), for the location filter. */
  city?: string | null;
  area?: string | null;
}

export interface PostingFilters {
  keyword: string;
  workMode: WorkMode | "";
  /** Postings show only once a location is chosen. */
  city?: string;
  /** Also show remote postings from other cities (default on). */
  includeRemote?: boolean;
}

/** Individual professional — no company fields. */
export interface SeekerProfile {
  fullName: string;
  title: string;
  skills: string[];
  experience: string;
  portfolioUrl: string;
  preferredLocations: string[];
  preferredCategories: string[];
  phone: string;
}

export interface SeekerSettings {
  defaultRadiusKm: number;
  dataSource: DataSource;
  recordHistory: boolean;
}

/** Lead tracker pipeline for saved opportunities. */
export type LeadStatus = "new" | "contacted" | "replied" | "won" | "lost";
export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "replied", "won", "lost"];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", replied: "Replied", won: "Won", lost: "Lost" };

export interface LeadTracking {
  status: LeadStatus;
  notes: string;
  /** YYYY-MM-DD, or null when no follow-up is planned. */
  followUpOn: string | null;
}

export type SavedItem = (
  | { kind: "business"; id: string; savedAt: string; business: BusinessResult }
  | { kind: "posting"; id: string; savedAt: string; posting: Posting }
) &
  Partial<LeadTracking>;

export type HistoryEntry =
  | {
      id: string;
      at: string;
      source: "location";
      query: LocationQuery;
      resolvedLabel: string;
      resultCount: number;
      dataSource: DataSource;
    }
  | { id: string; at: string; source: "postings"; filters: PostingFilters; resultCount: number };

export const RADIUS_KM = [5, 10, 25, 50];

export const EXPERIENCE_OPTIONS = ["", "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"];

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  osm: "OpenStreetMap",
  google: "Google Places",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };
