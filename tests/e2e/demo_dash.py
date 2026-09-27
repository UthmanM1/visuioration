import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); c = await b.new_context(viewport={"width":1440,"height":1000}); await c.add_init_script("localStorage.setItem('visuioration.tour-done','1')"); pg = await c.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:3100/app", wait_until="networkidle")
        print("demo KPI cards:", await pg.locator("section[aria-label='Key metrics'] article").count(), "| revenue panel:", await pg.get_by_text("Revenue performance").count(), "| AI highlights:", await pg.get_by_text("AI highlights").count(), "| no edit button:", await pg.get_by_role("button", name="Edit layout").count() == 0)
        print("errors:", errs); await b.close()
asyncio.run(main())
