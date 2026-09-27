/** Only allow same-site relative paths for post-auth redirects. */
export function safeNextPath(value: unknown, fallback = "/app") {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
