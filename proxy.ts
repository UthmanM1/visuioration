import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/security/csp";
import { appMode } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

/** Routes that read or change the Supabase session (or are closed when the app is unconfigured). */
const SESSION_ROUTES = ["/app", "/onboarding", "/login", "/signup", "/forgot-password", "/reset-password", "/auth"];

/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware):
 *  1. Creates a per-request CSP nonce and passes it to rendering via request headers (Next.js applies it
 *     to its own scripts), and sets the Content-Security-Policy response header.
 *  2. Closes workspace routes with HTTP 503 in an unconfigured production build.
 *  3. Refreshes the Supabase session and guards protected routes in live mode.
 */
export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce);
  const withSecurityHeaders = (headers: Headers) => {
    const next = new Headers(headers);
    next.set("x-nonce", nonce);
    next.set("Content-Security-Policy", csp);
    return next;
  };

  const path = request.nextUrl.pathname;
  const sessionRoute = SESSION_ROUTES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  let response: NextResponse;
  if (appMode === "unconfigured" && sessionRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/unavailable";
    url.search = "";
    response = NextResponse.rewrite(url, { status: 503, request: { headers: withSecurityHeaders(request.headers) } });
  } else if (appMode === "live" && sessionRoute) {
    response = await updateSession(request, withSecurityHeaders);
  } else {
    response = NextResponse.next({ request: { headers: withSecurityHeaders(request.headers) } });
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Every page and route handler; static files are served without running the proxy.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
