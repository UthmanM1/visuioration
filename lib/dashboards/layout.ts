/** Dashboard widget layout shared by client and server. Stored as an ordered JSON array in dashboards.layout. */

export const widgetSizes = ["sm", "md", "lg", "full"] as const;
export const widgetHeights = ["regular", "tall"] as const;
export type WidgetSize = (typeof widgetSizes)[number];
export type WidgetHeight = (typeof widgetHeights)[number];

export interface DashboardWidget {
  id: string;
  visualizationId: string;
  size: WidgetSize;
  height: WidgetHeight;
}

export const MAX_WIDGETS = 50;

export const sizeLabels: Record<WidgetSize, string> = { sm: "Small (⅓)", md: "Medium (½)", lg: "Large (⅔)", full: "Full width" };
export const heightLabels: Record<WidgetHeight, string> = { regular: "Regular", tall: "Tall" };

/** Grid spans on a 1 / 6 / 12 column grid (mobile / tablet / desktop). Literal strings so Tailwind keeps them. */
export const sizeClasses: Record<WidgetSize, string> = {
  sm: "md:col-span-3 xl:col-span-4",
  md: "md:col-span-3 xl:col-span-6",
  lg: "md:col-span-6 xl:col-span-8",
  full: "md:col-span-6 xl:col-span-12",
};

export const chartHeights: Record<WidgetHeight, number> = { regular: 220, tall: 380 };

export function newWidgetId() {
  return `w_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Reads a stored layout defensively; unknown entries are dropped. */
export function parseLayout(value: unknown): DashboardWidget[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((w): w is Record<string, unknown> => Boolean(w) && typeof w === "object")
    .map((w) => ({
      id: String(w.id ?? ""),
      visualizationId: String(w.visualizationId ?? ""),
      size: (widgetSizes as readonly string[]).includes(String(w.size)) ? (w.size as WidgetSize) : "md",
      height: (widgetHeights as readonly string[]).includes(String(w.height)) ? (w.height as WidgetHeight) : "regular",
    }))
    .filter((w) => /^[A-Za-z0-9_-]{1,40}$/.test(w.id) && /^[0-9a-f-]{36}$/i.test(w.visualizationId));
}

export function moveWidget<T>(list: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** A sensible default size for a newly added chart. */
export function defaultSizeFor(kind: string): WidgetSize {
  return kind === "kpi" ? "sm" : kind === "table" || kind === "heatmap" ? "full" : "md";
}
