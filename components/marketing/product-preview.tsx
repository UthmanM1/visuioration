"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { facts, monthly, regionSummary, totals } from "@/lib/demo-data";
import { cn, formatChange, formatCurrency, formatNumber } from "@/lib/format";

const kpis = [
  { label: "Revenue", value: formatCurrency(totals.revenue, { compact: true }), change: totals.yoyGrowth, note: "vs FY25" },
  { label: "Conversion", value: `${totals.conversion.toFixed(2)}%`, change: 0.21, note: "pts vs FY25", pts: true },
  { label: "Customers", value: formatNumber(totals.customers), change: 11.2, note: "vs FY25" },
  { label: "Growth", value: formatChange(totals.yoyGrowth), change: 2.1, note: "pts vs plan", pts: true },
];

/** The hero product preview. Real components rendering the same demo data as the app. */
export function ProductPreview() {
  const [region, setRegion] = useState<string | null>(null);
  const series = useMemo(() => monthly.map((m) => ({ label: m.label, revenue: m.revenue, orders: m.orders })), []);
  const max = Math.max(...regionSummary.map((r) => r.revenue));
  return (
    <div className="overflow-hidden rounded-[18px] border border-night-line bg-night text-white shadow-[0_40px_80px_-32px_rgba(10,51,54,0.55)]">
      <div className="flex items-center justify-between border-b border-night-line px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </span>
          <span className="ml-2">Northstar Retail Group</span>
          <span className="text-white/30">/</span>
          <span className="text-white/80">Performance</span>
        </div>
        <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-2xs text-amber-100">Demo data</span>
      </div>
      <div className="grid grid-cols-2 border-b border-night-line sm:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn("px-4 py-4", i % 2 === 1 && "border-l border-night-line", i >= 2 && "border-t border-night-line sm:border-t-0", i === 2 && "sm:border-l")}>
            <p className="text-2xs text-white/55">{k.label}</p>
            <p className="tnum mt-1 text-xl font-semibold tracking-[-0.02em]">{k.value}</p>
            <p className="tnum mt-0.5 text-2xs text-petrol-200">
              {k.pts ? `+${k.change.toFixed(k.change < 1 ? 2 : 1)}` : formatChange(k.change)} <span className="text-white/40">{k.note}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-[1.55fr_1fr] grid-cols-1">
        <div className="border-b border-night-line p-4 md:border-b-0 md:border-r">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[13px] font-medium">Revenue, FY26</p>
            <p className="text-2xs text-white/50">Monthly · orders dashed</p>
          </div>
          <RevenueChart data={series} height={190} dark />
        </div>
        <div className="flex flex-col">
          <div className="border-b border-night-line p-4">
            <p className="mb-3 text-[13px] font-medium">Regional performance</p>
            <ul className="space-y-2">
              {regionSummary.map((r) => (
                <li key={r.region}>
                  <button onClick={() => setRegion(region === r.region ? null : r.region)} aria-pressed={region === r.region} className="group flex w-full items-center gap-3 rounded-md text-left text-[12px]">
                    <span className="w-10 text-white/70">{r.region}</span>
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className={cn("absolute inset-y-0 left-0 rounded-full transition-colors", r.region === "West" ? "bg-amber-500" : "bg-[#5FB3B6]", region && region !== r.region && "opacity-30")} style={{ width: `${(r.revenue / max) * 100}%` }} />
                    </span>
                    <span className="tnum w-14 text-right font-medium">{formatCurrency(r.revenue, { compact: true, decimals: 2 })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Insight · demo analysis
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              {region && region !== "West"
                ? `${region} grew ${regionSummary.find((r) => r.region === region)!.growth.toFixed(1)}% in Q2 versus Q1, close to the company-wide ${facts.q2Growth.toFixed(1)}%.`
                : `West drove ${facts.westShareOfDecline.toFixed(0)}% of March's ${Math.abs(facts.marchRevenueChange).toFixed(1)}% revenue dip, led by a ${Math.abs(facts.westOrdersChange).toFixed(0)}% fall in orders.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
