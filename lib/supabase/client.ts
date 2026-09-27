"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Supabase client for the browser. Uses the public key and the user's session cookie, so it is bound by RLS.
 * Components should not query data with it; data flows through server actions and services.
 * It is used for client-side auth events.
 */
export function getSupabaseBrowserClient() {
  browserClient ??= createBrowserClient<Database>(supabaseConfig.url, supabaseConfig.publicKey);
  return browserClient;
}
