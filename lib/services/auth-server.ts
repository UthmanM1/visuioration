import "server-only";
import { headers } from "next/headers";
import { siteConfig } from "../site";
import { createSupabaseServerClient } from "../supabase/server";
import { ServiceError } from "./errors";

/** Absolute origin for links in auth emails. Prefers the request host so preview deployments work. */
/**
 * Origin used in links inside auth emails. In production the configured site URL is used, so a forged
 * Host / X-Forwarded-Host header can't redirect confirmation or reset links (Supabase's redirect
 * allow-list is a second safeguard). Preview and local builds fall back to the request host.
 */
async function requestOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL && process.env.VERCEL_ENV !== "preview") return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteConfig.url.replace(/\/$/, "");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function authMessage(error: { message: string; code?: string; status?: number }) {
  const code = error.code ?? "";
  if (code === "invalid_credentials") return "That email and password don't match an account.";
  if (code === "email_not_confirmed") return "Confirm your email first. Check your inbox for the link we sent.";
  if (code === "user_already_exists" || code === "email_exists") return "An account with this email already exists. Try logging in instead.";
  if (code === "weak_password") return "Choose a stronger password: at least 8 characters.";
  if (code === "same_password") return "Your new password must be different from the current one.";
  if (code === "over_email_send_rate_limit" || error.status === 429) return "Too many attempts. Wait a minute and try again.";
  console.error("[auth]", code, error.message);
  return "Something went wrong. Please try again.";
}

export const authServerService = {
  async signIn(email: string, password: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ServiceError(authMessage(error), "validation");
  },

  /** Returns whether the user is signed in immediately (email confirmation disabled) or must confirm first. */
  async signUp(input: { name: string; email: string; password: string }) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.name }, emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/onboarding` },
    });
    if (error) throw new ServiceError(authMessage(error), "validation");
    // With confirmation on, an existing email returns a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      throw new ServiceError("An account with this email already exists. Try logging in instead.", "conflict");
    }
    return { signedIn: Boolean(data.session) };
  },

  async sendPasswordReset(email: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password` });
    // Do not reveal whether the email exists; only surface rate limiting.
    if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) throw new ServiceError(authMessage(error));
  },

  async updatePassword(password: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ServiceError(authMessage(error), "validation");
  },

  async signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  },
};
