import { Suspense } from "react";
import { DatasetList } from "@/components/datasets/dataset-list";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingBlock } from "@/components/ui/skeleton";

export const metadata = { title: "Datasets" };

export default function DatasetsPage() {
  return (
    <>
      <PageHeader title="Datasets" description="Every chart, insight and report in this workspace reads from one of these datasets." />
      <Suspense fallback={<LoadingBlock label="Loading datasets" />}>
        <DatasetList />
      </Suspense>
    </>
  );
}
