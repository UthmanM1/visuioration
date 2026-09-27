import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { ServiceError, waitText } from "./services/errors";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Server-side rate limits backed by Postgres (public.consume_rate_limit), so every server instance shares
 * the same counters. Limits live in public.rate_limit_policies. Callers can't influence the counted subject
 * for user buckets (the database uses auth.uid()). If the limiter can't be reached the request is refused
 * (fail closed), because every protected operation is expensive.
 */
export type UserBucket = "dataset_process" | "report_render" | "report_pdf" | "ai_request";
export type PublicBucket = "share_pdf_ip" | "share_pdf_link";

type Verdict = { allowed: boolean; limit: number; remaining: number; retry_after: number };

async function consume(bucket: string, subject?: string): Promise<Verdict> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_bucket: bucket, ...(subject ? { p_subject: subject } : {}) });
  if (error || !data) {
    console.error("[rate-limit]", bucket, error?.code, error?.message);
    throw new ServiceError("This service is busy right now. Please try again shortly.", "unavailable");
  }
  return data as unknown as Verdict;
}

/** Counts one request for the signed-in user; throws a rate_limited ServiceError when over the limit. */
export async function enforceUserRateLimit(bucket: UserBucket) {
  const verdict = await consume(bucket);
  if (!verdict.allowed) throw new ServiceError(`You're doing that too often. Try again in ${waitText(verdict.retry_after)}.`, "rate_limited", verdict.retry_after);
}

/** Counts one anonymous request against a server-derived subject (hashed IP or share token). */
export async function enforcePublicRateLimit(bucket: PublicBucket, subject: string) {
  const verdict = await consume(bucket, subject);
  if (!verdict.allowed) throw new ServiceError(`Too many requests. Try again in ${waitText(verdict.retry_after)}.`, "rate_limited", verdict.retry_after);
}

/** Salted hash, so raw IP addresses and tokens are never stored. */
export function hashedSubject(kind: string, value: string) {
  const salt = process.env.RATE_LIMIT_SALT ?? "";
  return `${kind}_${createHash("sha256").update(`${salt}:${kind}:${value}`).digest("hex").slice(0, 40)}`;
}

/**
 * The client IP as reported by the hosting platform. On Vercel, x-real-ip and x-forwarded-for are set by the
 * edge network. Self-hosted deployments must run behind a proxy that overwrites these headers.
 */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** JSON body and headers for an HTTP 429 response. */
export function tooManyRequests(error: ServiceError) {
  return {
    status: 429,
    headers: { "retry-after": String(error.retryAfter ?? 60), "cache-control": "no-store" },
    message: error.message,
  };
}
