# End-to-end and database tests

These suites drive the real app in Chromium (Playwright for Python) against a **local Supabase stack**:
GoTrue v2.197, PostgREST v16, Supabase Storage v1.79, Postgres 16 with every migration in
`supabase/migrations` applied, a small gateway (`tests/local-stack/proxy.js`, port 54321), an SMTP catcher
(`smtp_sink.py`, port 2525, writes `.eml` files) and a stand-in for the Anthropic Messages API
(`fake_anthropic.py`, port 4010) that replays scripted tool calls, including deliberately wrong ones.

The scripts expect that stack under `/tmp/sb` (as used during development) and the app on `http://localhost:3100`
(and a second instance without `ANTHROPIC_API_KEY` on 3101 for one AI check). Paths are hard-coded for that
environment; adjust them before using elsewhere. Local keys (`keys.env`, `gotrue.env`, `storage.env`) are not
committed.

| Suite | Checks | Covers |
|---|---|---|
| `e2e.py` | 35 | Sign-up, email confirmation, sign-in, password reset, workspaces, onboarding, RLS isolation, viewers |
| `e2e_datasets.py` | 44 | CSV/XLSX upload to Storage, profiling, previews, invalid files, storage isolation, deletion |
| `e2e_viz.py` | 38 | Database-backed chart queries, aggregations, filters, date ranges, saving, isolation |
| `e2e_dash.py` | 32 | Dashboards: create, add, remove, resize, reorder (drag and buttons), save, layout validation |
| `e2e_ai.py` | 27 | AI pipeline: planning, validation, execution, number verification, fallbacks, rate limit, privacy |
| `e2e_reports.py` | 44 | Reports, embedded charts, PDF export, share links, expiry, revocation, anonymous access |
| `e2e_audit.py` | 8 | Production-audit fixes: no sample content in live mode, share headers, malformed snapshots |
| `interact.py`, `demo_*.py` | – | Demo mode regression (run against a build with `NEXT_PUBLIC_DEMO_MODE=true`) |

Run one suite with a clean database: `tests/local-stack/run_suite.sh e2e_reports.py`.

Database access tests (pgTAP, 78 tests) live in `supabase/tests/database/` and run with
`supabase test db`, or `pg_prove -d <database> supabase/tests/database/*.test.sql`.
