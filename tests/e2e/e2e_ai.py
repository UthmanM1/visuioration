import asyncio, re, json, csv, time, subprocess, urllib.request
from playwright.async_api import async_playwright
import importlib.util
spec = importlib.util.spec_from_file_location("v", "/tmp/e2e_viz.py"); v = importlib.util.module_from_spec(spec)
exec(open("/tmp/e2e_viz.py").read().split("async def main():")[0], v.__dict__)
BASE, FX, sql, new_user, import_file = v.BASE, v.FX, v.sql, v.new_user, v.import_file
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

rows = list(csv.DictReader(open(f"{FX}/sales.csv", encoding="utf-8-sig")))
money = lambda s: float(s.replace("$", "").replace(",", ""))
by_region = {}
for r in rows: by_region[r["Region"]] = by_region.get(r["Region"], 0) + money(r["Revenue"])
total = sum(by_region.values()); top = max(by_region, key=by_region.get)
usd = lambda x: "${:,.0f}".format(x)
share = f"{round(by_region[top] / total * 1000) / 10:g}%"
west_recent = sum(money(r["Revenue"]) for r in rows if r["Region"] == "West" and r["Date"][:7] in ("2026-04", "2026-05", "2026-06"))
west_recent_n = sum(1 for r in rows if r["Region"] == "West" and r["Date"][:7] in ("2026-04", "2026-05", "2026-06"))

async def ask(pg, q, timeout=40):
    before = await pg.locator("section[aria-labelledby='assistant-title'] ol > li").count()
    await pg.fill("#assistant-input", q); await pg.keyboard.press("Enter")
    item = pg.locator("section[aria-labelledby='assistant-title'] ol > li").nth(before)
    for _ in range(timeout * 4):
        if await item.locator("[data-testid='ai-answer'], [role='alert']").count(): break
        await asyncio.sleep(0.25)
    return item

async def main():
    open("/tmp/fake_anthropic_requests.jsonl", "w").close()
    # This suite asks many questions quickly; the per-minute burst limit is tested in e2e_ratelimit.py.
    sql("update rate_limit_policies set max_hits = 1000 where bucket = 'ai_request'")
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE + "/app/insights", wait_until="networkidle")
        check("no data yet: points to import", await pg.get_by_text("importing a dataset").count() == 1)
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        await pg.goto(BASE + "/app/insights", wait_until="networkidle")
        sugg = await pg.locator("section[aria-labelledby='assistant-title'] ul button").all_inner_texts()
        check("suggested questions come from the dataset's own columns", "Which region has the highest revenue?" in sugg and "How has revenue changed over time?" in sugg, str(sugg))

        # 1. full pipeline
        item = await ask(pg, "What is revenue by region?")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("answer quotes the real top region, value and share", top in answer and usd(by_region[top]) in answer and share in answer and usd(total) in answer, answer)
        check("answer marked as verified", await item.get_by_text("Every number above was checked against the query results.").count() == 1)
        check("evidence: two charts (breakdown + total)", await item.locator("[aria-label='Evidence'] > figure").count() == 2 and await item.locator("[aria-label='Evidence'] .recharts-surface").count() >= 1)
        await item.locator("summary", has_text="How this was calculated").first.click()
        details = await item.locator("details").first.inner_text()
        check("evidence explains what was computed on how many rows", "Sum of Revenue by Region" in details and "1,200 of 1,200 rows in Store sales" in details, details[:160])
        check("follow-up questions offered", await item.locator("button", has_text="How has revenue changed over time?").count() == 1)
        check("source links to the dataset", await item.get_by_role("link", name="Store sales").get_attribute("href") == "/app/datasets/store-sales")

        # 2. invented number rejected, rewrite accepted
        item = await ask(pg, "invent something: revenue by region")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("invented numbers are rejected and the answer rewritten", "9,999,999" not in answer and usd(by_region[top]) in answer and await item.get_by_text("Every number above was checked").count() == 1, answer)

        # 3. model keeps inventing -> template from computed facts
        item = await ask(pg, "stubborn: revenue by region")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("persistent invention falls back to a summary of computed figures", "9,999,999" not in answer and "87%" not in answer and usd(by_region[top]) in answer and await item.get_by_text("Summary generated directly from the computed figures.").count() == 1, answer)

        # 4. filters + date range, numbers match independent calculation
        item = await ask(pg, "What was West revenue in the last 3 months?")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("filtered, date-ranged answer matches independent calculation", usd(west_recent) in answer and f"{west_recent_n:,}" in answer, answer)

        # 5. invalid plan repaired
        item = await ask(pg, "bad column revenue by region")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("invalid query plan is repaired on retry", usd(by_region[top]) in answer, answer)

        # 6. cannot answer
        item = await ask(pg, "What is our profit margin?")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("unanswerable question says so, with no evidence", "no profit" in answer and await item.locator("[aria-label='Evidence']").count() == 0, answer)

        item = await ask(pg, "margin trick: what is our margin?")
        answer = await item.locator("[data-testid='ai-answer']").inner_text()
        check("an invented number in a 'cannot answer' reason is removed", "2.4" not in answer and "can't be answered" in answer, answer)

        # 7. provider errors
        item = await ask(pg, "overload please")
        err = await item.locator("[role='alert']").inner_text()
        check("provider overload shows a friendly error", "busy" in err, err)

        # 8. what was sent to the provider
        reqs = [json.loads(l) for l in open("/tmp/fake_anthropic_requests.jsonl")]
        bodies = "\n".join(json.dumps(r["body"]) for r in reqs)
        check("requests use forced tool calls, API key header and version", all(r["headers"]["x-api-key"] == "test-key" and r["headers"]["anthropic-version"] == "2023-06-01" and r["body"]["tool_choice"]["type"] == "tool" for r in reqs))
        schemas = [json.loads(re.search(r"<schema>(.*?)</schema>", r["body"]["messages"][0]["content"], re.S).group(1)) for r in reqs if r["body"]["tools"][0]["name"] == "plan_queries"]
        evid = [json.loads(re.search(r"<evidence>(.*?)</evidence>", r["body"]["messages"][0]["content"], re.S).group(1)) for r in reqs if r["body"]["tools"][0]["name"] == "give_answer"]
        cols = {c["name"]: c for c in schemas[0][0]["columns"]}
        check("schema: names and types only; examples just for small category columns", "examples" not in cols["Order ID"] and cols["Region"]["examples"] == ["North", "South", "East", "West"] and all(len(x) <= 40 for c in cols.values() for x in c.get("examples", [])))
        labels = {row["label"] for e in evid for item in e for row in item["results"]}
        check("explanation receives aggregated results only, never raw rows", "NS-10000" not in bodies and labels <= {"North", "South", "East", "West", "(empty)"}, str(sorted(labels))[:120])
        check("schema sent: column names, types, category examples", '\\"name\\": \\"Region\\"' in bodies or '"name":"Region"' in bodies.replace("\\", "") )
        check("API key never appears in request bodies", "test-key" not in bodies)

        # 9. audit log
        stats = sql("select string_agg(status || ':' || coalesce(verified::text,'-'), ',' order by created_at) from ai_requests")
        check("every question logged with outcome and verification", stats == "answered:true,answered:true,answered:false,answered:true,answered:true,cannot_answer:true,cannot_answer:false,failed:-", stats)
        check("log stores tokens and model, not answers", sql("select bool_and(input_tokens > 0 and model = 'claude-sonnet-5') from ai_requests where status <> 'failed'") == "t")

        # 10. rate limit
        uid = sql("select id from auth.users where email='alice@example.com'"); ws = sql("select workspace_id from datasets limit 1")
        open("/tmp/rl.sql", "w").write(f"insert into ai_requests (workspace_id, user_id, question, status) select '{ws}', '{uid}', 'x', 'answered' from generate_series(1, 30);")
        subprocess.run(["su", "postgres", "-c", "psql -q -d sbtest -f /tmp/rl.sql"], capture_output=True)
        item = await ask(pg, "What is revenue by region?")
        err = await item.locator("[role='alert']").inner_text()
        check("rate limit per user per hour", "questions in the last hour" in err, err)

        # 11. other workspace: can't reach Alice's data
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        await bp.goto(BASE + "/app/insights", wait_until="networkidle")
        check("other workspace has no data for AI to use", await bp.get_by_text("importing a dataset").count() == 1)

        # 12. not configured
        nk = await actx.new_page()
        await nk.goto("http://localhost:3101/app/insights", wait_until="networkidle")
        check("without an API key the page explains how to connect AI", await nk.get_by_text("AI isn't connected yet").count() == 1 and await nk.locator("#assistant-input").is_disabled())

        # 13. mobile
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await actx.storage_state()); mp = await m.new_page()
        await mp.goto(BASE + "/app/insights", wait_until="networkidle")
        check("no horizontal overflow at 375px", await mp.evaluate("document.documentElement.scrollWidth") <= 376)
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    sql("update rate_limit_policies set max_hits = 6 where bucket = 'ai_request'")
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
