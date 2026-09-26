import { datasets, insights, projects, reports, visualizations } from "./demo-data";

export type SearchGroup = "Commands" | "Projects" | "Datasets" | "Visualizations" | "Reports" | "Insights";

export interface SearchItem {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  href: string;
  keywords?: string;
}

export const commands: SearchItem[] = [
  { id: "cmd-dashboard", group: "Commands", title: "Go to Dashboard", href: "/app", keywords: "home overview" },
  { id: "cmd-projects", group: "Commands", title: "Search projects", href: "/app/projects", keywords: "find project" },
  { id: "cmd-viz", group: "Commands", title: "Create visualization", href: "/app/visualizations/new", keywords: "chart new build" },
  { id: "cmd-report", group: "Commands", title: "Create report", href: "/app/reports/new", keywords: "new document" },
  { id: "cmd-ai", group: "Commands", title: "Ask AI", href: "/app/insights", keywords: "question intelligence assistant" },
  { id: "cmd-import", group: "Commands", title: "Import dataset", href: "/app/datasets?import=1", keywords: "upload csv excel data" },
  { id: "cmd-settings", group: "Commands", title: "Settings", href: "/app/settings", keywords: "preferences workspace profile" },
  { id: "cmd-recent", group: "Commands", title: "Open recent project", subtitle: projects[0].name, href: `/app/projects/${projects[0].slug}`, keywords: "last northstar" },
];

export const searchIndex: SearchItem[] = [
  ...projects.map((p) => ({ id: `p-${p.slug}`, group: "Projects" as const, title: p.name, subtitle: p.description, href: `/app/projects/${p.slug}` })),
  ...datasets.map((d) => ({ id: `d-${d.slug}`, group: "Datasets" as const, title: d.name, subtitle: `${d.rows.toLocaleString("en-US")} rows · ${d.source}`, href: d.slug === "northstar-sales" ? `/app/datasets/${d.slug}` : "/app/datasets" })),
  ...visualizations.map((v) => ({ id: `v-${v.id}`, group: "Visualizations" as const, title: v.name, subtitle: v.description, href: `/app/visualizations/new?from=${v.id}` })),
  ...reports.map((r) => ({ id: `r-${r.slug}`, group: "Reports" as const, title: r.name, subtitle: r.period, href: r.slug === "q2-executive-review" ? `/app/reports/${r.slug}` : "/app/reports" })),
  ...insights.map((i) => ({ id: `i-${i.id}`, group: "Insights" as const, title: i.title, subtitle: i.period, href: `/app/insights/${i.id}` })),
];

export function search(query: string, includeCommands = true) {
  const q = query.trim().toLowerCase();
  const pool = includeCommands ? [...commands, ...searchIndex] : searchIndex;
  if (!q) return includeCommands ? commands : [];
  const terms = q.split(/\s+/);
  return pool
    .map((item) => {
      const haystack = `${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""} ${item.group}`.toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return null;
      const score = item.title.toLowerCase().startsWith(q) ? 3 : item.title.toLowerCase().includes(q) ? 2 : 1;
      return { item, score };
    })
    .filter((x): x is { item: SearchItem; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item)
    .slice(0, 24);
}
