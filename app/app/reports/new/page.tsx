import { Suspense } from "react";
import { ReportBuilder } from "@/components/reports/report-builder";
import { LoadingBlock } from "@/components/ui/skeleton";

export const metadata = { title: "Report builder" };

export default function NewReportPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading report builder" />}>
      <ReportBuilder />
    </Suspense>
  );
}
