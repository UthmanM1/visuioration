"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ChartKind } from "@/lib/demo-data";
import { formatMeasure } from "@/lib/query";
import type { QueryResult } from "@/lib/query";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { axisStyle, chartColors, gridStroke, regionColors, categoryColors } from "./palette";

const colorFor = (key: string, index: number) => regionColors[key] ?? categoryColors[key] ?? chartColors[index % chartColors.length];

export function ChartRenderer({ kind, result, height = 320, title }: { kind: ChartKind; result: QueryResult; height?: number; title: string }) {
  const { rows, series, measure } = result;
  const f = (v: number, compact = true) => (result.format ? result.format(v, compact) : formatMeasure(measure, v, compact));
  const fmt = (v: number) => f(v);
  const common = { data: rows, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={gridStroke} />
      <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} interval={0} angle={rows.length > 6 && String(rows[0]?.label).length > 8 ? -20 : 0} textAnchor={rows.length > 6 && String(rows[0]?.label).length > 8 ? "end" : "middle"} height={rows.length > 6 && String(rows[0]?.label).length > 8 ? 60 : 30} />
      <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={60} tickFormatter={fmt} />
      <Tooltip content={<ChartTooltip formatter={(v) => f(v, false)} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
      {series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} /> : null}
    </>
  );
  const frameRows = rows.map((r) => [String(r.label), ...series.map((s) => f(Number(r[s] ?? 0), false))]);

  let body: React.ReactNode;
  switch (kind) {
    case "line":
      body = (
        <LineChart {...common}>
          {axes}
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={colorFor(s, i)} strokeWidth={2} dot={{ r: 2.5 }} animationDuration={450} />
          ))}
        </LineChart>
      );
      break;
    case "area":
      body = (
        <AreaChart {...common}>
          {axes}
          {series.map((s, i) => (
            <Area key={s} type="monotone" dataKey={s} stackId={series.length > 1 ? "a" : undefined} stroke={colorFor(s, i)} fill={colorFor(s, i)} fillOpacity={series.length > 1 ? 0.55 : 0.15} strokeWidth={2} animationDuration={450} />
          ))}
        </AreaChart>
      );
      break;
    case "bar":
      body = (
        <BarChart {...common} barCategoryGap="22%">
          {axes}
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} fill={colorFor(s, i)} radius={series.length > 1 ? 0 : [4, 4, 0, 0]} stackId={series.length > 1 ? "a" : undefined} animationDuration={450} />
          ))}
        </BarChart>
      );
      break;
    case "donut": {
      const data = rows.map((r) => ({ name: String(r.label), value: series.reduce((sum, s) => sum + Number(r[s] ?? 0), 0) }));
      body = (
        <PieChart>
          <Tooltip content={<ChartTooltip formatter={(v) => f(v, false)} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1.5} stroke="none" animationDuration={450}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={colorFor(d.name, i)} />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    }
    case "scatter":
      if (result.scatter) {
        const xLabel = result.scatter.xLabel;
        body = (
          <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={gridStroke} />
            <XAxis type="number" dataKey="sx" name={xLabel} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis type="number" dataKey={series[0]} name={result.scatter.yLabel} tick={axisStyle} tickLine={false} axisLine={false} width={60} tickFormatter={fmt} />
            <ZAxis range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => (active && payload?.[0] ? <div className="rounded-lg bg-night px-3 py-2 text-[12px] text-white shadow-overlay"><p className="font-medium">{xLabel}: {String(payload[0].payload.label)}</p><p className="tnum text-white/70">{f(Number(payload[0].payload[series[0]]), false)}</p></div> : null)} />
            <Scatter data={rows} fill="#12656A" animationDuration={450} />
          </ScatterChart>
        );
        break;
      }
      body = (
        <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={gridStroke} />
          <XAxis type="number" dataKey="orders" name="Orders" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatMeasure("Orders", v)} />
          <YAxis type="number" dataKey="revenue" name="Revenue" tick={axisStyle} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => formatMeasure("Revenue", v)} />
          <ZAxis range={[80, 80]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => (active && payload?.[0] ? <div className="rounded-lg bg-night px-3 py-2 text-[12px] text-white shadow-overlay"><p className="font-medium">{String(payload[0].payload.label)}</p><p className="tnum text-white/70">{formatMeasure("Orders", Number(payload[0].payload.orders), false)} orders · {formatMeasure("Revenue", Number(payload[0].payload.revenue), false)}</p></div> : null)} />
          <Scatter data={rows.filter((r) => r.orders !== undefined)} fill="#12656A" animationDuration={450}>
            {rows.map((r, i) => (
              <Cell key={String(r.label)} fill={colorFor(String(r.label), i)} />
            ))}
          </Scatter>
        </ScatterChart>
      );
      break;
    default:
      body = null;
  }

  if (kind === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-line" style={{ maxHeight: height }}>
        <table className="w-full min-w-[360px] text-left text-[13px]">
          <caption className="sr-only">{title}</caption>
          <thead className="sticky top-0 bg-paper text-ink-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Label</th>
              {series.map((s) => (
                <th key={s} scope="col" className="px-3 py-2 text-right font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.label)} className="border-t border-line">
                <th scope="row" className="px-3 py-2 font-medium text-ink">{String(r.label)}</th>
                {series.map((s) => (
                  <td key={s} className="tnum px-3 py-2 text-right text-ink-soft">{f(Number(r[s] ?? 0), false)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (kind === "kpi") {
    const first = rows[0] ? series.reduce((s, k) => s + Number(rows[0][k] ?? 0), 0) : 0;
    const last = rows.length ? series.reduce((s, k) => s + Number(rows[rows.length - 1][k] ?? 0), 0) : 0;
    const change = first ? ((last - first) / first) * 100 : 0;
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
        <p className="text-sm text-ink-muted">{title}</p>
        <p className="tnum mt-2 font-display text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">{f(result.total)}</p>
        {rows.length > 1 ? (
        <p className="tnum mt-3 text-[13px] text-ink-muted">
            {String(rows[rows.length - 1]?.label)} vs {String(rows[0]?.label)}: <span className="font-semibold text-ink">{change >= 0 ? "+" : "−"}{Math.abs(change).toFixed(1)}%</span>
          </p>
        ) : null}
      </div>
    );
  }

  if (kind === "heatmap") {
    const allValues = rows.flatMap((r) => series.map((s) => Number(r[s] ?? 0)));
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    return (
      <div className="overflow-x-auto" style={{ maxHeight: height }}>
        <table className="w-full border-separate border-spacing-1 text-[12px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">Label</th>
              {rows.map((r) => (
                <th key={String(r.label)} scope="col" className="px-1 pb-1 text-center font-medium text-ink-muted">{String(r.label)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left font-medium text-ink-soft">{s}</th>
                {rows.map((r) => {
                  const v = Number(r[s] ?? 0);
                  const t = max === min ? 0.5 : (v - min) / (max - min);
                  return (
                    <td key={String(r.label)} className="tnum h-10 min-w-[52px] rounded-md text-center font-medium" style={{ backgroundColor: `rgba(18,101,106,${0.08 + t * 0.85})`, color: t > 0.5 ? "#fff" : "#16191D" }}>
                      {f(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ChartFrame label={title} columns={["Label", ...series]} rows={frameRows}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {body as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
