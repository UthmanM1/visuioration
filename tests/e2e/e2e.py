import asyncio, glob, os, re, quopri, email
from playwright.async_api import async_playwright
BASE = "http://localhost:3100"
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

def latest_link(to, since):
    files = sorted(f for f in glob.glob("/tmp/sb/mail/*.eml") if to in f and os.path.getmtime(f) >= since)
    if not files: return None
    msg = email.message_from_bytes(open(files[-1], "rb").read())
    body = ""
    for part in msg.walk():
        if part.get_content_type() in ("text/html", "text/plain"):
            body += part.get_payload(decode=True).decode("utf-8", "ignore")
    m = re.search(r'href="([^"]+verify[^"]+)"', body) or re.search(r'(http://localhost:54321/auth/v1/verify\S+)', body)
    return m.group(1).replace("&amp;", "&") if m else None

async def wait_mail(to, since):
    for _ in range(40):
        link = latest_link(to, since)
        if link: return link
        await asyncio.sleep(0.25)
    return None

async def signup_and_confirm(ctx, name, mail, pw):
    pg = await ctx.new_page()
    import time; t = time.time() - 1
    await pg.goto(BASE + "/signup", wait_until="networkidle")
    await pg.fill("#signup-name", name); await pg.fill("#signup-email", mail); await pg.fill("#signup-password", pw)
    await pg.get_by_role("button", name="Create account").click()
    await pg.get_by_text("Confirm your email").wait_for(timeout=15000)
    check(f"signup shows confirm-email state ({name})", True)
    link = await wait_mail(mail, t)
    check(f"confirmation email delivered ({name})", bool(link), (link or "")[:70])
    await pg.goto(link, wait_until="networkidle")
    return pg

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        alice = await b.new_context(viewport={"width": 1280, "height": 860})
        await alice.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
        errs = []
        # 1. Route protection
        pg = await alice.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(BASE + "/app/projects", wait_until="networkidle")
        check("unauthenticated /app/projects redirects to login", "/login?next=%2Fapp%2Fprojects" in pg.url, pg.url)
        check("login page hides demo credentials", await pg.locator("text=demo@visuioration.example").count() == 0)
        # 2. Sign up + confirm
        pg = await signup_and_confirm(alice, "Alice Adams", "alice@example.com", "correct-horse-1")
        check("confirmation link signs in and opens onboarding", pg.url.endswith("/onboarding"), pg.url)
        check("onboarding greets by real name", await pg.get_by_text("Welcome, Alice.").count() == 1)
        await pg.get_by_role("button", name="Get started").click()
        ws = pg.locator("#ws-name"); check("onboarding prefilled with auto-created workspace", (await ws.input_value()) == "Alice Adams's workspace", await ws.input_value())
        await ws.fill("Alice Analytics"); await pg.get_by_role("button", name="Continue").click()
        await pg.get_by_role("radio", name="Analyst").click(); await pg.get_by_role("button", name="Continue").click()
        await pg.get_by_role("radio", name="Build dashboards").click(); await pg.get_by_role("button", name="Continue").click()
        await pg.get_by_role("button", name="Continue").click()
        await pg.get_by_role("button", name="Open Visuioration").click()
        await pg.wait_for_url(BASE + "/app", timeout=15000); await pg.wait_for_load_state("networkidle")
        check("onboarding saved workspace name", await pg.get_by_role("button", name=re.compile("Workspace: Alice Analytics")).count() == 1)
        await pg.locator("h1", has_text="Good").filter(has_text="Alice").first.wait_for(timeout=10000)
        check("dashboard greets real user", await pg.locator("h1", has_text="Good").filter(has_text="Alice").count() == 1)
        await pg.get_by_role("button", name="Account menu").click()
        check("user menu shows real email", await pg.get_by_text("alice@example.com").count() == 1)
        await pg.keyboard.press("Escape")
        # 3. Projects persist
        await pg.goto(BASE + "/app/projects", wait_until="networkidle")
        check("new workspace starts with no projects", await pg.get_by_text("No projects yet").count() == 1)
        await pg.get_by_role("button", name="New project").first.click()
        await pg.fill("#project-name", "Q3 Review"); await pg.fill("#project-description", "Quarterly numbers")
        await pg.get_by_role("button", name="Create project").click()
        await pg.get_by_text("Project created").wait_for(timeout=10000)
        await pg.reload(wait_until="networkidle")
        check("created project persists after reload", await pg.get_by_role("heading", name="Q3 Review").count() == 1)
        await pg.get_by_role("heading", name="Q3 Review").click(); await pg.wait_for_url(BASE + "/app/projects/q3-review", timeout=15000); await pg.wait_for_load_state("networkidle")
        check("project detail page loads from database", pg.url.endswith("/app/projects/q3-review") and await pg.locator("h1", has_text="Q3 Review").count() == 1, pg.url)
        # 4. Second workspace + switching
        await pg.goto(BASE + "/app/settings?section=workspace", wait_until="networkidle")
        await pg.fill("#new-ws-name", "Side Project Co"); await pg.get_by_role("button", name="Create workspace").click()
        await pg.wait_for_url(BASE + "/app", timeout=15000); await pg.wait_for_load_state("networkidle")
        check("new workspace created and made active", await pg.get_by_role("button", name=re.compile("Workspace: Side Project Co")).count() == 1)
        await pg.goto(BASE + "/app/projects", wait_until="networkidle")
        check("projects are scoped to the active workspace", await pg.get_by_text("No projects yet").count() == 1)
        await pg.get_by_role("button", name=re.compile("Switch workspace")).click()
        await pg.get_by_role("option", name=re.compile("Alice Analytics")).get_by_role("button").click()
        await pg.wait_for_timeout(2500); await pg.wait_for_load_state("networkidle")
        check("switching workspace shows its projects", await pg.get_by_role("heading", name="Q3 Review").count() == 1)
        # 5. Profile + workspace settings save
        await pg.goto(BASE + "/app/settings?section=profile", wait_until="networkidle")
        await pg.fill("#pf-title", "Head of Analytics"); await pg.get_by_role("button", name="Save changes").click()
        await pg.get_by_text("Settings saved").wait_for(timeout=10000); await pg.reload(wait_until="networkidle")
        check("profile change persists", (await pg.locator("#pf-title").input_value()) == "Head of Analytics")
        await pg.goto(BASE + "/app/team", wait_until="networkidle")
        check("team page lists real owner", await pg.locator("tbody tr").count() == 1 and "Alice Adams" in await pg.locator("tbody").inner_text() and "Owner" in await pg.locator("tbody").inner_text())
        # 6. Sign out
        await pg.get_by_role("button", name="Account menu").click(); await pg.get_by_role("button", name="Sign out").click()
        await pg.wait_for_url(re.compile(r"/login"), timeout=10000)
        await pg.goto(BASE + "/app", wait_until="networkidle")
        check("after sign out /app redirects to login", "/login" in pg.url)
        # 7. Login: wrong then right
        await pg.fill("#login-email", "alice@example.com"); await pg.fill("#login-password", "wrong-password")
        await pg.get_by_role("button", name="Log in").click(); await pg.wait_for_timeout(2000)
        check("wrong password shows friendly error", await pg.get_by_text("That email and password don't match an account.").count() == 1)
        await pg.fill("#login-password", "correct-horse-1"); await pg.get_by_role("button", name="Log in").click()
        await pg.wait_for_url(BASE + "/app", timeout=15000)
        check("login returns to requested page", pg.url == BASE + "/app")
        # 8. Signed-in user visiting /login is sent to /app
        await pg.goto(BASE + "/login", wait_until="networkidle")
        check("signed-in user visiting /login goes to /app", pg.url == BASE + "/app")
        # 9. Forgot password -> email -> reset -> login with new password
        await pg.get_by_role("button", name="Account menu").click(); await pg.get_by_role("button", name="Sign out").click()
        await pg.wait_for_url(re.compile(r"/login"), timeout=10000)
        import time; t = time.time() - 1
        await pg.goto(BASE + "/forgot-password", wait_until="networkidle")
        await pg.fill("#forgot-email", "alice@example.com"); await pg.get_by_role("button", name="Send reset link").click()
        await pg.get_by_text("Check your inbox").wait_for(timeout=10000)
        link = await wait_mail("alice@example.com", t)
        check("password reset email delivered", bool(link))
        await pg.goto(link, wait_until="networkidle")
        check("reset link opens reset-password page signed in", pg.url.endswith("/reset-password"), pg.url)
        await pg.fill("#new-password", "new-password-2"); await pg.fill("#confirm-password", "new-password-2")
        await pg.get_by_role("button", name="Update password").click(); await pg.wait_for_url(BASE + "/app", timeout=15000)
        check("password updated and redirected to /app", True)
        await pg.get_by_role("button", name="Account menu").click(); await pg.get_by_role("button", name="Sign out").click()
        await pg.wait_for_url(re.compile(r"/login"), timeout=10000)
        await pg.fill("#login-email", "alice@example.com"); await pg.fill("#login-password", "new-password-2"); await pg.get_by_role("button", name="Log in").click()
        await pg.wait_for_url(BASE + "/app", timeout=15000)
        check("login works with new password", True)
        # 10. Isolation: Bob cannot see Alice's project
        bob = await b.new_context(viewport={"width": 1280, "height": 860})
        await bob.add_init_script("localStorage.setItem('visuioration.tour-done','1')")
        bp = await signup_and_confirm(bob, "Bob Brown", "bob@example.com", "bob-password-1")
        await bp.goto(BASE + "/app/projects/q3-review", wait_until="networkidle")
        check("other users cannot open Alice's project", await bp.get_by_text("We couldn't find that").count() == 1)
        await bp.goto(BASE + "/app/projects", wait_until="networkidle")
        check("other users see an empty project list", await bp.get_by_text("No projects yet").count() == 1)
        # 11. Mobile check of live pages
        m = await b.new_context(viewport={"width": 375, "height": 812}, storage_state=await alice.storage_state())
        mp = await m.new_page()
        for path in ["/app", "/app/projects", "/app/settings?section=workspace", "/app/team"]:
            await mp.goto(BASE + path, wait_until="networkidle")
            sw = await mp.evaluate("document.documentElement.scrollWidth")
            check(f"no horizontal overflow at 375px {path}", sw <= 376, str(sw))
        check("no client-side JavaScript errors", not errs, "; ".join(errs[:2]))
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
