"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { axisStyle, gridStroke } from "./palette";

interface Point {
  label: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({ data, height = 300, showOrders = true, dark = false }: { data: Point[]; height?: number; showOrders?: boolean; dark?: boolean }) {
  const tick = dark ? { ...axisStyle, fill: "#8FA0A6" } : axisStyle;
  const interval = data.length > 40 ? Math.ceil(data.length / 8) : data.length > 14 ? 3 : 0;
  return (
    <ChartFrame
      label={`Revenue${showOrders ? " and orders" : ""} over ${data.length} periods, from ${data[0]?.label} to ${data[data.length - 1]?.label}`}
      columns={["Period", "Revenue", "Orders"]}
      rows={data.map((d) => [d.label, formatCurrency(d.revenue), formatNumber(d.orders)])}
    >
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={dark ? "rev-dark" : "rev-light"} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dark ? "#5FB3B6" : "#12656A"} stopOpacity={dark ? 0.35 : 0.2} />
                <stop offset="100%" stopColor={dark ? "#5FB3B6" : "#12656A"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={dark ? "#2E3B41" : gridStroke} />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval={interval} minTickGap={8} />
            <YAxis yAxisId="rev" tick={tick} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v, { compact: true, decimals: v >= 1_000_000 ? 1 : 0 })} />
            {showOrders ? <YAxis yAxisId="ord" orientation="right" hide /> : null}
            <Tooltip content={<ChartTooltip formatter={(v, name) => (name === "Revenue" ? formatCurrency(v) : formatNumber(v))} />} cursor={{ stroke: dark ? "#5FB3B6" : "#12656A", strokeOpacity: 0.3 }} />
            <Area yAxisId="rev" name="Revenue" type="monotone" dataKey="revenue" stroke={dark ? "#5FB3B6" : "#12656A"} strokeWidth={2} fill={`url(#${dark ? "rev-dark" : "rev-light"})`} animationDuration={500} />
            {showOrders ? <Line yAxisId="ord" name="Orders" type="monotone" dataKey="orders" stroke="#C98A1B" strokeWidth={1.5} strokeDasharray="4 3" dot={false} animationDuration={500} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
