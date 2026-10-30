import { BadgeCheck } from "lucide-react";
import type { Domain } from "../shared/domains";

/** Small static picture of each side (business: a posting with applicants; freelancer: an area with flagged pins).
 *  Used on the workspace picker and the sign-in page. Styles live in WorkspacePage.css (.choice-art). */
export default function ChoiceArt({ domain }: { domain: Domain }) {
  if (domain === "client") {
    return (
      <div className="choice-art choice-art--business" aria-hidden="true">
        <div className="choice-art__ticket">
          <span className="choice-art__kind">Your posting</span>
          <span className="choice-art__title">Website for our café</span>
          <span className="choice-art__budget">₹20,000–₹35,000 for the project</span>
        </div>
        <div className="choice-art__applicants">
          <span className="choice-art__face" />
          <span className="choice-art__face" />
          <span className="choice-art__face" />
          <span className="choice-art__count">3 applied</span>
        </div>
      </div>
    );
  }
  return (
    <div className="choice-art choice-art--seeker" aria-hidden="true">
      <span className="choice-art__radius" />
      <span className="choice-art__pin" style={{ left: "24%", top: "38%" }} />
      <span className="choice-art__pin choice-art__pin--none" style={{ left: "64%", top: "28%" }} />
      <span className="choice-art__pin" style={{ left: "72%", top: "66%" }} />
      <span className="choice-art__pin choice-art__pin--none choice-art__pin--target" style={{ left: "44%", top: "58%" }} />
      <span className="choice-art__chip">
        <BadgeCheck size={12} /> Needs attention
      </span>
    </div>
  );
}
