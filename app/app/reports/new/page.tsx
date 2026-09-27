import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LiveReportBuilder } from "@/components/reports/live-report-builder";
import { ReportBuilder } from "@/components/reports/report-builder";
import { LoadingBlock } from "@/components/ui/skeleton";
import { liveReportService } from "@/lib/services/live-reports";
import { requireSession } from "@/lib/services/session";
import { visualizationService } from "@/lib/services/visualizations";

export const metadata = { title: "Report builder" };

export default async function NewReportPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ id?: string }> }) {
  const searchParams = await searchParamsPromise;
  const session = await requireSession();
  if (session.mode === "demo") {
    return (
      <Suspense fallback={<LoadingBlock label="Loading report builder" />}>
        <ReportBuilder />
      </Suspense>
    );
  }
  const [charts, report] = await Promise.all([
    visualizationService.list(session.workspace.id),
    searchParams.id ? liveReportService.get(session.workspace.id, { id: searchParams.id }) : Promise.resolve(null),
  ]);
  if (searchParams.id && !report) notFound();
  return (
    <LiveReportBuilder
      key={`${session.workspace.id}-${report?.id ?? "new"}`}
      charts={charts.map((c) => ({ id: c.id, name: c.name, kind: c.kind, datasetName: c.datasetName }))}
      initial={report ? { id: report.id, name: report.name, description: report.description, period: report.period, sections: report.sections } : null}
    />
  );
}
