export const siteConfig = {
  name: "Visuioration",
  tagline: "Turn complex data into clear decisions.",
  description:
    "Visuioration transforms business data into interactive visualizations, intelligent insights, and presentation-ready reports.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://visuioration.example",
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url.replace(/\/$/, "")}${path}`;
}
