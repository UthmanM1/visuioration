import { Suspense } from "react";
import { DatasetList } from "@/components/datasets/dataset-list";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/skeleton";
import { datasetService } from "@/lib/services/datasets";
import { requireSession } from "@/lib/services/session";

export const metadata = { title: "Datasets" };

// Uploaded files are profiled in a server action on this route; large files need more than the default time.
export const maxDuration = 300;

export default async function DatasetsPage() {
  const session = await requireSession();
  const datasets = await datasetService.list(session.workspace.id);
  return (
    <>
      <PageHeader title="Datasets" description="Every chart, insight and report in this workspace reads from one of these datasets." />
      <Suspense fallback={<LoadingBlock label="Loading datasets" />}>
        <DatasetList key={session.workspace.id} initialDatasets={datasets} />
      </Suspense>
    </>
  );
}
