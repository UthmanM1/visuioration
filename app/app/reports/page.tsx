import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LiveReportLibrary } from "@/components/reports/live-report-library";
import { getUser, reports } from "@/lib/demo-data";
import { liveReportService } from "@/lib/services/live-reports";
import { requireSession } from "@/lib/services/session";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await requireSession();
  if (session.mode === "live") {
    const list = await liveReportService.list(session.workspace.id);
    return (
      <>
        <PageHeader title="Reports" description="Documents built from your charts and findings. Present them, export PDFs, or share expiring links." actions={session.canEdit ? <ButtonLink href="/app/reports/new" icon={<Plus className="h-4 w-4" aria-hidden />}>New report</ButtonLink> : undefined} />
        <LiveReportLibrary key={session.workspace.id} reports={list} />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Reports" description="Executive-ready documents built from your charts and insights." actions={<ButtonLink href="/app/reports/new" icon={<Plus className="h-4 w-4" aria-hidden />}>New report</ButtonLink>} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 grid-cols-1">
        {reports.map((r, i) => {
          const owner = getUser(r.ownerId)!;
          const href = r.slug === "q2-executive-review" ? `/app/reports/${r.slug}` : `/app/reports/new?from=${r.slug}`;
          return (
            <li key={r.slug}>
              <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel transition-colors hover:border-petrol-500">
                <div className={i === 0 ? "relative h-40 bg-night p-4 text-white" : "relative h-40 bg-paper p-4"} aria-hidden>
                  <div className={i === 0 ? "h-full rounded-md border border-night-line p-3" : "h-full rounded-md border border-line bg-surface p-3"}>
                    <p className={i === 0 ? "text-[10px] text-white/50" : "text-[10px] text-ink-faint"}>Northstar Retail Group</p>
                    <p className="mt-1 font-display text-[15px] font-semibold leading-tight">{r.name}</p>
                    <div className="mt-4 flex h-12 items-end gap-1">
                      {[40, 55, 48, 70, 62, 85].map((h, j) => (
                        <span key={j} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: j === 5 ? "#C98A1B" : i === 0 ? "#2E4A4E" : "#C9D9D8" }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold group-hover:text-petrol-700">{r.name}</h2>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{r.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-ink-muted">
                    <span className="flex items-center gap-1.5"><Avatar user={owner} size="sm" />{owner.name.split(" ")[0]}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden />{r.pages} pages · {r.period}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
