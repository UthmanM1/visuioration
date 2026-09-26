"use client";

import type { TooltipProps } from "recharts";

export function ChartTooltip({ active, payload, label, formatter }: TooltipProps<number, string> & { formatter?: (value: number, name: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-night-line bg-night px-3 py-2 text-[12px] text-white shadow-overlay">
      {label !== undefined ? <p className="mb-1 font-medium text-white/70">{label}</p> : null}
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="tnum flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          <span className="text-white/70">{item.name}</span>
          <span className="ml-auto pl-3 font-semibold">{formatter ? formatter(Number(item.value), String(item.name)) : item.value}</span>
        </p>
      ))}
    </div>
  );
}
