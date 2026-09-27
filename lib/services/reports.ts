import { reports } from "../demo-data";
import { demoResolve } from "./client";

export const reportSectionTypes = [
  { type: "cover", label: "Cover", description: "Title, period and prepared-by line" },
  { type: "summary", label: "Executive summary", description: "Three-sentence headline and key figures" },
  { type: "kpis", label: "KPI section", description: "Revenue, orders, conversion and CAC" },
  { type: "chart", label: "Chart section", description: "Any saved visualization with commentary" },
  { type: "insights", label: "Insight section", description: "Selected AI insights with evidence" },
  { type: "regional", label: "Regional analysis", description: "Revenue and growth by region" },
  { type: "recommendations", label: "Recommendations", description: "Next areas to investigate" },
  { type: "appendix", label: "Appendix", description: "Definitions and data sources" },
] as const;

export type ReportSectionType = (typeof reportSectionTypes)[number]["type"];

export const reportService = {
  list: () => demoResolve(reports),
  get: (slug: string) => demoResolve(reports.find((r) => r.slug === slug) ?? null),
  /** Production: server-side render with a headless browser and store the PDF. */
  exportPdf: (slug: string) => demoResolve({ slug, url: null as string | null }, 1400),
  share: (slug: string) => demoResolve({ slug, link: `/share/${reports.find((r) => r.slug === slug)?.shareSlug ?? "q2-performance"}` }, 500),
};
