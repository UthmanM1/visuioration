import type { ChartKind } from "../demo-data/types";
import type { ChartData } from "../visualizations/definition";

/** Report sections as stored in reports.sections (ordered). Shared by client and server. */
export type StoredSection =
  | { id: string; type: "cover"; subtitle: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "kpis"; heading: string; visualizationIds: string[] }
  | { id: string; type: "chart"; heading: string; visualizationId: string; commentary: string }
  | { id: string; type: "list"; heading: string; items: string[] }
  | { id: string; type: "appendix"; heading: string; body: string };

export type SectionType = StoredSection["type"];

/** The builder's palette. Several entries share a stored type with a different default heading. */
export const sectionPalette: Array<{ key: string; label: string; description: string; create: () => StoredSection }> = [
  { key: "cover", label: "Cover", description: "Title, period and prepared-by line", create: () => ({ id: newSectionId(), type: "cover", subtitle: "" }) },
  { key: "summary", label: "Executive summary", description: "A few sentences for readers in a hurry", create: () => ({ id: newSectionId(), type: "text", heading: "Executive summary", body: "" }) },
  { key: "kpis", label: "KPI section", description: "Up to four headline numbers from saved charts", create: () => ({ id: newSectionId(), type: "kpis", heading: "Key metrics", visualizationIds: [] }) },
  { key: "chart", label: "Chart section", description: "Any saved visualization with commentary", create: () => ({ id: newSectionId(), type: "chart", heading: "", visualizationId: "", commentary: "" }) },
  { key: "insights", label: "Insight section", description: "Findings as a bulleted list", create: () => ({ id: newSectionId(), type: "list", heading: "Key insights", items: [] }) },
  { key: "recommendations", label: "Recommendations", description: "Next steps and areas to investigate", create: () => ({ id: newSectionId(), type: "list", heading: "Recommendations", items: [] }) },
  { key: "text", label: "Text", description: "Free-form paragraph with a heading", create: () => ({ id: newSectionId(), type: "text", heading: "", body: "" }) },
  { key: "appendix", label: "Appendix", description: "Notes, plus data sources listed automatically", create: () => ({ id: newSectionId(), type: "appendix", heading: "Appendix", body: "" }) },
];

export const typeLabels: Record<SectionType, string> = { cover: "Cover", text: "Text", kpis: "KPIs", chart: "Chart", list: "List", appendix: "Appendix" };

export const LIMITS = { sections: 40, heading: 160, body: 5000, items: 20, item: 300, kpis: 4, subtitle: 200 };

export function newSectionId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : "");

/** Parses and normalises sections from untrusted input; unknown entries are dropped. */
export function parseSections(value: unknown): StoredSection[] {
  if (!Array.isArray(value)) return [];
  const out: StoredSection[] = [];
  const ids = new Set<string>();
  for (const raw of value.slice(0, LIMITS.sections)) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    let id = typeof s.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(s.id) ? s.id : newSectionId();
    while (ids.has(id)) id = newSectionId();
    ids.add(id);
    switch (s.type) {
      case "cover":
        out.push({ id, type: "cover", subtitle: text(s.subtitle, LIMITS.subtitle) });
        break;
      case "text":
        out.push({ id, type: "text", heading: text(s.heading, LIMITS.heading), body: text(s.body, LIMITS.body) });
        break;
      case "kpis":
        out.push({ id, type: "kpis", heading: text(s.heading, LIMITS.heading), visualizationIds: Array.isArray(s.visualizationIds) ? Array.from(new Set(s.visualizationIds.map(uuid).filter(Boolean))).slice(0, LIMITS.kpis) : [] });
        break;
      case "chart":
        out.push({ id, type: "chart", heading: text(s.heading, LIMITS.heading), visualizationId: uuid(s.visualizationId), commentary: text(s.commentary, LIMITS.body) });
        break;
      case "list":
        out.push({ id, type: "list", heading: text(s.heading, LIMITS.heading), items: Array.isArray(s.items) ? s.items.map((i) => text(i, LIMITS.item)).filter(Boolean).slice(0, LIMITS.items) : [] });
        break;
      case "appendix":
        out.push({ id, type: "appendix", heading: text(s.heading, LIMITS.heading), body: text(s.body, LIMITS.body) });
        break;
    }
  }
  return out;
}

/** Visualization ids a report depends on. */
export function referencedVisualizations(sections: StoredSection[]) {
  const ids = new Set<string>();
  for (const s of sections) {
    if (s.type === "chart" && s.visualizationId) ids.add(s.visualizationId);
    if (s.type === "kpis") s.visualizationIds.forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

// ---------------------------------------------------------------------------
// Rendered reports: sections with chart results filled in. Used by the web view, share snapshots and PDFs.
// ---------------------------------------------------------------------------

export interface RenderedChart {
  title: string;
  kind: ChartKind;
  data: ChartData;
  datasetName: string | null;
}

export type RenderedSection =
  | { id: string; type: "cover"; subtitle: string }
  | { id: string; type: "text"; heading: string; body: string }
  | { id: string; type: "kpis"; heading: string; items: Array<{ label: string; value: string | null; detail: string; error?: string }> }
  | { id: string; type: "chart"; heading: string; commentary: string; chart: RenderedChart | null; error?: string }
  | { id: string; type: "list"; heading: string; items: string[] }
  | { id: string; type: "appendix"; heading: string; body: string; sources: Array<{ name: string; rows: number }> };

export interface RenderedReport {
  name: string;
  period: string;
  description: string;
  workspaceName: string;
  preparedBy: string;
  generatedAt: string;
  sections: RenderedSection[];
}

/** Page titles for the page footer and presentation mode. */
export function sectionTitle(section: RenderedSection) {
  if (section.type === "cover") return "Cover";
  if (section.type === "chart") return section.heading || section.chart?.title || "Chart";
  return section.heading || typeLabels[section.type];
}
