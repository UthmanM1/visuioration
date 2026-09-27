import asyncio, re
from playwright.async_api import async_playwright
exec(open("/tmp/e2e_viz.py").read().split("async def main" + "():")[0])
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE + "/app", wait_until="networkidle")
        check("live sidebar has no demo notice", await pg.get_by_text("demo workspace with fictional data").count() == 0)
        await pg.goto(BASE + "/app/insights/west-region-decline", wait_until="networkidle")
        check("sample insight pages show not-found in live mode", await pg.get_by_text("We couldn't find that").count() == 1 and await pg.get_by_text("West region revenue declined").count() == 0)
        await pg.goto(BASE + "/app/shared", wait_until="networkidle")
        check("Shared page shows real (empty) state, not sample data", await pg.get_by_text("Nothing is shared").count() == 1 and await pg.get_by_text("Q2 Executive Performance Review").count() == 0)
        ws = sql("select workspace_id from workspace_members limit 1")
        sql(f"insert into reports (workspace_id, slug, name, sections) values ('{ws}', 'r1', 'Board review', '[]')")
        rid = sql("select id from reports where slug='r1'")
        sql(f"insert into shares (workspace_id, resource_type, resource_id, snapshot, snapshot_at, label) values ('{ws}', 'report', '{rid}', '{{}}', now(), 'Board')")
        await pg.goto(BASE + "/app/shared", wait_until="networkidle")
        check("Shared page lists real share links", await pg.get_by_role("link", name="Board review", exact=True).count() == 1 and await pg.get_by_text("Active").count() >= 1)
        await pg.keyboard.press("Control+k"); await pg.keyboard.type("West region")
        check("live search has no sample insights", await pg.get_by_role("option", name=re.compile("West region revenue declined")).count() == 0)
        await pg.keyboard.press("Escape")
        r = await pg.request.get(BASE + "/share/" + sql("select token from shares limit 1"))
        check("a malformed stored snapshot is treated as an invalid link, not a crash", r.status == 404, str(r.status))
        hdr = r
        check("share responses: no-referrer, no-store, noindex, DENY framing", hdr.headers.get("referrer-policy") == "no-referrer" and "no-store" in hdr.headers.get("cache-control", "") and "noindex" in hdr.headers.get("x-robots-tag", "") and hdr.headers.get("x-frame-options") == "DENY", str({k: hdr.headers.get(k) for k in ["referrer-policy", "cache-control", "x-robots-tag"]}))
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
