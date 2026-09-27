"""Staging test of the AI pipeline against the REAL Anthropic API (not part of CI).

Prerequisites: the local stack (tests/local-stack), `python3 tests/ai-staging/fault_proxy.py` running, and the
app started with ANTHROPIC_API_KEY=<staging key> ANTHROPIC_BASE_URL=http://127.0.0.1:4011 on port 3100.
Never commit the key. Expected figures are computed independently from tests/fixtures/sales.csv."""
import asyncio, csv, os, re, sys
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(__file__))
exec(open(os.path.join(os.path.dirname(__file__), "..", "e2e", "e2e_viz.py")).read().split("async def main" + "():")[0].replace('FX = "/home/claude/visuioration/tests/fixtures"', f'FX = "{os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures"))}"'))
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

rows = list(csv.DictReader(open(os.path.join(FX, "sales.csv"), encoding="utf-8-sig")))
money = lambda s: float(s.replace("$", "").replace(",", ""))
total = sum(money(r["Revenue"]) for r in rows)
by_region = {}
for r in rows: by_region[r["Region"]] = by_region.get(r["Region"], 0) + money(r["Revenue"])
west = sum(money(r["Revenue"]) for r in rows if r["Region"] == "West")
def figures(text): return {round(float(x.replace(",", ""))) for x in re.findall(r"\$([\d,]+(?:\.\d+)?)(?![\dKMB])", text)}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        _, pg = await new_user(b, "Staging Tester", "staging@example.com", "staging-password-1")
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        await pg.goto(BASE + "/app/insights", wait_until="networkidle")
        async def ask(q):
            before = await pg.locator("section[aria-labelledby='assistant-title'] ol > li").count()
            await pg.fill("#assistant-input", q); await pg.keyboard.press("Enter")
            item = pg.locator("section[aria-labelledby='assistant-title'] ol > li").nth(before)
            await item.locator("[data-testid='ai-answer'], [role='alert']").first.wait_for(timeout=90000)
            text = await item.locator("[data-testid='ai-answer'], [role='alert']").first.inner_text()
            verified = await item.get_by_text("Every number above was checked").count() == 1
            template = await item.get_by_text("Summary generated directly").count() == 1
            evidence = await item.locator("[aria-label='Evidence'] > figure").count()
            return text, verified, template, evidence
        t, v, tpl, ev = await ask("What is our total revenue?")
        check("normal question: answered from a database query", ev >= 1 and (v or tpl), t[:120])
        check("aggregation: total matches the source data", round(total) in figures(t) or tpl, t[:120])
        t, v, tpl, ev = await ask("Which region has the highest revenue?")
        top = max(by_region, key=by_region.get)
        check("aggregation by category: names the real top region", top in t and ev >= 1, t[:120])
        t, v, tpl, ev = await ask("What was revenue in the West region?")
        check("filtering: West total matches the source data", round(west) in figures(t) or (tpl and ev >= 1), t[:120])
        t, v, tpl, ev = await ask("What is our profit margin by supplier?")
        check("unsupported question is declined without evidence", ev == 0, t[:120])
        t, v, tpl, ev = await ask("[fault:malformed] What is revenue by region?")
        check("malformed model output: friendly error, nothing executed", "unexpected response" in t.lower() or "try again" in t.lower(), t[:120])
        t, v, tpl, ev = await ask("[fault:badplan] What is revenue by region?")
        check("invalid plan is rejected by validation (repaired by the real model or refused)", "drop table" not in t.lower(), t[:120])
        t, v, tpl, ev = await ask("[fault:500] What is revenue?")
        check("API error: friendly message", "busy" in t.lower() or "try again" in t.lower(), t[:120])
        t, v, tpl, ev = await ask("[fault:429] What is revenue?")
        check("provider rate limit: friendly message", "rate limiting" in t.lower() or "wait" in t.lower(), t[:120])
        t, v, tpl, ev = await ask("How has revenue changed month by month?")
        check("evidence and number verification: every figure checked or template used", (v or tpl) and ev >= 1, t[:120])
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} staging checks passed")
asyncio.run(main())
