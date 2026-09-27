import { supabaseConfig } from "../supabase/config";

/**
 * Content-Security-Policy with a per-request nonce (set in proxy.ts).
 *
 * script-src   Only scripts carrying this request's nonce (Next.js adds it to its own scripts), plus scripts
 *              those load ('strict-dynamic'). No 'unsafe-inline'. 'unsafe-eval' only in `next dev`, where React
 *              Refresh needs it; never in production.
 * style-src    'unsafe-inline' is required: the UI and the chart library (Recharts) use inline style
 *              attributes, which nonces can't cover. Style injection can't run script.
 * connect-src  The app itself and the Supabase project (browser uploads to Storage, auth token refresh).
 *              AI calls happen server-side and never need a browser exception.
 * fonts        Google Fonts stylesheet and font files, the only third-party assets.
 */
export function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  let supabaseOrigin = "";
  let supabaseSocket = "";
  if (supabaseConfig.url) {
    try {
      const u = new URL(supabaseConfig.url);
      supabaseOrigin = u.origin;
      supabaseSocket = `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`;
    } catch {
      /* invalid URL: leave Supabase out of connect-src */
    }
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "connect-src": ["'self'", supabaseOrigin, supabaseSocket, ...(dev ? ["ws:"] : [])].filter(Boolean),
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
  };
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
