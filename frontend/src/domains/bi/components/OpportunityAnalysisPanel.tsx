import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, RotateCw, Sparkles } from "lucide-react";
import { errorMessage } from "../../../shared/api";
import { analyzeBusiness, cachedAnalysis } from "../services/analysis";
import type { BusinessResult, OpportunityAnalysis, OpportunityPriority } from "../types";

const PRIORITY_LABELS: Record<OpportunityPriority, string> = { high: "Needs attention", medium: "Worth a look", low: "Low priority" };

/** On-demand opportunity analysis for one business. Nothing is sent to the AI until the Seeker clicks. */
export default function OpportunityAnalysisPanel({ business }: { business: BusinessResult }) {
  const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(() => cachedAnalysis(business.id));
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAnalysis(cachedAnalysis(business.id));
    setStatus("idle");
    setError(null);
  }, [business.id]);

  async function run() {
    setStatus("loading");
    setError(null);
    try {
      setAnalysis(await analyzeBusiness(business));
      setStatus("idle");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  }

  async function copyDraft(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!analysis) {
    return (
      <section className="bi-analysis bi-analysis--start" aria-label="Opportunity analysis">
        <div>
          <p className="bi-analysis__heading">
            <Sparkles size={15} aria-hidden="true" /> Opportunity analysis
          </p>
          <p className="bi-analysis__intro">
            Checks the listing{business.website ? " and the website's homepage" : ""} against your skills, then explains whether this business may need your
            services and drafts a first message.
          </p>
          {error && (
            <p className="bi-analysis__error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="button" className="btn btn--soft" onClick={run} disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle size={15} className="bi-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {status === "loading" ? "Analyzing…" : status === "error" ? "Try again" : "Analyze opportunity"}
        </button>
      </section>
    );
  }

  const site = analysis.website;
  return (
    <section className="bi-analysis" aria-label="Opportunity analysis" aria-busy={status === "loading"}>
      <div className="bi-analysis__top">
        <p className="bi-analysis__heading">
          <Sparkles size={15} aria-hidden="true" /> Opportunity analysis
        </p>
        <span className="bi-analysis__badges">
          {analysis.established && <span className="bi-established">Established · {business.reviewCount} reviews</span>}
          <span className={`bi-priority bi-priority--${analysis.priority}`}>{PRIORITY_LABELS[analysis.priority]}</span>
        </span>
      </div>

      {analysis.ai ? (
        <p className="bi-analysis__summary">{analysis.ai.summary}</p>
      ) : (
        <p className="bi-analysis__error" role="status">
          {analysis.aiError ?? "The AI summary isn't available."}
        </p>
      )}

      <h3 className="bi-analysis__sub">{analysis.profileHasSkills ? "Why, for your skills" : "Why"}</h3>
      {analysis.reasons.length ? (
        <ul className="bi-findings">
          {analysis.reasons.map((r) => (
            <li key={r.id}>
              <strong>{r.label}</strong>
              <span>{r.detail}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bi-analysis__note">Nothing in the listing{site ? " or website check" : ""} points to a need that matches your skills.</p>
      )}

      {analysis.otherFindings.length > 0 && (
        <>
          <h3 className="bi-analysis__sub">Other findings (outside your listed skills)</h3>
          <ul className="bi-findings bi-findings--muted">
            {analysis.otherFindings.map((r) => (
              <li key={r.id}>
                <strong>{r.label}</strong>
                <span>{r.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {analysis.services.length > 0 && (
        <>
          <h3 className="bi-analysis__sub">Services that could help</h3>
          <div className="bi-service-chips">
            {analysis.services.map((s) => (
              <span key={s.kind} className={`bi-service${s.matchesProfile === false ? " bi-service--other" : ""}`}>
                {s.matchesProfile && <Check size={12} aria-hidden="true" />}
                {s.label}
              </span>
            ))}
          </div>
        </>
      )}

      {analysis.ai && (
        <>
          <div className="bi-analysis__draft-head">
            <h3 className="bi-analysis__sub">Draft first message</h3>
            <button type="button" className="bi-textbtn" onClick={() => copyDraft(analysis.ai!.outreachDraft)}>
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="bi-analysis__draft">{analysis.ai.outreachDraft}</p>
        </>
      )}

      {!analysis.profileHasSkills && <p className="bi-analysis__note">Add your skills in My Profile to tailor this analysis to the services you offer.</p>}

      <div className="bi-analysis__foot">
        <span>
          Priority comes from the listed facts{site?.checked ? " and a quick homepage check" : ""}, matched to your skills. Text written by AI
          {analysis.ai ? ` (${analysis.ai.model})` : ""} — review it before sending.
        </span>
        <button type="button" className="bi-textbtn" onClick={run} disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle size={13} className="bi-spin" aria-hidden="true" /> : <RotateCw size={13} aria-hidden="true" />}
          Analyze again
        </button>
      </div>
      {status === "error" && error && (
        <p className="bi-analysis__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
