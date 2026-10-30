import type { ReactNode } from "react";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { formatKm } from "../services/geo";
import { DATA_SOURCE_LABELS, type BusinessResult } from "../types";
import Drawer from "./Drawer";
import OpportunityAnalysisPanel from "./OpportunityAnalysisPanel";

interface BusinessDrawerProps {
  business: BusinessResult;
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  /** Extra panel shown first, e.g. lead tracking on the Saved page. */
  extra?: ReactNode;
}

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function BusinessDrawer({ business, saved, onToggleSave, onClose, extra }: BusinessDrawerProps) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Category", value: business.category },
    { label: "Address", value: business.address ?? <span className="bi-muted">Not listed</span> },
    { label: "Distance", value: business.distanceKm === null ? <span className="bi-muted">Unknown</span> : `${formatKm(business.distanceKm)} (straight line)` },
    {
      label: "Website",
      value: business.website ? (
        <a className="bi-ext" href={withScheme(business.website)} target="_blank" rel="noopener noreferrer">
          {business.website} <ExternalLink size={12} aria-hidden="true" />
        </a>
      ) : (
        <span className="bi-muted">None listed</span>
      ),
    },
    { label: "Phone", value: business.phone ?? <span className="bi-muted">Not listed</span> },
    ...(business.source === "google"
      ? [
          {
            label: "Google rating",
            value:
              business.rating != null ? (
                `${business.rating.toFixed(1)} ★ from ${business.reviewCount ?? 0} review${business.reviewCount === 1 ? "" : "s"}`
              ) : (
                <span className="bi-muted">No rating yet</span>
              ),
          },
        ]
      : []),
    { label: "Opening hours", value: business.openingHours ?? <span className="bi-muted">Not listed</span> },
    {
      label: "Coordinates",
      value: business.lat !== null && business.lng !== null ? `${business.lat.toFixed(5)}, ${business.lng.toFixed(5)}` : <span className="bi-muted">Not available</span>,
    },
  ];

  return (
    <Drawer
      label={<span className={`bi-web${business.website ? "" : " bi-web--none"}`}>{business.website ? "Website listed" : "No website listed"}</span>}
      title={business.name}
      onClose={onClose}
      footer={
        <>
          {business.sourceUrl && (
            <a className="btn btn--secondary" href={business.sourceUrl} target="_blank" rel="noopener noreferrer">
              View on {business.source === "google" ? "Google Maps" : DATA_SOURCE_LABELS[business.source]} <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
          <button type="button" className={`btn ${saved ? "btn--secondary" : "btn--primary"}`} onClick={onToggleSave}>
            {saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
            {saved ? "Saved" : "Save opportunity"}
          </button>
        </>
      }
    >
      {extra}
      <OpportunityAnalysisPanel business={business} />

      <dl className="bi-facts">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {!business.website && (
        <p className="bi-callout">
          <strong>Possible opportunity:</strong> {DATA_SOURCE_LABELS[business.source]} doesn't list a website for this business. That doesn't prove it
          has none — check before reaching out.
        </p>
      )}

      <p className="bi-source-note">
        Source: {business.source === "osm" ? "© OpenStreetMap contributors (ODbL)" : DATA_SOURCE_LABELS[business.source]}. Details are shown as the
        source lists them and may be incomplete or out of date.
      </p>
    </Drawer>
  );
}
