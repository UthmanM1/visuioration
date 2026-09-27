"""Content-Security-Policy end to end: every main area works under the production CSP with no violations."""
import asyncio, json, re, subprocess
from playwright.async_api import async_playwright
exec(open("/tmp/e2e_viz.py").read().split("async def main" + "():")[0])
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
def sqlf(statement):
    open("/tmp/csp_fixture.sql", "w").write(statement)
    subprocess.run(["su", "postgres", "-c", "psql -q -v ON_ERROR_STOP=1 -d sbtest -f /tmp/csp_fixture.sql"], check=True, capture_output=True)

WATCH = """
window.__csp = [];
document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '')));
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        violations, console_csp, errors = [], [], []
        ctx = await b.new_context(viewport={"width": 1440, "height": 1000})
        await ctx.add_init_script(WATCH)
        await ctx.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
        # Sign-up / email confirmation / sign-in all run under the CSP.
        _, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        await ctx.close()
        ctx = pg.context
        await ctx.add_init_script(WATCH)
        pg.on("console", lambda m: console_csp.append(m.text[:160]) if "Content Security Policy" in m.text else None)
        pg.on("pageerror", lambda e: errors.append(str(e)[:160]))

        async def visit(path, name, action=None):
            resp = await pg.goto(BASE + path, wait_until="networkidle")
            if action:
                await action()
            v = await pg.evaluate("window.__csp || []")
            violations.extend(f"{name}: {x}" for x in v)
            header = resp.headers.get("content-security-policy", "") if resp else ""
            nonce = re.search(r"'nonce-([^']+)'", header)
            html = await pg.content()
            scripts = re.findall(r"<script\b[^>]*>", html)
            unsigned = [s for s in scripts if "ld+json" not in s and nonce and f'nonce="{nonce.group(1)}"' not in s and "nonce=" not in s]
            return header, not v, unsigned

        # Datasets: browser upload goes straight to Supabase Storage (connect-src).
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        v = await pg.evaluate("window.__csp || []")
        check("dataset upload from the browser works under the CSP", sql("select status from datasets where slug = 'store-sales'") in ("ready", "needs_review") and not v, str(v))
        ws = sql("select workspace_id from datasets limit 1"); ds = sql("select id from datasets limit 1")
        definition = {"version": 1, "x": {"column": 2}, "y": {"column": 3, "aggregation": "sum"}, "series": None, "filters": [], "dateRange": None, "limit": 50}
        sqlf(f"insert into visualizations (id, workspace_id, dataset_id, name, kind, config) values ('9c9c9c9c-9c9c-4c9c-8c9c-9c9c9c9c9c9c', '{ws}', '{ds}', 'Revenue by region', 'bar', '{json.dumps(definition)}');"
             f"insert into dashboards (workspace_id, name, is_default, layout) values ('{ws}', 'Overview', true, '[{{\"id\":\"w1\",\"visualizationId\":\"9c9c9c9c-9c9c-4c9c-8c9c-9c9c9c9c9c9c\",\"size\":\"md\",\"height\":\"regular\"}}]');"
             f"insert into reports (id, workspace_id, slug, name, sections) values ('8d8d8d8d-8d8d-4d8d-8d8d-8d8d8d8d8d8d', '{ws}', 'csp', 'CSP review', '[{{\"id\":\"c\",\"type\":\"cover\",\"subtitle\":\"\"}},{{\"id\":\"k\",\"type\":\"chart\",\"heading\":\"Revenue\",\"visualizationId\":\"9c9c9c9c-9c9c-4c9c-8c9c-9c9c9c9c9c9c\",\"commentary\":\"\"}}]');")

        header, clean, unsigned = await visit("/app", "dashboard")
        check("CSP header: nonce, strict-dynamic, no unsafe-eval, no inline scripts", "'strict-dynamic'" in header and "unsafe-eval" not in header and "script-src 'self' 'nonce-" in header and "'unsafe-inline'" not in header.split("script-src")[1].split(";")[0], header[:120])
        check("dashboard widget chart renders with no CSP violation", clean and await pg.locator("ol[aria-label$='widgets'] .recharts-surface").count() >= 1)
        # Server HTML (before hydration; browsers hide nonce values in the live DOM): every script carries this response's nonce.
        raw = await pg.request.get(BASE + "/app")
        raw_nonce = re.search(r"'nonce-([^']+)'", raw.headers.get("content-security-policy", "")).group(1)
        raw_scripts = [x for x in re.findall(r"<script\b[^>]*>", await raw.text()) if "ld+json" not in x]
        check("every script in the server HTML carries the response's nonce", raw_scripts and all(f'nonce="{raw_nonce}"' in x for x in raw_scripts), f"{len(raw_scripts)} scripts")
        second = await pg.request.get(BASE + "/app")
        check("a new nonce is generated for every response", re.search(r"'nonce-([^']+)'", second.headers.get("content-security-policy", "")).group(1) != raw_nonce)
        _, clean, _ = await visit("/app/visualizations/new", "builder")
        check("chart builder renders a live chart with no CSP violation", clean and await pg.locator(".recharts-surface").count() >= 1)
        _, clean, _ = await visit("/app/visualizations", "library")
        check("chart library works with no CSP violation", clean and await pg.locator(".recharts-surface").count() >= 1)
        _, clean, _ = await visit("/app/datasets/store-sales", "dataset")
        check("dataset page works with no CSP violation", clean and await pg.locator("tbody tr").count() > 0)

        async def present():
            await pg.get_by_role("button", name="Present").click(); await pg.keyboard.press("ArrowRight"); await pg.keyboard.press("Escape")
        _, clean, _ = await visit("/app/reports/csp", "report", present)
        check("report with a live chart and presentation mode: no CSP violation", clean and await pg.locator("section[aria-label^='Page '] .recharts-surface").count() >= 1)
        r = await pg.request.get(BASE + "/app/reports/csp/pdf")
        check("report PDF export still works", r.status == 200 and (await r.body())[:5] == b"%PDF-")

        async def share():
            await pg.get_by_role("button", name="Share").click(); await pg.get_by_role("button", name="Create link").click()
            await pg.get_by_text("Link copied").first.wait_for(timeout=15000)
        _, clean, _ = await visit("/app/reports/csp", "share dialog", share)
        check("creating a share link: no CSP violation", clean)
        token = sql("select token from shares limit 1")
        anon_ctx = await b.new_context(); await anon_ctx.add_init_script(WATCH); ap = await anon_ctx.new_page()
        resp = await ap.goto(BASE + f"/share/{token}", wait_until="networkidle")
        await ap.get_by_role("button", name="Presentation mode").click(); await ap.keyboard.press("Escape")
        sv = await ap.evaluate("window.__csp || []")
        check("public share page and its presentation mode: no CSP violation", resp.status == 200 and not sv and await ap.locator(".recharts-surface").count() >= 1, str(sv))

        async def ask():
            await pg.fill("#assistant-input", "What is revenue by region?"); await pg.keyboard.press("Enter")
            await pg.locator("[data-testid='ai-answer']").first.wait_for(timeout=40000)
        _, clean, _ = await visit("/app/insights", "AI", ask)
        check("AI question and evidence charts: no CSP violation", clean and await pg.locator("[aria-label='Evidence'] .recharts-surface").count() >= 1)
        _, clean, _ = await visit("/app/settings", "settings")
        check("settings: no CSP violation", clean)
        for path in ["/", "/pricing", "/login"]:
            c2 = await b.new_context(); await c2.add_init_script(WATCH); p2 = await c2.new_page()
            await p2.goto(BASE + path, wait_until="networkidle")
            v = await p2.evaluate("window.__csp || []")
            violations.extend(f"{path}: {x}" for x in v)
            await c2.close()
        check("marketing and sign-in pages: no CSP violation", not [x for x in violations if x.split(":")[0] in ("/", "/pricing", "/login")])
        check("fonts are allowed by the CSP (only the sandbox network blocks Google Fonts here)", not [x for x in violations if "font" in x])
        check("no CSP violations anywhere", not violations and not console_csp, "; ".join((violations + console_csp)[:3]))
        check("no client-side JavaScript errors", not errors, "; ".join(errors[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
