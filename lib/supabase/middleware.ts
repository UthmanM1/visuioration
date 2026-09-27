import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/app", "/onboarding", "/reset-password"];
const AUTH_PAGES = ["/login", "/signup"];

/** Refreshes the auth session cookie on every request and guards the workspace routes. */
/** `forward` adds request headers for rendering (the CSP nonce) to every response created here. */
export async function updateSession(request: NextRequest, forward: (headers: Headers) => Headers = (h) => h) {
  let response = NextResponse.next({ request: { headers: forward(request.headers) } });

  const supabase = createServerClient<Database>(supabaseConfig.url, supabaseConfig.publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: forward(request.headers) } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalidates the token with Supabase Auth; do not replace it with getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectWithCookies(url, response);
  }

  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
