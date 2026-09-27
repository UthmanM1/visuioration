"use client";

import Link from "next/link";
import { BarChart3, Database, FileText, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { InsightCard } from "@/components/insights/insight-card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { activity, datasets, getUser, insights, reports, totals, visualizations } from "@/lib/demo-data";
import type { Dataset, Project } from "@/lib/demo-data";
import { formatCurrency, formatNumber } from "@/lib/format";
import { runQuery } from "@/lib/query";
import type { QueryInput } from "@/lib/query";

type TabId = "overview" | "data" | "visualizations" | "insights" | "reports";

const vizQueries: Record<string, Partial<QueryInput>> = {
  "revenue-overview": { dimension: "Date", measure: "Revenue" },
  "regional-performance": { dimension: "Region", measure: "Revenue" },
  "product-mix": { dimension: "Category", measure: "Revenue" },
  "mobile-desktop": { dimension: "Device", measure: "Conversion" },
  "customer-acquisition": { dimension: "Region", measure: "CAC" },
  "customer-retention": { dimension: "Date", measure: "Orders", groupBy: "Region" },
};

export function vizResult(id: string) {
  return runQuery({ dimension: "Date", measure: "Revenue", groupBy: "None", aggregation: "Sum", range: "Last 12 months", regionFilter: "All regions", ...vizQueries[id] });
}

/**
 * `sample` projects come from the Northstar demo data; live projects pass their own dataset
 * and show empty states until visualizations and reports are stored in the database.
 */
export function ProjectWorkspace({ project, dataset: liveDataset, sample = true }: { project: Project; dataset?: Dataset; sample?: boolean }) {
  const [tab, setTab] = useState<TabId>("overview");
  const dataset = sample ? datasets.find((d) => d.slug === project.datasetSlug) : liveDataset;
  const projectViz = sample ? visualizations.filter((v) => project.visualizationIds.includes(v.id)) : [];
  const projectReports = sample ? reports.filter((r) => project.reportSlugs.includes(r.slug)) : [];
  const projectInsights = !sample ? [] : project.datasetSlug === "northstar-sales" ? insights : insights.filter((i) => i.category === "Acquisition");
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "data" as const, label: "Data" },
    { id: "visualizations" as const, label: "Visualizations", count: projectViz.length },
    { id: "insights" as const, label: "Insights", count: projectInsights.length },
    { id: "reports" as const, label: "Reports", count: projectReports.length },
  ];

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Project sections" idPrefix="project" className="mb-6" />

      <TabPanel id="overview" idPrefix="project" active={tab === "overview"}>
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] grid-cols-1">
          <div className="space-y-4">
            <Panel className="p-5">
              <h2 className="text-[15px] font-semibold">Project summary</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{project.description}</p>
              {sample ? (
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                  {[
                    ["Revenue", formatCurrency(totals.revenue, { compact: true })],
                    ["Orders", formatNumber(totals.orders)],
                    ["Conversion", `${totals.conversion.toFixed(2)}%`],
                    ["AOV", `$${totals.averageOrderValue.toFixed(2)}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[12px] text-ink-muted">{k}</dt>
                      <dd className="tnum mt-0.5 text-lg font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-muted">Created by {project.owner?.name ?? "a workspace member"} · updated {project.updated.toLowerCase()}</p>
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Recent visualizations" actions={<ButtonLink href="/app/visualizations/new" size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" aria-hidden />}>New</ButtonLink>} />
              {projectViz.length === 0 ? (
                <div className="p-5"><EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No visualizations yet" body="Charts built from this project's dataset will appear here." action={<ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink>} /></div>
              ) : null}
              <div className={projectViz.length ? "grid gap-4 p-5 md:grid-cols-2 grid-cols-1" : "hidden"}>
                {projectViz.slice(0, 2).map((v) => (
                  <Link key={v.id} href={`/app/visualizations/new?from=${v.id}`} className="rounded-lg border border-line p-3 hover:border-petrol-500">
                    <p className="text-[13px] font-semibold">{v.name}</p>
                    <p className="text-[12px] text-ink-muted">{v.description}</p>
                    <div className="mt-2">
                      <ChartRenderer kind={v.kind === "heatmap" ? "bar" : v.kind} result={vizResult(v.id)} height={160} title={v.name} />
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
          <div className="space-y-4">
            {dataset ? (
              <Panel className="p-5">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Database className="h-4 w-4 text-petrol-600" aria-hidden />Dataset</h2>
                <p className="mt-2 font-medium">{dataset.name}</p>
                <dl className="tnum mt-3 grid grid-cols-3 gap-2 text-[12px]">
                  <div><dt className="text-ink-muted">Rows</dt><dd className="font-semibold">{formatNumber(dataset.rows)}</dd></div>
                  <div><dt className="text-ink-muted">Columns</dt><dd className="font-semibold">{dataset.columns}</dd></div>
                  <div><dt className="text-ink-muted">Status</dt><dd><StatusBadge status={dataset.status} /></dd></div>
                </dl>
              </Panel>
            ) : null}
            {sample ? (
              <>
            <Panel className="bg-night p-5 text-white" style={{ borderColor: "#12181B" }}>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="h-4 w-4 text-amber-100" aria-hidden />AI recommendations</h2>
              <ol className="mt-3 space-y-3 text-[13px] leading-relaxed text-white/80">
                <li>1. Review mobile checkout in the West region, where the March order decline and the device conversion gap overlap.</li>
                <li>2. Plan Outdoor inventory for Q3 against its Q2 growth rate.</li>
                <li>3. Compare paid social CAC with email before the next budget cycle.</li>
              </ol>
              <Link href="/app/insights" className="mt-4 inline-block text-[13px] font-medium text-petrol-200 underline underline-offset-4">Ask a follow-up question</Link>
            </Panel>
            <Panel>
              <PanelHeader title="Recent activity" />
              <ol className="space-y-3 p-5">
                {activity.map((a) => {
                  const actor = a.actorId === "ai" ? null : getUser(a.actorId);
                  return (
                    <li key={a.id} className="flex items-start gap-3 text-[13px]">
                      {actor ? <Avatar user={actor} size="sm" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Sparkles className="h-3 w-3" aria-hidden /></span>}
                      <p className="flex-1">
                        <span className="font-medium">{actor ? actor.name.split(" ")[0] : "AI"}</span> <span className="text-ink-muted">{a.action}</span> <span className="font-medium">{a.target}</span>
                        <span className="block text-[11px] text-ink-faint">{a.time}</span>
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Panel>
              </>
            ) : null}
          </div>
        </div>
      </TabPanel>

      <TabPanel id="data" idPrefix="project" active={tab === "data"}>
        {dataset ? (
          <Panel className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{dataset.name}</h2>
                <p className="mt-1 text-[13px] text-ink-muted">{dataset.description}</p>
              </div>
              <ButtonLink href={!sample || dataset.slug === "northstar-sales" ? `/app/datasets/${dataset.slug}` : "/app/datasets"} variant="secondary">Open dataset</ButtonLink>
            </div>
            <dl className="tnum mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-[13px] sm:grid-cols-5">
              <div><dt className="text-ink-muted">Rows</dt><dd className="font-semibold">{formatNumber(dataset.rows)}</dd></div>
              <div><dt className="text-ink-muted">Columns</dt><dd className="font-semibold">{dataset.columns}</dd></div>
              <div><dt className="text-ink-muted">Source</dt><dd className="font-semibold">{dataset.source}</dd></div>
              <div><dt className="text-ink-muted">Size</dt><dd className="font-semibold">{dataset.sizeLabel}</dd></div>
              <div><dt className="text-ink-muted">Updated</dt><dd className="font-semibold">{dataset.updated}</dd></div>
            </dl>
          </Panel>
        ) : (
          <EmptyState icon={<Database className="h-5 w-5" />} title="No dataset connected" body="Import a dataset, then connect it to this project." action={<ButtonLink href="/app/datasets?import=1">Import dataset</ButtonLink>} />
        )}
      </TabPanel>

      <TabPanel id="visualizations" idPrefix="project" active={tab === "visualizations"}>
        {projectViz.length ? (
          <div className="grid gap-4 md:grid-cols-2 grid-cols-1">
            {projectViz.map((v) => (
              <Panel key={v.id}>
                <PanelHeader title={v.name} description={v.description} as="h3" actions={<ButtonLink href={`/app/visualizations/new?from=${v.id}`} size="sm" variant="ghost">Edit</ButtonLink>} />
                <div className="p-4">
                  <ChartRenderer kind={v.kind} result={vizResult(v.id)} height={220} title={v.name} />
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No visualizations yet" body="Build a chart from this project's dataset to see it here." action={<ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink>} />
        )}
      </TabPanel>

      <TabPanel id="insights" idPrefix="project" active={tab === "insights"}>
        {projectInsights.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 grid-cols-1">
            {projectInsights.map((i) => (
              <li key={i.id}><InsightCard insight={i} /></li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No insights yet" body="Insights will appear here once this project has a dataset and AI analysis is enabled for the workspace." />
        )}
      </TabPanel>

      <TabPanel id="reports" idPrefix="project" active={tab === "reports"}>
        {projectReports.length ? (
          <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
            {projectReports.map((r) => (
              <li key={r.slug} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-petrol-600" aria-hidden />
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-[12px] text-ink-muted">{r.period} · {r.pages} pages</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <ButtonLink href={r.slug === "q2-executive-review" ? `/app/reports/${r.slug}` : "/app/reports"} size="sm" variant="secondary">Open</ButtonLink>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<FileText className="h-5 w-5" />} title="No reports yet" body="Turn this project's charts and insights into a report for your team." action={<ButtonLink href="/app/reports/new">Build a report</ButtonLink>} />
        )}
      </TabPanel>
    </>
  );
}
