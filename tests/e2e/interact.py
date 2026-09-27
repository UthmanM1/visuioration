import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 375, "height": 812})
        await ctx.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        base = "http://localhost:3100"
        # mobile overflow check
        for path in ["/", "/pricing", "/technology", "/case-study", "/login", "/onboarding", "/app", "/app/projects", "/app/projects/northstar-retail", "/app/datasets/northstar-sales", "/app/visualizations", "/app/visualizations/new", "/app/insights", "/app/insights/west-region-decline", "/app/reports", "/app/reports/new", "/app/reports/q2-executive-review", "/share/q2-performance", "/app/team", "/app/settings"]:
            await pg.goto(base + path, wait_until="networkidle")
            await pg.wait_for_timeout(300)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            if sw > 376: print("OVERFLOW", path, sw)
        await pg.goto(base + "/app", wait_until="networkidle"); await pg.screenshot(path="/tmp/shots/m-app.png")
        # chat
        await pg.goto(base + "/app/insights", wait_until="networkidle")
        await pg.get_by_role("button", name="Why did revenue decline in March?").click()
        await pg.wait_for_timeout(2200)
        await pg.screenshot(path="/tmp/shots/m-chat.png", full_page=False)
        txt = await pg.locator("#main").inner_text()
        print("chat answered:", "declined 8.4%" in txt)
        # command palette desktop
        ctx2 = await b.new_context(viewport={"width": 1280, "height": 800})
        await ctx2.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
        d = await ctx2.new_page(); d.on("pageerror", lambda e: errs.append(str(e)))
        await d.goto(base + "/app", wait_until="networkidle")
        await d.keyboard.press("Control+k"); await d.wait_for_timeout(300)
        await d.keyboard.type("west"); await d.wait_for_timeout(200)
        await d.screenshot(path="/tmp/shots/d-palette.png")
        await d.keyboard.press("Enter"); await d.wait_for_timeout(1200)
        print("palette ->", d.url)
        # projects create
        await d.goto(base + "/app/projects", wait_until="networkidle")
        await d.get_by_role("button", name="New project").first.click()
        await d.fill("#project-name", "Holiday readiness")
        await d.get_by_role("button", name="Create project").click(); await d.wait_for_timeout(1200)
        print("project created:", await d.locator("text=Holiday readiness").count())
        # report present
        await d.goto(base + "/app/reports/q2-executive-review", wait_until="networkidle")
        await d.get_by_role("button", name="Present").click(); await d.wait_for_timeout(500)
        await d.keyboard.press("ArrowRight"); await d.wait_for_timeout(400)
        await d.screenshot(path="/tmp/shots/d-present.png")
        await d.keyboard.press("Escape")
        # tour
        ctx3 = await b.new_context(viewport={"width": 1280, "height": 800}); t = await ctx3.new_page()
        await t.goto(base + "/app", wait_until="networkidle"); await t.wait_for_timeout(1200)
        await t.screenshot(path="/tmp/shots/d-tour.png")
        # import flow
        await d.goto(base + "/app/datasets?import=1", wait_until="networkidle"); await d.wait_for_timeout(400)
        await d.get_by_role("button", name="Continue").click()
        await d.get_by_role("button", name="Use sample file").click()
        await d.get_by_role("button", name="Import dataset").last.click(); await d.wait_for_timeout(2800)
        print("import done:", await d.locator("text=Dataset imported").count())
        print("errors:", errs[:5])
        await b.close()
asyncio.run(main())
