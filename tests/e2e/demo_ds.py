import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1280,"height":900}); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("http://localhost:3100/app/datasets/northstar-sales", wait_until="networkidle")
        heads = await pg.locator("thead th").all_inner_texts()
        print("demo table columns:", len(heads), heads[:4])
        print("demo footer:", await pg.get_by_text("sample rows", exact=False).count() + await pg.get_by_text("preview rows", exact=False).count(), "|", (await pg.locator("text=/of \\d/").first.inner_text()))
        await pg.select_option("#filter-region", "West"); await pg.wait_for_timeout(200)
        print("demo filter works:", set(await pg.locator("tbody tr td:nth-child(3)").all_inner_texts()) == {"West"})
        print("errors:", errs); await b.close()
asyncio.run(main())
