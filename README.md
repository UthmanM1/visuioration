# Visuioration

**Turn complex data into clear decisions.**

Visuioration is an AI-powered visual intelligence platform concept: import business data, understand it, visualize it, ask what changed, and turn the answer into a report people can act on. This repository is a complete, working portfolio implementation — a marketing site plus a fully navigable product demo — running entirely on local demo data.

> **Portfolio disclaimer.** Visuioration is a product concept. The company "Northstar Retail Group", its people, customers and every figure shown are fictional. Authentication, imports, AI answers, exports and sharing are simulated. Nothing in this project is presented as a production enterprise platform, and no compliance or security certifications are claimed.

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

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3 · Recharts · Lucide icons · clsx. No paid APIs, no database, no external services required.

## Project structure

```
src/
  app/
    (marketing)/          Marketing pages with shared header/footer
    (auth)/               Login, signup, forgot password
    onboarding/           Six-step setup flow
    app/                  Product workspace (noindex), loading and error states
    share/[slug]/         Public shared report
    sitemap.ts, robots.ts, opengraph-image.tsx, not-found.tsx, global-error.tsx
  components/
    ui/                   Buttons, panels, dialogs, sheets, tabs, toasts, fields…
    charts/               Chart primitives and the generic ChartRenderer
    app/                  App shell, sidebar, command palette, tour, notifications
    dashboard/ projects/ datasets/ builder/ visualizations/
    insights/ reports/ team/ settings/ marketing/ auth/ brand/
  lib/
    demo-data/            All demo data (single source of truth)
    services/             Service abstractions over the demo data
    query.ts              In-memory query engine used by the builder
    search.ts             Command and search index
    analytics.ts          Mock event tracking
    seo.ts, site.ts, format.ts
```

## Demo

| | |
|---|---|
| Demo login | `demo@visuioration.example` / `demo` |
| Shortcut | "Continue with demo workspace" on `/login`, or open `/app` directly |
| Sample report | `/app/reports/q2-executive-review` |
| Shared report | `/share/q2-performance` |
| Import error state | In the import dialog, choose Google Sheets or API and use a URL containing `fail` |
| Replay product tour | Help menu (?) → Replay product tour |

`/app` is intentionally open without signing in so reviewers can explore immediately.

## Architecture

Pages are server components wherever possible; interactivity (charts, builders, chat, dialogs) lives in client components. All data access goes through `src/lib/services/*`, which currently resolve against local demo data via `demoResolve()` with simulated latency. Swapping the demo transport for real API calls requires no changes to UI components.

The visualization builder uses `runQuery()` in `src/lib/query.ts`, a small in-memory engine that aggregates the demo ledger by dimension, measure, grouping, aggregation, region filter and date range.

The AI assistant (`askAssistant()` in `src/lib/services/insights.ts`) is rule-based: it matches the question to an intent and composes an answer from precomputed facts. It is clearly labelled as simulated in the UI.

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
npm run typecheck
npm run lint
npm run build && npm start
```

Requires Node.js 18.17 or later.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Base URL for canonical links, sitemap and Open Graph | No (defaults to `https://visuioration.example`) |

Other variables in `.env.example` are placeholders for future integrations and are not read by the demo.

## Deployment

The project is Vercel-ready: import the repository, set `NEXT_PUBLIC_SITE_URL` to your production domain, and deploy. No other configuration is needed. Fonts (Bricolage Grotesque and Instrument Sans) load from Google Fonts at runtime with system fallbacks.

## Production and security considerations

This demo has no real authentication, sessions, persistence or access control. A production version would need, at minimum:

- An identity provider with sessions, SSO for enterprise plans, and middleware protecting `/app`
- Role-based access control enforced server-side, not only in the UI
- Encryption in transit and at rest; secure object storage with signed uploads and malware scanning
- Input validation and rate limiting on every API route
- Secrets held in a secrets manager; no keys in the client
- Audit logging, backups, monitoring, alerting and defined data-retention policies
- An AI layer that only explains figures computed by the database, with prompt-injection safeguards for user data

## Future integrations

PostgreSQL or Supabase for workspace metadata · a columnar warehouse (Snowflake, BigQuery, ClickHouse) for dataset queries · object storage for uploads and exports · an LLM provider for question-to-query and explanations · server-side PDF rendering · connectors for Google Sheets, HubSpot, Salesforce and databases · Slack and email notifications · PostHog or Segment for product analytics · Stripe for billing.

## Known limitations

- State created in the app (projects, imports, renamed charts, invitations) lives in memory and resets on reload.
- The AI assistant recognises a fixed set of intents; other questions receive a guided fallback.
- "Export PDF" opens the browser print dialog rather than generating a file server-side.
- Only the Northstar Sales dataset and the Q2 report have full detail pages; other reports open in the builder.
- Share access settings are not enforced.

---

Built as a portfolio project. All data is fictional.
