import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "datasets";
const BATCH = 100;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Scheduled maintenance (Vercel Cron, see vercel.json): removes dataset files whose dataset record no longer
 * exists in the same workspace, then prunes expired rate-limit windows.
 *
 * Safe by construction: candidates come from storage_orphan_candidates() (ownership + grace period), each
 * batch is re-checked immediately before deletion, and deleting an already-removed file is a no-op, so runs
 * are idempotent. Failures return HTTP 500 and are recorded; the next run retries whatever is left.
 * `?dry_run=1` reports candidates without deleting anything.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 503 });

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const minAge = Math.max(3600, Number(process.env.STORAGE_CLEANUP_MIN_AGE_SECONDS) || 86400);

  const { data: run } = await admin.from("storage_cleanup_runs").insert({ dry_run: dryRun }).select("id").single();
  const finish = async (fields: Record<string, unknown>) => {
    if (run) await admin.from("storage_cleanup_runs").update({ ...fields, finished_at: new Date().toISOString() }).eq("id", run.id);
  };

  const { data: candidates, error: listError } = await admin.rpc("storage_orphan_candidates", { p_min_age_seconds: minAge, p_limit: 1000 });
  if (listError) {
    console.error("[cleanup] candidates", listError.message);
    await finish({ status: "failed", error: "Could not list candidates" });
    return NextResponse.json({ status: "failed", error: "Could not list candidates" }, { status: 500 });
  }
  const names = (candidates ?? []).map((c: { name: string }) => c.name);
  if (dryRun) {
    await finish({ status: "ok", candidates: names.length });
    return NextResponse.json({ status: "ok", dryRun: true, candidates: candidates ?? [] });
  }

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    // Re-check ownership immediately before deleting: a file is removed only if it is still an orphan.
    const { data: still, error: recheckError } = await admin.rpc("storage_orphans_recheck", { p_names: batch, p_min_age_seconds: minAge });
    if (recheckError) {
      failed += batch.length;
      errors.push("recheck failed");
      continue;
    }
    const confirmed = (still ?? []) as unknown as string[];
    if (confirmed.length === 0) continue;
    const { error: removeError } = await admin.storage.from(BUCKET).remove(confirmed);
    if (removeError) {
      failed += confirmed.length;
      errors.push(removeError.message.slice(0, 200));
    } else {
      deleted += confirmed.length;
    }
  }

  const { data: gc } = await admin.rpc("rate_limit_gc");
  const status = failed === 0 ? "ok" : deleted > 0 ? "partial" : "failed";
  await finish({ status, candidates: names.length, deleted, failed, rate_limit_rows_removed: Number(gc ?? 0), error: errors[0] ?? null });
  return NextResponse.json({ status, candidates: names.length, deleted, failed, rateLimitRowsRemoved: Number(gc ?? 0) }, { status: failed ? 500 : 200 });
}
