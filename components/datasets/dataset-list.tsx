"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Database, Plus, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/demo-data";
import { useAppSession } from "@/components/app/session-context";
import { EmptyState } from "@/components/ui/empty-state";
import type { Dataset } from "@/lib/demo-data";
import { formatNumber } from "@/lib/format";
import { ImportDialog } from "./import-dialog";

export function DatasetList({ initialDatasets }: { initialDatasets: Dataset[] }) {
  const params = useSearchParams();
  const session = useAppSession();
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // Sync with the URL and fresh server data during render instead of in effects.
  const importRequested = params.get("import") === "1";
  const [lastImportRequested, setLastImportRequested] = useState(false);
  if (importRequested !== lastImportRequested) {
    setLastImportRequested(importRequested);
    if (importRequested) setOpen(true);
  }
  const [lastInitial, setLastInitial] = useState(initialDatasets);
  if (initialDatasets !== lastInitial) {
    setLastInitial(initialDatasets);
    setDatasets(initialDatasets);
  }
  // While a dataset is still uploading or processing (for example in another tab), refresh until it settles.
  const pending = session.mode === "live" && datasets.some((d) => d.status === "Uploading" || d.status === "Processing");
  useEffect(() => {
    if (!pending || open) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [pending, open, router]);
  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen(true)} disabled={!session.canEdit} title={session.canEdit ? undefined : "Viewers can’t import datasets"} icon={<Plus className="h-4 w-4" aria-hidden />}>Import dataset</Button>
      </div>
      {datasets.length === 0 ? (
        <EmptyState icon={<Database className="h-5 w-5" />} title="No datasets yet" body="Datasets you import into this workspace will appear here, with row counts, columns and refresh status." action={<Button onClick={() => setOpen(true)}>Import dataset</Button>} />
      ) : null}
      <ul className={datasets.length ? "grid gap-4 md:grid-cols-2 grid-cols-1" : "hidden"}>
        {datasets.map((d) => {
          const ownerName = d.ownerName ?? getUser(d.owner)?.name;
          const detail = session.mode === "live" ? d.status !== "Uploading" : d.slug === "northstar-sales";
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600"><Database className="h-4 w-4" aria-hidden /></span>
                  <div>
                    <h2 className="font-semibold">{d.name}</h2>
                    <p className="text-[12px] text-ink-muted">Owner: {ownerName ?? "You"}</p>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <p className="mt-3 text-[13px] text-ink-muted">{d.description}</p>
              <dl className="tnum mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[12px] sm:grid-cols-4">
                <div><dt className="text-ink-faint">Rows</dt><dd className="font-semibold">{formatNumber(d.rows)}</dd></div>
                <div><dt className="text-ink-faint">Columns</dt><dd className="font-semibold">{d.columns}</dd></div>
                <div><dt className="text-ink-faint">Source</dt><dd className="font-semibold">{d.source}</dd></div>
                <div><dt className="text-ink-faint">Last updated</dt><dd className="font-semibold">{d.updated}</dd></div>
              </dl>
              {d.status === "Needs review" ? (
                <p className="mt-3 flex items-center gap-2 rounded-md bg-amber-100/70 px-3 py-2 text-[12px] text-amber-700"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{d.issues?.length ? `${d.issues[0].message}${d.issues.length > 1 ? ` (+${d.issues.length - 1} more)` : ""}` : "Partial data: 212 rows are missing a store ID."}</p>
              ) : null}
              {d.status === "Refreshing" || d.status === "Uploading" || d.status === "Processing" ? (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-dusk-700"><RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />{d.status === "Uploading" ? "Uploading…" : d.status === "Processing" ? "Profiling columns…" : "Refreshing from source…"}</p>
              ) : null}
              {d.status === "Failed" && d.errorMessage ? (
                <p className="mt-3 flex items-center gap-2 rounded-md bg-rust-100/70 px-3 py-2 text-[12px] text-rust-700"><XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />{d.errorMessage}</p>
              ) : null}
              {!detail && session.mode === "demo" ? <Badge tone="outline" className="mt-3">Preview available for Northstar Sales Data</Badge> : null}
            </>
          );
          return (
            <li key={d.slug}>
              {detail ? (
                <Link href={`/app/datasets/${d.slug}`} className="block h-full rounded-panel border border-line bg-surface p-5 shadow-panel transition-colors hover:border-petrol-500">{body}</Link>
              ) : (
                <div className="h-full rounded-panel border border-line bg-surface p-5 shadow-panel">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <ImportDialog live={session.mode === "live"} open={open} onClose={() => setOpen(false)} onImported={(d) => { setDatasets((all) => [d, ...all.filter((x) => x.id !== d.id || !d.id)]); if (session.mode === "live") router.refresh(); }} />
    </>
  );
}
