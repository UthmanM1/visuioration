import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseConfig } from "./config";

/**
 * Service-role client. Bypasses row level security, so it is used ONLY by the scheduled maintenance job
 * (app/api/cron/storage-cleanup). Never import it from request handlers that act for a user.
 * SUPABASE_SERVICE_ROLE_KEY is server-only and must never be given a NEXT_PUBLIC_ name.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseConfig.url || !key) return null;
  return createClient<Database>(supabaseConfig.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
