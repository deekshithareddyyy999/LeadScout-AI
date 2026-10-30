# LeadScout AI

B2B SaaS platform that matches business requirements ("requirements") with solution providers through explainable, AI-assisted matching. Humans make every final decision; the AI only evaluates and ranks. Three user domains: **Business / Client**, **Solution Provider**, **Business Intelligence**.

- `frontend/`: React 19 + TypeScript (strict) + Vite 5 + lucide-react + plain CSS with CSS custom properties. This is where all current work happens.
- `backend/`: Express API (TypeScript, CommonJS, run with `tsx`). Start it with `npm run dev` in `backend/` (port 4000). It uses Node's built-in `fetch` for outside APIs.
  - **Every integration is optional.** The server starts with an empty `.env`, and `GET /api/health` reports which keys are configured (booleans only).
  - Secrets go only in `backend/.env`, copied from `.env.example`; `.gitignore` excludes it. The keys are `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `JWT_SECRET`. `config.ts` is the only file that reads them, and they are never sent to the browser or logged.
    - **The user tends to paste keys into `.env.example` or `config.ts` by mistake.** Check both, and move any key to `.env` without printing it.
    - Restart the backend after `.env` changes; `tsx watch` doesn't reload `.env`.
  - Health checks: `GET /api/health/ai` verifies the AI keys with a metadata-only call that spends no tokens. `GET /api/health/db` verifies Supabase.
  - **Gemini:** use `gemini-3.5-flash`. `gemini-2.5-flash` is closed to new users, and `gemini-3.8-flash` returns 503 when it's overloaded, so the code will need a fallback model.
  - `POST /api/places/search` (`routes/places.ts`) proxies Google Places API (New) Nearby Search. It has a tight field mask and maps our category ids to Places types. It returns 503 `not-configured` without a key.
    - **Google Places is the primary data source** (the user's choice, 2026-10-27). New Seeker profiles get `data_source: google` when the key is set (`defaultDataSource()`).
    - Each search makes **two parallel calls**, one ranked by DISTANCE and one by POPULARITY (20 results each), and merges them by id: up to 40 results that cover the whole radius.
    - Verified: 40 results from 0.15 to 4.8 km for Banjara Hills, 5 km, food.
    - **Quality filter** (the user's request, 2026-10-30): the backend drops any place that isn't `OPERATIONAL`. The Location page hides "low-information" Google listings by default (`isLowInformation`: no rating, fewer than `MIN_REVIEWS` = 5 reviews, or no address). A note shows the count with a "Show them" toggle. It runs client-side, at no extra API cost. Verified: 31 shown and 4 hidden for Banjara Hills, 5 km, food.
  - **Database:** Supabase, reached through its **Data API over HTTPS** (`db/supabase.ts` → `rest()`) with the server-only service_role key. The app never opens a direct Postgres connection, so it also works on networks that block ports 5432/6543.
    - The schema is `db/migrations/0002_supabase_schema.sql`: `users`, `seeker_profiles`, `saved_opportunities` and `search_history`.
    - The user runs it manually in Supabase's SQL Editor; the Data API can't run DDL.
    - RLS is on with no policies, so only the secret key can access the tables.
  - **Auth (`routes/auth.ts`, `controllers/authController.ts`):** real accounts.
    - Endpoints: `register`, `login`, `logout` and `me`.
    - Passwords are hashed with bcrypt. The session is an httpOnly `authToken` JWT cookie: 30 days with "Keep signed in", otherwise a session cookie.
    - Domains are `client`, `provider` and `bi`. One account per email, tied to one domain.
    - `requireDomain()` gates per-workspace routes.
  - **`/api/seeker` (`routes/seeker.ts`):** profile, settings, saved items and history for the signed-in Seeker.
    - Every query is scoped to the user id in the cookie.
    - History is capped at 50 entries and skipped when `record_history` is off.
  - **AI opportunity analysis (`POST /api/seeker/analyze`)**, triggered only by the "Analyze opportunity" button in `BusinessDrawer` → `OpportunityAnalysisPanel`:
    1. `services/websiteCheck.ts` makes an SSRF-guarded homepage check (public http(s) hosts only, re-checked on each redirect, 8 s, 400 KB). It records reachability, HTTPS, the mobile viewport, the title and the meta description.
    2. `services/opportunity.ts` holds the **transparent rules**: weighted signals, each mapped to a service (website, website-upgrade, seo, marketing). Only signals matching the seeker's profile skills or title count. Priority is ≥4 high ("Needs attention"), 2–3 medium, otherwise low.
    3. `services/gemini.ts` produces only the summary and the outreach draft, as structured JSON, from those facts. Models: `gemini-3.5-flash`, falling back to `gemini-3.5-flash-lite`, then `gemini-flash-latest`.
    - The prompt forbids invented facts and the phrase "has no website".
    - Results are cached for an hour per user, business and profile, and each user gets 30 fresh analyses an hour.
    - Places search now also returns `rating` and `reviewCount`: same SKU tier, no extra cost.
    - Verified 2026-10-27: no-website bar → "Needs attention"; bistro with a good HTTPS mobile site → "Low priority".
  - **Added 2026-10-30** (the user chose ideas A1, A3, B4–6, B8, D13 and D14):
    - **A1, quick priority:** `POST /api/seeker/quick-priority` runs `quickPriority()`, the same rules on listing facts only, for up to 80 results. There's no website check and no AI, so it's free. It shows as a badge on each result row and powers the "Highest priority" sort. A cached full analysis overrides the quick badge.
    - **A3, established:** `ESTABLISHED_REVIEWS` = 50. Results show an "Established · N reviews" tag. A new `established-weak-site` signal fires when the business has 50+ reviews and its listed website either didn't load or has 2 or more issues.
    - **B, website checks:** `websiteCheck.ts` also records `whatsappLink`, `phoneLink`, `bookingLink`, `orderingLink`, `socialLinks` and `copyrightYear`, read from the homepage HTML. New signals:
      - `no-contact-buttons`
      - `no-ordering` (food categories) or `no-booking` (salon, clinic, gym and similar), chosen by the category text
      - `no-social`
      - `outdated` (copyright year 3+ years old)
      - All are worded "we didn't find", because sites that add links with JavaScript can be missed.
    - **D14, Areas:** `places.addressComponents` (no extra cost) becomes `area`, the neighbourhood. `AreaSummary` adds an Areas tab on the results that groups by area, shows how many need attention and how many have no website listed, and filters the list when an area is clicked. It covers only the current search's results.
    - **D13, lead tracker:** `saved_opportunities` gets `status` (new, contacted, replied, won, lost), `notes` and `follow_up_on` through migration `0003_lead_tracker.sql`, **which the user must run**. `PATCH /api/seeker/saved/:itemId` updates them.
      - The Saved page has status tabs with counts, a status dropdown on each row, follow-up labels (overdue or today), and a `LeadTrackerPanel` in the details drawer (`extra` prop on `BusinessDrawer` and `PostingDrawer`).
      - Before the migration, saving a change returns a 503 that names the migration file.
  - **Networks with TLS inspection:** Node must trust the inspecting root certificate through the `NODE_EXTRA_CA_CERTS` OS environment variable (see `backend/.env.example`). Machine-specific details live in `CLAUDE.local.md`, which is not committed.
  - `npm audit` flags `tar` through bcrypt 5's install-time `node-pre-gyp`. bcrypt 6 fixes it, but that upgrade hasn't been approved yet.
  - **Google terms:** Places results must not be displayed on a non-Google map. The user approved (2026-10-27) showing Google results on a Google map.
    - `components/GoogleOpportunityMap.tsx` loads the Maps JavaScript API with a script tag (no npm package) and draws advanced markers, a circle and an InfoWindow.
    - It's lazy-loaded. `LocationOpportunitiesPage` picks the map from the source of the results on screen.
    - It needs `VITE_GOOGLE_MAPS_BROWSER_KEY` in `frontend/.env.local`. That's a public browser key, restricted to localhost and the Maps JavaScript API. `VITE_GOOGLE_MAPS_MAP_ID` is optional and defaults to `DEMO_MAP_ID`.
    - The Google map is **not yet verified with a real key**. Without the key, Google results show as a full-width list (`bi-locate__body--list`) with no map panel.
- Git repo: pushed to GitHub (personal account). Secrets, `.claude/` and `CLAUDE.local.md` are not committed.

## Commands (run from `frontend/`)

| Purpose | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:5173; `/api` is proxied to :4000) |
| Type check | `npm run typecheck` (`tsc --noEmit`; `noUnusedLocals` and `noUnusedParameters` are on, so unused imports fail) |
| Production build | `npm run build` (type check, then `vite build` into `dist/`) |
| Preview build | `npm run preview` |

There are no tests and no linter. Typecheck, build and visual verification are the only safety nets.

## Hard constraints (do not break without explicit approval)

- **Stack:** no new dependency, UI framework, router, state library, CSS framework (Tailwind, Bootstrap, MUI, etc.), CSS-in-JS or CSS modules. Keep plain CSS, CSS variables, lucide-react, and the custom view-state navigation.
- **Google Stitch is the visual spec.** The user designs every screen in Stitch and shares screenshots. Build to the screenshot. **If no screenshot exists for a screen, ask for one. Do not invent a layout or style.**
- **No generic templates.** Do not add admin-template layouts, arbitrary gradients, glassmorphism, decorative blobs, oversized radii or heavy shadows. App cards in this codebase are flat: a 1px border and no shadow.
- **Do not invent branding.** Do not add new colors, fonts or icons when a reference or an existing token already covers it.
- **Scope:** change only the requested screen or section. Do not replace whole pages, refactor unrelated code, or "simplify" working behavior.
- **Data honesty:** keep mock data clearly separate. Never claim something is backend-connected unless that has been verified. No secrets in browser code. UI auth checks are not security.
- **Target viewports:** 1366×768 and 1920×1080. Check for horizontal overflow, clipped text or buttons, nested scrolling, and oversized headers.

## Required workflow for every screen task

1. **Inspect** the Stitch reference and the existing screen, its components, its CSS and its tokens.
2. **Propose before editing:** list the differences from the reference and the files that will change.
3. **Implement** only that screen or component.
4. **Verify visually:** screenshot it at both viewports (see below), compare with the reference, and fix any differences.
5. **Run** `npm run typecheck` and `npm run build`.
6. **Report:** files changed, design decisions, behavior completed, checks actually run and their results, and remaining discrepancies. Never claim "pixel-perfect" without having looked at a rendered screenshot.

## Visual verification (no extra packages needed)

Chrome is at `C:\Program Files\Google\Chrome\Application\chrome.exe`; Edge is also installed. Node is v21.

- **Landing page:** use `chrome --headless=new --window-size=1366,768 --screenshot=<file> http://localhost:5173`.
- **Inner screens:** these need app state, because navigation is not URL-based. Use a small Node script that drives Chrome over the DevTools Protocol (`node --experimental-websocket`). It loads the page, signs in through the real sign-in form (the backend must be running), sets `sessionStorage["ls.view"]`, reloads, then calls `Page.captureScreenshot`. Injecting `ls.session` no longer works, because auth is real and the AuthProvider deletes that key. Keep the script in the session scratchpad unless the user approves adding it to the repo.
- **Run the script from the Bash tool, not PowerShell.** PowerShell 5.1 strips the double quotes from JSON arguments passed to native programs.
- **Example state:**
  - view: `{"name":"app","domain":"client","page":"applications"}`
  - user: `{"email":"client@leadscout.dev","fullName":"Jordan Blake","organization":"Acme Corp","domain":"client","createdAt":"2026-09-01T00:00:00.000Z"}`
- **Inside the app shell the document does not scroll; `main.app-shell__content` does.** A screenshot only covers the viewport. To check content below the fold, scroll that element or capture more than one screenshot.
- Read the PNG with the Read tool to inspect it.

## Architecture (frontend/src)

- `main.tsx` imports `tokens.css`, then `base.css`, then `layout.css`, and renders `App`.
- **`App.tsx`:** the provider tree is `ToastProvider` > `AuthProvider` > `NavigationProvider` > `Screens`. `Screens` switches on `view.name`.
- **`app/navigation.tsx`:**
  - `View` = `landing | workspace | signin{domain} | app{domain, page: string, requirementId?}`.
  - `go(view)` saves it to sessionStorage `ls.view`.
  - There is no URL routing and no back-button support.
- **`shared/auth/AuthContext.tsx`:** real auth through `/api/auth`, using `shared/api.ts`.
  - On load it calls `/auth/me`; `ready` is false until that returns, and `App` renders nothing for `app` views until then.
  - `login` and `register` are async and return `{ok, error}`.
  - Nothing is stored in the browser except the httpOnly cookie. There are no demo accounts: register a real one.
- **Domain gating:** `App.tsx` renders `SignInPage` for any `app` view whose domain is not the signed-in user's.
- **`shared/domains.ts`:** the `DOMAINS` labels. `WorkspacePage.tsx` duplicates them as literals, so keep both in sync.
- **`domains/client/`:** the Business / Client workspace. **Real data since 2026-10-30.**
  - **Data:** comes from `/api/client` (`backend/src/routes/client.ts`), stored in the `business_profiles`, `postings` and `applications` tables (migration `0004_marketplace.sql`). The demo `seed.ts`, `providers.ts` and the mock `evaluateMatch` are deleted.
  - **Nav:** Dashboard, My Requirements, Applications, **Business Profile** (`BusinessProfilePage`: editable). The page `switch` and the `ACTIVE_NAV` map stay in `ClientWorkspace.tsx`.
  - **Business profile:** an optional "Verified on Google" link. `services/googleBusiness.ts` handles Text Search, then a server-side Place Details read. The rating is refreshed when it's more than 30 days old.
  - **Post Requirement:**
    - A service field (`SERVICE_LABELS`).
    - A **structured budget**: `budgetType` (project, daily or monthly), ₹ `budgetMin`/`budgetMax`, and `budgetOpen` ("Open to quotes"). `shared/utils/money.ts` `formatBudget` formats it.
    - **"Help me write this"** (`POST /api/client/draft`, Gemini): never suggests a price.
    - Attachments were removed: there's no file storage.
  - **Applicants are Seekers.** They apply through `POST /api/postings/:id/apply` with a proposal, an optional ₹ quote and a timeline.
  - **AI matching runs one applicant at a time** (the user's request, 2026-10-30, to save tokens). Each card has a "Run AI match" button (`POST /api/client/applications/:id/match`); there is **no** match-everyone button. Details (`services/applicantMatch.ts`):
    - Rules give the match %, with a `breakdown`: skills 50, experience 15, quote vs budget 15, service fit 10, portfolio 5, proposal 5.
    - Gemini writes the synthesis for that applicant. There's a rules-only fallback. Running it again re-evaluates.
    - Tiers: strong ≥90, good 80–89, partial below 80.
  - **Contact details:** the applicant's email and phone, and the business's contact on the Seeker side, are shared **only once the business shortlists**.
  - **AI cap:** 20 AI actions per business per hour.
  - **Seeker Posted Opportunities is location-first** (the user's request): **nothing shows until a location is chosen**.
    - **The location is typed** (a text input with a `<datalist>` of cities from `postingCities()`, with counts). Typed text matches the posting's city, area or location as a case-insensitive substring. Picking a suggestion applies at once; typed text applies on Search or Enter.
    - Each posting's `city` is the business profile's City, else the last comma part of the posting's location.
    - "Also show remote work from other cities" is on by default.
    - Location searches are recorded in history.
    - `GET /api/postings` lists open and reviewing postings with the business, the verified badge and `myApplication`. `PostingDrawer` has the apply form and shows the application status, plus the business's contact once shortlisted.
- **`domains/bi/`:** the **Seeker** workspace, for individual freelancers finding businesses that may need their services. The domain key stays `bi`; the labels in `shared/domains.ts` say "Seeker". **No demo or sample data, ever:** results come from live sources, and anything not connected shows an honest setup state.
  - `BiWorkspace.tsx` has 8 nav items: Dashboard, Location Opportunities, Posted Opportunities, Saved, My Profile, Search History, Settings, and Sign Out (handled in `navigate`). The avatar opens My Profile.
  - `services/` keeps data access separate from the UI:
    - `geocode.ts`: OSM Nominatim, called only on Search, with results cached for the session. No autocomplete, per Nominatim's policy.
    - `places.ts`: the provider contract. The `osm` provider uses the Overpass API with `around:` radius filtering, a 300-result limit, and a "choose a category beyond 10 km" guard.
      - `queryOverpass` tries three public mirrors in turn, 18 s each: overpass-api.de, private.coffee and kumi.systems.
      - A reply whose `remark` is a runtime error or timeout counts as a failure, never as zero results.
      - If every mirror fails, it shows an "overloaded" error, and failed searches aren't recorded in history.
      - **The public Overpass servers are often down or at capacity:** all three failed on 2026-10-27. Google Places is the dependable source. The `google` provider calls the backend's `POST /api/places/search` and shows the backend's error message (for example "key not configured") as a setup state. If the backend is down, the Vite proxy returns a non-JSON reply, which also shows as a setup state.
    - `postings.ts`: calls `GET /api/postings`, which **doesn't exist yet**, so it shows a setup state.
    - `categories.ts` (category → OSM tags), `geo.ts` (straight-line distance; the default centre is Hyderabad), and `errors.ts` (`ServiceError` kinds).
  - `components/OpportunityMap.tsx` uses react-leaflet with OSM tiles and is lazy-loaded as its own chunk. It shows a radius circle and colored markers (grape = website listed, amber = none listed), opens popups, keeps the list and map in sync, offers "fit to area", and resizes with its container through a ResizeObserver.
    - The tile URL and attribution can be configured with `VITE_MAP_TILE_URL` and `VITE_MAP_TILE_ATTRIBUTION`.
    - The geocoder and Overpass addresses can be changed with `VITE_GEOCODER_URL` and `VITE_OVERPASS_URL`.
  - `store.tsx` loads and saves through `/api/seeker`, per account in the database: the profile (an individual, no company fields), settings (default radius, data source, history on/off), saved items (snapshots of real records the user saved) and real search history.
    - Actions update the screen first and save in the background. On failure they show a toast and re-sync.
    - `BiWorkspace` shows loading and error states until the data has loaded.
  - `BiPages.css` prefixes every class `bi-`. The workspace fonts, sidebar width and title style now live in `layout.css` and apply to every `.app-shell` (see Design system).
  - **Dependencies `leaflet`, `react-leaflet` and `@types/leaflet` were added with the user's approval (Oct 2026).**
  - `App.tsx` routes `client` to `ClientWorkspace`, `bi` to `BiWorkspace`, and anything else (`provider`) to `PlaceholderWorkspace`.
- **Shared components** (`shared/components/`): `AppShell`, `TopBar` (+ `PortalBadge`), `BrandMark` (with `RadarMark`, a small animated radar before the wordmark; the landing `Wordmark` uses it too; styles in `layout.css`, sized per page with `--radar-size`: 40px landing and picker, 36px sign-in, 28px app top bar, 30px on landing below 600px), `Breadcrumbs`, `SelectPill`, `RowMenu`, `Toast` (`notify`, `comingSoon`) and `PlaceholderWorkspace`. `shared/account/ProfilePage` is shared by all domains.

**Adding a page to an existing workspace:**
1. Create `pages/<Name>Page.tsx`.
2. Add a `case` to that workspace's `switch`.
3. Add it to `NAV_ITEMS`, or to `ACTIVE_NAV` if it is a sub-page.

**Replacing the Provider or BI placeholder:**
1. Create `domains/<domain>/<Domain>Workspace.tsx`, modeled on `ClientWorkspace`.
2. Route it in the `App.tsx` ternary that currently renders `PlaceholderWorkspace`.

### Screen status

| Screen | Status |
|---|---|
| Landing | **Redesigned Oct 30, 2026** at the user's request ("grab the audience"). Details below. |
| Workspace picker | **Redesigned Oct 30, 2026.** Details below. |

**Landing details:**
- **Hero:** indigo `#4B0082` band, headline "Where businesses and freelancers find each other."
- **The one animated moment is `landing/ScoutScene.tsx`**, an example search labelled "Example":
  - A radar sweep crosses the search area.
  - Pins pop in, using the real map's colours (lavender = website listed, amber = none listed).
  - An analysis card slides in, then a posted-job ticket.
  - It respects `prefers-reduced-motion`.
- **Sections:** How it works (two numbered columns, for businesses and for freelancers), How the AI is used (three statements), and a closing band.
- **Header:**
  - Links: How it works, For businesses, For freelancers. They scroll, mark the active section and briefly highlight the target column.
  - It gains a hairline once the page scrolls.
  - Signed out: only "Get started" (it leads to the picker, where people sign in; the duplicate "Sign in" link was removed). Signed in: one "Open my workspace" button.
  - The landing page is **full width** (`.landing-container` has no max-width; side padding `clamp(20px, 4.5vw, 88px)`). The header is 80px tall with a 32px wordmark.
- **Removed:** the unused `MatchingDiagram.tsx`, the enterprise copy, "For Solution Providers" and "Schedule a Demo".

**Workspace picker details:**
- Title: "How will you use LeadScout?"
- Two whole-card buttons with small art panels, a hover or focus lift, and accurate feature lists.
- **Only true claims in the footer.** SOC 2, NDA, "Network Live", the language menu, "Contact Sales" and "Architecture Brief" were removed.
- `ChoiceArt` (the art panels) lives in `workspace/ChoiceArt.tsx`, with its styles in `WorkspacePage.css`, and is reused on the sign-in page.

**Sign-in page (redesigned Oct 30, 2026):**
- **Two panels.** Left: an indigo side panel with the logo, "Back to home", a message for the chosen side (heading, three points and `ChoiceArt`) and "Choose a different side". Right: the form.
- **Removed:** the fake `LiveBadge` (deleted from `TopBar.tsx`), Docs, Support and "Forgot password?" (there's no password reset). The submit button now reads "Sign in" or "Create account", so **test scripts must click those, not "Continue"**.
- `.segmented` and `.checkbox` stay defined in `SignInPage.css`; other pages use them.
| Sign-in / Register (all domains) | Complete. Real accounts in Supabase through the backend. Redesigned with two panels (Oct 30, 2026) |
| Client: Dashboard, My Requirements, Post Requirement, Applications, Business Profile | Real data through `/api/client` (Oct 30, 2026). Needs migration `0004_marketplace.sql` |
| Profile (shared) | Partial (read-only) |
| Provider workspace | Placeholder, waiting on Stitch designs |
| Seeker workspace (`bi`) | Location-Based Opportunities **works with live OpenStreetMap data** on a real Leaflet map. The Google Places provider goes through the backend proxy and needs `GOOGLE_PLACES_API_KEY`. It was verified with a real key on 2026-10-25: 20 results, nearest first. In dense areas all 20 can fall within a few hundred metres. Postings-Based Opportunities shows a setup state until `GET /api/postings` exists. Saved, My Profile, Search History and Settings are saved per account in Supabase. The code is done; verify it end to end once the user has run the schema SQL. |

## Design system as implemented (match these before adding anything new)

**The whole app uses the Stitch "Editorial Precision" system** from the landing-page export's `DESIGN.md` (applied to every screen in Oct 2026, at the user's request). It has warm off-white canvases, carbon text, 1px hairline borders, deep-teal accents and no drop shadows. The Landing page keeps its own copy of the same values as `--lp-*` variables in `LandingPage.css`. Every other screen uses `shared/styles/tokens.css`.

- **Signed-in workspaces (everything inside `.app-shell`: Client, Seeker, Provider and the shared Profile) use Geist + Geist Mono** (Oct 2026, at the user's request, to match the Seeker workspace). `layout.css` redefines `--font-sans` and `--font-serif` as Geist and `--font-mono` as Geist Mono under `.app-shell`. It also sets a 236px sidebar and 24px/600 page titles. The brand wordmark keeps Newsreader.
- **Fonts outside the app shell** (Landing, workspace picker, sign-in), from the Google Fonts link in `index.html`:
  - `--font-serif`: Newsreader. Use it for page titles, card and entity names, stat values and empty-state titles.
  - `--font-sans`: Hanken Grotesk. Use it for all interface text. Body text is 14px.
  - `--font-mono`: JetBrains Mono. Use it for labels, statuses, badges, scores, chips, table headers and counters, usually 11px.
- **Colors** (`tokens.css`):

  | Group | Tokens |
  |---|---|
  | Canvas | bg `#fbfbfa`, bg-tint (warm) `#faf9f6`, stone (sidebar, table head, footers) `#f8f7f4` |
  | Surface | surface `#fff`, surface-muted `#f4f3ee` |
  | Border | border `#e5e5e2`, border-strong `#d8d8d3` |
  | Text | text `#1a1c1e`, muted / nav `#3e4947`, subtle `#6e7977` |
  | Carbon (primary buttons, toasts) | `--color-carbon #141618`, hover Indigo `#4b0082` |
  | Accent (**trial, Oct 2026**: Grape + Indigo, replacing teal) | `--color-primary #6f2da8` (Grape), hover `#4b0082` (Indigo), soft `#f6f0fb`, line `#e6d6f3`, strong-line `#d0b5ea`. The previous teal values are kept in a comment in `tokens.css` and `LandingPage.css`. The Landing page's `--lp-teal*` variables now hold the grape values |
  | Success | `#0f766e` on the teal soft and line colors |
  | Warning | `#b45309` on `#fef3c7`, border `#fde68a` |
  | Danger | `#991b1b` on `#fff5f5`, border `#fee2e2` |
  | Neutral badge | `#f4f3ef` with border `#d8d5cd` |

  Primary buttons are carbon, not teal. Teal is for active states, highlights, links and verified or match signals.
- **Radii:** `--radius-sm` and `--radius-md` are 4px (buttons, inputs, chips). `--radius-lg` is 8px (cards, menus). `--radius-pill` is **4px**: badges are deliberately rectangular. Circles use a literal `50%`.
- **Shadows:**
  - `--shadow-card`: `0 2px 12px rgba(20,22,24,.04)`, used only for the sign-in card and menus.
  - `--focus-ring`: `0 0 0 1px` teal (no glow). It is used on inputs.
  - Buttons get a 2px teal outline on keyboard focus (`base.css`).
- **No spacing tokens exist.** Spacing values are raw px. Page title is serif 30px/400; subtitle is 14px muted.
- **Layout:**
  - Top bar 64px (sticky), background `#fbfbfa`.
  - Sidebar fixed at 236px in every workspace (the base rule says 208px; `.app-shell .sidebar` overrides it), with an Indigo `#4b0082` background (`--color-sidebar`) and white text. The active item is filled Grape with a 3px lavender left rule. Inside the sidebar, focus outlines are white.
  - `.page` has padding `24px 28px 32px`. **Inside `.app-shell` (both workspaces) every page is full width** (`max-width: none`, no centring; the user's request, Oct 2026), including `.page--narrow` and `.page--form`. Outside the app shell, `.page` keeps its 1320px cap.
  - The only width breakpoints are on the Landing page.
- **Buttons:** `.btn` is 38px tall with a 1px border.
  - `--primary`: carbon.
  - `--secondary`: white, border-strong; hover adds a carbon border.
  - `--soft`: teal wash with a teal line border.
  - `--danger-outline`.
  - Sizes: `--sm` 32px, `--lg` 46px. Also `--block`, `--link`, and `.icon-btn` (32px).
- **Forms:** `.field__label` is 13px/600.
  - `.input` and `.textarea` are 38px tall with a border-strong border and 4px radius.
  - Focus gives a teal border plus a 1px teal ring. Invalid uses `.input--invalid` (textareas use it too).
  - Other controls: `.select-pill` (34px), `.search-input`, `.choice-card` (radio: teal ring with a 6px dot), `.tag-input`, `.segmented`, `.checkbox`.
- **Tables:** `.table` headers are mono, uppercase, on a stone background over a 1px carbon rule. Row hover uses a stone background plus a 2px teal left rule.
- **Primitives:** `.card`, `.pill` (`--live`, `--primary`), `.status--{status}`, `.match-badge--{tier}`, `.chip`, `.tag`, `.notice` (warning only), `.empty-state`, `.table`, `.menu`, `.toast`, `.spin`.

## Gotchas when implementing Stitch screens

- **All CSS is global.** Page CSS files are imported statically and load everywhere.
  - Give new screens **prefixed class names** (`.provider-dash__*`, etc.).
  - Never redefine `.card`, `.btn`, `.page`, `.input`, `.status`, `.chip`, `.table`, `.notice`, `.icon-tile`, `.spin` and similar shared classes.
  - Add modifiers rather than changing base values; Client screens depend on them.
- **Some class names are built at runtime:** `status--${status}`, `match-badge--${tier}`, `toast--${tone}`. Grep will not find their usages.
- **Hidden cross-file dependency:** `.icon-tile` lives in `RequirementsTable.css` but `ApplicationCard` uses it too. Do not move or split that file casually.
- **Focus rule:** the global `button:focus-visible` rule (`base.css`) draws a 2px teal outline with a 2px offset. It no longer changes border-radius or box-shadow.
- **Shared chrome:** `AppShell` chrome (the "Overview" label, Docs/Support, avatar, account card) is shared by every domain. Make per-domain changes optional props.
- **Stored data shape:** changing the `Requirement` or `Application` shape requires bumping the `ls.client.v1` key, or old session data will break rendering.
- **Unknown provider ids:** `getProvider()` throws on an unknown id, which crashes the whole Client workspace.
- **Toast placeholders:** "Coming soon" buttons call `comingSoon(...)`. Replace them on purpose when a real destination exists.
- **Client workspace data is real and per account** (`/api/client`). The old `ls.client.v1` session key is deleted on load.
