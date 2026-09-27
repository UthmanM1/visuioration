import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { DeleteDatasetButton, PrepareForChartsButton, RefreshWhilePending } from "@/components/datasets/dataset-actions";
import { AnalyzeAction, DataTable } from "@/components/datasets/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { sampleTableData } from "@/lib/datasets/table-data";
import { datasets } from "@/lib/demo-data";
import type { Dataset } from "@/lib/demo-data";
import { formatNumber } from "@/lib/format";
import { datasetService } from "@/lib/services/datasets";
import { requireSession } from "@/lib/services/session";

export const maxDuration = 300;

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();
  if (session.mode === "demo") return { title: datasets.find((d) => d.slug === params.slug)?.name ?? "Dataset" };
  const detail = await datasetService.getDetail(session.workspace.id, params.slug);
  return { title: detail?.dataset.name ?? "Dataset not found" };
}

function Header({ dataset, updated, actions }: { dataset: Dataset; updated: string; actions: React.ReactNode }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted">
        <Link href="/app/datasets" className="hover:text-ink">Datasets</Link> <span aria-hidden>/</span> <span className="text-ink">{dataset.name}</span>
      </nav>
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={dataset.status} /><span className="text-[12px] text-ink-muted">{dataset.source} · {dataset.sizeLabel}{dataset.fileName ? ` · ${dataset.fileName}` : ""}</span></div>
          <h1 className="break-words font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{dataset.name}</h1>
          <dl className="tnum mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <div className="flex gap-1.5"><dt className="text-ink-muted">Rows</dt><dd className="font-semibold">{formatNumber(dataset.rows)}</dd></div>
            <div className="flex gap-1.5"><dt className="text-ink-muted">Columns</dt><dd className="font-semibold">{dataset.columns}</dd></div>
            <div className="flex gap-1.5"><dt className="text-ink-muted">Last updated</dt><dd className="font-semibold">{updated}</dd></div>
          </dl>
        </div>
        <div className="relative flex flex-wrap items-start gap-2">{actions}</div>
      </div>
    </>
  );
}

export default async function DatasetPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();

  if (session.mode === "demo") {
    const dataset = datasets.find((d) => d.slug === params.slug);
    if (!dataset || dataset.slug !== "northstar-sales") notFound();
    return (
      <>
        <Header dataset={dataset} updated="Today" actions={<><ButtonLink href="/app/visualizations/new" variant="secondary">Visualize</ButtonLink><AnalyzeAction /></>} />
        <DataTable data={sampleTableData()} />
      </>
    );
  }

  const detail = await datasetService.getDetail(session.workspace.id, params.slug);
  if (!detail) notFound();
  const { dataset, table } = detail;
  const pending = dataset.status === "Uploading" || dataset.status === "Processing";

  return (
    <>
      <RefreshWhilePending pending={pending} />
      <Header
        dataset={dataset}
        updated={dataset.updated}
        actions={
          <>
            {table && dataset.chartReady ? <ButtonLink href={`/app/visualizations/new?dataset=${dataset.slug}`} variant="secondary">Visualize</ButtonLink> : null}
            {table && !dataset.chartReady && dataset.id ? <PrepareForChartsButton datasetId={dataset.id} disabled={!session.canEdit} /> : null}
            {dataset.id ? <DeleteDatasetButton datasetId={dataset.id} name={dataset.name} disabled={!session.canEdit} /> : null}
          </>
        }
      />
      {dataset.issues?.length ? (
        <Panel className="mb-4 border-amber-500/40 bg-amber-100/40 p-4 shadow-none">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-amber-700"><AlertTriangle className="h-4 w-4" aria-hidden />Things to review before building charts</h2>
          <ul className="mt-2 space-y-1 pl-6 text-[13px] text-ink-soft">
            {dataset.issues.map((issue, i) => (
              <li key={i} className="list-disc">{issue.message}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {pending ? (
        <Panel className="flex items-center gap-3 p-6" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-petrol-600" aria-hidden />
          <div>
            <p className="font-medium">{dataset.status === "Uploading" ? "Waiting for the upload to finish…" : "Detecting column types and profiling data…"}</p>
            <p className="text-[13px] text-ink-muted">This page updates by itself.</p>
          </div>
        </Panel>
      ) : null}
      {dataset.status === "Failed" ? (
        <Panel className="flex items-start gap-3 p-6" role="alert">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rust-500" aria-hidden />
          <div>
            <p className="font-medium">This file couldn&apos;t be processed</p>
            <p className="mt-1 text-[13px] text-ink-muted">{dataset.errorMessage ?? "Something went wrong while reading the file."} Delete this dataset, fix the file, and import it again.</p>
          </div>
        </Panel>
      ) : null}
      {table ? <DataTable data={table} /> : null}
    </>
  );
}
