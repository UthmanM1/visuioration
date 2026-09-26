import { VizLibrary } from "@/components/visualizations/viz-library";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Visualizations" };

export default function VisualizationsPage() {
  return (
    <>
      <PageHeader title="Visualizations" description="Saved charts you can reuse in dashboards and reports." actions={<ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink>} />
      <VizLibrary />
    </>
  );
}
