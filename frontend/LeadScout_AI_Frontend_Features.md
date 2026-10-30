# LeadScout AI — Frontend Feature Specification

> **Purpose:** Define the frontend screens, features, interactions, and UI states to implement before backend integration.
>
> **Current approach:** Build and validate the UI using clearly identified mock data and local frontend state. Do not pretend that mock actions are connected to a backend. Later, replace mock data/actions with API calls without redesigning the screens.
>
> **Stack constraints:** Reuse the existing React + TypeScript + Vite setup, lucide-react, custom CSS, CSS variables/design tokens, and existing navigation approach. Do not add a UI framework, router, or state-management library without approval.

## 1. Product workflows

### Workflow A — Personalized Opportunity Discovery
Users maintain a profile and discover relevant jobs, companies, and selected business opportunities. Results should support search, filters, sorting, saving, details, and explainable match information.

### Workflow B — Business Requirement-to-Solution Matching
Clients publish business requirements. Solution providers browse requirements and submit proposals. Clients compare proposals and make final shortlist decisions.

### Business Intelligence
Treat this as a lightweight company/opportunity insights area using the same opportunity data—not a separate, unrelated product. Keep advanced analytics as a later enhancement.

---

## 2. Shared application shell

### Global UI
- [ ] Consistent header/navigation and page layout.
- [ ] LeadScout AI logo/wordmark and active page indicator.
- [ ] User profile menu with profile/settings access and sign-out.
- [ ] Consistent buttons, inputs, selects, cards, badges, modals, tabs, and pagination.
- [ ] Toasts or inline feedback for successful/failed frontend actions.
- [ ] Loading, empty, error, disabled, and success states.
- [ ] Responsive behavior without breaking the approved desktop design.
- [ ] Keyboard focus states, labels, readable contrast, and accessible control names.
- [ ] Reusable confirmation dialog for destructive actions.
- [ ] No fake operational indicators, fake metrics, or excessive “coming soon” content.

### Navigation
- [ ] Keep navigation consistent with the existing custom view-state approach.
- [ ] Show only relevant sections for the selected workspace/role.
- [ ] Provide a clear way to return to the workspace selector if that is part of the approved flow.
- [ ] Handle unknown/unavailable views gracefully.
- [ ] Preserve the existing navigation implementation unless the repository audit reveals a concrete issue.

---

## 3. Landing page

- [ ] Clear headline explaining opportunity discovery and requirement-to-solution matching.
- [ ] Short supporting description; avoid long blocks of marketing text.
- [ ] Primary call to action to get started/sign in.
- [ ] Secondary action to explore how the platform works, if needed.
- [ ] Concise explanation of the two core workflows.
- [ ] A small, purposeful preview of the product if supported by the approved design.
- [ ] Footer with wordmark and copyright; avoid large grids of placeholder links.
- [ ] Responsive layout and checked typography/spacing at 1366×768 and 1920×1080.
- [ ] No fake latency/status claims or unsupported AI-performance claims.

---

## 4. Workspace selection

Provide a clear entry point into the appropriate workflow.

- [ ] **Opportunity Discovery** — find jobs, companies, and selected business opportunities.
- [ ] **Business / Client** — post requirements and review provider proposals.
- [ ] **Solution Provider** — browse requirements and submit proposals.
- [ ] **Business Intelligence** — company/opportunity insights, if retained as a separate visible workspace.
- [ ] Brief explanation of each workspace.
- [ ] Selected/hover/focus states for workspace cards.
- [ ] Clear continue action.
- [ ] Role-aware navigation after a workspace is selected.
- [ ] Avoid presenting unfinished sections as fully functional.

**Product decision to confirm:** whether a user chooses a workspace every session or whether the account role determines the default workspace. The frontend can support the chosen behavior with mock state for now.

---

## 5. Authentication UI

### Sign up
- [ ] Name, email, password, and confirm-password fields as required by the current design.
- [ ] Password visibility toggle.
- [ ] Required-field and format validation.
- [ ] Password mismatch feedback.
- [ ] Terms/privacy acknowledgement only if the project requires it.
- [ ] Loading and success/error states.
- [ ] Link to sign in.

### Sign in
- [ ] Email and password fields.
- [ ] Password visibility toggle.
- [ ] Validation and error message area.
- [ ] Loading state.
- [ ] Link to sign up.
- [ ] Optional “forgot password” UI only if reset flow will be implemented.

**Frontend-only stage:** simulate successful and failed states clearly. Do not store real passwords in localStorage or claim authentication is secure before backend integration.

---

## 6. Profile and preferences

### Personal opportunity profile
- [ ] Basic information.
- [ ] Skills as removable tags/chips.
- [ ] Qualifications/education.
- [ ] Experience level and relevant experience.
- [ ] Preferred roles and opportunity categories.
- [ ] Preferred location(s).
- [ ] Remote, hybrid, or on-site preference.
- [ ] Optional salary/compensation preference if appropriate.
- [ ] Save, cancel, and unsaved-changes behavior.
- [ ] Profile completion indicator only if its calculation is meaningful.
- [ ] Clear validation and empty states.

### Solution provider profile
- [ ] Provider/company name and short description.
- [ ] Capabilities/services and skill tags.
- [ ] Relevant experience and portfolio/project examples.
- [ ] Budget/rate range, if relevant.
- [ ] Availability and typical delivery timeline.
- [ ] Service location/remote availability.
- [ ] Edit and preview profile.

### Client/business profile
- [ ] Business name and description.
- [ ] Industry/category.
- [ ] Website/contact details as appropriate.
- [ ] Location.
- [ ] Edit and preview profile.

Keep profile fields appropriate to the selected workflow. Avoid asking every user for irrelevant information.

---

## 7. Opportunity Discovery

### Discovery landing/dashboard
- [ ] Welcome/summary area.
- [ ] Search input with a clear search action.
- [ ] Search by role, skill, company, or opportunity keyword.
- [ ] Filter panel or toolbar.
- [ ] Recommended opportunities section.
- [ ] Recent/new opportunities section only if data supports it.
- [ ] Saved opportunities shortcut.
- [ ] Profile-completion prompt when profile information is missing.
- [ ] Empty state for a new user.

### Filters
- [ ] Opportunity type: job, company, or business opportunity.
- [ ] Skills/capabilities.
- [ ] Category/industry.
- [ ] Location.
- [ ] Remote/hybrid/on-site.
- [ ] Experience/qualification level where data exists.
- [ ] Compensation range only where data exists.
- [ ] Clear all filters.
- [ ] Visible active-filter chips.
- [ ] Sorting: relevance, newest, and other options only when supported by data.

### Opportunity cards
Each card should show only fields available in the dataset:
- [ ] Title/opportunity name.
- [ ] Company name.
- [ ] Category/type.
- [ ] Location/work mode.
- [ ] Short description.
- [ ] Key skills/capabilities.
- [ ] Posted/updated date if available.
- [ ] Match score or match label when calculated.
- [ ] Save/unsave control.
- [ ] View details action.
- [ ] Official external link where available.

### Opportunity detail page/panel
- [ ] Full description.
- [ ] Company details.
- [ ] Required skills/qualifications.
- [ ] Responsibilities or expected outcomes where relevant.
- [ ] Location and work mode.
- [ ] Compensation/budget information when available.
- [ ] Official website/application link.
- [ ] Match explanation.
- [ ] Matched skills and preferences.
- [ ] Missing/unverified criteria shown neutrally.
- [ ] Save/unsave action.
- [ ] Back to results while preserving filters.

### Recommendation explanation panel
- [ ] Overall score/label with a clear note that it is an estimate of relevance.
- [ ] Score components or matching criteria.
- [ ] Evidence such as matched skills and compatible preferences.
- [ ] Gaps or missing information.
- [ ] No unsupported “AI guarantees this is the best job” claims.

### Saved opportunities
- [ ] Saved list.
- [ ] Remove from saved list.
- [ ] Open details.
- [ ] Empty state.
- [ ] Filters/sorting if the list becomes large.

---

## 8. Business / Client workspace

### Client dashboard
- [ ] Summary cards for active requirements, proposals received, and shortlisted proposals—using real mock counts, not arbitrary numbers.
- [ ] Recent requirements list.
- [ ] Requirement status labels: draft, open, paused, closed, if those states are supported.
- [ ] Proposal activity summary.
- [ ] Primary action to create a requirement.
- [ ] Empty state guiding a first-time client.

### Create/edit requirement form
- [ ] Requirement title.
- [ ] Problem statement/current challenge.
- [ ] Desired outcome/success criteria.
- [ ] Required capabilities/skills as tags.
- [ ] Industry/category.
- [ ] Budget range or budget flexibility.
- [ ] Expected timeline/deadline.
- [ ] Location/remote preference if relevant.
- [ ] Optional attachments only if upload support is planned.
- [ ] Draft/save, preview, publish, and cancel actions as appropriate.
- [ ] Field-level validation.
- [ ] Unsaved changes warning.
- [ ] Confirmation before closing/deleting a requirement.
- [ ] Clear distinction between draft and published requirement.

### My requirements
- [ ] List/table of the client's own requirements.
- [ ] Search/filter by status.
- [ ] Status and proposal count.
- [ ] View/edit requirement.
- [ ] Open/close/pause actions if implemented.
- [ ] Empty state.
- [ ] Confirmation for destructive/status-changing actions.

### Requirement details and proposals
- [ ] Requirement summary and criteria.
- [ ] List of submitted proposals.
- [ ] Sort by match score, submission date, or budget only when data is available.
- [ ] Proposal cards with provider name, summary, capabilities, relevant experience, budget, and timeline.
- [ ] Explainable match score and component breakdown.
- [ ] Matched capabilities and gaps.
- [ ] Full proposal detail.
- [ ] Shortlist and reject actions with visible status.
- [ ] Confirmation/feedback after an action.
- [ ] Empty state when no proposals have been received.
- [ ] Do not automatically finalize a provider on behalf of the client.

---

## 9. Solution Provider workspace

### Provider dashboard
- [ ] Summary of available requirements, submitted proposals, and proposal statuses.
- [ ] Recommended requirements.
- [ ] Recent requirements.
- [ ] Quick access to provider profile.
- [ ] Empty state for a new provider.

### Browse requirements
- [ ] Search requirements by keyword.
- [ ] Filter by category, required capabilities, budget, timeline, and location/remote preference where data exists.
- [ ] Sort by relevance, newest, and other supported fields.
- [ ] Requirement cards with title, client/business, summary, required capabilities, budget/timeline, and match explanation.
- [ ] Saved requirements only if the feature is included.
- [ ] Clear empty/no-results state.

### Requirement detail
- [ ] Full problem statement.
- [ ] Desired outcome and required capabilities.
- [ ] Budget and timeline.
- [ ] Client information that the provider is permitted to see.
- [ ] Why the requirement may fit the provider.
- [ ] Submit proposal action.
- [ ] Clear closed/unavailable state.

### Submit proposal
- [ ] Proposed approach/solution.
- [ ] Relevant experience and evidence.
- [ ] Capabilities addressed.
- [ ] Estimated cost/budget.
- [ ] Estimated timeline.
- [ ] Optional supporting links/portfolio.
- [ ] Review before submit.
- [ ] Validation and success/error state.
- [ ] Prevent accidental duplicate submission if that is the intended rule.
- [ ] Do not allow edits after submission unless the product rules permit them.

### My proposals
- [ ] List submitted proposals.
- [ ] Requirement title and submission date.
- [ ] Status: submitted, shortlisted, rejected, withdrawn, or other agreed statuses.
- [ ] View proposal details.
- [ ] Edit/withdraw only if supported by the agreed workflow.
- [ ] Empty state.

---

## 10. Business Intelligence / insights

Keep this lightweight and dependent on available data.

- [ ] Company/opportunity directory.
- [ ] Search and category/location filters.
- [ ] Company detail view.
- [ ] Basic counts by category/location only if calculated from the available dataset.
- [ ] Recent opportunities or companies.
- [ ] Simple charts only when they answer a useful question.
- [ ] Explain the source and date range for displayed figures.
- [ ] Empty state if data is insufficient.
- [ ] Avoid claiming future trends or predictive insights without evidence.

This workspace should not delay the two core workflows or the recommendation evaluation.

---

## 11. Optional conversational AI UI

Implement only after the core workflows are stable.

- [ ] Chat panel/page with a clear input and send action.
- [ ] Suggested example questions.
- [ ] Conversation loading state.
- [ ] Display relevant opportunity cards alongside answers.
- [ ] Clarifying questions for ambiguous searches.
- [ ] Ground answers in records and match evidence.
- [ ] Clear “no relevant results found” state.
- [ ] Error/fallback state when the AI service is unavailable.
- [ ] Never display fabricated facts or pretend the model searched external sources when it did not.
- [ ] Keep API secrets out of frontend code.

---

## 12. Location UI

Initial version:
- [ ] Location filter.
- [ ] Remote/hybrid/on-site preference.
- [ ] Display location clearly on cards and details.
- [ ] Handle records with missing location.

Optional later:
- [ ] Map with opportunity/company pins.
- [ ] List-to-map selection behavior.
- [ ] Loading and map-service error states.
- [ ] Legend and accessible alternative list.
- [ ] Only show coordinates from a permitted and sufficiently reliable source.

Do not build advanced GIS features unless time and data allow.

---

## 13. Shared UI states and interaction requirements

For each screen/form/list, implement:
- [ ] Initial state.
- [ ] Loading state where asynchronous behavior is simulated or later expected.
- [ ] Empty state.
- [ ] No-results state.
- [ ] Validation errors.
- [ ] General error state.
- [ ] Success feedback.
- [ ] Disabled/in-progress button states.
- [ ] Confirmation for destructive actions.
- [ ] Keyboard focus and accessible labels.
- [ ] Responsive layout.
- [ ] Consistent date, currency, and score formatting.
- [ ] Pagination or “load more” if the expected dataset size needs it.

---

## 14. Frontend-only phase: mock data and state

Until backend work begins:
- Use a central, typed mock-data layer rather than scattering hardcoded records throughout components.
- Keep mock data clearly labelled and realistic enough for demos.
- Use frontend state for interactions such as filters, sorting, saving, requirement forms, and proposal flows.
- If persistence is needed for a prototype, use a deliberate mock adapter; avoid storing passwords or secrets in browser storage.
- Keep UI components independent from the data source so API integration can replace mock adapters later.
- Do not display fake success for an operation that has not actually been simulated.
- Do not label mock data as live, verified, or real.
- Use stable IDs in mock records.
- Create enough sample data to test empty, partial, full, matching, and no-match states.

Suggested frontend folders only if compatible with the existing project:
- `components/` — shared controls and layout.
- `pages/` or existing screen structure — top-level views.
- `features/discovery/`
- `features/client/`
- `features/provider/`
- `features/profile/`
- `features/insights/`
- `data/` — typed mock data.
- `types/` — shared TypeScript types.
- `services/` — data-access interfaces/adapters, initially mocked.
- `utils/` — formatting and UI helpers.

Do not reorganize the repository just to match these names. Inspect the existing structure first.

---

## 15. Recommended frontend implementation order

1. Audit existing screens and interactions; mark complete/partial/missing.
2. Finalize navigation and workspace selection behavior.
3. Define shared TypeScript types and typed mock-data contracts.
4. Complete shared components and common loading/empty/error states.
5. Complete profile forms.
6. Complete Opportunity Discovery: search, filters, cards, details, save, explanation.
7. Complete Client workflow: create/manage requirements, view/compare proposals, shortlist.
8. Complete Provider workflow: browse requirements, submit proposals, track status.
9. Complete lightweight Business Intelligence only if retained in the MVP.
10. Add responsive/accessibility pass and test at 1366×768 and 1920×1080.
11. Validate all flows with mock data and record what is intentionally mocked.
12. Then design the backend API contracts and replace the mock data adapter with API integration.

Do not polish every pixel before the workflows work end to end. Preserve the existing custom design and focus on functional completeness.

---

## 16. Frontend definition of done

- [ ] Every P0 workflow can be demonstrated end to end with mock data.
- [ ] Navigation does not lead to dead or misleading screens.
- [ ] Search, filters, sorting, and clear-filter behavior work.
- [ ] Forms validate inputs and show helpful errors.
- [ ] Save/unsave, submit proposal, and shortlist interactions work in the prototype.
- [ ] Match explanations display real computed mock component values, not arbitrary scores.
- [ ] Loading, empty, no-results, success, and error states are present where needed.
- [ ] Mock data and UI are separated cleanly enough for backend integration.
- [ ] No secrets or passwords are stored in browser storage.
- [ ] Existing typecheck/build passes.
- [ ] Desktop layouts are checked at 1366×768 and 1920×1080.
- [ ] Existing custom visual design is preserved.
- [ ] Mocked features are documented and not represented as backend-connected.

## 17. Instructions for Claude Code

Before making frontend changes:
1. Inspect the existing repository and screenshots.
2. Map existing screens to this specification.
3. Report which features already work, are partially implemented, are placeholders, or are missing.
4. Identify the smallest set of changes needed to complete the frontend MVP.
5. Recommend an implementation order and files likely to change.
6. Do not edit files until the owner approves the audit and first bounded task.

When approved, implement one screen or feature group at a time. Preserve working code, existing design tokens, approved Stitch references, and the current stack. Do not perform broad rewrites or add dependencies without justification. After each task, report changes, checks run, and remaining mock/backend dependencies.

**Guiding principle:** Finish the UI flows and interaction contracts first, keep mock data isolated, then connect the same screens to the backend without rebuilding the frontend.
