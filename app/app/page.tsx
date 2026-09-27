import { Sparkles } from "lucide-react";
import { LiveDashboard } from "@/components/dashboard/live-dashboard";
import { Greeting } from "@/components/dashboard/greeting";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RegionalPanel } from "@/components/dashboard/regional-panel";
import { RevenuePanel } from "@/components/dashboard/revenue-panel";
import { TopProducts } from "@/components/dashboard/top-products";
import { InsightCard } from "@/components/insights/insight-card";
import { DemoTag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { insights, kpiSeries, previousYear, totals, workspace } from "@/lib/demo-data";
import { formatCurrency, formatNumber, percentChange } from "@/lib/format";
import { dashboardService } from "@/lib/services/dashboards";
import { requireSession } from "@/lib/services/session";
import { visualizationService } from "@/lib/services/visualizations";
import { resolveWidgets } from "@/lib/services/widgets";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ d?: string; edit?: string }> }) {
  const searchParams = await searchParamsPromise;
  const session = await requireSession();
  if (session.mode === "live") {
    const [dashboards, requested, charts] = await Promise.all([
      dashboardService.list(session.workspace.id),
      dashboardService.get(session.workspace.id, searchParams.d),
      visualizationService.list(session.workspace.id),
    ]);
    // A link to a dashboard that was deleted (or belongs to another workspace) falls back to the default.
    const current = requested ?? (searchParams.d ? await dashboardService.get(session.workspace.id, null) : null);
    const widgets = current ? await resolveWidgets(session.workspace.id, current.widgets, charts) : [];
    return (
      <LiveDashboard
        key={`${session.workspace.id}-${current?.id ?? "none"}`}
        dashboards={dashboards}
        current={current ? { id: current.id, name: current.name, isDefault: current.isDefault } : null}
        widgets={widgets}
        charts={charts.map((c) => ({ id: c.id, name: c.name, kind: c.kind, datasetName: c.datasetName }))}
        startInEditMode={searchParams.edit === "1"}
      />
    );
  }

  const highlights = insights.filter((i) => ["west-region-decline", "outdoor-acceleration", "mobile-conversion-gap", "q2-growth"].includes(i.id));
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <DemoTag />
            <span className="text-[12px] text-ink-muted">{workspace.dataPeriod}</span>
          </div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[2rem]">
            <Greeting />
          </h1>
          <p className="mt-1 text-[15px] text-ink-muted">Here&apos;s what&apos;s happening across Northstar Retail Group.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app/insights" variant="secondary" icon={<Sparkles className="h-4 w-4" aria-hidden />}>Ask AI</ButtonLink>
          <ButtonLink href="/app/reports/q2-executive-review">Open Q2 report</ButtonLink>
        </div>
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={formatCurrency(totals.revenue, { compact: true })} previous={formatCurrency(previousYear.revenue, { compact: true })} change={percentChange(totals.revenue, previousYear.revenue)} series={kpiSeries.revenue} />
        <KpiCard label="Orders" value={formatNumber(totals.orders)} previous={formatNumber(previousYear.orders)} change={percentChange(totals.orders, previousYear.orders)} series={kpiSeries.orders} />
        <KpiCard label="Conversion" value={`${totals.conversion.toFixed(2)}%`} previous={`${previousYear.conversion.toFixed(2)}%`} change={totals.conversion - previousYear.conversion} changeUnit="pts" series={kpiSeries.conversion} />
        <KpiCard label="Customer acquisition cost" value={`$${totals.cac.toFixed(2)}`} previous={`$${previousYear.cac.toFixed(2)}`} change={percentChange(totals.cac, previousYear.cac)} inverse series={kpiSeries.cac} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr] grid-cols-1">
        <RevenuePanel />
        <RegionalPanel />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr] grid-cols-1">
        <TopProducts />
        <section aria-labelledby="ai-highlights" className="rounded-panel border border-night bg-night p-5 text-white">
          <div className="flex items-center justify-between">
            <h2 id="ai-highlights" className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="h-4 w-4 text-amber-100" aria-hidden />AI highlights</h2>
            <span className="text-2xs text-white/50">Demo analysis</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {highlights.map((i) => (
              <li key={i.id}>
                <InsightCard insight={i} compact />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
