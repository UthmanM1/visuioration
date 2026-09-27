# Visuioration

**Turn complex data into clear decisions.**

Visuioration is an AI-assisted data visualization application: import business data, chart it, build dashboards, ask questions answered from database queries, and turn the results into reports and share links. It runs in **live mode** on Supabase (Postgres, Auth, Storage) and, optionally, the Anthropic API; or, when deliberately enabled, in a **demo mode** with fictional sample data.

> **Three modes.** **Live** when Supabase is configured: real accounts, workspaces and data, protected by row level security. **Demo** only when `NEXT_PUBLIC_DEMO_MODE=true` (or under `npm run dev` without Supabase): fictional "Northstar Retail Group" data and no sign-in. **Unconfigured** production builds (no Supabase, no demo opt-in) return HTTP 503 for workspace routes. See [Capability status](#capability-status) for what is implemented, demo-only or not yet available.

---

## Features

**Marketing site** — home, solutions (4 pages), industries (4 pages), customers (demo case studies), resources (6 articles), pricing with monthly/annual toggle, about, contact form with validation and success state, technology (demo vs production architecture), and a portfolio case study.

**Authentication (demo)** — login with published demo credentials, "Continue with demo workspace", sign-up, forgot password, and a six-step onboarding flow ending in "Your workspace is ready."

**Product workspace (`/app`)**
- Dashboard with KPI cards (vs FY25), revenue chart with 7D/30D/90D/12M ranges, interactive regional panel, top products and AI highlights.
- Projects: list, status filters, search, empty states and a create-project modal; project workspace with Overview / Data / Visualizations / Insights / Reports tabs.
- Datasets: dataset library with Ready / Refreshing / Needs review states, import dialog (CSV, Excel, Google Sheets, API) with progress, success and error states; dataset detail with search, filters (sheet on mobile), sortable columns, pagination, column profiling and a simulated "Analyze dataset" action.
- Visualization builder: click or drag dimensions and measures onto axes, 8 chart types (line, bar, area, donut, scatter, table, KPI, heatmap), group by, aggregation, filters, date range, title/description, save. Opens pre-configured from any saved chart.
- Visualization library: create, edit, add to dashboard, duplicate, rename and delete (with confirmation).
- AI Insights: "Visuioration Intelligence" chat with recommended questions, typing state, answers with evidence charts, sources and follow-ups; detected insight list; insight detail pages with impact, drivers, evidence, contributing factors, data points, recommended investigation and activity.
- Reports: library, section-based report builder (add, remove, reorder, preview) and a seven-page Q2 Executive Performance Review with charts, tables and page numbers. Share dialog, PDF export (print-to-PDF) and presentation mode with keyboard navigation.
- Public shared report at `/share/q2-performance` with its own layout, "Powered by Visuioration", share, download and presentation mode.
- Shared items, team management with add-member modal, and settings (workspace, profile, notifications, security, members, data, integrations, billing).
- Command palette (⌘K / Ctrl+K) and grouped search (`/`), notifications menu, workspace switcher, and a first-visit product tour (desktop).

**Quality** — responsive from 375 px to 1440 px+, keyboard accessible dialogs with focus trapping, screen-reader data tables for every chart, change indicators that never rely on colour alone, reduced-motion support, print styles, loading/error/empty/partial states, SEO metadata, canonical URLs, Open Graph image, sitemap, robots and JSON-LD.

## Tech stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript (strict) · Tailwind CSS 3 · Recharts 2 · Lucide icons · Supabase (Auth, PostgreSQL, Storage) via `@supabase/ssr` · pdf-lib (server-side PDFs) · exceljs and papaparse (file parsing) · Anthropic Messages API (optional) · ESLint 9 · pgTAP and Playwright tests

## Project structure

```
app/
  (marketing)/            Marketing pages with shared header/footer
  (auth)/                 Login, signup, forgot password, reset password
  auth/callback/          Handles links from Supabase auth emails
  onboarding/             Workspace setup flow
  app/                    Product workspace (auth required in live mode)
  share/[slug]/           Public shared report
components/               UI, charts and feature components (no database access)
lib/
  actions/                Server actions: validate input, check the session, call services
  services/               Service layer. Each service has a demo and a live implementation
  supabase/               Config, server/browser/admin clients, session helper, database types
  security/               Content-Security-Policy builder
  rate-limit.ts           Postgres-backed rate limiting
  datasets/               File reading, type detection, profiling and row normalisation
  visualizations/         Chart definitions, validation and result shaping (shared by client and server)
  dashboards/             Widget layout types, sizes and helpers (shared by client and server)
  ai/                     AI pipeline: schema description, query plans, validation, evidence, number verification, Claude client
  reports/                Report sections (shared by client and server) and the server-side PDF renderer
  demo-data/              Sample data used in demo mode and for not-yet-migrated pages
  session-types.ts        Session and workspace shapes shared by server and client
proxy.ts                  Per-request CSP nonce, session refresh, route guards, 503 when unconfigured
supabase/migrations/      Database schema, Row Level Security policies and storage bucket
```

## Demo mode

> **Demo mode is opt-in in production.** It runs only when `NEXT_PUBLIC_DEMO_MODE=true`, or automatically during local development (`npm run dev`). A production build without Supabase and without that flag closes the workspace with HTTP 503 rather than silently serving an open demo. See `PRODUCTION_AUDIT.md`.

These apply when Supabase is not configured.

| | |
|---|---|
| Demo login | `demo@visuioration.example` / `demo` |
| Shortcut | "Continue with demo workspace" on `/login`, or open `/app` directly |
| Sample report | `/app/reports/q2-executive-review` |
| Shared report | `/share/q2-performance` |
| Import error state | In the import dialog, choose Google Sheets or API and use a URL containing `fail` |
| Replay product tour | Help menu (?) → Replay product tour |

In demo mode `/app` is open without signing in so reviewers can explore immediately. In live mode it requires an account.

## Architecture

**Layers.** UI components never query the database. They call **server actions** (`lib/actions`), which validate input, resolve the signed-in user and active workspace, and call **services** (`lib/services`). Services talk to Supabase through a server-side client that runs as the signed-in user, so every query is subject to Row Level Security. The service role key is never used.

```
Component → Server action → Service → Supabase (RLS) → PostgreSQL / Storage
```

**Modes.** `lib/supabase/config.ts` sets `appMode` to `live` when `NEXT_PUBLIC_SUPABASE_URL` and a public key are present, otherwise `demo`. Each service keeps one interface, for example `projectService.list(workspaceId)`, and branches internally, so pages work identically in both modes.

**Workspaces.** Every business record belongs to a workspace. Each workspace has a unique, URL-safe `slug` generated from its name (for example `acme-analytics-3f9k2a`) that stays stable when the workspace is renamed. `workspace_members` holds each person's role:

| Role | Can do |
|---|---|
| `owner` | Everything, including deleting the workspace. Cannot be demoted or removed by others. |
| `admin` | Manage members, roles and workspace settings; edit all content. |
| `member` | Create and edit projects, datasets, visualizations and reports. |
| `viewer` | Read everything in the workspace; change nothing. |

The active workspace is stored in an HTTP-only cookie and validated against the user's memberships on every request. A workspace with no members left (for example after its only user deletes their account) is removed automatically.

**Supabase clients** (`lib/supabase/`):

| File | Used by | Purpose |
|---|---|---|
| `server.ts` | Services, server actions, route handlers | Runs as the signed-in user; all queries go through RLS |
| Session and security | `proxy.ts` | Sets the per-request CSP, refreshes the session cookie, redirects signed-out visitors |
| `client.ts` | `AuthListener` in the app shell | Browser client for auth events only (sends a tab to login when the session ends elsewhere). Components do not query data with it |
| `config.ts` | Everywhere | Reads the public URL and key and decides demo or live mode |
| `database.types.ts` | Clients | Types for the schema |

**Schema.** Phase 1 tables: `profiles` (id, full_name, avatar_url, email, job_title, created_at, updated_at), `workspaces` (id, name, slug, description, created_by, created_at, updated_at) and `workspace_members` (workspace_id, user_id, role, created_at). The migration also creates the tables later phases will use (`datasets`, `projects`, `visualizations`, `dashboards`, `reports`, `shares`), all workspace-scoped with RLS.

**Auth.** Supabase Auth with email and password. Signing up fires a database trigger that creates the profile, a personal workspace and the owner membership. `proxy.ts` refreshes the session and redirects signed-out visitors away from `/app`, `/onboarding` and `/reset-password`. Email links (confirmation, password reset) land on `/auth/callback`, which only redirects to same-site paths.

### Migration status

| Area | Live mode |
|---|---|
| Sign up, log in, password reset, sign out | Supabase Auth |
| Workspaces, switching, creating, settings | Database |
| Profile | Database |
| Team members (list) | Database |
| Projects (list, view, create) | Database |
| Datasets: CSV and XLSX upload, schema detection, preview, delete, status | Storage + database |
| Google Sheets and API sources | Later phase (shown as coming soon) |
| Visualizations: builder, saved charts, aggregations, filters, date ranges | Database (queries run in Postgres) |
| Dashboards: create, add, remove, resize and reorder widgets, save, switch, default | Database |
| AI Insights: questions answered from your data with evidence, charts and follow-ups | Claude API + database (optional; needs `ANTHROPIC_API_KEY`) |
| Reports: sections, embedded live charts, presentation, PDF export | Database + server-side PDF |
| Share links with expiry and revocation | Database (snapshot served by `get_shared_report`) |
| AI insight detail pages | Later phase (sample data shown) |
| Share links | Phase 4 (sample report shown) |
| Member invitations | Later phase |
| AI insights | Later phase (simulated assistant) |

The schema for all of these tables already exists, with RLS, so later phases only add services.

## Setting up Supabase (live mode)

1. **Create a project** at [supabase.com](https://supabase.com). Note the project URL and the anon (or publishable) key under Project Settings → API.
2. **Run the migrations, in order.** Open SQL Editor → New query and run each file once:
   1. `supabase/migrations/20260926120000_initial_schema.sql`: tables, RLS policies, signup trigger and the private `datasets` storage bucket
   2. `supabase/migrations/20260927090000_dataset_profiles.sql`: dataset columns, previews and the stricter upload rule
   3. `supabase/migrations/20260928090000_visualizations.sql`: dataset rows for charts, saved visualizations and the `query_dataset` function
   4. `supabase/migrations/20260929090000_dashboards.sql`: dashboard layout validation and clean-up when a chart is deleted
   5. `supabase/migrations/20260930090000_ai_requests.sql`: AI question log used for auditing and rate limiting
   6. `supabase/migrations/20261001090000_reports_sharing.sql`: report section rules, share-link snapshots and expiry, and the public `get_shared_report` function
   7. `supabase/migrations/20261002090000_security_hardening.sql`: least-privilege grants, function permissions, integrity rules and query limits from the production audit
   8. `supabase/migrations/20261003090000_rate_limits.sql`: rate-limit policies and counters; limits on dataset and workspace creation enforced in the database
   9. `supabase/migrations/20261004090000_storage_cleanup.sql`: orphaned-file detection and the clean-up run log

   With the Supabase CLI, `supabase link` then `supabase db push` runs them all. Datasets uploaded before step 3 show a "Prepare for charts" button that loads their rows.
3. **Configure auth URLs.** Authentication → URL Configuration:
   - Site URL: your production URL, for example `https://visuioration-iota.vercel.app`
   - Redirect URLs: add `https://visuioration-iota.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` (add preview URLs too if you use them, for example `https://*-yourteam.vercel.app/auth/callback`)
4. **Email confirmation** is on by default: new users must click the link before logging in. For quick testing you can turn it off under Authentication → Sign In / Providers → Email. For production, configure a custom SMTP provider; Supabase's built-in sender is rate-limited.
5. **Set environment variables** in Vercel (Project → Settings → Environment Variables) and in `.env.local` for local development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   Then redeploy. Removing them returns the app to demo mode.

Accounts created before the migration ran get a workspace automatically on first login.

If you ran an **earlier draft** of this migration (one with an `editor` role and no workspace `slug`), start from a fresh Supabase project, or drop the objects it created before running the current file. The migration is written for a clean database.

## Datasets

**Upload flow.** Files never pass through the Next.js server on the way in:

1. The browser asks the server to start an upload (`startDatasetUploadAction`). The server checks the file type (`.csv`, `.tsv`, `.txt` or `.xlsx`) and size (up to 50 MB), creates the dataset record with status `uploading`, and returns a signed upload URL for `datasets/<workspace_id>/<dataset_id>/<file>`.
2. The browser uploads straight to Supabase Storage with progress shown.
3. The browser calls `completeDatasetUploadAction`. The server downloads the file, profiles it, saves the results and sets the status.

**Profiling** (`lib/datasets/profile.ts`) streams rows, so memory stays flat for large files. It:

- detects the delimiter (comma, semicolon, tab or pipe);
- reads the first worksheet of a workbook, including formula results, rich text and dates;
- infers each column's type (text, integer, decimal, currency, percent, boolean or date) when at least 95% of non-empty values agree;
- records missing values, distinct values (exact up to 5,000), minimum, maximum and sample values;
- stores the first 200 rows as the preview.

A 33 MB, 700,000-row CSV took about 13 seconds end to end in testing. Profiling runs in a server action with `maxDuration = 60`.

**Statuses:**

| Status | Meaning |
|---|---|
| Uploading | Record created, file on its way |
| Processing | File stored, being profiled |
| Ready | Profiled with no issues |
| Needs review | Profiled; issues were found, such as empty or duplicate column names, rows with the wrong number of values, mostly-empty columns, or values that don't match their column's type |
| Failed | The file couldn't be read. The reason is shown in plain language |

An upload that never finished (for example, the tab was closed) is shown as Failed after an hour.

**Storage security.** The bucket is private. Members can read their workspace's files. Owners, admins and members can upload, but only into the folder of a dataset record that exists in their workspace. Deleting a dataset removes the record, its columns and preview, and the file; projects that used it keep working.

**Tests.** `npm test` runs the profiler tests: types, delimiters, messy headers, ragged rows, workbooks, invalid files, multi-line quoted values across chunk boundaries, and a 200,000-row performance check.

## Visualizations

**How a chart is calculated.** The builder sends a chart definition to a server action. The server checks it against the dataset's columns and calls the `query_dataset` database function, which aggregates the dataset's rows inside Postgres. Nothing is calculated in the browser, and the definition is saved exactly as it was run.

```
Builder → runVisualizationAction → visualizationService.run → query_dataset() → dataset_rows (RLS)
```

**Dataset rows.** When a file is imported, every data row is converted to its column's type and stored in `dataset_rows` as a JSON array: numbers as numbers, dates as ISO `YYYY-MM-DD`, and yes/no values as booleans. Values that don't fit their column's type are stored as empty so they can't break aggregations. Up to 1,000,000 rows per dataset are loaded. Row writes are "insert or skip" on (dataset, row number), so a retried batch never duplicates data.

**Chart definition** (`lib/visualizations/definition.ts`, stored in `visualizations.config`):

| Part | Options |
|---|---|
| X axis | Any text, yes/no, date or whole-number column. Dates group by day, week, month, quarter or year. Text categories show the top 5–100 |
| Y axis | Row count, or a column with sum, average, minimum, maximum or count distinct (count distinct also works on text) |
| Group by | Split into up to 8 series by a text or yes/no column |
| Filters | Text: is, is not, is any of, is none of, contains. Numbers: is, is not, greater or less than. Dates: on, on or after, on or before. Any column: is empty, is not empty |
| Date range | All time, last 30 days, last 3, 6 or 12 months, year to date, or a custom range. Relative ranges end at the dataset's latest date, so historical data still shows |
| Chart types | Line, bar, area, donut, scatter (number column on the X axis), table, KPI (single value), heatmap |

**Safety.** `query_dataset` runs with the caller's permissions (`SECURITY INVOKER`), so row-level security limits it to the caller's workspaces. It reads each column's type from `dataset_columns` rather than trusting the request. It only accepts known aggregations, date groupings and operators, and passes every user value as a quoted literal. Only signed-in users can call it. Visualizations and projects can only reference datasets in their own workspace (composite foreign keys).

**Performance.** On a 700,000-row dataset, most charts return in 0.5–1.5 seconds (one pass over the rows, using `GROUPING SETS` for the grand total). Importing a 33 MB, 700,000-row CSV, including loading every row, took about 60 seconds, so the dataset routes allow up to 300 seconds. Rows take roughly 190 bytes each in Postgres: 700,000 rows used 133 MB. Keep an eye on the database size limit on Supabase's free plan (500 MB).

## Dashboards

**What a dashboard is.** A row in `dashboards` whose `layout` is an ordered list of widgets. Each widget points at a saved visualization and has a width and a height. Order in the list is display order.

```json
[{ "id": "w_k3j9x2", "visualizationId": "<uuid>", "size": "md", "height": "regular" }]
```

| Width | Desktop (12 columns) | Tablet (6 columns) | Phone |
|---|---|---|---|
| Small | 4 columns (⅓) | 3 | Full width |
| Medium | 6 (½) | 3 | Full width |
| Large | 8 (⅔) | 6 | Full width |
| Full | 12 | 6 | Full width |

Height is Regular (220 px chart) or Tall (380 px). KPI widgets use a compact fixed height.

**Editing.** "Edit layout" on `/app` turns on edit mode (also reachable as `/app?d=<id>&edit=1`):

- **Add widget:** pick from the workspace's saved charts, excluding ones already on this dashboard.
- **Remove:** takes the widget off the dashboard; the chart stays in the library.
- **Resize:** width menu and height toggle on each widget.
- **Reorder:** drag a widget by its handle, or use the "Move earlier/later" buttons (keyboard accessible). Every change is announced to screen readers.
- **Save:** writes the whole layout. "Cancel" discards changes, and the browser warns before leaving with unsaved changes.

Each workspace can have several dashboards: create them from the options menu, switch with the selector, "Make default" (the default opens first), and delete. Deleting the default promotes the oldest remaining dashboard.

**Linked to the chart library.** "Add to dashboard" in the builder or library adds the chart to the default dashboard, creating an "Overview" dashboard if there is none. The library's "On dashboard" badge reflects the default dashboard's layout.

**Enforced in the database.** A trigger validates every layout on write:

- it must be a list of at most 50 widgets;
- widget ids must be unique and URL-safe;
- sizes and heights must be known values;
- every widget must reference a visualization in the same workspace.

Deleting a visualization removes its widgets from every dashboard. Widgets are drawn from live query results; each chart is calculated independently, so one failing chart shows an explanation without affecting the others.

## AI Insights

**Pipeline** (`lib/ai/`). The model is used twice, and neither time is it allowed to produce a number the database didn't return.

| Stage | What happens | Where |
|---|---|---|
| 1. Schema understanding | The workspace's chart-ready datasets are described: column names, types, date and number ranges, and up to 5 short example values for category columns with 50 or fewer distinct values. No rows | `schema.ts` |
| 2. Query generation | Claude must call the `plan_queries` tool (forced `tool_choice`), returning up to 3 queries as structured JSON that name columns. It never writes SQL | `plan.ts`, `anthropic.ts` |
| 3. Validation | Column names are matched to real columns and each query is checked with the chart builder's rules. Invalid plans get one repair attempt with the specific errors | `plan.ts` |
| 4. Database execution | Queries run through `query_dataset` as the signed-in user (row-level security applies), exactly like saved charts | `services/visualizations.ts` |
| 5. Explanation | Claude must call `give_answer` with a short answer, the evidence ids it used and 3 follow-up questions. It receives only aggregated results and facts computed in code (totals, first and latest period, change, highest and lowest, top categories and their share) | `evidence.ts`, `pipeline.ts` |
| 6. Number verification | Every number in the answer is extracted (including forms like $3.54M and 12%) and must match a value in the evidence at the precision written. If any doesn't, the model gets one rewrite. If it still fails, the answer is replaced with a summary assembled only from the computed facts, and labelled as such | `evidence.ts` |

**What the user gets.** A plain-language answer, marked either "every number checked" or "summary generated from the computed figures". Each piece of evidence shows its chart, what was computed (measure, grouping, filters, date range, rows matched out of total) and its key figures. Answers also include follow-up questions and a link to the source dataset. Questions the data can't answer (for example, profit when there's no cost column) get an explanation instead of a guess.

**Safety and cost controls:**

- The API key is server-only, and requests use a 45-second timeout.
- Provider errors (bad key, rate limiting, overload) become plain messages. Logs record the status code and error type only, never workspace data.
- Dataset names, column names and example values are treated as data in both prompts. Even if they contain instructions, the model can only return a plan that passes validation, and wording whose numbers are verified.
- Answers render as plain text, not HTML or markdown.
- `ai_requests` logs each question's outcome, model, tokens, whether the wording was verified, and duration. It never logs the answer or data. Users see their own history; owners and admins see their workspace's.
- Each user can ask `AI_MAX_QUESTIONS_PER_HOUR` questions per hour (default 30).

**Data sent to the AI provider:** column names and types, value ranges, short example category values, the question, and each query's aggregated results (for example "West: $885,975"). Individual rows are never sent. Review this against your data policies before enabling AI; without `ANTHROPIC_API_KEY`, no data leaves Supabase.

## Reports and sharing

**Sections.** A report is an ordered list of sections stored in `reports.sections` (at most 40):

| Section | Content |
|---|---|
| Cover | Title, period, subtitle (or the report description) and the author |
| Text | Heading and paragraphs; used for the executive summary |
| KPIs | Up to four saved charts, each shown as its total for the chart's filters and date range |
| Chart | Any saved visualization, plus commentary |
| List | Bulleted items; used for insights and recommendations |
| Appendix | Notes, plus the data sources used by the report's charts (listed automatically) |

Section content is validated on the server (`lib/reports/sections.ts`): known types only, length limits, and chart references that must belong to the same workspace. Charts are **embedded by reference**: every time the report is viewed or exported, they're recalculated from the database with the viewer's permissions. A chart that was deleted, or whose dataset was deleted, shows an explanation instead.

**Viewing.** `/app/reports/<slug>` shows one page per section with "Page n of N" footers. Presentation mode steps through the pages with the arrow keys. Owners, admins and members can edit and share; viewers can read, present and export.

**PDF export.** `/app/reports/<slug>/pdf` renders the report to a real PDF on the server with `pdf-lib`: text is wrapped and paginated, and charts (bars, stacked bars, lines and areas, donuts, KPIs, tables) are drawn as vector graphics. No browser or print dialog is involved. It needs a signed-in workspace member and returns `404` for other workspaces. The standard PDF fonts cover Western European characters; others are replaced.

**Share links.** "Share" creates a link to `/share/<token>`:

- **Tokens** are 64 random hexadecimal characters, generated by the database and checked for format.
- **Expiry** can be 1, 7, 30 or 90 days, a custom date (the link stops at the end of that day, UTC, at most a year ahead), or never.
- **A link serves a frozen snapshot** of the rendered report taken when it was created. "Update snapshot" replaces it with the current version, so edits never leak out by accident. Anonymous viewers never run queries and can't reach the workspace, other reports or the underlying rows.
- **Turn off** revokes a link immediately. Deleting a report deletes its links.
- **The only public entry point is `get_shared_report(token)`**, a `SECURITY DEFINER` function that returns the snapshot for a live link, `{status: "expired"}` for an expired or revoked one, and nothing otherwise. Anonymous callers can't read the `reports` or `shares` tables.
- **Shared pages** show when the snapshot was taken and when the link expires. They're `noindex`, send no referrer (so the token isn't passed to other sites), offer the same PDF download at `/share/<token>/pdf`, and have a presentation mode. Expired links show a friendly message (`410` for the PDF); unknown tokens return `404`.
- The sample link `/share/q2-performance` keeps working as a demo.

## How this was verified

Phase 6 (reports and sharing) was tested end to end against the same local Supabase stack. 44 browser checks passed, covering:

- building a report: default outline, text, KPIs, chart sections with commentary, lists, appendix, reordering
- saved section structure
- page rendering with live figures matching the source data
- presentation mode
- PDF export: a real PDF containing the report's text and live figures, with sign-in required
- creating a 7-day link, with expiry stored server-side
- the anonymous shared view and its PDF, with noindex and no-referrer
- snapshots staying frozen until refreshed
- custom-date and never-expiring links
- revoked and expired links stopping (including `410` for the PDF), unknown tokens returning `404`
- anonymous API and RPC access returning nothing
- another workspace unable to view or export
- viewers read-only
- library link counts and search listing real reports
- deleting a report deleting its links
- mobile layout

Two unit tests render a report with every section type to PDF; the pages were also rasterised and inspected. The sharing rules were tested directly in Postgres: token format, cross-workspace links, past expiry dates, anonymous table access, and link clean-up.

Phase 5 (AI) was tested end to end in a browser against a stand-in for the Anthropic Messages API, which checks the key and version headers and forced `tool_choice`, and replays scripted tool calls, including deliberately wrong ones. 26 checks passed, including:

- answers quoting the real top region, value, share and total, computed independently from the source file
- a filtered, date-ranged answer matching an independent calculation
- an invented number rejected and rewritten
- a model that keeps inventing numbers falling back to the computed summary
- an invalid plan repaired on retry
- an unanswerable question declined without evidence
- friendly errors for provider overload and the per-user rate limit
- the audit log recording outcomes and verification
- request inspection showing no raw rows or API key in request bodies, and examples only for small category columns
- another workspace having no access
- a clear message when no API key is configured
- mobile layout

18 unit tests cover number extraction and verification, plan mapping (including an injection attempt in a column name), evidence facts and the template fallback. The real Claude API was not called from this environment; set `ANTHROPIC_API_KEY` to use it.

Phase 4 (dashboards) was tested end to end against the same local Supabase stack. 32 browser checks passed, covering:

- creating the first dashboard (made default)
- adding widgets from saved charts, with sensible default sizes
- resizing width and height
- reordering by buttons and by drag and drop
- removing widgets
- saving name, order, sizes and heights
- cancel discarding changes
- multiple dashboards: switching, making default, deleting with default promotion
- library "Add to dashboard" and its badge
- deleting a chart removing its widget
- viewers read-only, even via `?edit=1`
- other workspaces unable to open a dashboard
- the API rejecting a layout that points at another workspace's chart
- mobile layout

Phase 3 (visualizations) was tested end to end against the same local Supabase stack. 38 browser checks passed, covering:

- rows loaded and typed on import
- totals, averages, filters and date ranges matching values computed independently from the source file
- series splits, KPI and count-distinct charts
- saving, editing, duplicating, renaming, pinning and deleting charts
- search listing the workspace's saved charts
- "Prepare for charts" for older datasets
- other workspaces and anonymous callers unable to open or query charts
- viewers read-only
- charts whose dataset was deleted explaining why
- mobile layout

The `query_dataset` function was also tested directly with injection attempts and invalid definitions.

Phase 2 (datasets) was tested end to end against the real Supabase Storage server (v1.79.20), GoTrue and PostgREST, with both migrations applied. 44 browser checks passed, covering:

- CSV and XLSX upload, with records, columns and previews saved
- storage paths and sizes
- preview formatting, filters, sorting and column information
- data-quality issues
- invalid files failing with clear messages
- unique slugs for same-named datasets
- projects linked to real datasets
- another user unable to download, upload or read previews
- viewers unable to import or delete
- delete removing the record, previews and file
- mobile layout

Phase 1 was tested end to end against the real Supabase Auth server (GoTrue v2.197.0) and PostgREST v16.4 running on PostgreSQL 16 with this migration applied. 35 browser checks passed, covering:

- route protection with the destination preserved
- sign-up with email confirmation
- onboarding saving to the database
- login with correct and wrong passwords
- logout
- the full forgot-password email flow
- project creation and persistence
- creating and switching workspaces
- profile updates
- isolation between two users
- mobile layout

Direct REST calls with a real user token confirmed that another user cannot read, insert into or join someone else's workspace.

## Demo data

Every number derives from one monthly ledger in `src/lib/demo-data/metrics.ts` (July 2025 – June 2026), so figures agree across the dashboard, builder, insights, report and marketing site:

- Revenue $12.84M · Orders 184,290 · Customers 68,420 · Conversion 4.82% · AOV $69.67 · CAC $42.18 · +14.8% vs FY25
- March revenue −8.4% vs February; the West region accounts for ~44% of the decline (orders −13%)
- Q2 revenue $3.29M, +8.2% on Q1; Outdoor +21.7%
- Mobile conversion 4.32% vs desktop 5.52% (1.2-point gap, 58% of sessions)
- Blended CAC $42.18; paid social $46.18; email & CRM $31.40

`rows.ts` generates a seeded 600-row order sample for the dataset table.

## Local development

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
npm run typecheck             # tsc --noEmit
npm run lint                  # eslint . (flat config)
npm test                      # unit tests (tsx --test)
npm run build && npm start    # production build (Turbopack)
```

Requires Node.js 22 (Next.js 16 needs 20.9 or later). Without Supabase, `npm run dev` runs the demo; a production build without Supabase needs `NEXT_PUBLIC_DEMO_MODE=true` to run the demo.

Database tests: `pg_prove -d <db> supabase/tests/database/*.test.sql` (or `supabase test db`). End-to-end suites: see `tests/e2e/README.md`. Real-API AI staging test: `tests/ai-staging/README.md`.

## Environment variables

| Variable | Scope | Purpose | Required |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical origin: auth email links, sitemap, Open Graph | Yes, in production |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL | Live mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Public | Anon/publishable key; data is protected by row level security. The app refuses to start if a service-role or secret key is placed here | Live mode |
| `NEXT_PUBLIC_DEMO_MODE` | Public | `true` runs the sample-data demo on purpose. Ignored when Supabase is configured | Demo deployments only |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Used only by the scheduled storage clean-up job (`app/api/cron/storage-cleanup`). Never give it a `NEXT_PUBLIC_` name | Live mode (for clean-up) |
| `CRON_SECRET` | Server only | At least 16 characters. Vercel Cron sends it as `Authorization: Bearer …`; without it the clean-up route never runs | Live mode (for clean-up) |
| `RATE_LIMIT_SALT` | Server only | Salt for hashing client IPs and share tokens in rate-limit counters | Recommended |
| `STORAGE_CLEANUP_MIN_AGE_SECONDS` | Server only | Grace period before an orphaned file may be deleted (default 86400, minimum 3600) | No |
| `ANTHROPIC_API_KEY` | Server only | Enables AI Insights | For AI |
| `AI_MODEL` | Server only | Default `claude-sonnet-5` | No |
| `AI_MAX_QUESTIONS_PER_HOUR` | Server only | Per-user hourly AI limit (default 30); a per-minute limit also applies (`rate_limit_policies`) | No |
| `ANTHROPIC_BASE_URL` | Server only | Proxies and tests only | No |

## Deployment

Vercel, with Node.js 20.9 or later:

1. Create a Supabase project and run the nine migrations in `supabase/migrations` in order.
2. Set the environment variables above in Vercel. For a sample-data demo instead, set only `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_DEMO_MODE=true`.
3. In Supabase Auth, set the Site URL and redirect allow-list to your production domain, and configure custom SMTP.
4. Deploy. `vercel.json` schedules the storage clean-up daily at 03:30 UTC (Vercel Cron). Check `public.storage_cleanup_runs` for run results.

Fonts (Bricolage Grotesque, Instrument Sans) load from Google Fonts, which the Content-Security-Policy allows; system fonts are the fallback.

## Production and security considerations

In place in live mode (details and evidence in `PRODUCTION_AUDIT.md`):

- **Accounts and sessions:** Supabase Auth, with sessions in HTTP-only cookies refreshed by `proxy.ts`; `/app` requires sign-in.
- **Data isolation:** row level security on every table and on Storage; workspace roles (owner, admin, member, viewer) enforced by the database; least-privilege grants (the anonymous role has no table access).
- **Rate limiting:** stored in Postgres, so counters are shared across server instances. It covers dataset upload initialisation and processing, workspace creation, report rendering, report and share-link PDFs, and AI requests. Limits are rows in `rate_limit_policies`.
- **Content-Security-Policy:** a per-request nonce with `strict-dynamic`, no `unsafe-eval` in production, and framing blocked. Also HSTS, `nosniff`, a referrer policy and a permissions policy.
- **Uploads:** 50 MB maximum, content checks, and column, row and cell limits.
- **Orphaned files:** removed by an authenticated, idempotent scheduled job.
- **AI:** never runs model-written SQL; every number in an answer is verified against query results.
- **Secrets:** the service-role key is server-only and used by the clean-up job alone. Database errors are logged server-side and shown to users as plain messages.
- **Tests:** 102 pgTAP database tests and 10 end-to-end suites; see `tests/e2e/README.md`.

Not yet in place:

- error monitoring and alerting;
- backups (Supabase point-in-time recovery depends on your plan);
- custom SMTP (configure it in Supabase);
- virus scanning of uploads;
- data-retention policies;
- SSO;
- full audit logging.

## Future integrations

Not implemented:

- connectors for Google Sheets, HubSpot, Salesforce, databases and REST APIs;
- a columnar warehouse for very large datasets;
- team invitations;
- notifications;
- billing.

## Capability status

**Implemented in live mode:**

- sign-up, email confirmation, sign-in and password reset;
- workspaces and roles;
- projects;
- CSV and Excel datasets, with profiling and previews;
- database-backed charts;
- dashboards;
- AI Insights (with an Anthropic API key);
- reports, with PDF export and expiring share links;
- rate limiting, CSP and scheduled storage clean-up.

**Demo mode only**, with fictional data and nothing stored on a server:

- the Northstar sample workspace;
- the published demo sign-in;
- the rule-based simulated AI assistant and its sample insight pages;
- the sample Q2 report (`/share/q2-performance`, which stays public in every mode);
- simulated imports.

**Not available yet** (shown as such in the app):

- team invitations;
- notifications;
- integrations (Google Sheets, Snowflake, PostgreSQL, Slack, HubSpot, REST API);
- the security settings panel (two-step verification, SSO, session management, audit log);
- billing, which is illustrative only;
- saved notification preferences;
- product analytics, which is an in-memory mock.

Marketing pages use illustrative brands, figures and case studies, labelled as such. Pricing marks planned features as "Planned".

**Required for production:**

- Supabase configured with all migrations;
- the environment variables above;
- the Supabase Auth URL settings and SMTP;
- a real-API staging run of the AI suite (`tests/ai-staging`) before enabling AI.

## Known limitations

- Reports: PDFs use standard fonts (non-Western-European characters are replaced); one page per section in the web view; share links show a snapshot, not live data; link views aren't counted; dashboards and individual charts can't be shared on their own.
- AI: one dataset per question (no joins); up to three queries per answer; no conversation memory; number verification checks figures, not wording.
- Dashboards: four widths and two heights (no free-form resizing); saved charts only (no text or image widgets); no sharing outside the workspace.
- Visualizations: one dataset per chart; dates without time zones; numeric X axes on bar and line charts are treated as categories.
- Datasets: first worksheet only; `.xls` must be re-saved as `.xlsx`; decimal commas are read as text; previews hold 200 rows; charts use up to 1,000,000 rows.
- Rate limits use fixed windows, so a burst of up to twice the limit is possible across a window boundary.
- Demo mode: anything created lives in browser memory and resets on reload; the simulated assistant recognises a fixed set of questions; "Export PDF" in the demo report opens the browser print dialog.
