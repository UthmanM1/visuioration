import "server-only";
import type { DashboardWidget } from "../dashboards/layout";
import type { ChartKind } from "../demo-data/types";
import type { ChartData } from "../visualizations/definition";
import { ServiceError } from "./errors";
import { visualizationService } from "./visualizations";
import type { SavedVisualization } from "./visualizations";

/** Serialisable widget ready to draw: the layout entry, its chart's details and the calculated data. */
export interface WidgetView {
  widget: DashboardWidget;
  viz: { id: string; name: string; description: string; kind: ChartKind; datasetName: string | null } | null;
  data: ChartData | null;
  error: string | null;
}

export async function renderVisualization(workspaceId: string, viz: SavedVisualization): Promise<Pick<WidgetView, "viz" | "data" | "error">> {
  const meta = { id: viz.id, name: viz.name, description: viz.description, kind: viz.kind, datasetName: viz.datasetName };
  if (!viz.datasetId) return { viz: meta, data: null, error: "The dataset for this chart was deleted." };
  if (!viz.definition) return { viz: meta, data: null, error: "This chart's settings couldn't be read." };
  try {
    return { viz: meta, data: await visualizationService.run(workspaceId, viz.datasetId, viz.definition, viz.kind), error: null };
  } catch (error) {
    return { viz: meta, data: null, error: error instanceof ServiceError ? error.message : "This chart couldn't be calculated." };
  }
}

/** Resolves every widget in parallel. Charts that were deleted come back with viz = null. */
export async function resolveWidgets(workspaceId: string, widgets: DashboardWidget[], charts: SavedVisualization[]): Promise<WidgetView[]> {
  const byId = new Map(charts.map((c) => [c.id, c]));
  return Promise.all(
    widgets.map(async (widget) => {
      const viz = byId.get(widget.visualizationId);
      if (!viz) return { widget, viz: null, data: null, error: "This chart was deleted." };
      return { widget, ...(await renderVisualization(workspaceId, viz)) };
    }),
  );
}
