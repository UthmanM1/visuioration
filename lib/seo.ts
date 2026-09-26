import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site";

export function pageMetadata({ title, description, path, noIndex = false }: { title: string; description: string; path: string; noIndex?: boolean }): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · ${siteConfig.name}`, description, url, siteName: siteConfig.name, type: "website", images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: `${siteConfig.name}: ${siteConfig.tagline}` }] },
    twitter: { card: "summary_large_image", title: `${title} · ${siteConfig.name}`, description },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
