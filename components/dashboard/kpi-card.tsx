"use client";

import { Sparkline } from "@/components/charts/sparkline";
import { Delta } from "@/components/ui/delta";
import { cn } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  previous: string;
  change: number;
  changeUnit?: "%" | "pts";
  inverse?: boolean;
  series: number[];
  className?: string;
}

export function KpiCard({ label, value, previous, change, changeUnit = "%", inverse, series, className }: KpiCardProps) {
  const good = inverse ? change < 0 : change > 0;
  return (
    <article className={cn("flex flex-col rounded-panel border border-line bg-surface p-4 shadow-panel sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-medium text-ink-muted">{label}</h3>
        <Delta value={change} inverse={inverse} suffix={changeUnit} decimals={changeUnit === "pts" ? 2 : 1} />
      </div>
      <p className="tnum mt-2 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-ink">{value}</p>
      <p className="tnum mt-1.5 text-[12px] text-ink-faint">vs {previous} in FY25</p>
      <div className="mt-3">
        <Sparkline data={series} color={good ? "#12656A" : "#B5452F"} label={`${label} trend over the last 12 months`} />
      </div>
    </article>
  );
}
