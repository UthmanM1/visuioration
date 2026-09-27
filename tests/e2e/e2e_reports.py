import asyncio, re, json, subprocess, datetime, urllib.request
from playwright.async_api import async_playwright
import importlib.util
exec(open("/tmp/e2e_viz.py").read().split("async def main" + "():")[0])
exec(open("/tmp/e2e_dash.py").read().split("async def widget_names")[0].split("results = []")[1].split("def check")[0]) if False else None
dash_src = open("/tmp/e2e_dash.py").read()
exec(dash_src[dash_src.index("def make_charts"):dash_src.index("async def widget_names")])
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
def pdf_info(data: bytes, path="/tmp/check.pdf"):
    open(path, "wb").write(data)
    text = subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True).stdout
    pages = subprocess.run(["pdfinfo", path], capture_output=True, text=True).stdout
    n = int(re.search(r"Pages:\s+(\d+)", pages).group(1)) if "Pages:" in pages else 0
    return text, n

async def pick(select, prefix):
    opts = await select.locator("option").all()
    for o in opts:
        if (await o.inner_text()).startswith(prefix):
            await select.select_option(value=await o.get_attribute("value")); return
    raise AssertionError(f"no option starting {prefix}")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        ds = sql("select id from datasets where slug='store-sales'"); ws = sql(f"select workspace_id from datasets where id='{ds}'")
        make_charts(ws, ds)

        await pg.goto(BASE + "/app/reports", wait_until="networkidle")
        check("empty library invites creating a report", await pg.get_by_text("No reports yet").count() == 1)
        await pg.get_by_role("link", name="New report").first.click(); await pg.wait_for_url(BASE + "/app/reports/new"); await pg.wait_for_load_state("networkidle")
        check("builder starts with a sensible outline", [t.strip() for t in await pg.locator("ol[aria-label='Report sections'] > li h2").all_inner_texts()] == ["Cover", "Executive summary", "Key metrics", "Chart section", "Recommendations"])
        await pg.fill("#report-title", "Q3 Review"); await pg.fill("#report-period", "Q3 2026"); await pg.fill("#report-description", "For the leadership team.")
        secs = pg.locator("ol[aria-label='Report sections'] > li")
        await secs.nth(1).locator("textarea").fill("Revenue held steady across regions.\n\nWest led narrowly.")
        await secs.nth(2).get_by_role("button", name="Add number").click(); await pick(secs.nth(2).locator("select").nth(0), "Total orders")
        await secs.nth(2).get_by_role("button", name="Add number").click(); await pick(secs.nth(2).locator("select").nth(1), "Revenue by region")
        await pick(secs.nth(3).locator("select"), "Revenue by region")
        await secs.nth(3).locator("textarea").fill("All four regions are within half a percent.")
        await secs.nth(4).locator("textarea").fill("Review West checkout\nPlan Q4 inventory\n\n")
        await pg.get_by_role("button", name=re.compile("^Appendix")).click()
        await pg.get_by_role("button", name=re.compile("^Chart section")).click()
        last = secs.nth(6); await pick(last.locator("select"), "Revenue by month")
        await pg.get_by_role("button", name="Move section 7 (Revenue by month) up").click()
        titles = [t.strip() for t in await secs.locator("h2").all_inner_texts()]
        check("sections add and reorder; chart cards show the chosen chart", titles == ["Cover", "Executive summary", "Key metrics", "Revenue by region", "Recommendations", "Revenue by month", "Appendix"], str(titles))
        await pg.get_by_role("button", name="Save and view").click()
        await pg.wait_for_url(BASE + "/app/reports/q3-review", timeout=20000); await pg.wait_for_load_state("networkidle")
        stored = json.loads(sql("select sections::text from reports where slug='q3-review'"))
        check("report saved with ordered, typed sections", [s["type"] for s in stored] == ["cover", "text", "kpis", "chart", "list", "chart", "appendix"] and stored[4]["items"] == ["Review West checkout", "Plan Q4 inventory"], str([s["type"] for s in stored]))
        pages = pg.locator("section[aria-label^='Page ']")
        check("report renders one page per section with page numbers", await pages.count() == 7 and await pg.get_by_text("Page 7 of 7").count() == 1)
        check("cover shows title, period and author", await pages.nth(0).get_by_text("Q3 Review").count() >= 1 and await pages.nth(0).get_by_text("Q3 2026").count() == 1 and await pages.nth(0).get_by_text("Prepared by Alice Adams").count() == 1)
        kpis = await pages.nth(2).inner_text()
        check("KPI section shows live totals", "1,200" in kpis and usd(total_rev) in kpis, kpis.replace("\n", " | ")[:160])
        check("chart sections embed live charts with commentary", await pages.nth(3).locator(".recharts-surface").count() >= 1 and await pages.nth(3).get_by_text("All four regions are within half a percent.").count() == 1 and await pages.nth(5).locator(".recharts-surface").count() >= 1)
        check("appendix lists data sources", await pages.nth(6).get_by_text(re.compile("Store sales: up to 1,200 rows used")).count() == 1)

        # presentation
        await pg.get_by_role("button", name="Present").click(); await pg.keyboard.press("ArrowRight"); await pg.keyboard.press("ArrowRight")
        check("presentation mode steps through pages", await pg.get_by_role("dialog", name="Presentation mode").get_by_text("3 / 7").count() == 1)
        await pg.keyboard.press("Escape")

        # PDF export
        resp = await pg.request.get(BASE + "/app/reports/q3-review/pdf")
        body = await resp.body(); text, npages = pdf_info(body)
        check("PDF export downloads a real PDF", resp.status == 200 and resp.headers["content-type"] == "application/pdf" and body[:5] == b"%PDF-" and "attachment" in resp.headers.get("content-disposition", ""))
        check("PDF contains the report's text and live figures", "Q3 Review" in text and "Executive summary" in text and "3,538,050" in text and "Review West checkout" in text and npages >= 3, f"pages={npages}")
        anon = await b.new_context(); ap = await anon.new_page()
        r = await ap.request.get(BASE + "/app/reports/q3-review/pdf", max_redirects=0)
        check("PDF export requires sign-in", r.status in (302, 303, 307, 308) and "/login" in r.headers.get("location", ""), str(r.status))

        # share: create 7-day link
        await pg.get_by_role("button", name="Share").click()
        await pg.fill("#share-label", "Board pack"); await pg.get_by_role("button", name="Create link").click()
        await pg.get_by_text("Link copied").first.wait_for(timeout=15000)
        await pg.locator("ul[aria-label='Share links'] li").first.wait_for(timeout=10000)
        row = await pg.locator("ul[aria-label='Share links'] li").first.inner_text()
        check("link created, listed as active with its expiry", "Board pack" in row and "Active" in row and re.search(r"Expires in 7 days", row) is not None, row.replace("\n", " | "))
        token = sql("select token from shares where label='Board pack'")
        exp_days = float(sql("select extract(epoch from (expires_at - created_at)) / 86400 from shares where label='Board pack'"))
        check("expiry stored server-side (7 days)", abs(exp_days - 7) < 0.01 and len(token) == 64, str(exp_days))
        check("report marked published once shared", sql("select status from reports where slug='q3-review'") == "published")

        # anonymous viewer
        await ap.goto(BASE + f"/share/{token}", wait_until="networkidle")
        check("anonymous visitor sees the shared report", await ap.get_by_role("heading", name="Q3 Review").count() >= 1 and await ap.locator("section[aria-label^='Page ']").count() == 7 and await ap.get_by_text("Powered by Visuioration").count() == 1)
        check("shared view shows live figures from the snapshot", usd(total_rev) in await ap.locator("section[aria-label^='Page ']").nth(2).inner_text())
        check("share page tells viewers when the snapshot was taken and when it expires", await ap.get_by_text(re.compile(r"Snapshot from .* link expires")).count() == 1)
        check("share page is noindex and sends no referrer", await ap.locator("meta[name='robots'][content*='noindex']").count() >= 1 and await ap.locator("meta[name='referrer'][content='no-referrer']").count() == 1)
        check("share page has no app navigation", await ap.get_by_role("navigation", name="Workspace").count() == 0)
        r = await ap.request.get(BASE + f"/share/{token}/pdf"); sbody = await r.body(); stext, _ = pdf_info(sbody, "/tmp/share.pdf")
        check("anonymous PDF download from the link", r.status == 200 and sbody[:5] == b"%PDF-" and "Q3 Review" in stext)

        # snapshot is frozen until refreshed
        await pg.keyboard.press("Escape")
        await pg.goto(BASE + "/app/reports/new?id=" + sql("select id from reports where slug='q3-review'"), wait_until="networkidle")
        await pg.fill("#report-title", "Q3 Review (final)"); await pg.get_by_role("button", name="Save and view").click()
        await pg.wait_for_url(BASE + "/app/reports/q3-review-final", timeout=20000)
        await ap.reload(wait_until="networkidle")
        check("link keeps serving its snapshot after edits", await ap.get_by_role("heading", name="Q3 Review", exact=True).count() >= 1 and await ap.get_by_text("Q3 Review (final)").count() == 0)
        await pg.get_by_role("button", name="Share").click(); await pg.locator("ul[aria-label='Share links'] li").first.wait_for()
        await pg.get_by_role("button", name="Update snapshot").click(); await pg.get_by_text("Shared version updated").wait_for(timeout=15000)
        await ap.reload(wait_until="networkidle")
        check("refreshing the link updates the shared version", await ap.get_by_text("Q3 Review (final)").count() >= 1)

        # custom-date link and revoke
        await pg.select_option("#share-expiry", "custom")
        target = (datetime.date.today() + datetime.timedelta(days=5)).isoformat()
        await pg.fill("#share-date", target); await pg.fill("#share-label", "Until a date")
        await pg.get_by_role("button", name="Create link").click(); await pg.get_by_text("Link copied").first.wait_for(timeout=15000)
        await asyncio.sleep(1)
        check("custom expiry date ends at the end of that day (UTC)", sql("select to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') from shares where label='Until a date'") == f"{target} 23:59:59")
        await pg.select_option("#share-expiry", "never"); await pg.fill("#share-label", "Forever")
        await pg.get_by_role("button", name="Create link").click(); await pg.get_by_text("Link copied").first.wait_for(timeout=15000)
        await asyncio.sleep(1)
        forever = sql("select token from shares where label='Forever'")
        check("never-expiring link option", sql("select expires_at is null from shares where label='Forever'") == "t")
        forever_row = pg.locator("ul[aria-label='Share links'] li", has_text="Forever")
        await forever_row.get_by_role("button", name="Turn off link").click(); await pg.get_by_text("Link turned off").wait_for(timeout=10000)
        await ap.goto(BASE + f"/share/{forever}", wait_until="networkidle")
        check("revoked link shows an expired message, not the report", await ap.get_by_text("This link has expired").count() == 1 and await ap.locator("section[aria-label^='Page ']").count() == 0)

        # expiry passes
        # Test fixture only: backdate the link (created_at is protected by a trigger, so bypass triggers for this statement).
        open("/tmp/expire.sql", "w").write(f"begin; set local session_replication_role = replica; update shares set created_at = now() - interval '8 days', expires_at = now() - interval '1 hour' where token = '{token}'; commit;")
        subprocess.run(["su", "postgres", "-c", "psql -q -d sbtest -f /tmp/expire.sql"], capture_output=True)
        await ap.goto(BASE + f"/share/{token}", wait_until="networkidle")
        check("expired link stops working", await ap.get_by_text("This link has expired").count() == 1)
        r = await ap.request.get(BASE + f"/share/{token}/pdf")
        check("expired link's PDF returns 410 Gone", r.status == 410, str(r.status))
        for bad in ["not-a-token", "0" * 64]:
            r = await ap.goto(BASE + f"/share/{bad}")
            check(f"unknown token is a 404 ({bad[:8]}…)", r.status == 404, str(r.status))

        # anonymous API access
        anon_key = open("/tmp/sb/keys.env").read().split("ANON_KEY=")[1].split("\n")[0]
        def rest(path, data=None):
            req = urllib.request.Request(f"http://localhost:54321/rest/v1/{path}", data=data, headers={"apikey": anon_key, "content-type": "application/json"})
            try: return urllib.request.urlopen(req).read().decode()
            except urllib.error.HTTPError as e: return f"HTTP {e.code}"
        denied = lambda r: r == "[]" or r.startswith("HTTP 401") or r.startswith("HTTP 403")
        check("anonymous API can't list reports or links", denied(rest("reports?select=name")) and denied(rest("shares?select=token")), rest("shares?select=token"))
        check("anonymous RPC with a wrong token returns nothing", rest("rpc/get_shared_report", json.dumps({"p_token": "f" * 64}).encode()) == "null")

        # other workspace and viewer
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        await bp.goto(BASE + "/app/reports/q3-review-final", wait_until="networkidle")
        check("other workspace can't open the report", await bp.get_by_text("We couldn't find that").count() == 1)
        r = await bp.request.get(BASE + "/app/reports/q3-review-final/pdf")
        check("other workspace can't export its PDF", r.status == 404, str(r.status))
        cctx, cp = await new_user(b, "Carol Chen", "carol@example.com", "carol-password-1")
        sql(f"insert into workspace_members (workspace_id, user_id, role) select '{ws}', id, 'viewer' from auth.users where email='carol@example.com'")
        await cctx.add_cookies([{"name": "vz_workspace", "value": ws, "url": BASE}])
        await cp.goto(BASE + "/app/reports/q3-review-final", wait_until="networkidle")
        check("viewer can read and export but not edit or share", await cp.get_by_role("link", name="Export PDF").count() == 1 and await cp.get_by_role("button", name="Share").count() == 0 and await cp.get_by_role("link", name="Edit").count() == 0)

        # search + library
        await pg.goto(BASE + "/app/reports", wait_until="networkidle")
        check("library lists the report with its active links", await pg.get_by_text("2 active links").count() == 1 or await pg.get_by_text(re.compile(r"\d active link")).count() == 1)
        await pg.keyboard.press("Control+k"); await pg.keyboard.type("Q3 Review")
        check("search finds real reports, not samples", await pg.get_by_role("option", name=re.compile("Q3 Review \\(final\\)")).count() == 1 and await pg.get_by_role("option", name=re.compile("Q2 Executive")).count() == 0)
        await pg.keyboard.press("Escape")

        # delete
        live_token = sql("select token from shares where label='Until a date'")
        card = pg.locator("li", has=pg.get_by_role("heading", name="Q3 Review (final)"))
        await card.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Delete").click()
        await pg.get_by_role("dialog").get_by_role("button", name="Delete report").click(); await pg.get_by_text("Report deleted").wait_for(timeout=10000)
        check("deleting a report deletes its links", sql("select count(*) from shares") == "0")
        r = await ap.goto(BASE + f"/share/{live_token}")
        check("links of a deleted report stop working", r.status == 404, str(r.status))
        check("charts survive report deletion", sql(f"select count(*) from visualizations where workspace_id='{ws}'") == "4")

        # mobile
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await actx.storage_state()); mp = await m.new_page()
        for path in ["/app/reports", "/app/reports/new"]:
            await mp.goto(BASE + path, wait_until="networkidle")
            check(f"no horizontal overflow at 375px {path}", await mp.evaluate("document.documentElement.scrollWidth") <= 376)
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
