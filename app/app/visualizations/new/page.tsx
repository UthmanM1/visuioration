import { Suspense } from "react";
import { VisualizationBuilder } from "@/components/builder/visualization-builder";
import { LoadingBlock } from "@/components/ui/skeleton";

export const metadata = { title: "Visualization builder" };

export default function NewVisualizationPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading builder" />}>
      <VisualizationBuilder />
    </Suspense>
  );
}
