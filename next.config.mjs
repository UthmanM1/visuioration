/** Security headers applied to every response. The Content-Security-Policy is set per request in proxy.ts (nonce). */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Parsed with Node APIs on the server; keep them out of the server bundle.
  serverExternalPackages: ["exceljs", "papaparse", "pdf-lib"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Share links carry their token in the URL: never send it onward or cache it.
      { source: "/share/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};
export default nextConfig;
