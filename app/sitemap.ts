import type { MetadataRoute } from "next";
import { articles, industries, solutions } from "@/lib/demo-data";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-06-30");
  const staticPaths = ["/", "/solutions", "/industries", "/customers", "/resources", "/pricing", "/about", "/contact", "/technology", "/case-study"];
  return [
    ...staticPaths.map((p) => ({ url: absoluteUrl(p), lastModified: now, changeFrequency: "monthly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...solutions.map((s) => ({ url: absoluteUrl(`/solutions/${s.slug}`), lastModified: now, priority: 0.6 })),
    ...industries.map((i) => ({ url: absoluteUrl(`/industries/${i.slug}`), lastModified: now, priority: 0.6 })),
    ...articles.map((a) => ({ url: absoluteUrl(`/resources/${a.slug}`), lastModified: now, priority: 0.5 })),
  ];
}
