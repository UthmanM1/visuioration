import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1440,"height":1000}); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:3100/app/visualizations/new?from=product-mix", wait_until="networkidle")
        print("demo builder preset title:", await pg.locator("#cfg-title").input_value())
        await pg.goto("http://localhost:3100/app/visualizations", wait_until="networkidle")
        print("demo library cards:", await pg.locator("li h2").count())
        await pg.keyboard.press("Control+k"); await pg.keyboard.type("Revenue Overview")
        print("demo search keeps sample charts:", await pg.get_by_role("option", name="Revenue Overview").count())
        print("errors:", errs); await b.close()
asyncio.run(main())
