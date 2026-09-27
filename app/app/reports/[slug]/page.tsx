import { enforceUserRateLimit } from "@/lib/rate-limit";
import { ServiceError } from "@/lib/services/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Q2Report } from "@/components/reports/q2-report";
import { ReportToolbar } from "@/components/reports/report-actions";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { LiveReportToolbar } from "@/components/reports/live-report-actions";
import { LiveReportView } from "@/components/reports/live-report-view";
import { getUser, reports } from "@/lib/demo-data";
import { liveReportService } from "@/lib/services/live-reports";
import { requireSession } from "@/lib/services/session";

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();
  if (session.mode === "demo") return { title: "Q2 Executive Performance Review" };
  const report = await liveReportService.get(session.workspace.id, { slug: params.slug });
  return { title: report?.name ?? "Report not found" };
}

// Charts in the report are calculated when the page loads.
export const maxDuration = 60;

export default async function ReportPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();
  if (session.mode === "live") {
    const record = await liveReportService.get(session.workspace.id, { slug: params.slug });
    if (!record) notFound();
    try {
      await enforceUserRateLimit("report_render");
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
      return (
        <div role="alert" className="mx-auto max-w-lg py-16 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">{record.name}</h1>
          <p className="mt-3 text-ink-muted">{error.message}</p>
          <p className="mt-1 text-[13px] text-ink-faint">Reports recalculate every chart when opened, so opening them is limited.</p>
        </div>
      );
    }
    const rendered = await liveReportService.render(session.workspace.id, record, { workspaceName: session.workspace.name, preparedBy: session.user.name });
    return (
      <>
        <nav aria-label="Breadcrumb" className="no-print mb-3 text-[13px] text-ink-muted">
          <Link href="/app/reports" className="hover:text-ink">Reports</Link> <span aria-hidden>/</span> <span className="text-ink">{record.name}</span>
        </nav>
        <div className="no-print mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={record.status === "published" ? "Published" : "Draft"} />
              <span className="text-[12px] text-ink-muted">{record.sections.length} section{record.sections.length === 1 ? "" : "s"} · updated {record.updated.toLowerCase()}</span>
            </div>
            <h1 className="break-words font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{record.name}</h1>
            {record.period ? <p className="mt-1.5 text-[14px] text-ink-muted">{record.period}</p> : null}
          </div>
          <LiveReportToolbar report={rendered} reportId={record.id} slug={record.slug} />
        </div>
        <div className="-mx-4 bg-[#E9ECE9] px-3 py-6 sm:mx-0 sm:rounded-panel sm:px-6 sm:py-10">
          <LiveReportView report={rendered} />
        </div>
      </>
    );
  }

  const report = reports.find((r) => r.slug === params.slug);
  if (!report || report.slug !== "q2-executive-review") notFound();
  const owner = getUser(report.ownerId)!;
  return (
    <>
      <nav aria-label="Breadcrumb" className="no-print mb-3 text-[13px] text-ink-muted">
        <Link href="/app/reports" className="hover:text-ink">Reports</Link> <span aria-hidden>/</span> <span className="text-ink">{report.name}</span>
      </nav>
      <div className="no-print mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={report.status} /><span className="text-[12px] text-ink-muted">{report.pages} pages · updated {report.updated.toLowerCase()}</span></div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{report.name}</h1>
          <p className="mt-1.5 flex items-center gap-2 text-[14px] text-ink-muted"><Avatar user={owner} size="sm" />Prepared by {owner.name} for the leadership team</p>
        </div>
        <ReportToolbar slug={report.slug} />
      </div>
      <div className="-mx-4 bg-[#E9ECE9] px-3 py-6 sm:mx-0 sm:rounded-panel sm:px-6 sm:py-10">
        <Q2Report />
      </div>
    </>
  );
}
