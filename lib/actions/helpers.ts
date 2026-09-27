import "server-only";
import { ServiceError } from "../services/errors";
import type { ActionResult } from "../session-types";

/** Runs a server action body and converts thrown errors into a serialisable result. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Let Next.js handle redirect() and notFound().
    if (error && typeof error === "object" && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_")) throw error;
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error("[action]", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export function requireText(value: FormDataEntryValue | null | undefined, field: string, { min = 1, max = 500 } = {}) {
  const text = String(value ?? "").trim();
  if (text.length < min) throw new ServiceError(min > 1 ? `${field} needs at least ${min} characters.` : `Enter ${field.toLowerCase()}.`, "validation");
  if (text.length > max) throw new ServiceError(`${field} can be at most ${max} characters.`, "validation");
  return text;
}

export function requireEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) throw new ServiceError("Enter a valid email address.", "validation");
  return email;
}

export function requirePassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 8) throw new ServiceError("Use at least 8 characters for your password.", "validation");
  if (password.length > 72) throw new ServiceError("Passwords can be at most 72 characters.", "validation");
  return password;
}

export { safeNextPath as safeNext } from "../redirects";
