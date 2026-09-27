# AI staging test (real Anthropic API)

**Status: not yet run.** No staging key was available when this was written. Run it before enabling AI for customers.

1. Start the local stack (`tests/local-stack`) and apply all migrations.
2. `python3 tests/ai-staging/fault_proxy.py` (port 4011). It forwards to `https://api.anthropic.com`; questions tagged
   `[fault:malformed]`, `[fault:badplan]`, `[fault:500]` or `[fault:429]` get a substituted response instead.
3. Start the app on port 3100 with `ANTHROPIC_API_KEY=<staging-only key> ANTHROPIC_BASE_URL=http://127.0.0.1:4011`.
   Export the key in your shell only. **Never commit it.**
4. `python3 tests/ai-staging/run_staging.py`

It covers:

| Scenario | Source |
|---|---|
| Normal question, aggregation, aggregation by category, filtering, unsupported question | Real API |
| Evidence and number verification | Real API, with expected figures computed independently from `tests/fixtures/sales.csv` |
| Malformed model output, invalid plan, API error (500), rate limit (429) | Substituted by the proxy |

The same fault paths are covered deterministically in CI by `tests/e2e/e2e_ai.py`, using a stand-in API.
