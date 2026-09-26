import Link from "next/link";
import { notFound } from "next/navigation";
import { Q2Report } from "@/components/reports/q2-report";
import { ReportToolbar } from "@/components/reports/report-actions";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { getUser, reports } from "@/lib/demo-data";

export function generateStaticParams() {
  return [{ slug: "q2-executive-review" }];
}

export const metadata = { title: "Q2 Executive Performance Review" };

export default function ReportPage({ params }: { params: { slug: string } }) {
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
