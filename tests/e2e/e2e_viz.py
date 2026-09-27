import asyncio, glob, os, re, email, json, subprocess, time, csv, urllib.request
from playwright.async_api import async_playwright
BASE = "http://localhost:3100"; FX = "/home/claude/visuioration/tests/fixtures"
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
def sql(q): return subprocess.run(["su", "postgres", "-c", f'psql -tAq -d sbtest -c "{q}"'], capture_output=True, text=True).stdout.strip()

# Independent expectations from the fixture
rows = list(csv.DictReader(open(f"{FX}/sales.csv", encoding="utf-8-sig")))
money = lambda s: float(s.replace("$", "").replace(",", ""))
total_rev = sum(money(r["Revenue"]) for r in rows)
west = [r for r in rows if r["Region"] == "West"]
west_recent = [r for r in west if r["Date"][:7] in ("2026-04", "2026-05", "2026-06")]
usd = lambda v: "${:,.0f}".format(v)

def latest_link(to, since):
    files = sorted(f for f in glob.glob("/tmp/sb/mail/*.eml") if to in f and os.path.getmtime(f) >= since)
    if not files: return None
    msg = email.message_from_bytes(open(files[-1], "rb").read()); body = ""
    for part in msg.walk():
        if part.get_content_type() in ("text/html", "text/plain"): body += part.get_payload(decode=True).decode("utf-8", "ignore")
    m = re.search(r'href="([^"]+verify[^"]+)"', body); return m.group(1).replace("&amp;", "&") if m else None

async def new_user(browser, name, mail, pw, width=1440):
    ctx = await browser.new_context(viewport={"width": width, "height": 1000})
    await ctx.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
    pg = await ctx.new_page(); t = time.time() - 1
    await pg.goto(BASE + "/signup", wait_until="networkidle")
    await pg.fill("#signup-name", name); await pg.fill("#signup-email", mail); await pg.fill("#signup-password", pw)
    await pg.get_by_role("button", name="Create account").click(); await pg.get_by_text("Confirm your email").wait_for(timeout=15000)
    link = None
    for _ in range(40):
        link = latest_link(mail, t)
        if link: break
        await asyncio.sleep(0.25)
    await pg.goto(link, wait_until="networkidle")
    return ctx, pg

async def import_file(pg, source_label, path, name=None):
    await pg.goto(BASE + "/app/datasets", wait_until="networkidle")
    await pg.get_by_role("button", name="Import dataset").first.click()
    await pg.get_by_role("radio", name=re.compile(source_label)).click(); await pg.get_by_role("button", name="Continue").click()
    await pg.set_input_files("#import-file", path)
    if name: await pg.fill("#import-name", name)
    await pg.get_by_role("dialog").get_by_role("button", name="Import dataset").click()
    await pg.locator("text=/Dataset imported|Imported, with a few things|couldn't be processed|Import didn't finish/").wait_for(timeout=60000)
    await pg.keyboard.press("Escape")

async def footer(pg, expect, timeout=15):
    loc = pg.locator("section[aria-label='Visualization preview'] div.border-t > span.tnum").first
    text = ""
    for _ in range(int(timeout * 4)):
        text = await loc.inner_text()
        if expect in text: return True, text
        await asyncio.sleep(0.25)
    return False, text

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE + "/app/visualizations/new", wait_until="networkidle")
        check("builder with no datasets asks for an import", await pg.get_by_text("Import a dataset to start charting").count() == 1)
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        ds = sql("select id from datasets where slug='store-sales'")
        check("upload loads every row for charts", sql(f"select count(*) from dataset_rows where dataset_id='{ds}'") == "1200" and sql(f"select rows_loaded_at is not null and query_row_count = 1200 from datasets where id='{ds}'") == "t")
        check("stored rows are typed (currency number, ISO date, boolean)", sql(f"select cells->>1 || '|' || jsonb_typeof(cells->3) || '|' || (cells->>3) || '|' || jsonb_typeof(cells->6) from dataset_rows where dataset_id='{ds}' and row_number=1") == "2026-01-01|number|1000|boolean")

        # --- Builder: default chart is revenue over time, computed from all rows ---
        await pg.goto(BASE + "/app/visualizations/new", wait_until="networkidle")
        ok, text = await footer(pg, usd(total_rev))
        check("default chart sums the whole dataset in the database", ok and "1,200 rows" in text, text)
        check("default title describes the chart", (await pg.locator("#cfg-title").input_value()) == "Sum of Revenue by date")
        check("date axis grouped by month (6 points)", await pg.locator("figure[role] ~ * , figcaption tbody tr").count() == 6 or len(await pg.locator("figcaption table tbody tr").all_inner_texts()) == 6)
        # switch to Region + Average
        await pg.get_by_role("button", name="Region", exact=True).click()
        await pg.select_option("#cfg-agg", "avg")
        ok, text = await footer(pg, "${:,.0f}".format(total_rev / len(rows)))
        check("aggregation changes are recalculated (average)", ok, text)
        # filter Region is West
        await pg.select_option("#cfg-agg", "sum")
        await pg.get_by_role("button", name="Add filter").click()
        await pg.get_by_label("Filter column").select_option(label="Region")
        await pg.get_by_label("Value").fill("West")
        ok, text = await footer(pg, f"{len(west):,} rows")
        check("filters narrow the rows", ok and usd(sum(money(r['Revenue']) for r in west)) in text, text)
        # date range last 3 months (anchored to latest date in data)
        await pg.select_option("#cfg-range", "last_3_months")
        ok, text = await footer(pg, f"{len(west_recent):,} rows")
        check("date range anchors to the dataset's latest date", ok and usd(sum(money(r['Revenue']) for r in west_recent)) in text, text)
        check("range hint shows the anchor date", await pg.get_by_text("Ends 2026-06-27, the latest date in this dataset.").count() == 1)
        # series split + bar chart
        await pg.get_by_role("button", name="Bar", exact=True).click()
        await pg.select_option("#cfg-group", label="Returned")
        await asyncio.sleep(1.5)
        legend = await pg.locator(".recharts-legend-item-text").all_inner_texts()
        check("group by splits into series", sorted(legend) == ["No", "Yes"], str(legend))
        await pg.fill("#cfg-title", "West revenue by region, recent")
        await pg.get_by_label("Add to dashboard").check()
        await pg.get_by_role("button", name="Save visualization").click()
        await pg.wait_for_url(BASE + "/app/visualizations", timeout=15000); await pg.wait_for_load_state("networkidle")
        cfg = json.loads(sql("select json_build_object('kind', kind, 'pinned', pinned, 'name', name, 'config', config) from visualizations"))
        check("visualization persisted with its definition", cfg["kind"] == "bar" and cfg["pinned"] and cfg["config"]["x"]["column"] == 2 and cfg["config"]["series"]["column"] == 6 and cfg["config"]["dateRange"]["preset"] == "last_3_months" and cfg["config"]["filters"][0]["value"] == "West", json.dumps(cfg["config"])[:160])
        card = pg.locator("li", has=pg.get_by_role("heading", name="West revenue by region, recent"))
        check("library shows the saved chart, calculated live", await card.locator(".recharts-surface").count() >= 1 and await card.get_by_text("On dashboard").count() == 1)

        # --- Edit ---
        vid = sql("select id from visualizations")
        await card.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("link", name="Edit").click()
        await pg.wait_for_url(re.compile(r"/app/visualizations/new\?id="), timeout=10000); await pg.wait_for_load_state("networkidle")
        check("editing restores saved settings", (await pg.locator("#cfg-title").input_value()) == "West revenue by region, recent" and (await pg.locator("#cfg-range").input_value()) == "last_3_months" and (await pg.locator("#cfg-group").input_value()) == "6")
        ok, _ = await footer(pg, f"{len(west_recent):,} rows")
        check("edited chart recalculates", ok)
        await pg.get_by_role("button", name="Line", exact=True).click()
        await pg.get_by_role("button", name="Save changes").click(); await pg.wait_for_url(BASE + "/app/visualizations", timeout=15000)
        check("changes saved to the same record", sql("select count(*) || ':' || max(kind) from visualizations") == "1:line")

        # --- Library actions ---
        await pg.wait_for_load_state("networkidle")
        card = pg.locator("li", has=pg.get_by_role("heading", name="West revenue by region, recent"))
        await card.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Duplicate").click()
        await pg.get_by_text("Visualization duplicated").wait_for(timeout=10000); await pg.wait_for_load_state("networkidle"); await asyncio.sleep(1)
        check("duplicate creates a copy", sql("select count(*) from visualizations where name like '%(copy)'") == "1")
        copy = pg.locator("li", has=pg.get_by_role("heading", name="West revenue by region, recent (copy)"))
        await copy.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Rename").click()
        await pg.fill("#viz-name", "Renamed copy"); await pg.get_by_role("button", name="Rename").last.click()
        await pg.get_by_text("Renamed", exact=True).wait_for(timeout=10000)
        check("rename persists", sql("select count(*) from visualizations where name='Renamed copy'") == "1")
        await card.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Remove from dashboard").click()
        await pg.get_by_text("Removed from dashboard").wait_for(timeout=10000)
        check("dashboard flag persists", sql(f"select pinned from visualizations where id='{vid}'") == "f")
        renamed = pg.locator("li", has=pg.get_by_role("heading", name="Renamed copy"))
        await renamed.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Delete").click()
        await pg.get_by_role("dialog").get_by_role("button", name="Delete").click(); await pg.get_by_text("Visualization deleted").wait_for(timeout=10000)
        check("delete removes the record", sql("select count(*) from visualizations") == "1")

        # --- KPI + count distinct ---
        await pg.goto(BASE + "/app/visualizations/new", wait_until="networkidle")
        await pg.get_by_role("button", name="KPI", exact=True).click()
        await pg.select_option("#cfg-y", "rows")
        ok, text = await footer(pg, "Rows: 1,200")
        check("KPI of row count", ok, text)
        check("KPI renders a single big value", await pg.locator("p.font-display", has_text="1,200").count() == 1)
        await pg.select_option("#cfg-y", "2")
        ok, text = await footer(pg, "Distinct Region: 4")
        check("count distinct on a text column", ok, text)

        # --- Search finds saved chart ---
        await pg.keyboard.press("Control+k"); await pg.keyboard.type("West revenue")
        check("command search lists real saved charts, not samples", await pg.get_by_role("option", name=re.compile("West revenue by region")).count() == 1 and await pg.get_by_role("option", name=re.compile("Revenue Overview")).count() == 0)
        await pg.keyboard.press("Escape")

        # --- Legacy dataset: prepare for charts ---
        sql(f"delete from dataset_rows where dataset_id='{ds}'"); sql(f"update datasets set rows_loaded_at=null, query_row_count=null where id='{ds}'")
        await pg.goto(BASE + "/app/visualizations/new", wait_until="networkidle")
        check("unprepared dataset offers Prepare for charts", await pg.get_by_role("button", name="Prepare for charts").count() == 1)
        await pg.get_by_role("button", name="Prepare for charts").click()
        ok, text = await footer(pg, usd(total_rev), timeout=30)
        check("prepare loads rows and the chart appears", ok and sql(f"select count(*) from dataset_rows where dataset_id='{ds}'") == "1200", text)

        # --- Isolation ---
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        await bp.goto(BASE + f"/app/visualizations/new?id={vid}", wait_until="networkidle")
        check("other workspace can't open the saved chart", await bp.get_by_text("We couldn't find that").count() == 1)
        await bp.goto(BASE + "/app/visualizations", wait_until="networkidle")
        check("other workspace sees an empty library", await bp.get_by_text("No saved visualizations").count() == 1)
        anon = open("/tmp/sb/keys.env").read().split("ANON_KEY=")[1].split("\n")[0]
        tok = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:54321/auth/v1/token?grant_type=password", data=json.dumps({"email": "bob@example.com", "password": "bob-password-1"}).encode(), headers={"apikey": anon, "content-type": "application/json"})).read())["access_token"]
        req = urllib.request.Request("http://localhost:54321/rest/v1/rpc/query_dataset", data=json.dumps({"p_dataset": ds, "p_spec": {"y": {"agg": "count"}}}).encode(), headers={"apikey": anon, "Authorization": f"Bearer {tok}", "content-type": "application/json"})
        try: code = urllib.request.urlopen(req).status
        except urllib.error.HTTPError as e: code = e.code
        check("other user can't query the dataset via API", code in (400, 404), str(code))
        req = urllib.request.Request("http://localhost:54321/rest/v1/rpc/query_dataset", data=json.dumps({"p_dataset": ds, "p_spec": {"y": {"agg": "count"}}}).encode(), headers={"apikey": anon, "content-type": "application/json"})
        try: code = urllib.request.urlopen(req).status
        except urllib.error.HTTPError as e: code = e.code
        check("anonymous callers can't run queries", code in (401, 403, 404), str(code))

        # --- Viewer ---
        cctx, cp = await new_user(b, "Carol Chen", "carol@example.com", "carol-password-1")
        ws = sql(f"select workspace_id from datasets where id='{ds}'")
        sql(f"insert into workspace_members (workspace_id, user_id, role) select '{ws}', id, 'viewer' from auth.users where email='carol@example.com'")
        await cctx.add_cookies([{"name": "vz_workspace", "value": ws, "url": BASE}])
        await cp.goto(BASE + "/app/visualizations", wait_until="networkidle")
        check("viewer sees the chart but no actions", await cp.get_by_role("heading", name="West revenue by region, recent").count() == 1 and await cp.get_by_role("button", name=re.compile("Actions for")).count() == 0)
        await cp.goto(BASE + f"/app/visualizations/new?id={vid}", wait_until="networkidle")
        check("viewer can't save", await cp.get_by_role("button", name="Save changes").is_disabled())

        # --- Dataset deleted: chart explains ---
        await pg.goto(BASE + "/app/datasets/store-sales", wait_until="networkidle")
        await pg.get_by_role("button", name="Delete").click(); await pg.get_by_role("button", name="Delete dataset").click()
        await pg.wait_for_url(BASE + "/app/datasets", timeout=15000)
        check("dataset delete removes its rows", sql(f"select count(*) from dataset_rows where dataset_id='{ds}'") == "0")
        await pg.goto(BASE + "/app/visualizations", wait_until="networkidle")
        check("chart whose dataset was deleted says so", await pg.get_by_text("The dataset for this chart was deleted.").count() == 1)

        # --- Mobile ---
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await bctx.storage_state()); mp = await m.new_page()
        await import_file(bp, "CSV", f"{FX}/sales.csv")
        for path in ["/app/visualizations/new", "/app/visualizations"]:
            await mp.goto(BASE + path, wait_until="networkidle"); await asyncio.sleep(1)
            sw = await mp.evaluate("document.documentElement.scrollWidth"); check(f"no horizontal overflow at 375px {path}", sw <= 376, str(sw))
        await mp.goto(BASE + "/app/visualizations/new", wait_until="networkidle")
        await mp.get_by_role("button", name="Configure").click()
        check("mobile configure sheet opens", await mp.get_by_role("dialog", name="Configure chart").count() == 1)
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
