import asyncio, glob, os, re, email, json, subprocess, time, urllib.request
from playwright.async_api import async_playwright
BASE = "http://localhost:3100"; FX = "/home/claude/visuioration/tests/fixtures"
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
def sql(q):
    return subprocess.run(["su", "postgres", "-c", f'psql -tAq -d sbtest -c "{q}"'], capture_output=True, text=True).stdout.strip()

def latest_link(to, since):
    files = sorted(f for f in glob.glob("/tmp/sb/mail/*.eml") if to in f and os.path.getmtime(f) >= since)
    if not files: return None
    msg = email.message_from_bytes(open(files[-1], "rb").read()); body = ""
    for part in msg.walk():
        if part.get_content_type() in ("text/html", "text/plain"): body += part.get_payload(decode=True).decode("utf-8", "ignore")
    m = re.search(r'href="([^"]+verify[^"]+)"', body); return m.group(1).replace("&amp;", "&") if m else None

async def new_user(browser, name, mail, pw):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
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
    await pg.get_by_role("radio", name=re.compile(source_label)).click()
    await pg.get_by_role("button", name="Continue").click()
    await pg.set_input_files("#import-file", path)
    if name: await pg.fill("#import-name", name)
    await pg.get_by_role("dialog").get_by_role("button", name="Import dataset").click()
    await pg.locator("text=/Dataset imported|Imported, with a few things|couldn't be processed|Import didn't finish/").wait_for(timeout=60000)
    return await pg.get_by_role("dialog").inner_text()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE + "/app/datasets", wait_until="networkidle")
        check("empty dataset list in a new workspace", await pg.get_by_text("No datasets yet").count() == 1)
        await pg.get_by_role("button", name="Import dataset").first.click()
        check("Google Sheets and API disabled in live mode", await pg.get_by_role("radio", name=re.compile("Google Sheets")).is_disabled() and await pg.get_by_role("radio", name=re.compile("API")).is_disabled())
        await pg.keyboard.press("Escape")

        # --- CSV upload ---
        text = await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        check("CSV import reports real row and column counts", "1,200 rows and 8 columns" in text, text[:120].replace("\n", " | "))
        check("CSV import surfaces data-quality issues", "Imported, with a few things to review" in text and "Notes" in text)
        ws = sql("select id from workspaces limit 1")
        ds = sql("select id || '|' || status || '|' || row_count || '|' || column_count || '|' || storage_path || '|' || size_bytes from datasets where slug='store-sales'").split("|")
        check("dataset record saved with status needs_review", ds[1] == "needs_review" and ds[2] == "1200" and ds[3] == "8", "|".join(ds[1:4]))
        check("file stored under <workspace>/<dataset>/", ds[4] == f"{ws}/{ds[0]}/sales.csv", ds[4])
        check("file exists in Supabase Storage", sql(f"select count(*) from storage.objects where bucket_id='datasets' and name='{ds[4]}'") == "1")
        check("size recorded from stored file", ds[5] == str(os.path.getsize(f"{FX}/sales.csv")), ds[5])
        cols = sql(f"select string_agg(name || ':' || data_type, ',' order by position) from dataset_columns where dataset_id='{ds[0]}'")
        check("column schema saved", cols == "Order ID:text,Date:date,Region:text,Revenue:currency,Units:integer,Discount:percent,Returned:boolean,Notes:text", cols)
        check("preview stored (200 rows)", sql(f"select jsonb_array_length(rows) from dataset_previews where dataset_id='{ds[0]}'") == "200")

        # --- Detail page ---
        await pg.get_by_role("link", name="Open dataset").click(); await pg.wait_for_url(BASE + "/app/datasets/store-sales"); await pg.wait_for_load_state("networkidle")
        check("detail page shows real counts", await pg.locator("dd", has_text="1,200").count() >= 1)
        check("detail page lists review items", await pg.get_by_text("Things to review before building charts").count() == 1)
        headers = [h.strip() for h in await pg.locator("thead th").all_inner_texts()]
        check("preview table uses the file's columns", headers[:8] == ["Order ID", "Date", "Region", "Revenue", "Units", "Discount", "Returned", "Notes"], str(headers[:8]))
        first = await pg.locator("tbody tr").first.inner_text()
        check("preview formats currency, percent and boolean", "$1,000.00" in first and "0%" in first and "Yes" in first, first.replace("\t", " | "))
        check("pagination explains preview vs total", await pg.get_by_text(re.compile(r"preview rows \(first 200 of 1,200\)")).count() == 1)
        check("low-cardinality column offered as filter", await pg.locator("#filter-c2").count() == 1)
        await pg.select_option("#filter-c2", "West"); await pg.wait_for_timeout(200)
        regions = set(await pg.locator("tbody tr td:nth-child(3)").all_inner_texts())
        check("filter narrows rows", regions == {"West"}, str(regions))
        await pg.get_by_role("button", name="Clear all").click()
        await pg.get_by_role("button", name=re.compile("^Revenue")).click(); await pg.get_by_role("button", name=re.compile("^Revenue")).click()
        check("sorting works on numeric column", (await pg.locator("tbody tr td:nth-child(4)").first.inner_text()) == "$1,000.00")
        await pg.get_by_role("tab", name=re.compile("Column information")).click()
        info = await pg.locator("#dataset-panel-columns").inner_text()
        check("column information shows types, missing and distinct", "Currency" in info and "Percent" in info and "Boolean" in info and "67%" in info, info.replace("\n", " ")[:160])

        # --- XLSX upload ---
        text = await import_file(pg, "Excel", f"{FX}/workbook.xlsx")
        check("XLSX import succeeds with real counts", "Dataset imported" in text and "300 rows and 6 columns" in text, text[:100].replace("\n", " | "))
        check("XLSX dataset is Ready", sql("select status from datasets where slug='workbook'") == "ready")
        await pg.goto(BASE + "/app/datasets/workbook", wait_until="networkidle")
        check("XLSX preview shows first sheet with dates", "2026-01-01" in await pg.locator("tbody tr").first.inner_text())

        # --- Failure path ---
        text = await import_file(pg, "Excel", f"{FX}/fake.xlsx", "Broken file")
        check("invalid workbook fails with a helpful message", "doesn't look like an .xlsx file" in text, text[:160].replace("\n", " | "))
        check("failed dataset recorded with error", sql("select status from datasets where slug='broken-file'") == "failed")
        await pg.goto(BASE + "/app/datasets", wait_until="networkidle")
        check("list shows failure reason", await pg.get_by_text("doesn't look like an .xlsx file").count() >= 1)
        # client-side validation
        await pg.get_by_role("button", name="Import dataset").first.click()
        await pg.get_by_role("radio", name=re.compile("CSV")).click(); await pg.get_by_role("button", name="Continue").click()
        open("/tmp/old.xls", "w").write("x"); await pg.set_input_files("#import-file", "/tmp/old.xls")
        check("unsupported file type rejected before upload", await pg.get_by_text("Choose a .csv file").count() == 1)
        await pg.keyboard.press("Escape")

        # --- Duplicate names get unique slugs ---
        await import_file(pg, "CSV", f"{FX}/semicolon.csv", "Store sales")
        check("duplicate names get a unique slug", sql("select count(*) from datasets where slug='store-sales-2'") == "1")
        await pg.goto(BASE + "/app/projects", wait_until="networkidle"); await pg.get_by_role("button", name="New project").first.click()
        labels = await pg.locator("#project-dataset option").all_inner_texts()
        check("same-named datasets are distinguishable when picking", "Store sales (sales.csv)" in labels and "Store sales (semicolon.csv)" in labels, str(labels)); await pg.keyboard.press("Escape")

        # --- Projects can use a real dataset ---
        await pg.goto(BASE + "/app/projects", wait_until="networkidle")
        await pg.get_by_role("button", name="New project").first.click(); await pg.fill("#project-name", "Sales deep dive")
        await pg.select_option("#project-dataset", value=ds[0])
        await pg.get_by_role("button", name="Create project").click(); await pg.get_by_text("Project created").wait_for(timeout=10000)
        await pg.goto(BASE + "/app/projects/sales-deep-dive", wait_until="networkidle")
        await pg.get_by_role("tab", name="Data").click()
        check("project links to real dataset", await pg.get_by_role("link", name="Open dataset").get_attribute("href") == "/app/datasets/store-sales")

        # --- Isolation ---
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        await bp.goto(BASE + "/app/datasets/store-sales", wait_until="networkidle")
        check("other workspace cannot open the dataset page", await bp.get_by_text("We couldn't find that").count() == 1)
        anon = open("/tmp/sb/keys.env").read().split("ANON_KEY=")[1].split("\n")[0]
        tok = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:54321/auth/v1/token?grant_type=password", data=json.dumps({"email": "bob@example.com", "password": "bob-password-1"}).encode(), headers={"apikey": anon, "content-type": "application/json"})).read())["access_token"]
        def storage(method, path, body=None):
            req = urllib.request.Request(f"http://localhost:54321/storage/v1/object/datasets/{path}", data=body, method=method, headers={"apikey": anon, "Authorization": f"Bearer {tok}", "content-type": "text/csv"})
            try: return urllib.request.urlopen(req).status
            except urllib.error.HTTPError as e: return e.code
        check("other user cannot download the file", storage("GET", ds[4]) in (400, 403, 404), str(storage("GET", ds[4])))
        check("other user cannot upload into the workspace", storage("POST", f"{ws}/{ds[0]}/evil.csv", b"a,b\n1,2") in (400, 403), str(storage("POST", f"{ws}/{ds[0]}/evil.csv", b"a,b\n1,2")))
        bob_ws = sql("select w.id from workspaces w join workspace_members m on m.workspace_id=w.id join auth.users u on u.id=m.user_id where u.email='bob@example.com'")
        check("upload into own workspace needs a matching dataset record", storage("POST", f"{bob_ws}/not-a-dataset/x.csv", b"a\n1") in (400, 403))
        req = urllib.request.Request(f"http://localhost:54321/rest/v1/dataset_previews?select=rows", headers={"apikey": anon, "Authorization": f"Bearer {tok}"})
        check("other user sees no previews via API", json.loads(urllib.request.urlopen(req).read()) == [])

        # --- Viewer role ---
        carol_ctx, cp = await new_user(b, "Carol Chen", "carol@example.com", "carol-password-1")
        sql(f"insert into workspace_members (workspace_id, user_id, role) select '{ws}', id, 'viewer' from auth.users where email='carol@example.com'")
        await cp.context.add_cookies([{"name": "vz_workspace", "value": ws, "url": BASE}])
        await cp.goto(BASE + "/app/datasets/store-sales", wait_until="networkidle")
        check("viewer can read the dataset", await cp.locator("thead th").count() >= 8)
        check("viewer cannot delete", await cp.get_by_role("button", name="Delete").is_disabled())
        await cp.goto(BASE + "/app/datasets", wait_until="networkidle")
        check("viewer cannot import", await cp.get_by_role("button", name="Import dataset").first.is_disabled())

        # --- Delete ---
        await pg.goto(BASE + "/app/datasets/store-sales", wait_until="networkidle")
        await pg.get_by_role("button", name="Delete").click(); await pg.get_by_role("button", name="Delete dataset").click()
        await pg.wait_for_url(BASE + "/app/datasets", timeout=15000); await pg.wait_for_load_state("networkidle")
        check("delete removes record, columns and preview", sql(f"select (select count(*) from datasets where id='{ds[0]}') + (select count(*) from dataset_columns where dataset_id='{ds[0]}') + (select count(*) from dataset_previews where dataset_id='{ds[0]}')") == "0")
        check("delete removes the stored file", sql(f"select count(*) from storage.objects where name='{ds[4]}'") == "0")
        check("project survives dataset deletion", sql("select count(*) from projects where slug='sales-deep-dive' and dataset_id is null") == "1")
        check("deleted dataset gone from list (same-named one remains)", await pg.get_by_role("heading", name="Store sales", exact=True).count() == 1)

        # --- Mobile ---
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await actx.storage_state()); mp = await m.new_page()
        for path in ["/app/datasets", "/app/datasets/workbook"]:
            await mp.goto(BASE + path, wait_until="networkidle")
            sw = await mp.evaluate("document.documentElement.scrollWidth"); check(f"no horizontal overflow at 375px {path}", sw <= 376, str(sw))
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
