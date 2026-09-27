import {
  acquisitionChannels,
  categories,
  categorySummary,
  channelMix,
  deviceConversion,
  monthly,
  quarters,
  regionOrders,
  regionalMonthly,
  regions,
  topProducts,
  totals,
} from "./demo-data";
import type { RegionName } from "./demo-data";

export const dimensions = ["Date", "Region", "Product", "Category", "Channel", "Device"] as const;
export const measures = ["Revenue", "Orders", "Units", "Conversion", "CAC"] as const;
export const aggregations = ["Sum", "Average", "Maximum"] as const;
export const dateRanges = ["Last 3 months", "Last 6 months", "Last 12 months"] as const;
export const groupOptions = ["None", "Region", "Category"] as const;

export type Dimension = (typeof dimensions)[number];
export type Measure = (typeof measures)[number];
export type Aggregation = (typeof aggregations)[number];
export type DateRange = (typeof dateRanges)[number];
export type GroupBy = (typeof groupOptions)[number];

export interface QueryInput {
  dimension: Dimension;
  measure: Measure;
  groupBy: GroupBy;
  aggregation: Aggregation;
  range: DateRange;
  regionFilter: "All regions" | RegionName;
}

export interface QueryResult {
  rows: Array<Record<string, string | number>>;
  series: string[];
  measure: Measure;
  total: number;
  note?: string;
  /** Live datasets: formats values for the chosen measure. Defaults to the demo measure formats. */
  format?: (value: number, compact?: boolean) => string;
  /** Live datasets: scatter plots the numeric x value (row key "sx") against the first series. */
  scatter?: { xLabel: string; yLabel: string };
}

const UNITS_PER_ORDER = 1.38;
const regionConversion: Record<RegionName, number> = { North: 4.98, South: 4.71, East: 4.94, West: 4.61 };
const regionCac: Record<RegionName, number> = { North: 40.9, South: 43.2, East: 41.4, West: 43.6 };

function monthsFor(range: DateRange) {
  const count = { "Last 3 months": 3, "Last 6 months": 6, "Last 12 months": 12 }[range];
  return monthly.slice(-count);
}

function monthValue(m: (typeof monthly)[number], measure: Measure) {
  switch (measure) {
    case "Revenue":
      return m.revenue;
    case "Orders":
      return m.orders;
    case "Units":
      return Math.round(m.orders * UNITS_PER_ORDER);
    case "Conversion":
      return Number(((m.orders / m.sessions) * 100).toFixed(2));
    case "CAC":
      return Number((m.marketingSpend / m.newCustomers).toFixed(2));
  }
}

const isRate = (measure: Measure) => measure === "Conversion" || measure === "CAC";

function aggregate(values: number[], aggregation: Aggregation, measure: Measure) {
  if (values.length === 0) return 0;
  if (aggregation === "Maximum") return Math.max(...values);
  if (aggregation === "Average" || isRate(measure)) return values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + b, 0);
}

export function runQuery(input: QueryInput): QueryResult {
  const months = monthsFor(input.range);
  const fraction = months.reduce((s, m) => s + m.revenue, 0) / totals.revenue;
  const regionFactor = input.regionFilter === "All regions" ? 1 : { North: 0.28, South: 0.21, East: 0.26, West: 0.25 }[input.regionFilter];
  const scale = (v: number) => (isRate(input.measure) ? v : v * fraction * regionFactor);
  const round = (v: number) => (isRate(input.measure) ? Number(v.toFixed(2)) : Math.round(v));
  let rows: QueryResult["rows"] = [];
  let series = [input.measure as string];
  let note: string | undefined;

  if (input.dimension === "Date") {
    if (input.groupBy === "Region" && (input.measure === "Revenue" || input.measure === "Orders" || input.measure === "Units")) {
      series = regions.filter((r) => input.regionFilter === "All regions" || r === input.regionFilter);
      rows = months.map((m) => {
        const reg = regionalMonthly.find((r) => r.key === m.key)!;
        const row: Record<string, string | number> = { label: m.label };
        series.forEach((r) => {
          const region = r as RegionName;
          const orders = regionOrders(m.key, region);
          row[r] = input.measure === "Revenue" ? reg[region] : input.measure === "Orders" ? orders : Math.round(orders * UNITS_PER_ORDER);
        });
        return row;
      });
    } else if (input.groupBy === "Category" && input.measure === "Revenue") {
      series = [...categories];
      rows = quarters.map((q) => ({ label: q.quarter, ...q.byCategory }));
      note = "Category revenue is recorded by quarter in this dataset.";
    } else {
      rows = months.map((m) => ({ label: m.label, [input.measure]: round(monthValue(m, input.measure) * (isRate(input.measure) ? 1 : regionFactor)) }));
      if (input.groupBy !== "None") note = `Grouping by ${input.groupBy.toLowerCase()} is available for revenue, orders and units.`;
    }
  } else {
    const base: Array<{ label: string; revenue: number; orders: number; conversion: number; cac: number }> = (() => {
      switch (input.dimension) {
        case "Region":
          return regions
            .filter((r) => input.regionFilter === "All regions" || r === input.regionFilter)
            .map((r) => {
              const revenue = regionalMonthly.reduce((s, m) => s + m[r], 0);
              const orders = monthly.reduce((s, m) => s + regionOrders(m.key, r), 0);
              return { label: r, revenue: revenue / regionFactor, orders: orders / regionFactor, conversion: regionConversion[r], cac: regionCac[r] };
            });
        case "Category":
          return categorySummary.map((c) => ({ label: c.category, revenue: c.revenue, orders: c.revenue / (c.category === "Electronics" ? 96.4 : c.category === "Outdoor" ? 58.2 : 55.1), conversion: c.category === "Outdoor" ? 5.6 : c.category === "Electronics" ? 4.2 : 4.9, cac: 42.18 }));
        case "Channel":
          return channelMix.map((c) => ({ label: c.channel, revenue: c.revenue, orders: c.revenue / totals.averageOrderValue, conversion: { Web: 4.9, App: 5.8, Store: 0, Marketplace: 3.6 }[c.channel] ?? 0, cac: acquisitionChannels[0].cac }));
        case "Device":
          return deviceConversion.map((d) => {
            const orders = (totals.sessions * d.sessionShare * d.conversion) / 10000;
            return { label: d.device, revenue: orders * totals.averageOrderValue, orders, conversion: d.conversion, cac: 42.18 };
          });
        case "Product":
          return topProducts.map((p) => ({ label: p.name.replace(/"/g, "″"), revenue: p.revenue, orders: p.orders, conversion: p.conversion, cac: 42.18 }));
        default:
          return [];
      }
    })();
    const denominator = input.aggregation === "Average" ? months.length : 1;
    rows = base.map((b) => {
      const value =
        input.measure === "Revenue" ? b.revenue : input.measure === "Orders" ? b.orders : input.measure === "Units" ? b.orders * UNITS_PER_ORDER : input.measure === "Conversion" ? b.conversion : b.cac;
      return { label: b.label, [input.measure]: round(scale(value) / (isRate(input.measure) ? 1 : denominator)), orders: Math.round(scale(b.orders)), revenue: Math.round(scale(b.revenue)) };
    });
    if (input.measure === "CAC" && input.dimension !== "Region") note = "CAC is tracked by region and acquisition channel; other breakdowns show the blended figure.";
    if (input.dimension === "Channel" && input.measure === "Conversion") note = "Store conversion is not tracked (no session data).";
    if (input.groupBy !== "None") note = "Grouping applies when Date is on the X axis.";
  }

  const values = rows.flatMap((r) => series.map((s) => Number(r[s] ?? 0)));
  const total = input.dimension === "Date" && input.groupBy !== "None" && series.length > 1
    ? aggregate(rows.map((r) => series.reduce((sum, s) => sum + Number(r[s] ?? 0), 0)), input.aggregation, input.measure)
    : aggregate(values, input.aggregation, input.measure);
  return { rows, series, measure: input.measure, total, note };
}

export function formatMeasure(measure: Measure, value: number, compact = true) {
  if (measure === "Revenue") return compact ? `$${value >= 1e6 ? (value / 1e6).toFixed(2) + "M" : value >= 1e3 ? (value / 1e3).toFixed(0) + "K" : value.toFixed(0)}` : `$${Math.round(value).toLocaleString("en-US")}`;
  if (measure === "Conversion") return `${value.toFixed(2)}%`;
  if (measure === "CAC") return `$${value.toFixed(2)}`;
  return compact && value >= 10000 ? `${(value / 1000).toFixed(1)}K` : Math.round(value).toLocaleString("en-US");
}
