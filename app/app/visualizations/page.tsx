import { LiveVizLibrary } from "@/components/visualizations/live-viz-library";
import type { LibraryItem } from "@/components/visualizations/live-viz-library";
import { VizLibrary } from "@/components/visualizations/viz-library";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceError } from "@/lib/services/errors";
import { requireSession } from "@/lib/services/session";
import { dashboardService } from "@/lib/services/dashboards";
import { visualizationService } from "@/lib/services/visualizations";

export const metadata = { title: "Visualizations" };

export default async function VisualizationsPage() {
  const session = await requireSession();
  if (session.mode === "demo") {
    return (
      <>
        <PageHeader title="Visualizations" description="Saved charts you can reuse in dashboards and reports." actions={<ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink>} />
        <VizLibrary />
      </>
    );
  }

  const [saved, onDashboard] = await Promise.all([visualizationService.list(session.workspace.id), dashboardService.defaultVisualizationIds(session.workspace.id)]);
  // Each card's chart is calculated in the database; one failing chart doesn't stop the rest.
  const items: LibraryItem[] = await Promise.all(
    saved.map(async (v) => {
      const base = { id: v.id, name: v.name, description: v.description, kind: v.kind, datasetName: v.datasetName, pinned: onDashboard.has(v.id), updated: v.updated };
      if (!v.datasetId) return { ...base, data: null, error: "The dataset for this chart was deleted." };
      if (!v.definition) return { ...base, data: null, error: "This chart's settings couldn't be read. Edit it to fix them." };
      try {
        return { ...base, data: await visualizationService.run(session.workspace.id, v.datasetId, v.definition, v.kind), error: null };
      } catch (error) {
        return { ...base, data: null, error: error instanceof ServiceError ? error.message : "This chart couldn't be calculated." };
      }
    }),
  );

  return (
    <>
      <PageHeader title="Visualizations" description="Saved charts you can reuse in dashboards and reports." actions={session.canEdit ? <ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink> : undefined} />
      <LiveVizLibrary key={session.workspace.id} items={items} />
    </>
  );
}
