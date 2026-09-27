import { dailyRevenue, monthly, regionSummary, topProducts, totals } from "../demo-data";
import { demoResolve } from "./client";

export type RangeKey = "7D" | "30D" | "90D" | "12M";

export function revenueSeries(range: RangeKey) {
  if (range === "12M") return monthly.map((m) => ({ label: m.label, revenue: m.revenue, orders: m.orders }));
  const days = { "7D": 7, "30D": 30, "90D": 90 }[range];
  return dailyRevenue.slice(-days).map((d) => ({ label: d.label, revenue: d.revenue, orders: d.orders }));
}

export const analyticsService = {
  summary: () => demoResolve(totals),
  revenue: (range: RangeKey) => demoResolve(revenueSeries(range)),
  regions: () => demoResolve(regionSummary),
  products: () => demoResolve(topProducts),
};
