"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useId } from "react";

export function Sparkline({ data, color = "#12656A", label }: { data: number[]; color?: string; label: string }) {
  const id = useId().replace(/:/g, "");
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div role="img" aria-label={label} className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} fill={`url(#spark-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
