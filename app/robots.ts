import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/share", "/onboarding", "/login", "/signup", "/forgot-password"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
