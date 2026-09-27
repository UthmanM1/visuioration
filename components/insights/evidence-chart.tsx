"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisStyle, gridStroke } from "@/components/charts/palette";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { acquisitionChannels, categorySummary, deviceConversion, monthIndex, monthly, regionalMonthly, regions, totals } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";
import type { EvidenceKind } from "@/lib/services/insights";

export const evidenceTitles: Record<EvidenceKind, string> = {
  "revenue-trend": "Revenue trend, FY26",
  "regional-contribution": "Change in revenue by region, Mar vs Feb",
  "category-contribution": "Revenue by category, Q1 vs Q2 2026",
  "device-conversion": "Conversion rate by device",
  acquisition: "Customer acquisition cost by channel",
};

export function EvidenceChart({ kind, height = 220 }: { kind: EvidenceKind; height?: number }) {
  if (kind === "revenue-trend") {
    return <RevenueChart data={monthly.map((m) => ({ label: m.label, revenue: m.revenue, orders: m.orders }))} height={height} showOrders={false} />;
  }

  if (kind === "regional-contribution") {
    const feb = regionalMonthly[monthIndex("2026-02")];
    const mar = regionalMonthly[monthIndex("2026-03")];
    const data = regions.map((r) => ({ region: r, change: Math.round(mar[r] - feb[r]) }));
    return (
      <ChartFrame label={evidenceTitles[kind]} columns={["Region", "Change"]} rows={data.map((d) => [d.region, formatCurrency(d.change)])}>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="region" tick={axisStyle} tickLine={false} axisLine={false} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
              <ReferenceLine y={0} stroke="#8A939C" />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
              <Bar dataKey="change" name="Change" radius={[4, 4, 4, 4]} animationDuration={450}>
                {data.map((d) => (
                  <Cell key={d.region} fill={d.region === "West" ? "#B5452F" : "#C9D9D8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    );
  }

  if (kind === "category-contribution") {
    const data = categorySummary.map((c) => ({ category: c.category, Q1: c.q1, Q2: c.q2 }));
    return (
      <ChartFrame label={evidenceTitles[kind]} columns={["Category", "Q1", "Q2"]} rows={data.map((d) => [d.category, formatCurrency(d.Q1), formatCurrency(d.Q2)])}>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={gridStroke} />
              <XAxis dataKey="category" tick={axisStyle} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
              <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Q1" fill="#C9D9D8" radius={[3, 3, 0, 0]} animationDuration={450} />
              <Bar dataKey="Q2" fill="#12656A" radius={[3, 3, 0, 0]} animationDuration={450} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    );
  }

  if (kind === "device-conversion") {
    const data = deviceConversion.map((d) => ({ device: `${d.device} (${d.sessionShare}% of sessions)`, conversion: d.conversion }));
    return (
      <ChartFrame label={evidenceTitles[kind]} columns={["Device", "Conversion"]} rows={data.map((d) => [d.device, `${d.conversion}%`])}>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} stroke={gridStroke} />
              <XAxis type="number" domain={[0, 6]} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="device" tick={{ ...axisStyle, fill: "#3A4048" }} tickLine={false} axisLine={false} width={150} />
              <ReferenceLine x={totals.conversion} stroke="#C98A1B" strokeDasharray="4 3" label={{ value: `Avg ${totals.conversion.toFixed(2)}%`, position: "top", fontSize: 11, fill: "#8C5E0F" }} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(2)}%`} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
              <Bar dataKey="conversion" name="Conversion" radius={[0, 4, 4, 0]} animationDuration={450}>
                {data.map((d) => (
                  <Cell key={d.device} fill={d.device.startsWith("Mobile") ? "#B5452F" : "#12656A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    );
  }

  const data = acquisitionChannels.map((c) => ({ channel: c.channel, cac: Number(c.cac.toFixed(2)) }));
  return (
    <ChartFrame label={evidenceTitles.acquisition} columns={["Channel", "CAC"]} rows={data.map((d) => [d.channel, `$${d.cac.toFixed(2)}`])}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 16, right: 40, bottom: 0, left: 8 }}>
            <CartesianGrid horizontal={false} stroke={gridStroke} />
            <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
            <YAxis type="category" dataKey="channel" tick={{ ...axisStyle, fill: "#3A4048" }} tickLine={false} axisLine={false} width={120} />
            <ReferenceLine x={totals.cac} stroke="#C98A1B" strokeDasharray="4 3" label={{ value: `Blended $${totals.cac.toFixed(2)}`, position: "top", fontSize: 11, fill: "#8C5E0F" }} />
            <Tooltip content={<ChartTooltip formatter={(v) => `$${v.toFixed(2)}`} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
            <Bar dataKey="cac" name="CAC" radius={[0, 4, 4, 0]} animationDuration={450}>
              {data.map((d) => (
                <Cell key={d.channel} fill={d.cac > totals.cac ? "#C98A1B" : "#12656A"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
