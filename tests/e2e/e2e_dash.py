import asyncio, re, json, time, urllib.request
from playwright.async_api import async_playwright
import importlib.util
spec = importlib.util.spec_from_file_location("v", "/tmp/e2e_viz.py"); v = importlib.util.module_from_spec(spec)
src = open("/tmp/e2e_viz.py").read().split("async def main():")[0]; exec(src, v.__dict__)
BASE, FX, sql, new_user, import_file = v.BASE, v.FX, v.sql, v.new_user, v.import_file
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

def make_charts(ws, ds):
    defs = [
        ("Revenue by month", "area", {"version": 1, "x": {"column": 1, "grain": "month"}, "y": {"column": 3, "aggregation": "sum"}, "series": None, "filters": [], "dateRange": None, "limit": 50}),
        ("Revenue by region", "bar", {"version": 1, "x": {"column": 2}, "y": {"column": 3, "aggregation": "sum"}, "series": None, "filters": [], "dateRange": None, "limit": 50}),
        ("Total orders", "kpi", {"version": 1, "x": None, "y": {"column": None, "aggregation": "count"}, "series": None, "filters": [], "dateRange": None, "limit": 50}),
        ("Units by region", "donut", {"version": 1, "x": {"column": 2}, "y": {"column": 4, "aggregation": "sum"}, "series": None, "filters": [], "dateRange": None, "limit": 50}),
    ]
    import subprocess
    stmts = "\n".join(f"insert into visualizations (workspace_id, dataset_id, name, kind, config) values ('{ws}', '{ds}', '{name}', '{kind}', '{json.dumps(d)}');" for name, kind, d in defs)
    open("/tmp/charts.sql", "w").write(stmts)
    out = subprocess.run(["su", "postgres", "-c", "psql -v ON_ERROR_STOP=1 -q -d sbtest -f /tmp/charts.sql"], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return {n: sql(f"select id from visualizations where name='{n}' and workspace_id='{ws}'") for n, _, _ in defs}

async def widget_names(pg):
    return [t.strip() for t in await pg.locator("ol[aria-label$='widgets'] > li h2").all_inner_texts()]

def layout(dash_name):
    return json.loads(sql(f"select layout::text from dashboards where name='{dash_name}'") or "[]")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Store sales")
        ds = sql("select id from datasets where slug='store-sales'"); ws = sql(f"select workspace_id from datasets where id='{ds}'")
        ids = make_charts(ws, ds)

        await pg.goto(BASE + "/app", wait_until="networkidle")
        check("no dashboards: prompt to create one", await pg.get_by_text("Create your first dashboard").count() == 1)
        check("existing header kept (greeting)", await pg.locator("h1", has_text="Alice").count() == 1)
        await pg.get_by_role("button", name="Create dashboard").click()
        await pg.fill("#new-dashboard-name", "Sales overview"); await pg.get_by_role("dialog").get_by_role("button", name="Create dashboard").click()
        await pg.wait_for_url(re.compile(r"/app\?d=.*&edit=1"), timeout=15000); await pg.wait_for_load_state("networkidle")
        check("create dashboard: saved as default, opens in edit mode", sql("select is_default from dashboards where name='Sales overview'") == "t" and await pg.get_by_role("button", name="Save dashboard").count() == 1)

        # add widgets
        await pg.get_by_role("button", name="Add widget").first.click()
        for n in ["Revenue by month", "Revenue by region", "Total orders"]:
            await pg.get_by_role("button", name=f"Add {n}").click()
            await pg.get_by_role("button", name=f"Add {n}").wait_for(state="detached", timeout=15000)
        await pg.get_by_role("dialog").get_by_role("button", name="Done").click()
        check("add widgets: three charts on the dashboard", await widget_names(pg) == ["Revenue by month", "Revenue by region", "Total orders"], str(await widget_names(pg)))
        check("widgets render live charts", await pg.locator("ol[aria-label$='widgets'] .recharts-surface").count() >= 2 and await pg.locator("ol[aria-label$='widgets'] p.font-display", has_text="1,200").count() == 1)
        check("KPI widget defaults to small, others to medium", "xl:col-span-4" in (await pg.locator("ol[aria-label$='widgets'] > li").nth(2).get_attribute("class")) and "xl:col-span-6" in (await pg.locator("ol[aria-label$='widgets'] > li").nth(0).get_attribute("class")))

        # resize
        first = pg.locator("ol[aria-label$='widgets'] > li").nth(0)
        await first.get_by_label("Width of Revenue by month").select_option("full")
        await first.get_by_role("radio", name="Tall").click()
        check("resize: width and height change", "xl:col-span-12" in (await first.get_attribute("class")) and await first.locator("div[style*='height: 380px']").count() >= 1)

        # reorder with buttons
        await pg.get_by_role("button", name="Move Total orders earlier").click()
        check("reorder with buttons", await widget_names(pg) == ["Revenue by month", "Total orders", "Revenue by region"], str(await widget_names(pg)))
        # reorder by dragging the handle of widget 1 onto widget 3
        handle = pg.locator("ol[aria-label$='widgets'] > li").nth(0).locator("span[draggable='true']")
        target = pg.locator("ol[aria-label$='widgets'] > li").nth(2).locator("h2")
        await target.scroll_into_view_if_needed(); await handle.scroll_into_view_if_needed()
        sb = await handle.bounding_box(); await pg.mouse.move(sb["x"] + 10, sb["y"] + 10); await pg.mouse.down()
        await pg.mouse.move(sb["x"] + 30, sb["y"] + 30, steps=5)
        tb = await target.bounding_box(); await pg.mouse.move(tb["x"] + 20, tb["y"] + 8, steps=15); await pg.mouse.up()
        check("reorder by drag and drop", await widget_names(pg) == ["Total orders", "Revenue by region", "Revenue by month"], str(await widget_names(pg)))

        # remove + add one more, then save
        await pg.get_by_role("button", name="Remove Revenue by region").click()
        check("remove widget", await widget_names(pg) == ["Total orders", "Revenue by month"])
        await pg.get_by_role("button", name="Add widget").first.click()
        check("picker hides charts already on the dashboard", await pg.get_by_role("button", name="Add Total orders").count() == 0 and await pg.get_by_role("button", name="Add Revenue by region").count() == 1)
        await pg.get_by_role("button", name="Add Units by region").click(); await pg.get_by_role("button", name="Add Units by region").wait_for(state="detached", timeout=15000)
        await pg.get_by_role("dialog").get_by_role("button", name="Done").click()
        await pg.fill("#dashboard-name", "Sales overview (Q2)")
        await pg.get_by_role("button", name="Save dashboard").click(); await pg.get_by_text("Dashboard saved").wait_for(timeout=15000)
        await pg.wait_for_url(re.compile(r"/app\?d=[0-9a-f-]+$"), timeout=10000)
        lay = layout("Sales overview (Q2)")
        check("save: order, sizes, heights and name persisted", [w["visualizationId"] for w in lay] == [ids["Total orders"], ids["Revenue by month"], ids["Units by region"]] and lay[1]["size"] == "full" and lay[1]["height"] == "tall" and lay[0]["size"] == "sm", json.dumps(lay)[:200])
        await pg.reload(wait_until="networkidle")
        check("reload shows the saved layout in view mode", await widget_names(pg) == ["Total orders", "Revenue by month", "Units by region"] and await pg.get_by_role("button", name="Edit layout").count() == 1)

        # cancel discards
        await pg.get_by_role("button", name="Edit layout").click()
        await pg.get_by_role("button", name="Remove Units by region").click()
        await pg.get_by_role("button", name="Cancel").click(); await asyncio.sleep(0.5)
        check("cancel discards unsaved changes", await widget_names(pg) == ["Total orders", "Revenue by month", "Units by region"] and len(layout("Sales overview (Q2)")) == 3)

        # second dashboard, switching, default, delete
        await pg.get_by_role("button", name="Dashboard options").click(); await pg.get_by_role("button", name="New dashboard").click()
        await pg.fill("#new-dashboard-name", "Marketing"); await pg.get_by_role("dialog").get_by_role("button", name="Create dashboard").click()
        await pg.wait_for_url(re.compile(r"&edit=1"), timeout=15000); await pg.wait_for_load_state("networkidle")
        check("second dashboard is not default", sql("select is_default from dashboards where name='Marketing'") == "f")
        await pg.get_by_role("button", name="Cancel").click(); await asyncio.sleep(0.5)
        options = await pg.locator("#dashboard-switcher option").all_inner_texts()
        check("switcher lists both dashboards", options == ["Sales overview (Q2) (default)", "Marketing"], str(options))
        await pg.select_option("#dashboard-switcher", label="Sales overview (Q2) (default)"); await pg.wait_for_load_state("networkidle"); await asyncio.sleep(1)
        check("switching dashboards", await widget_names(pg) == ["Total orders", "Revenue by month", "Units by region"])
        await pg.select_option("#dashboard-switcher", label="Marketing"); await pg.wait_for_load_state("networkidle"); await asyncio.sleep(1)
        await pg.get_by_role("button", name="Dashboard options").click(); await pg.get_by_role("button", name="Make default").click()
        await pg.get_by_text("Default dashboard updated").wait_for(timeout=10000)
        check("make default moves the flag", sql("select string_agg(name, ',') from dashboards where is_default") == "Marketing")
        await pg.goto(BASE + "/app", wait_until="networkidle")
        check("/app opens the default dashboard", (await pg.locator("#dashboard-switcher").input_value()) == sql("select id from dashboards where name='Marketing'"))

        # library 'Add to dashboard' targets the default dashboard
        await pg.goto(BASE + "/app/visualizations", wait_until="networkidle")
        card = pg.locator("li", has=pg.get_by_role("heading", name="Revenue by region", exact=True))
        await card.get_by_role("button", name=re.compile("Actions for")).click(); await pg.get_by_role("button", name="Add to dashboard").click()
        await pg.get_by_text("Added to dashboard").wait_for(timeout=10000)
        check("library 'Add to dashboard' adds to the default dashboard", [w["visualizationId"] for w in layout("Marketing")] == [ids["Revenue by region"]])
        await pg.reload(wait_until="networkidle")
        check("'On dashboard' badge reflects the default dashboard", await pg.locator("li", has=pg.get_by_role("heading", name="Revenue by region", exact=True)).get_by_text("On dashboard").count() == 1 and await pg.locator("li", has=pg.get_by_role("heading", name="Total orders", exact=True)).get_by_text("On dashboard").count() == 0)

        # delete dashboard: default falls back
        await pg.goto(BASE + "/app", wait_until="networkidle")
        await pg.get_by_role("button", name="Dashboard options").click(); await pg.get_by_role("button", name="Delete dashboard").click()
        await pg.get_by_role("dialog").get_by_role("button", name="Delete dashboard").click(); await pg.get_by_text("Dashboard deleted").wait_for(timeout=10000)
        await pg.wait_for_load_state("networkidle"); await asyncio.sleep(1)
        check("deleting the default promotes the remaining dashboard", sql("select string_agg(name || ':' || is_default, ',') from dashboards") == "Sales overview (Q2):true")
        check("charts survive dashboard deletion", sql(f"select count(*) from visualizations where workspace_id='{ws}'") == "4")

        # deleting a chart removes its widget
        sql(f"delete from visualizations where id='{ids['Units by region']}'")
        await pg.goto(BASE + "/app", wait_until="networkidle")
        check("deleting a chart removes its widget", await widget_names(pg) == ["Total orders", "Revenue by month"] and len(layout("Sales overview (Q2)")) == 2)

        # viewer
        cctx, cp = await new_user(b, "Carol Chen", "carol@example.com", "carol-password-1")
        sql(f"insert into workspace_members (workspace_id, user_id, role) select '{ws}', id, 'viewer' from auth.users where email='carol@example.com'")
        await cctx.add_cookies([{"name": "vz_workspace", "value": ws, "url": BASE}])
        await cp.goto(BASE + "/app", wait_until="networkidle")
        check("viewer sees the dashboard without edit controls", await widget_names(cp) == ["Total orders", "Revenue by month"] and await cp.get_by_role("button", name="Edit layout").count() == 0 and await cp.get_by_role("button", name="Dashboard options").count() == 0)
        await cp.goto(BASE + "/app?edit=1", wait_until="networkidle")
        check("viewer can't force edit mode via URL", await cp.get_by_role("button", name="Save dashboard").count() == 0)

        # other workspace
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        alice_dash = sql("select id from dashboards where name='Sales overview (Q2)'")
        await bp.goto(BASE + f"/app?d={alice_dash}", wait_until="networkidle")
        check("other workspace can't open the dashboard", await bp.get_by_text("Create your first dashboard").count() == 1 and await bp.get_by_text("Total orders").count() == 0)
        anon = open("/tmp/sb/keys.env").read().split("ANON_KEY=")[1].split("\n")[0]
        tok = json.loads(urllib.request.urlopen(urllib.request.Request("http://localhost:54321/auth/v1/token?grant_type=password", data=json.dumps({"email": "bob@example.com", "password": "bob-password-1"}).encode(), headers={"apikey": anon, "content-type": "application/json"})).read())["access_token"]
        bob_ws = sql("select m.workspace_id from workspace_members m join auth.users u on u.id=m.user_id where u.email='bob@example.com' and m.role='owner'")
        body = json.dumps({"workspace_id": bob_ws, "name": "Sneaky", "layout": [{"id": "w1", "visualizationId": ids["Total orders"], "size": "md", "height": "regular"}]}).encode()
        req = urllib.request.Request("http://localhost:54321/rest/v1/dashboards", data=body, headers={"apikey": anon, "Authorization": f"Bearer {tok}", "content-type": "application/json"})
        try: code = urllib.request.urlopen(req).status
        except urllib.error.HTTPError as e: code = e.code
        check("API rejects a layout pointing at another workspace's chart", code == 400 and sql("select count(*) from dashboards where name='Sneaky'") == "0", str(code))

        # mobile
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await actx.storage_state()); mp = await m.new_page()
        for path in ["/app", "/app?edit=1"]:
            await mp.goto(BASE + path, wait_until="networkidle"); await asyncio.sleep(1)
            sw = await mp.evaluate("document.documentElement.scrollWidth"); check(f"no horizontal overflow at 375px {path}", sw <= 376, str(sw))
        check("widgets stack full-width on mobile", len(set([round((await el.bounding_box())["width"]) for el in await mp.locator("ol[aria-label$='widgets'] > li").all()])) == 1)
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
