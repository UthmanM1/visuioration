import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Q2Report } from "@/components/reports/q2-report";
import { ReportToolbar } from "@/components/reports/report-actions";
import { SharedReportToolbar } from "@/components/reports/live-report-actions";
import { LiveReportView } from "@/components/reports/live-report-view";
import { reports } from "@/lib/demo-data";
import { liveReportService } from "@/lib/services/live-reports";
import { pageMetadata } from "@/lib/seo";
import { appMode } from "@/lib/supabase/config";

const DEMO_SLUG = "q2-performance";

export const dynamic = "force-dynamic";

const demoMetadata = pageMetadata({
  title: "Q2 Performance Review · Northstar Retail Group",
  description: "Shared Visuioration report: Northstar Retail Group Q2 2026 performance review (fictional demo data).",
  path: "/share/q2-performance",
  noIndex: true,
});

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  if (params.slug === DEMO_SLUG) return demoMetadata;
  // Tokens are credentials: keep them out of search engines and Referer headers.
  const base = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
  if (appMode !== "live") return { ...base, title: "Shared report" };
  const shared = await liveReportService.getShared(params.slug);
  return { ...base, title: shared?.status === "ok" ? `${shared.report.name} · Shared report` : "Shared report" };
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function SharedShell({ children, footerNote }: { children: React.ReactNode; footerNote?: string }) {
  return (
    <div className="min-h-dvh bg-[#E9ECE9]">
      {children}
      <footer className="no-print pb-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink-muted shadow-panel hover:text-ink">
          <LogoMark className="h-5 w-5" />Powered by Visuioration
        </Link>
        {footerNote ? <p className="mt-3 text-[11px] text-ink-faint">{footerNote}</p> : null}
      </footer>
    </div>
  );
}

export default async function SharedReportPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  if (params.slug !== DEMO_SLUG) {
    if (appMode !== "live") notFound();
    const shared = await liveReportService.getShared(params.slug);
    if (!shared) notFound();
    if (shared.status === "expired") {
      return (
        <SharedShell>
          <main id="main" className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
            <LogoMark className="h-10 w-10" />
            <h1 className="mt-6 font-display text-2xl font-semibold tracking-[-0.02em]">This link has expired</h1>
            <p className="mt-2 text-ink-muted">The report was shared for a limited time, or the link was turned off. Ask the person who sent it for a new link.</p>
          </main>
        </SharedShell>
      );
    }
    const { report, snapshotAt, expiresAt } = shared;
    return (
        <SharedShell footerNote="Shared snapshot. Viewers can't access the workspace or its data.">
          <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1000px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-[12px] text-ink-muted">{report.workspaceName} · Shared report</p>
                <h1 className="truncate text-[15px] font-semibold">{report.name}</h1>
                <p className="text-[11px] text-ink-faint">Snapshot from {when(snapshotAt)}{expiresAt ? ` · link expires ${when(expiresAt)}` : ""}</p>
              </div>
              <SharedReportToolbar report={report} token={params.slug} />
            </div>
          </header>
          <main id="main" className="mx-auto max-w-[1000px] px-3 py-6 sm:px-6 sm:py-10">
            <LiveReportView report={report} />
          </main>
        </SharedShell>
    );
  }

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
