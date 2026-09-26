import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyzeAction, DataTable } from "@/components/datasets/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { datasets } from "@/lib/demo-data";
import { formatNumber } from "@/lib/format";

export function generateStaticParams() {
  return [{ slug: "northstar-sales" }];
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: datasets.find((d) => d.slug === params.slug)?.name ?? "Dataset" };
}

export default function DatasetPage({ params }: { params: { slug: string } }) {
  const dataset = datasets.find((d) => d.slug === params.slug);
  if (!dataset || dataset.slug !== "northstar-sales") notFound();
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted">
        <Link href="/app/datasets" className="hover:text-ink">Datasets</Link> <span aria-hidden>/</span> <span className="text-ink">{dataset.name}</span>
      </nav>
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><StatusBadge status={dataset.status} /><span className="text-[12px] text-ink-muted">{dataset.source} · {dataset.sizeLabel}</span></div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{dataset.name}</h1>
          <dl className="tnum mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <div className="flex gap-1.5"><dt className="text-ink-muted">Rows</dt><dd className="font-semibold">{formatNumber(dataset.rows)}</dd></div>
            <div className="flex gap-1.5"><dt className="text-ink-muted">Columns</dt><dd className="font-semibold">{dataset.columns}</dd></div>
            <div className="flex gap-1.5"><dt className="text-ink-muted">Last updated</dt><dd className="font-semibold">Today</dd></div>
          </dl>
        </div>
        <div className="relative flex flex-wrap items-start gap-2">
          <ButtonLink href="/app/visualizations/new" variant="secondary">Visualize</ButtonLink>
          <AnalyzeAction />
        </div>
      </div>
      <DataTable />
    </>
  );
}
