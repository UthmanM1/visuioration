"use client";

import { useState } from "react";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Delta } from "@/components/ui/delta";
import { revenueSeries } from "@/lib/services/analytics-data";
import type { RangeKey } from "@/lib/services/analytics-data";
import { formatCurrency, percentChange } from "@/lib/format";
import { previousYear } from "@/lib/demo-data";

const ranges: RangeKey[] = ["7D", "30D", "90D", "12M"];

export function RevenuePanel() {
  const [range, setRange] = useState<RangeKey>("12M");
  const data = revenueSeries(range);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const half = Math.floor(data.length / 2);
  const first = data.slice(0, half).reduce((s, d) => s + d.revenue, 0);
  const second = data.slice(data.length - half).reduce((s, d) => s + d.revenue, 0);
  const change = range === "12M" ? percentChange(total, previousYear.revenue) : first ? ((second - first) / first) * 100 : 0;
  return (
    <Panel>
      <PanelHeader
        title="Revenue performance"
        description={range === "12M" ? "Jul 2025 – Jun 2026, monthly" : `Last ${range.replace("D", " days")} to 30 Jun 2026, daily`}
        actions={<Segmented options={ranges} value={range} onChange={setRange} label="Date range" />}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 pt-3">
        <p className="tnum font-display text-2xl font-semibold tracking-[-0.02em]">{formatCurrency(total, { compact: true, decimals: 2 })}</p>
        <Delta value={change} />
        <span className="text-[12px] text-ink-faint">{range === "12M" ? "vs FY25" : "second half vs first half of period"}</span>
      </div>
      <div className="px-2 pb-4 pt-2 sm:px-3">
        <RevenueChart data={data} height={300} />
      </div>
    </Panel>
  );
}
