"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { chartColors } from "./palette";

export function Donut({ data, height = 220, colors, centerLabel, centerValue }: { data: Array<{ name: string; value: number }>; height?: number; colors?: Record<string, string>; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ChartFrame label="Share of total by category" columns={["Segment", "Value", "Share"]} rows={data.map((d) => [d.name, formatCurrency(d.value), `${((d.value / total) * 100).toFixed(1)}%`])}>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative w-full max-w-[220px]" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none" animationDuration={500}>
                {data.map((d, i) => (
                  <Cell key={d.name} fill={colors?.[d.name] ?? chartColors[i % chartColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {centerValue ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="tnum text-lg font-semibold">{centerValue}</span>
              {centerLabel ? <span className="text-2xs text-ink-muted">{centerLabel}</span> : null}
            </div>
          ) : null}
        </div>
        <ul className="w-full space-y-2 text-[13px]">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors?.[d.name] ?? chartColors[i % chartColors.length] }} aria-hidden />
              <span className="text-ink-soft">{d.name}</span>
              <span className="tnum ml-auto font-medium">{((d.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
