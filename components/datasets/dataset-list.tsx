"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Database, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { datasets as initial, getUser } from "@/lib/demo-data";
import type { Dataset } from "@/lib/demo-data";
import { formatNumber } from "@/lib/format";
import { ImportDialog } from "./import-dialog";

export function DatasetList() {
  const params = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>(initial);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get("import") === "1") setOpen(true);
  }, [params]);
  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>Import dataset</Button>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 grid-cols-1">
        {datasets.map((d) => {
          const owner = getUser(d.owner);
          const detail = d.slug === "northstar-sales";
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600"><Database className="h-4 w-4" aria-hidden /></span>
                  <div>
                    <h2 className="font-semibold">{d.name}</h2>
                    <p className="text-[12px] text-ink-muted">Owner: {owner?.name ?? "You"}</p>
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
                <p className="mt-3 flex items-center gap-2 rounded-md bg-amber-100/70 px-3 py-2 text-[12px] text-amber-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />Partial data: 212 rows are missing a store ID.</p>
              ) : null}
              {d.status === "Refreshing" ? (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-dusk-700"><RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />Refreshing from source…</p>
              ) : null}
              {!detail ? <Badge tone="outline" className="mt-3">Preview available for Northstar Sales Data</Badge> : null}
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
      <ImportDialog open={open} onClose={() => setOpen(false)} onImported={(d) => setDatasets((all) => [d, ...all])} />
    </>
  );
}
