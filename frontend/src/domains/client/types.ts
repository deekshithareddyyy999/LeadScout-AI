import type { BudgetType } from "../../shared/utils/money";

export type RequirementStatus = "open" | "reviewing" | "closed";
export type ExperienceLevel = "mid" | "senior" | "lead" | "open";
export type WorkMode = "remote" | "onsite" | "hybrid";
export type ApplicationStatus = "new" | "in_review" | "shortlisted" | "declined";
export type IconKey = "chart" | "sync" | "mobile" | "invoice" | "portal" | "document" | "agency" | "network" | "design" | "cloud" | "code";
export type ServiceKind = "website" | "website-upgrade" | "seo" | "social-media" | "marketing" | "design" | "photography" | "other";

/** A requirement this business posted (stored in the `postings` table). */
export interface Requirement {
  id: string;
  title: string;
  businessProblem: string;
  description: string;
  expectedOutcome: string;
  service: ServiceKind;
  skills: string[];
  experience: ExperienceLevel;
  budgetType: BudgetType;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetOpen: boolean;
  deadline: string;
  location: string;
  workMode: WorkMode;
  additionalInfo: string;
  status: RequirementStatus;
  postedAt: string;
}

/** Explained match from the server's rules; `synthesis` is written by AI from the same facts. */
export interface MatchResult {
  score: number;
  topCapability: string;
  matchedCapabilities: string[];
  experience: string;
  projects: string; // quote & timeline
  portfolio: string;
  considerations: string;
  synthesis: string;
  breakdown?: { label: string; points: number; max: number }[];
  evaluatedAt: string;
  model?: string | null;
}

/** A Seeker (freelancer) who applied. Email and phone are shared only after the business shortlists them. */
export interface Applicant {
  name: string;
  title: string;
  skills: string[];
  experience: string;
  portfolioUrl: string;
  email: string | null;
  phone: string | null;
}

export interface Application {
  id: string;
  requirementId: string;
  submittedAt: string;
  status: ApplicationStatus;
  proposal: string;
  quoteAmount: number | null;
  timeline: string;
  match: MatchResult | null;
  applicant: Applicant;
}

export interface GoogleListing {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  address?: string | null;
}

export interface BusinessProfile {
  businessName: string;
  category: string;
  area: string;
  city: string;
  website: string;
  contactName: string;
  phone: string;
  about: string;
  /** Account email (read-only here). */
  email: string;
  google: GoogleListing | null;
}

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  website: "New website",
  "website-upgrade": "Website improvements",
  seo: "SEO & Google visibility",
  "social-media": "Social media",
  marketing: "Marketing & ads",
  design: "Design & branding",
  photography: "Photography & video",
  other: "Something else",
};

export const SERVICE_ICONS: Record<ServiceKind, IconKey> = {
  website: "portal",
  "website-upgrade": "code",
  seo: "chart",
  "social-media": "network",
  marketing: "agency",
  design: "design",
  photography: "mobile",
  other: "document",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, { label: string; detail: string }> = {
  mid: { label: "Mid-level", detail: "3–5 years" },
  senior: { label: "Senior", detail: "5–8 years" },
  lead: { label: "Lead / Expert", detail: "8+ years" },
  open: { label: "Open / All", detail: "Anyone qualified" },
};

export const WORK_MODE_LABELS: Record<WorkMode, { label: string; detail: string }> = {
  remote: { label: "Remote", detail: "Work from anywhere" },
  onsite: { label: "On-site", detail: "At your location" },
  hybrid: { label: "Hybrid", detail: "Mix of both" },
};

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  closed: "Closed",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  in_review: "In Review",
  shortlisted: "Shortlisted",
  declined: "Declined",
};
