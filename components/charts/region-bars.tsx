"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { axisStyle, gridStroke } from "./palette";

interface RegionDatum {
  region: string;
  value: number;
}

export function RegionBars({ data, selected, onSelect, height = 240, metricLabel = "Revenue" }: { data: RegionDatum[]; selected?: string | null; onSelect?: (region: string) => void; height?: number; metricLabel?: string }) {
  return (
    <ChartFrame label={`${metricLabel} by region`} columns={["Region", metricLabel]} rows={data.map((d) => [d.region, formatCurrency(d.value)])}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={gridStroke} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="region" tick={{ ...axisStyle, fontSize: 12, fill: "#3A4048" }} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(18,101,106,0.06)" }} />
            <Bar dataKey="value" name={metricLabel} radius={[0, 5, 5, 0]} animationDuration={450} onClick={(d: { region?: string }) => d.region && onSelect?.(d.region)} className={onSelect ? "cursor-pointer" : undefined}>
              {data.map((d) => (
                <Cell key={d.region} fill={!selected || selected === d.region ? "#12656A" : "#C9D9D8"} />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v: number) => formatCurrency(v, { compact: true, decimals: v >= 1_000_000 ? 2 : 0 })} style={{ fontSize: 12, fill: "#3A4048", fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
