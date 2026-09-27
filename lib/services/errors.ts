/** Errors thrown by services carry a message that is safe to show to the user. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: "validation" | "not_found" | "forbidden" | "conflict" | "rate_limited" | "unavailable" | "unknown" = "unknown",
    /** Seconds until a rate-limited request may be retried. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function waitText(seconds: number) {
  if (seconds < 90) return `${Math.max(1, Math.ceil(seconds))} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 90 ? `${minutes} minutes` : `${Math.ceil(minutes / 60)} hours`;
}

/** Maps a Postgres/PostgREST error to a user-facing ServiceError. Details go to the server log only. */
export function fromDbError(error: { code?: string; message: string }, fallback = "Something went wrong. Please try again."): ServiceError {
  console.error("[db]", error.code, error.message);
  if (error.code === "42501") return new ServiceError("You don't have permission to do that in this workspace.", "forbidden");
  if (error.code === "23505") return new ServiceError("An item with that name already exists.", "conflict");
  // Raised by enforce_rate_limit() in the database (dataset creation, workspace creation).
  if (error.code === "PT429") {
    const retry = Number((error as { hint?: string }).hint) || 60;
    return new ServiceError(`You're doing that too often. Try again in ${waitText(retry)}.`, "rate_limited", retry);
  }
  return new ServiceError(fallback);
}
