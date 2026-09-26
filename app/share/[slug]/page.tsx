import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Q2Report } from "@/components/reports/q2-report";
import { ReportToolbar } from "@/components/reports/report-actions";
import { reports } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return [{ slug: "q2-performance" }];
}

export const metadata = pageMetadata({
  title: "Q2 Performance Review · Northstar Retail Group",
  description: "Shared Visuioration report: Northstar Retail Group Q2 2026 performance review (fictional demo data).",
  path: "/share/q2-performance",
  noIndex: true,
});

export default function SharedReportPage({ params }: { params: { slug: string } }) {
  const report = reports.find((r) => r.shareSlug === params.slug);
  if (!report) notFound();
  return (
    <div className="min-h-dvh bg-[#E9ECE9]">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[12px] text-ink-muted">Northstar Retail Group · Shared report</p>
            <h1 className="truncate text-[15px] font-semibold">{report.name}</h1>
            <p className="text-[11px] text-ink-faint">Last updated 30 June 2026, 18:20</p>
          </div>
          <ReportToolbar slug={report.slug} variant="share" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1000px] px-3 py-6 sm:px-6 sm:py-10">
        <Q2Report />
      </main>
      <footer className="no-print pb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink-muted shadow-panel hover:text-ink">
          <LogoMark className="h-5 w-5" />Powered by Visuioration
        </Link>
        <p className="mt-3 text-[11px] text-ink-faint">Fictional demo data. Visuioration is a portfolio product concept.</p>
      </footer>
    </div>
  );
}
