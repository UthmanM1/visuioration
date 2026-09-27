/**
 * Supabase connection settings and the app's operating mode.
 *
 *   live          Supabase is configured: real accounts and data.
 *   demo          Sample data, no sign-in. Only when explicitly enabled with NEXT_PUBLIC_DEMO_MODE=true,
 *                 or automatically during local development (`next dev`).
 *   unconfigured  A production build without Supabase and without the demo opt-in. Workspace routes are
 *                 closed (HTTP 503) instead of silently falling back to an open demo.
 *
 * Only public values are read here. A service-role or secret key in a NEXT_PUBLIC_ variable would be
 * shipped to every browser, so it stops the app at startup.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function isPrivilegedKey(key: string) {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = typeof atob === "function" ? atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")) : Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json)?.role === "service_role";
  } catch {
    return false;
  }
}

if (publicKey && isPrivilegedKey(publicKey)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contains a service-role or secret key. " +
      "That key bypasses row level security and would be exposed to every browser. Use the anon/publishable key.",
  );
}

export const supabaseConfig = { url, publicKey };

export const isSupabaseConfigured = url.length > 0 && publicKey.length > 0;

const demoOptIn = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const isDevelopment = process.env.NODE_ENV !== "production";

export type AppMode = "live" | "demo" | "unconfigured";
export const appMode: AppMode = isSupabaseConfigured ? "live" : demoOptIn || isDevelopment ? "demo" : "unconfigured";
