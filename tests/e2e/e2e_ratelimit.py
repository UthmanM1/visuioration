"""Rate limiting end to end: every protected path, through the app and the API. Limits are lowered for the test
in public.rate_limit_policies and restored afterwards."""
import asyncio, re, json, urllib.request, urllib.error
from playwright.async_api import async_playwright
exec(open("/tmp/e2e_viz.py").read().split("async def main" + "():")[0])
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

DEFAULTS = {"dataset_upload_start": 30, "dataset_process": 30, "workspace_create": 5, "report_render": 120, "report_pdf": 20, "share_pdf_ip": 20, "share_pdf_link": 100, "ai_request": 6}
def limit(bucket, n): sql(f"update rate_limit_policies set max_hits = {n} where bucket = '{bucket}'")
anon = open("/tmp/sb/keys.env").read().split("ANON_KEY=")[1].split("\n")[0]
def rest(path, token=None, body=None):
    req = urllib.request.Request(f"http://localhost:54321{path}", data=json.dumps(body).encode() if body is not None else None, headers={"apikey": anon, "content-type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        r = urllib.request.urlopen(req); return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

SNAPSHOT = {"name": "Limits", "period": "", "description": "", "workspaceName": "W", "preparedBy": "A", "generatedAt": "2026-09-27T00:00:00.000Z", "sections": [{"id": "s1", "type": "text", "heading": "Hello", "body": "World"}]}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        ws = sql("select workspace_id from workspace_members limit 1")
        _, tok = rest("/auth/v1/token?grant_type=password", body={"email": "alice@example.com", "password": "alice-password-1"})
        token = json.loads(tok)["access_token"]
        try:
            # Dataset upload initialisation (enforced by a database trigger, so it covers direct API calls too)
            limit("dataset_upload_start", 2)
            await import_file(pg, "CSV", f"{FX}/sales.csv", "One")
            await import_file(pg, "CSV", f"{FX}/sales.csv", "Two")
            await pg.goto(BASE + "/app/datasets", wait_until="networkidle")
            await pg.get_by_role("button", name="Import dataset").first.click()
            await pg.get_by_role("radio", name=re.compile("CSV")).click(); await pg.get_by_role("button", name="Continue").click()
            await pg.set_input_files("#import-file", f"{FX}/sales.csv")
            await pg.get_by_role("dialog").get_by_role("button", name="Import dataset").click()
            await pg.get_by_text(re.compile("doing that too often")).first.wait_for(timeout=15000)
            check("3rd upload initialisation in the window is refused", sql("select count(*) from datasets") == "2")
            await pg.keyboard.press("Escape")
            status, body = rest("/rest/v1/datasets", token, {"workspace_id": ws, "slug": "direct", "name": "Direct"})
            check("direct API dataset creation is limited too (HTTP 429)", status == 429, f"{status} {body[:80]}")
            limit("dataset_upload_start", DEFAULTS["dataset_upload_start"])

            # Dataset processing (upload completion / prepare for charts)
            limit("dataset_process", 1)
            ds = sql("select id from datasets where slug = 'one'")
            sql(f"update datasets set rows_loaded_at = null where id = '{ds}'")
            await pg.goto(BASE + "/app/datasets/one", wait_until="networkidle")
            await pg.get_by_role("button", name="Prepare for charts").click()
            await pg.get_by_text(re.compile("doing that too often")).first.wait_for(timeout=15000)
            check("dataset processing is limited", sql(f"select rows_loaded_at is null from datasets where id = '{ds}'") == "t")
            limit("dataset_process", DEFAULTS["dataset_process"])

            # Workspace creation (enforced inside create_workspace())
            limit("workspace_create", 1)
            s1, _ = rest("/rest/v1/rpc/create_workspace", token, {"workspace_name": "Extra one"})
            s2, b2 = rest("/rest/v1/rpc/create_workspace", token, {"workspace_name": "Extra two"})
            check("workspace creation is limited, including direct RPC calls", s1 == 200 and s2 == 429 and "too many" in b2.lower(), f"{s1} {s2}")
            limit("workspace_create", DEFAULTS["workspace_create"])

            # Report rendering and PDF generation
            import subprocess
            open("/tmp/report_fixture.sql", "w").write(f"""insert into reports (workspace_id, slug, name, sections) values ('{ws}', 'limits', 'Limits', '[{{"id":"s1","type":"text","heading":"Hello","body":"World"}}]');""")
            subprocess.run(["su", "postgres", "-c", "psql -q -d sbtest -f /tmp/report_fixture.sql"], capture_output=True)
            limit("report_render", 2)
            for _ in range(2):
                await pg.goto(BASE + "/app/reports/limits", wait_until="networkidle")
            check("report renders within the limit", await pg.locator("section[aria-label^='Page ']").count() == 1)
            await pg.goto(BASE + "/app/reports/limits", wait_until="networkidle")
            check("report rendering over the limit shows a message, not the report", await pg.get_by_text(re.compile("doing that too often")).count() == 1 and await pg.locator("section[aria-label^='Page ']").count() == 0)
            limit("report_render", DEFAULTS["report_render"])
            limit("report_pdf", 2)
            codes = [(await pg.request.get(BASE + "/app/reports/limits/pdf")).status for _ in range(2)]
            r = await pg.request.get(BASE + "/app/reports/limits/pdf")
            check("authenticated PDF generation is limited (429 + Retry-After)", codes == [200, 200] and r.status == 429 and int(r.headers.get("retry-after", "0")) > 0, f"{codes} {r.status}")
            limit("report_pdf", DEFAULTS["report_pdf"])

            # Shared report PDFs: per client IP and per link
            rid = sql("select id from reports where slug = 'limits'")
            open("/tmp/share_fixture.sql", "w").write(f"insert into shares (workspace_id, resource_type, resource_id, snapshot, snapshot_at, label) values ('{ws}', 'report', '{rid}', '{json.dumps(SNAPSHOT)}', now(), 'rl');")
            import subprocess; subprocess.run(["su", "postgres", "-c", "psql -q -d sbtest -f /tmp/share_fixture.sql"], capture_output=True)
            tkn = sql("select token from shares where label = 'rl'")
            anon_ctx = await b.new_context(); ap = await anon_ctx.new_page()
            limit("share_pdf_ip", 2)
            first = [(await ap.request.get(BASE + f"/share/{tkn}/pdf", headers={"x-real-ip": "198.51.100.7"})).status for _ in range(2)]
            third = await ap.request.get(BASE + f"/share/{tkn}/pdf", headers={"x-real-ip": "198.51.100.7"})
            other = await ap.request.get(BASE + f"/share/{tkn}/pdf", headers={"x-real-ip": "203.0.113.9"})
            check("shared PDF is limited per client IP", first == [200, 200] and third.status == 429 and int(third.headers.get("retry-after", "0")) > 0, f"{first} {third.status}")
            check("other clients are unaffected", other.status == 200, str(other.status))
            limit("share_pdf_ip", 1000); limit("share_pdf_link", 3)
            link_codes = [(await ap.request.get(BASE + f"/share/{tkn}/pdf", headers={"x-real-ip": f"192.0.2.{i}"})).status for i in range(4)]
            check("shared PDF is limited per link across many IPs", link_codes[-1] == 429 and link_codes.count(200) <= 3, str(link_codes))
            check("raw IPs and tokens are not stored", sql("select count(*) from rate_limit_counters where subject like '%198.51%' or subject like '%" + tkn[:12] + "%'") == "0")
            limit("share_pdf_ip", DEFAULTS["share_pdf_ip"]); limit("share_pdf_link", DEFAULTS["share_pdf_link"])

            # AI burst limit (the hourly limit is covered by e2e_ai.py)
            limit("ai_request", 1)
            await pg.goto(BASE + "/app/insights", wait_until="networkidle")
            async def ask(q):
                before = await pg.locator("section[aria-labelledby='assistant-title'] ol > li").count()
                await pg.fill("#assistant-input", q); await pg.keyboard.press("Enter")
                item = pg.locator("section[aria-labelledby='assistant-title'] ol > li").nth(before)
                await item.locator("[data-testid='ai-answer'], [role='alert']").first.wait_for(timeout=40000)
                return item
            first_ai = await ask("What is revenue by region?")
            second_ai = await ask("What is revenue by region?")
            check("AI requests are limited per minute", await first_ai.locator("[data-testid='ai-answer']").count() == 1 and "too often" in (await second_ai.locator("[role='alert']").inner_text()))
        finally:
            for bucket, n in DEFAULTS.items():
                limit(bucket, n)
        check("limits restored to their defaults", sql("select string_agg(bucket || '=' || max_hits, ',' order by bucket) from rate_limit_policies") == ",".join(f"{k}={v}" for k, v in sorted(DEFAULTS.items())))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
