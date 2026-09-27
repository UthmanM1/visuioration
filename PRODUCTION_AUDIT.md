# Production readiness audit

**Updated:** 27 September 2026 (second pass: framework upgrade, rate limiting, CSP, storage clean-up)
**Scope:** the whole repository: application code, the 9 Supabase migrations, Storage, server actions, route handlers, the proxy, AI, sharing, PDF generation, dependencies, configuration and documentation.
**Method:** code review, direct inspection of the database catalogue, 102 pgTAP database tests, 22 unit tests, 277 browser end-to-end checks against a local Supabase stack (GoTrue, PostgREST, Supabase Storage, Postgres 16), and production builds in all three operating modes.

## Verdict

**Meets the production-readiness criteria for the core product, with one condition on AI.**

| Criterion | Status |
|---|---|
| No critical or high production dependency vulnerability | Met: `npm audit --omit=dev` reports **0 vulnerabilities** |
| Security tests pass | Met: 102/102 pgTAP tests (workspace isolation, grants, rate limits, clean-up selection) |
| End-to-end tests pass | Met: 277/277 checks in live mode, plus demo-mode and unconfigured-mode checks |
| Rate limiting actually implemented | Met: Postgres-backed and shared across instances, covering all seven required operations (13 end-to-end checks) |
| CSP actually implemented | Met: per-request nonce with `strict-dynamic`; no violations anywhere (18 checks in live mode, plus demo pages) |
| Storage clean-up implemented | Met: scheduled, authenticated, ownership-checked, idempotent and retryable (18 end-to-end and 6 database checks) |
| Real Anthropic testing passed, or documented as an external requirement | **Documented as an external staging requirement.** No API key was available, so the real-API test has **not** been run or passed |

**Condition:** keep AI switched off in production (leave `ANTHROPIC_API_KEY` unset) until `tests/ai-staging/run_staging.py` passes against the real API with a staging key. Without the key, AI Insights shows "not connected" and everything else works.

Deployment still requires the configuration in [Production configuration](#production-configuration): Supabase Auth URLs, SMTP and the environment variables. Operational gaps (monitoring, backups, virus scanning) are listed under [Remaining issues](#remaining-issues).

## Findings from both audit passes

| ID | Area | Finding | Severity | Status |
|---|---|---|---|---|
| F-01 | Configuration | Demo mode activated silently when Supabase variables were missing | High | Fixed (pass 1): explicit opt-in; unconfigured production returns 503 |
| F-02 | Grants | `anon`/`authenticated` held ALL privileges on every table, including TRUNCATE | Medium | Fixed (pass 1) |
| F-03 | RLS | Owners and admins could add any user to a workspace without consent | Medium | Fixed (pass 1) |
| F-04 | Grants | Users could change the profile email their teammates see | Medium | Fixed (pass 1) |
| F-05 | Dependencies | `next@14.2.35` had critical and high advisories; no patched 14.x exists | Critical | **Fixed (pass 2):** `next@16.3.6` |
| F-06 | Server | Per-user database responses weren't excluded from the Next.js data cache | Medium | Fixed (pass 1) |
| F-07 | Uploads | No column, row or cell limits and no binary check | Medium | Fixed (pass 1) |
| F-08 to F-19 | Various | AI "can't answer" verification, query limits, function grants, search paths, share-token immutability, `created_by` stamping, same-workspace foreign keys, auth email origin, security headers, sample content in live mode, malformed snapshots, service-key guard | Low | Fixed (pass 1) |
| F-21 | Abuse | No application-level rate limiting on expensive operations | Medium | **Fixed (pass 2)** |
| F-23 | Storage | Files of deleted datasets and workspaces were never removed | Low | **Fixed (pass 2)** |
| F-24 | Headers | No Content-Security-Policy | Low | **Fixed (pass 2)** |
| F-25 | Dependencies | `exceljs → uuid@8.3.2` (moderate) | Low | **Fixed (pass 2):** npm override to `uuid@11.1.1`, verified with exceljs |
| F-26 | AI | Verified only against a stand-in API | Info | **Open:** external staging requirement (harness provided) |
| F-27 | Upgrade regression | With React 19, Recharts 2 dropped chart legends (it bundled `react-is@18`) | Medium | **Fixed (pass 2):** `react-is@19.3.0` override for recharts (Recharts' documented React 19 setup); caught by the visualization suite |
| F-28 | Code quality | React 19 lint rules found 22 effect, ref and component-definition issues (extra render passes, ref writes during render, components recreated each render) | Low | **Fixed (pass 2):** refactored, none suppressed |
| F-29 | Documentation | README and marketing copy described old behaviour: demo mode without opt-in, "no service role key", "Next.js upgrade needed", "Trusted by" above fictional brands, plan features that don't exist (SSO, API access, audit history) | Medium | **Fixed (pass 2)** |
| F-20 | Routing | "Not found" inside `/app` returns HTTP 200 (streaming); content isn't exposed | Info | Open (accepted) |
| F-22 | Trust model | Editors can change any column of their own workspace's datasets through the API | Low | Open (accepted) |

## Changes in this pass

### 1. Framework upgrade

**Dependency changes (production):**

| Package | From | To |
|---|---|---|
| `next` | 14.2.35 | **16.3.6** (the only current line with zero advisories; 15.5.26 still has a high one) |
| `react`, `react-dom` | 18.3.1 | **19.3.0** |
| npm `overrides` | – | `exceljs → uuid ^11.1.1` (patched), `recharts → react-is 19.3.0` |

**Dependency changes (development):**

| Package | From | To |
|---|---|---|
| `eslint-config-next` | 14.2.35 | **16.3.6** |
| `eslint` | 8 | **9** (flat config) |
| `@types/react`, `@types/react-dom` | 18 | **19** |

**Breaking changes handled (no suppressions):**

- **Async `cookies()` and `headers()`.** The Supabase server client is now async, and all 52 call sites await it. The auth-email origin helper, the session cookie and the workspace cookie are async too.
- **Async `params` and `searchParams`.** 20 pages and metadata functions, and 2 route handlers, await them.
- **Proxy.** `middleware.ts` became `proxy.ts` (`export function proxy`), and its matcher now covers every page so the CSP applies everywhere.
- **Configuration.** `experimental.serverComponentsExternalPackages` became `serverExternalPackages`, and builds now use Turbopack (the Next 16 default).
- **Lint.** `next lint` was removed in Next 16; it's replaced by `eslint .` with `eslint.config.mjs`.
- **React 19 rules:**
  - Browser-only values (local time, `localStorage`) use `useSyncExternalStore` through `useClientValue`.
  - Prop-to-state resets use React's adjust-during-render pattern.
  - Dialog close callbacks use `useEffectEvent`.
  - Presentation modes remount on open.
  - The builder's query result is keyed by its settings, so loading and error states are derived.
  - Axis drop zones are hoisted to module level.

### 2. Rate limiting

**Architecture.** The limiter uses Supabase Postgres, which the app already requires, so counters are shared by every server or serverless instance. No extra vendor is needed.

- **Storage:** `rate_limit_policies` holds one row per bucket (limit, window, scope) and can be tuned without a deploy. `rate_limit_counters` holds fixed-window counters.
- **`consume_rate_limit(bucket, subject)`:** one atomic `INSERT … ON CONFLICT DO UPDATE`.
- **User buckets** always count by `auth.uid()` from the verified JWT. A caller-supplied subject is ignored, so nobody can spend another user's budget.
- **Public buckets** take a server-computed subject: a salted SHA-256 of the client IP or share token. Raw values are never stored.
- **Database-level enforcement.** `enforce_rate_limit()` raises `PT429`, which PostgREST returns as HTTP 429. It's called inside `create_workspace()` and by a trigger on `datasets`, so direct API calls are limited too.
- **App-level enforcement.** `lib/rate-limit.ts` (server-only) covers operations that only the server performs. It **fails closed** if the limiter is unreachable.
- **Housekeeping.** Old windows are pruned by the scheduled maintenance job (`rate_limit_gc()`).

| Operation | Bucket | Default | Where enforced |
|---|---|---|---|
| Dataset upload initialisation | `dataset_upload_start` | 30 / hour / user | Database trigger on `datasets` (covers the app and direct API) |
| Dataset processing (completion, "Prepare for charts") | `dataset_process` | 30 / hour / user | Server actions |
| Workspace creation | `workspace_create` | 5 / hour / user | Inside `create_workspace()` (covers the app and direct RPC) |
| Report rendering (view, share create or refresh) | `report_render` | 120 / 10 min / user | Report page and share actions |
| Authenticated report PDF | `report_pdf` | 20 / 10 min / user | `/app/reports/[slug]/pdf` → 429 with `Retry-After` |
| Shared report PDF | `share_pdf_ip`, `share_pdf_link` | 20 / 10 min / IP; 100 / hour / link | `/share/[token]/pdf` → 429 with `Retry-After` |
| AI requests | `ai_request` | 6 / minute / user | AI pipeline, plus the existing `AI_MAX_QUESTIONS_PER_HOUR` (unchanged) |

**Known properties:**
- Fixed windows allow up to twice the limit across a window boundary.
- The client IP comes from `x-real-ip` / `x-forwarded-for`, which Vercel's edge sets. Self-hosted deployments need a proxy that overwrites these headers.
- Someone who knows a share token could use up that link's PDF budget.

### 3. Content-Security-Policy

**Architecture.** `proxy.ts` creates a 128-bit nonce per request. It passes the CSP to rendering through the request header, so Next.js adds the nonce to its own scripts, and it sets the CSP response header. The root layout reads request headers, so every page renders per request, which nonces require.

```
default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' <Supabase origin> <Supabase wss>;
worker-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; manifest-src 'self'
```

- **No `unsafe-inline` for scripts.** `'unsafe-eval'` is added only under `next dev`, for React Refresh; never in production.
- **`style-src 'unsafe-inline'` is necessary.** The UI and Recharts use inline `style` attributes, which nonces can't cover. Inline styles can't execute script.
- **Only two third-party origins:** Google Fonts (stylesheet and font files) and the deployment's own Supabase project (browser uploads, token refresh). AI runs server-side and needs no browser exception.
- **Verified:**
  - every script tag in server HTML carries the response's nonce;
  - the nonce changes per response;
  - there are zero `securitypolicyviolation` events across authentication, uploads, charts, dashboards, reports (including presentation and PDF), share pages, AI, settings and marketing pages in live mode;
  - demo pages have no violations either;
  - fonts are allowed. This sandbox's network blocks Google Fonts, so their actual loading was verified only as "not blocked by the CSP".

### 4. Storage orphan clean-up

**Architecture.**

- **Schedule:** Vercel Cron (`vercel.json`, daily at 03:30 UTC) calls `GET /api/cron/storage-cleanup` with `Authorization: Bearer $CRON_SECRET`, compared in constant time. Without a secret of at least 16 characters the route always returns 401.
- **Selection:** `storage_orphan_candidates()` (`SECURITY DEFINER`, executable only by `service_role`) picks a file only when:
  - its path is `<workspace uuid>/<dataset uuid>/…`;
  - no dataset with that id exists **in that same workspace** (ownership check);
  - it's older than the grace period (default 24 hours, never below 1 hour).

  Unrecognised paths and other buckets are never selected.
- **Deletion:** each batch of 100 is re-checked with `storage_orphans_recheck()` immediately before deletion through the Storage API, using the service-role client. That client (`lib/supabase/admin.ts`) is server-only and imported by nothing else.
- **Idempotent:** removing an already-deleted file is a no-op, and a re-run finds nothing left.
- **Retryable:** every run is recorded in `storage_cleanup_runs` (status, candidate, deleted and failed counts, error). Failures return HTTP 500, and the next run retries whatever remains. `?dry_run=1` reports without deleting.
- **Housekeeping:** the same job prunes expired rate-limit windows.

### 5. Anthropic API staging test

**Result: not run.** No `ANTHROPIC_API_KEY` was available in this environment, so the AI pipeline hasn't been tested against the real API. **It has not passed.**

To run it, see `tests/ai-staging/README.md`:
- `run_staging.py` drives the real app against the real API. It covers a normal question, aggregation, aggregation by category, filtering, an unsupported question, and evidence and number verification, with expected figures computed independently from the source CSV.
- `fault_proxy.py` forwards to the real API but substitutes malformed output, an invalid plan, HTTP 500 and HTTP 429 for tagged questions.

The key is read from the environment only; never commit it. The same failure paths are already covered deterministically by `tests/e2e/e2e_ai.py`, using a protocol-accurate stand-in.

### 6. Documentation

- **README:**
  - intro and modes;
  - tech stack;
  - project structure;
  - the list of 9 migrations;
  - environment variables, including scope and the service-role exception;
  - deployment, including the cron job;
  - security (what's in place and what isn't);
  - future integrations (only unimplemented items);
  - a new **Capability status** section (live, demo-only, not available yet, required for production);
  - known limitations, split into live and demo.
- **Marketing:**
  - The home page heading is now "Built for", not "Trusted by", above the illustrative brands.
  - The technology page compares demo mode with *implemented* live mode, and security controls are marked "In place" or "Not yet".
  - Pricing marks SSO, API access, audit history, custom branding, dedicated environments and data governance as "Planned".
  - The pricing FAQ describes where live data is actually stored.
- **`.env.example`:** documents the new server-only variables.

## Remaining issues

**Blocking for AI only:**

1. **F-26:** run `tests/ai-staging` against the real API with a staging key before setting `ANTHROPIC_API_KEY` in production.

**Operational requirements (deployment configuration, not code):**

2. Custom SMTP for Supabase Auth, and the Auth Site URL and redirect allow-list set to the production domain.
3. Backups and point-in-time recovery (depends on the Supabase plan), plus error monitoring and alerting (for example Sentry, or Vercel log drains alerting on 5xx responses and failed clean-up runs).

**Accepted residual risks:**

4. `style-src 'unsafe-inline'` (required by inline style attributes).
5. Fixed-window rate limits.
6. Per-link PDF budget exhaustion by someone who holds the token.
7. The IP header trust assumption off Vercel.
8. No virus scanning of uploads (files are parsed server-side and never served back as executable content).
9. HTTP 200 for "not found" inside `/app` (F-20).
10. The editor trust model for dataset columns (F-22).

## Production configuration

| Variable | Scope | Required |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes (live) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Yes (live). Never the service-role or secret key (the app refuses to start with one) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes (live, for the clean-up job only) |
| `CRON_SECRET` | Server only | Yes (live); at least 16 random characters |
| `RATE_LIMIT_SALT` | Server only | Recommended |
| `STORAGE_CLEANUP_MIN_AGE_SECONDS` | Server only | No (default 86400) |
| `NEXT_PUBLIC_DEMO_MODE` | Public | Only for a deliberate demo deployment |
| `ANTHROPIC_API_KEY` | Server only | Only after the staging test passes |
| `AI_MODEL`, `AI_MAX_QUESTIONS_PER_HOUR`, `ANTHROPIC_BASE_URL` | Server only | No |

**Supabase:** run migrations 1 to 9 in order, then configure the Auth URL settings and SMTP. **Vercel:** Node.js 20.9 or later; Cron is configured by `vercel.json`.

## Functionality that is still simulated or unavailable

- **Demo mode only:**
  - the fictional Northstar workspace;
  - the published demo sign-in;
  - the rule-based AI assistant and its sample insight pages;
  - the sample Q2 report (`/share/q2-performance` is public in every mode);
  - in-browser imports and edits.
- **Not available in live mode:**
  - team invitations;
  - notifications;
  - integrations and connectors;
  - the security settings panel (two-step verification, SSO, sessions, audit log);
  - billing (illustrative);
  - saved notification preferences;
  - product analytics (an in-memory mock).
- **Marketing:** illustrative brands, figures, case studies and pricing, labelled as such.

## Test results (final build)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 problems |
| `npm test` (unit) | 22 / 22 |
| `pg_prove supabase/tests/database/*.test.sql` | 102 / 102 (2 files) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Production build (live, demo, unconfigured) | Succeeds in all three |
| `e2e.py`: auth, workspaces, isolation | 35 / 35 |
| `e2e_datasets.py` | 44 / 44 |
| `e2e_viz.py` | 38 / 38 |
| `e2e_dash.py` | 32 / 32 |
| `e2e_ai.py` (stand-in API) | 27 / 27 |
| `e2e_reports.py` | 44 / 44 |
| `e2e_audit.py` | 8 / 8 |
| `e2e_ratelimit.py` (new) | 13 / 13 |
| `e2e_cleanup.py` (new) | 18 / 18 |
| `e2e_csp.py` (new) | 18 / 18 |
| Demo mode (`interact.py`, `demo_*.py`, CSP on demo pages) | Pass, 0 CSP violations, 0 JavaScript errors |
| Unconfigured production | Workspace, auth, onboarding and callback routes return 503; marketing 200; cron 401; server-action POST refused |
| Real Anthropic API (`tests/ai-staging`) | **Not run: no key available (external requirement)** |

**Commands:**

```bash
npx tsc --noEmit && npx eslint . && npm test && npm audit --omit=dev
pg_prove -d <db> supabase/tests/database/*.test.sql          # or: supabase test db
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run build
NEXT_PUBLIC_DEMO_MODE=true npm run build                       # demo deployment
env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY npm run build   # unconfigured: 503
tests/local-stack/run_suite.sh <suite>.py                      # each e2e suite on a clean database
python3 tests/ai-staging/run_staging.py                        # real API, staging key required
```

Test-harness adjustments in this pass:
- The AI suite raises the per-minute AI limit for its own run, because the burst limit has its own suite.
- The auth suite's greeting check now waits for the heading instead of sampling once.
- Fixtures containing JSON are written through SQL files.
- The CSP nonce check reads the server HTML, because browsers hide nonce values in the live DOM.

None of these changes an assertion about application behaviour.
