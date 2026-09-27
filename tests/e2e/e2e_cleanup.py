"""Storage orphan clean-up end to end, against the real Supabase Storage server.
Requires the app on :3100 with SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET=local-test-cron-secret-0123456789,
and on :3101 without CRON_SECRET."""
import asyncio, json, os, subprocess, time, urllib.request, urllib.error, uuid
from playwright.async_api import async_playwright
exec(open("/tmp/e2e_viz.py").read().split("async def main" + "():")[0])
results = []
def check(name, ok, detail=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

keys = dict(l.split("=", 1) for l in open("/tmp/sb/keys.env").read().split("\n") if "=" in l)
SERVICE = keys["SERVICE_KEY"].strip()
SECRET = "local-test-cron-secret-0123456789"

def http(url, method="GET", body=None, headers=None):
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        r = urllib.request.urlopen(req, timeout=120); return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
        return 0, str(e)

def upload(path):
    return http(f"http://localhost:54321/storage/v1/object/datasets/{path}", "POST", b"a,b\n1,2\n", {"Authorization": f"Bearer {SERVICE}", "apikey": SERVICE, "content-type": "text/csv"})[0]

def exists(path):
    return sql(f"select count(*) from storage.objects where bucket_id = 'datasets' and name = '{path}'") == "1"

def backdate(paths):
    names = ",".join(f"'{p}'" for p in paths)
    sql(f"update storage.objects set created_at = now() - interval '2 days' where name in ({names})")

def run(params="", auth=True, port=3100):
    h = {"Authorization": f"Bearer {SECRET}"} if auth else {}
    s, b = http(f"http://localhost:{port}/api/cron/storage-cleanup{params}", headers=h)
    try: return s, json.loads(b)
    except Exception: return s, {"raw": b[:200]}

def restart_storage():
    subprocess.run(["bash", "-c", "cd /tmp/sb/storage; export PATH=/tmp/sb/node24/node_modules/node-linux-x64/bin:$PATH; set -a; . ../storage.env; set +a; setsid nohup npx tsx src/start/server.ts > ../storage.log 2>&1 < /dev/null &"])
    for _ in range(90):
        if http("http://localhost:5000/status")[0] == 200: return True
        time.sleep(1)
    return False

async def main():
    sql("delete from storage_cleanup_runs")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        actx, pg = await new_user(b, "Alice Adams", "alice@example.com", "alice-password-1")
        bctx, bp = await new_user(b, "Bob Brown", "bob@example.com", "bob-password-1")
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Active")
        await import_file(pg, "CSV", f"{FX}/sales.csv", "Doomed")
        ws_a = sql("select workspace_id from datasets where slug = 'active'")
        ws_b = sql("select m.workspace_id from workspace_members m join auth.users u on u.id = m.user_id where u.email = 'bob@example.com'")
        active_path = sql("select storage_path from datasets where slug = 'active'")
        active_id = sql("select id from datasets where slug = 'active'")
        doomed_path = sql("select storage_path from datasets where slug = 'doomed'")
        # A dataset record removed without going through the app leaves its file behind.
        sql("delete from datasets where slug = 'doomed'")
        old_orphan = f"{ws_a}/{uuid.uuid4()}/old-orphan.csv"
        recent_orphan = f"{ws_a}/{uuid.uuid4()}/recent-orphan.csv"
        wrong_workspace = f"{ws_b}/{active_id}/copy-of-active.csv"   # dataset id exists, but in another workspace
        malformed = f"misc/{uuid.uuid4()}.csv"
        codes = [upload(x) for x in [old_orphan, recent_orphan, wrong_workspace, malformed]]
        check("fixture files uploaded through the Storage API", all(c == 200 for c in codes), str(codes))
        backdate([active_path, doomed_path, old_orphan, wrong_workspace, malformed])

        s, _ = run(auth=False)
        check("unauthenticated call is refused (401)", s == 401, str(s))
        s, _ = http("http://localhost:3100/api/cron/storage-cleanup", headers={"Authorization": "Bearer wrong-secret-wrong-secret"})
        check("wrong secret is refused (401)", s == 401, str(s))
        s, _ = run(port=3101)
        check("without CRON_SECRET configured the job never runs (401)", s == 401, str(s))

        s, dry = run("?dry_run=1")
        names = sorted(c["name"] for c in dry.get("candidates", []))
        check("dry run lists exactly the orphans", s == 200 and names == sorted([doomed_path, old_orphan, wrong_workspace]), str(names))
        check("dry run deletes nothing", all(exists(x) for x in [doomed_path, old_orphan, wrong_workspace]))

        s, res = run()
        check("clean-up run deletes the orphans", s == 200 and res.get("status") == "ok" and res.get("deleted") == 3, json.dumps(res))
        check("orphans are gone", not any(exists(x) for x in [doomed_path, old_orphan, wrong_workspace]))
        code, _ = http(f"http://localhost:54321/storage/v1/object/datasets/{old_orphan}", headers={"Authorization": f"Bearer {SERVICE}", "apikey": SERVICE})
        check("deleted files are gone from Storage itself", code in (400, 404), str(code))
        check("files of active datasets are kept", exists(active_path))
        check("recent orphans are kept (grace period)", exists(recent_orphan))
        check("unrecognised paths are never touched", exists(malformed))
        await pg.goto(BASE + "/app/datasets/active", wait_until="networkidle")
        check("the active dataset still works", await pg.locator("tbody tr").count() > 0)

        s, again = run()
        check("re-running is idempotent (nothing left to delete)", s == 200 and again.get("candidates") == 0 and again.get("deleted") == 0, json.dumps(again))

        # Failure and retry: Storage unavailable during a run.
        retry_orphan = f"{ws_a}/{uuid.uuid4()}/retry.csv"
        upload(retry_orphan); backdate([retry_orphan])
        subprocess.run(["bash", "-c", "for p in /proc/[0-9]*; do c=$(tr '\\0' ' ' < $p/cmdline 2>/dev/null); case \"$c\" in *src/start/server.ts*) kill ${p#/proc/};; esac; done"])
        time.sleep(2)
        s, failed = run()
        check("a failed run reports failure (HTTP 500) and deletes nothing", s == 500 and failed.get("status") == "failed" and exists(retry_orphan), json.dumps(failed))
        check("storage restarted", restart_storage())
        s, retried = run()
        check("the next run retries and completes", s == 200 and retried.get("deleted") == 1 and not exists(retry_orphan), json.dumps(retried))
        statuses = sql("select string_agg(status || ':' || deleted || ':' || dry_run, ',' order by started_at) from storage_cleanup_runs")
        check("every run is recorded", statuses == "ok:0:true,ok:3:false,ok:0:false,failed:0:false,ok:1:false", statuses)
        await b.close()
    print(f"\n{sum(ok for _, ok in results)}/{len(results)} checks passed")
asyncio.run(main())
