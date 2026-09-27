"use client";

import Link from "next/link";
import { FileText, Link2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppSession } from "@/components/app/session-context";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteReportAction } from "@/lib/actions/reports";
import type { ReportSummary } from "@/lib/services/live-reports";

export function LiveReportLibrary({ reports }: { reports: ReportSummary[] }) {
  const { canEdit, workspace } = useAppSession();
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<ReportSummary | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteReportAction({ id: deleting.id });
    setBusy(false);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't delete the report", body: result.error });
    toast({ tone: "info", title: "Report deleted", body: `${deleting.name} and its share links were removed.` });
    setDeleting(null);
    router.refresh();
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="No reports yet"
        body="Combine text, headline numbers and saved charts into a report you can present, export as PDF, or share with a link."
        action={canEdit ? <ButtonLink href="/app/reports/new" icon={<Plus className="h-4 w-4" aria-hidden />}>New report</ButtonLink> : undefined}
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map((r, i) => (
          <li key={r.id} className="relative">
            <Link href={`/app/reports/${r.slug}`} className="group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-panel transition-colors hover:border-petrol-500">
              <div className={i === 0 ? "relative h-40 bg-night p-4 text-white" : "relative h-40 bg-paper p-4"} aria-hidden>
                <div className={i === 0 ? "h-full rounded-md border border-night-line p-3" : "h-full rounded-md border border-line bg-surface p-3"}>
                  <p className={i === 0 ? "text-[10px] text-white/50" : "text-[10px] text-ink-faint"}>{workspace.name}</p>
                  <p className="mt-1 line-clamp-2 font-display text-[15px] font-semibold leading-tight">{r.name}</p>
                  <div className="mt-3 flex h-10 items-end gap-1">
                    {[40, 55, 48, 70, 62, 85].map((h, j) => (
                      <span key={j} className="flex-1 rounded-sm" style={{ height: `${h}%`, backgroundColor: j === 5 ? "#C98A1B" : i === 0 ? "#2E4A4E" : "#C9D9D8" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2 pr-7">
                  <h2 className="font-semibold group-hover:text-petrol-700">{r.name}</h2>
                  <StatusBadge status={r.status === "published" ? "Published" : "Draft"} />
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{r.description || r.period || "No description"}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-[12px] text-ink-muted">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden />{r.sectionCount} section{r.sectionCount === 1 ? "" : "s"} · {r.chartCount} chart{r.chartCount === 1 ? "" : "s"}</span>
                  {r.activeLinks ? <span className="flex items-center gap-1 text-petrol-700"><Link2 className="h-3.5 w-3.5" aria-hidden />{r.activeLinks} active link{r.activeLinks === 1 ? "" : "s"}</span> : <span>Updated {r.updated.toLowerCase()}</span>}
                </div>
              </div>
            </Link>
            {canEdit ? (
              <div className="absolute right-3 top-[172px]">
                <Menu
                  id={`report-menu-${r.id}`}
                  className="w-44 p-1"
                  trigger={({ open, toggle, id }) => (
                    <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label={`Actions for ${r.name}`} className="rounded-md p-1 text-ink-muted hover:bg-paper hover:text-ink">
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                >
                  {(close) => (
                    <ul className="text-[13px]">
                      <li><Link href={`/app/reports/new?id=${r.id}`} onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Pencil className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Edit</Link></li>
                      <li className="mt-1 border-t border-line pt-1"><button onClick={() => { close(); setDeleting(r); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rust-700 hover:bg-rust-100/60"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></li>
                    </ul>
                  )}
                </Menu>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete report?" description={deleting ? `“${deleting.name}” will be deleted, and its share links will stop working.` : undefined} size="sm" footer={<><Button variant="secondary" onClick={() => setDeleting(null)} data-autofocus>Cancel</Button><Button variant="danger" onClick={remove} loading={busy}>Delete report</Button></>}>
        <p className="text-sm text-ink-muted">The charts used in the report stay in your library.</p>
      </Modal>
    </>
  );
}
