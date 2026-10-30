import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { errorMessage } from "../../../shared/api";
import Breadcrumbs from "../../../shared/components/Breadcrumbs";
import { useToast } from "../../../shared/components/Toast";
import { BUDGET_TYPE_LABELS, formatBudget, type BudgetType } from "../../../shared/utils/money";
import SkillTagInput from "../components/SkillTagInput";
import { useClientStore, type NewRequirement } from "../store";
import { EXPERIENCE_LABELS, SERVICE_LABELS, WORK_MODE_LABELS, type ExperienceLevel, type ServiceKind, type WorkMode } from "../types";
import "./ClientPages.css";

const TITLE_MAX = 80;

// Budget amounts are typed as text and converted to whole rupees on publish.
type FormState = Omit<NewRequirement, "experience" | "service" | "budgetMin" | "budgetMax"> & {
  experience: ExperienceLevel | "";
  service: ServiceKind | "";
  budgetMin: string;
  budgetMax: string;
};
type FieldKey = "title" | "businessProblem" | "description" | "service" | "skills" | "expectedOutcome" | "experience" | "budget";

const EMPTY_FORM: FormState = {
  title: "",
  businessProblem: "",
  description: "",
  skills: [],
  expectedOutcome: "",
  experience: "",
  service: "",
  budgetType: "project",
  budgetMin: "",
  budgetMax: "",
  budgetOpen: false,
  deadline: "",
  location: "",
  workMode: "remote",
  additionalInfo: "",
};

const toAmount = (text: string) => (text.trim() === "" ? null : Number(text.replace(/[,\s₹]/g, "")));

function validate(form: FormState): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (!form.title.trim()) errors.title = "Add a requirement title.";
  if (!form.businessProblem.trim()) errors.businessProblem = "Summarize the business problem.";
  if (!form.description.trim()) errors.description = "Describe the problem in more detail.";
  if (!form.service) errors.service = "Choose the service you need.";
  if (form.skills.length === 0) errors.skills = "Add at least one required skill or capability.";
  if (!form.expectedOutcome.trim()) errors.expectedOutcome = "Describe the expected outcome.";
  if (!form.experience) errors.experience = "Choose an experience requirement.";
  const min = toAmount(form.budgetMin);
  const max = toAmount(form.budgetMax);
  if ((min !== null && !(Number.isInteger(min) && min >= 0)) || (max !== null && !(Number.isInteger(max) && max >= 0))) errors.budget = "Enter whole rupee amounts, e.g. 25000.";
  else if (min !== null && max !== null && min > max) errors.budget = "The minimum can't be more than the maximum.";
  else if (min === null && max === null && !form.budgetOpen) errors.budget = "Add a budget range, or tick “Open to quotes”.";
  return errors;
}

function Section({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <header className="form-section__head">
        <span className="form-section__step">{step}</span>
        <div className="form-section__heading">
          <h2 className="form-section__title">{title}</h2>
          <p className="form-section__description">{description}</p>
        </div>
        <span className="form-section__count">Step {step} of 4</span>
      </header>
      <div className="form-section__body">{children}</div>
    </section>
  );
}

function Label({ htmlFor, required, children, aside }: { htmlFor: string; required?: boolean; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="field__label-row">
      <label className="field__label" htmlFor={htmlFor}>
        {children}
        {required && <span className="field__required">*</span>}
      </label>
      {aside}
    </div>
  );
}

interface PostRequirementPageProps {
  onDashboard: () => void;
  onRequirements: () => void;
  onPublished: () => void;
  onProfile: () => void;
}

export default function PostRequirementPage({ onDashboard, onRequirements, onPublished, onProfile }: PostRequirementPageProps) {
  const { addRequirement, draftRequirement, profile } = useClientStore();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [idea, setIdea] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (submitted) setErrors(validate(next));
  }

  function leave(target: () => void) {
    const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
    if (!dirty || window.confirm("Discard this requirement? Your changes will be lost.")) target();
  }

  async function handleDraft() {
    setDrafting(true);
    setDraftError(null);
    try {
      const d = await draftRequirement(idea);
      setForm((f) => ({ ...f, title: d.title, businessProblem: d.businessProblem, description: d.description, expectedOutcome: d.expectedOutcome, skills: d.skills, service: d.service }));
      if (submitted) setErrors({});
      notify("Draft filled in below. Review it, then add your budget and timeline.", "success");
    } catch (error) {
      setDraftError(errorMessage(error));
    } finally {
      setDrafting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as FieldKey[])[0];
    if (firstInvalid) {
      document.getElementById(`req-${firstInvalid}`)?.focus();
      return;
    }
    setPublishing(true);
    try {
      const requirement = await addRequirement({
        ...form,
        title: form.title.trim(),
        businessProblem: form.businessProblem.trim(),
        description: form.description.trim(),
        expectedOutcome: form.expectedOutcome.trim(),
        experience: form.experience as ExperienceLevel,
        service: form.service as ServiceKind,
        budgetMin: toAmount(form.budgetMin),
        budgetMax: toAmount(form.budgetMax),
      });
      notify(`“${requirement.title}” published. Freelancers on LeadScout can now apply.`, "success");
      onPublished();
    } catch (error) {
      notify(`Couldn't publish: ${errorMessage(error)}`);
    } finally {
      setPublishing(false);
    }
  }

  const invalid = (key: FieldKey) => (errors[key] ? " input--invalid" : "");
  const today = new Date().toISOString().slice(0, 10);
  const budgetPreview = errors.budget
    ? null
    : formatBudget({ budgetType: form.budgetType, budgetMin: toAmount(form.budgetMin), budgetMax: toAmount(form.budgetMax), budgetOpen: form.budgetOpen });

  return (
    <div className="page page--form">
      <Breadcrumbs
        onBack={() => leave(onDashboard)}
        items={[
          { label: "Dashboard", onClick: () => leave(onDashboard) },
          { label: "Requirements", onClick: () => leave(onRequirements) },
          { label: "Post New Requirement" },
        ]}
      />
      <header className="page-header">
        <div>
          <h1 className="page-title">Post a Business Requirement</h1>
          <p className="page-subtitle">Describe the work you need and your budget. Freelancers on LeadScout can apply, and AI helps you compare them.</p>
        </div>
        <span className="pill pill--primary">
          <span className="pill__dot" aria-hidden="true" />
          AI Scouter Active
        </span>
      </header>

      {!profile.businessName && (
        <div className="notice notice--row">
          <span>Add your business details so freelancers know who is posting.</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => leave(onProfile)}>
            Complete business profile
          </button>
        </div>
      )}

      <section className="card req-assist" aria-label="Help me write this">
        <div className="req-assist__head">
          <Sparkles size={16} aria-hidden="true" />
          <div>
            <h2 className="req-assist__title">Help me write this</h2>
            <p className="req-assist__text">Describe what you need in your own words. AI fills in the title, description and skills for you to review. It never suggests a price.</p>
          </div>
        </div>
        <textarea
          className="textarea"
          rows={2}
          maxLength={2000}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g., We're a bakery in Banjara Hills. We want a simple website with our menu and an order-on-WhatsApp button."
          aria-label="Describe what you need"
        />
        {draftError && <span className="field__error">{draftError}</span>}
        <div className="req-assist__actions">
          <button type="button" className="btn btn--soft btn--sm" onClick={handleDraft} disabled={drafting || idea.trim().length < 15}>
            {drafting ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            {drafting ? "Writing…" : "Fill in the form"}
          </button>
        </div>
      </section>

      <form className="card req-form" onSubmit={handleSubmit} noValidate>
        <Section step={1} title="Basic Information & Objective" description="What you need and why.">
          <div className="field">
            <Label
              htmlFor="req-title"
              required
              aside={
                <span className="field__counter">
                  {form.title.length}/{TITLE_MAX}
                </span>
              }
            >
              Requirement Title
            </Label>
            <input
              id="req-title"
              className={`input${invalid("title")}`}
              maxLength={TITLE_MAX}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g., Website with online menu for our bakery"
            />
            {errors.title && <span className="field__error">{errors.title}</span>}
          </div>

          <div className="field">
            <Label htmlFor="req-service" required>
              Service Needed
            </Label>
            <select id="req-service" className={`input${invalid("service")}`} value={form.service} onChange={(e) => update("service", e.target.value as ServiceKind | "")}>
              <option value="">Choose a service…</option>
              {(Object.keys(SERVICE_LABELS) as ServiceKind[]).map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.service && <span className="field__error">{errors.service}</span>}
          </div>

          <div className="field">
            <Label htmlFor="req-businessProblem" required>
              Business Problem
            </Label>
            <input
              id="req-businessProblem"
              className={`input${invalid("businessProblem")}`}
              maxLength={300}
              value={form.businessProblem}
              onChange={(e) => update("businessProblem", e.target.value)}
              placeholder="One sentence, e.g., Customers can't find our menu or order online."
            />
            {errors.businessProblem ? (
              <span className="field__error">{errors.businessProblem}</span>
            ) : (
              <span className="field__hint">A one-sentence summary that helps freelancers and AI matching understand the need.</span>
            )}
          </div>

          <div className="field">
            <Label htmlFor="req-description" required>
              Problem Description
            </Label>
            <textarea
              id="req-description"
              className={`textarea${invalid("description")}`}
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What you have today, what isn't working, and anything a freelancer should know…"
            />
            {errors.description && <span className="field__error">{errors.description}</span>}
          </div>
        </Section>

        <Section step={2} title="Scope & Deliverables" description="The skills you need, what you expect at the end, and the experience level.">
          <div className="field">
            <Label htmlFor="req-skills" required>
              Required Skills
            </Label>
            <SkillTagInput id="req-skills" value={form.skills} onChange={(skills) => update("skills", skills)} invalid={!!errors.skills} />
            {errors.skills ? (
              <span className="field__error">{errors.skills}</span>
            ) : (
              <span className="field__hint">Press comma or Enter to add a skill (e.g., WordPress, SEO, Instagram).</span>
            )}
          </div>

          <div className="field">
            <Label htmlFor="req-expectedOutcome" required>
              Expected Outcome &amp; Deliverables
            </Label>
            <textarea
              id="req-expectedOutcome"
              className={`textarea${invalid("expectedOutcome")}`}
              rows={3}
              value={form.expectedOutcome}
              onChange={(e) => update("expectedOutcome", e.target.value)}
              placeholder="What you'll have when the work is done…"
            />
            {errors.expectedOutcome && <span className="field__error">{errors.expectedOutcome}</span>}
          </div>

          <fieldset className="field choice-field">
            <legend className="field__label">
              Experience Requirement<span className="field__required">*</span>
            </legend>
            <div className="choice-grid choice-grid--4">
              {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((level, index) => (
                <label key={level} className={`choice-card${form.experience === level ? " choice-card--selected" : ""}`}>
                  <input
                    id={index === 0 ? "req-experience" : undefined}
                    type="radio"
                    name="experience"
                    value={level}
                    checked={form.experience === level}
                    onChange={() => update("experience", level)}
                  />
                  <span className="choice-card__text">
                    <span className="choice-card__label">{EXPERIENCE_LABELS[level].label}</span>
                    <span className="choice-card__detail">{EXPERIENCE_LABELS[level].detail}</span>
                  </span>
                  <span className="choice-card__radio" aria-hidden="true" />
                </label>
              ))}
            </div>
            {errors.experience && <span className="field__error">{errors.experience}</span>}
          </fieldset>
        </Section>

        <Section step={3} title="Budget, Timeline & Location" description="What you can spend, by when, and where the work happens.">
          <fieldset className="field choice-field">
            <legend className="field__label">
              Budget Type<span className="field__required">*</span>
            </legend>
            <div className="choice-grid choice-grid--3">
              {(Object.keys(BUDGET_TYPE_LABELS) as BudgetType[]).map((type) => (
                <label key={type} className={`choice-card${form.budgetType === type ? " choice-card--selected" : ""}`}>
                  <input type="radio" name="budgetType" value={type} checked={form.budgetType === type} onChange={() => update("budgetType", type)} />
                  <span className="choice-card__text">
                    <span className="choice-card__label">{BUDGET_TYPE_LABELS[type].label}</span>
                    <span className="choice-card__detail">{BUDGET_TYPE_LABELS[type].detail}</span>
                  </span>
                  <span className="choice-card__radio" aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-grid">
            <div className="field">
              <Label htmlFor="req-budget">Minimum (₹)</Label>
              <input
                id="req-budget"
                className={`input${invalid("budget")}`}
                inputMode="numeric"
                value={form.budgetMin}
                onChange={(e) => update("budgetMin", e.target.value)}
                placeholder={form.budgetType === "daily" ? "e.g., 1500" : form.budgetType === "monthly" ? "e.g., 15000" : "e.g., 20000"}
              />
            </div>
            <div className="field">
              <Label htmlFor="req-budgetMax">Maximum (₹)</Label>
              <input
                id="req-budgetMax"
                className={`input${invalid("budget")}`}
                inputMode="numeric"
                value={form.budgetMax}
                onChange={(e) => update("budgetMax", e.target.value)}
                placeholder={form.budgetType === "daily" ? "e.g., 3000" : form.budgetType === "monthly" ? "e.g., 25000" : "e.g., 35000"}
              />
            </div>
            <div className="field form-grid__full">
              <label className="checkbox">
                <input type="checkbox" checked={form.budgetOpen} onChange={(e) => update("budgetOpen", e.target.checked)} />
                Open to quotes. Freelancers can suggest a price.
              </label>
              {errors.budget ? (
                <span className="field__error">{errors.budget}</span>
              ) : (
                budgetPreview && <span className="field__hint">Freelancers will see: {budgetPreview}</span>
              )}
            </div>
            <div className="field">
              <Label htmlFor="req-deadline">Deadline</Label>
              <input id="req-deadline" className="input" type="date" min={today} value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="req-location">Location</Label>
              <input
                id="req-location"
                className="input"
                maxLength={200}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="Area, city — or leave blank if it doesn't matter"
              />
            </div>
          </div>

          <fieldset className="field choice-field">
            <legend className="field__label">
              Work Arrangement<span className="field__required">*</span>
            </legend>
            <div className="choice-grid choice-grid--3">
              {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => (
                <label key={mode} className={`choice-card${form.workMode === mode ? " choice-card--selected" : ""}`}>
                  <input type="radio" name="workMode" value={mode} checked={form.workMode === mode} onChange={() => update("workMode", mode)} />
                  <span className="choice-card__text">
                    <span className="choice-card__label">{WORK_MODE_LABELS[mode].label}</span>
                    <span className="choice-card__detail">{WORK_MODE_LABELS[mode].detail}</span>
                  </span>
                  <span className="choice-card__radio" aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section step={4} title="Additional Details" description="Anything else that helps freelancers respond well.">
          <div className="field">
            <Label htmlFor="req-additionalInfo">Additional Information</Label>
            <textarea
              id="req-additionalInfo"
              className="textarea"
              rows={3}
              maxLength={3000}
              value={form.additionalInfo}
              onChange={(e) => update("additionalInfo", e.target.value)}
              placeholder="Examples you like, your brand colours, who will be the point of contact…"
            />
          </div>
        </Section>

        <footer className="req-form__footer">
          <span className="req-form__note">Published requirements are visible to freelancers on LeadScout right away.</span>
          <div className="req-form__buttons">
            <button type="button" className="btn btn--secondary" onClick={() => leave(onDashboard)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={publishing}>
              {publishing ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              Publish Requirement
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
