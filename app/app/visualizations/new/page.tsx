import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LiveVisualizationBuilder } from "@/components/builder/live-visualization-builder";
import { VisualizationBuilder } from "@/components/builder/visualization-builder";
import { LoadingBlock } from "@/components/ui/skeleton";
import { datasetService } from "@/lib/services/datasets";
import { requireSession } from "@/lib/services/session";
import { dashboardService } from "@/lib/services/dashboards";
import { visualizationService } from "@/lib/services/visualizations";

export const metadata = { title: "Visualization builder" };

export default async function NewVisualizationPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ id?: string; dataset?: string }> }) {
  const searchParams = await searchParamsPromise;
  const session = await requireSession();
  if (session.mode === "demo") {
    return (
      <Suspense fallback={<LoadingBlock label="Loading builder" />}>
        <VisualizationBuilder />
      </Suspense>
    );
  }

  const [datasets, saved, onDashboard] = await Promise.all([
    datasetService.listQueryable(session.workspace.id),
    searchParams.id ? visualizationService.get(session.workspace.id, searchParams.id) : Promise.resolve(null),
    dashboardService.defaultVisualizationIds(session.workspace.id),
  ]);
  if (searchParams.id && !saved) notFound();
  const initial =
    saved && saved.datasetId && saved.definition
      ? { id: saved.id, name: saved.name, description: saved.description, kind: saved.kind, datasetId: saved.datasetId, definition: saved.definition, pinned: onDashboard.has(saved.id) }
      : null;
  const initialDatasetId = searchParams.dataset ? datasets.find((d) => d.slug === searchParams.dataset)?.id ?? null : null;

  return <LiveVisualizationBuilder key={`${session.workspace.id}-${searchParams.id ?? "new"}`} datasets={datasets} initial={initial} initialDatasetId={initialDatasetId} />;
}
