import type { ChartKind } from "../demo-data/types";
import type { QueryResult } from "../query";
import type { ColumnDataType } from "../supabase/database.types";

/**
 * Chart definitions for live datasets. Stored as JSON in visualizations.config and translated into the
 * spec accepted by the query_dataset() database function. Safe to import on client and server.
 */

export const aggregations = ["sum", "avg", "min", "max", "count", "count_distinct"] as const;
export const dateGrains = ["day", "week", "month", "quarter", "year"] as const;
export const filterOps = ["eq", "neq", "in", "not_in", "contains", "gt", "gte", "lt", "lte", "empty", "not_empty"] as const;
export const rangePresets = ["all", "last_30_days", "last_3_months", "last_6_months", "last_12_months", "year_to_date", "custom"] as const;
export const chartKinds: ChartKind[] = ["line", "bar", "area", "donut", "scatter", "table", "kpi", "heatmap"];

export type Aggregation = (typeof aggregations)[number];
export type DateGrain = (typeof dateGrains)[number];
export type FilterOp = (typeof filterOps)[number];
export type RangePreset = (typeof rangePresets)[number];

export interface DefinitionFilter {
  column: number;
  op: FilterOp;
  value?: string | number | string[];
}

export interface VisualizationDefinition {
  version: 1;
  x: { column: number; grain?: DateGrain } | null;
  y: { column: number | null; aggregation: Aggregation };
  series: { column: number } | null;
  filters: DefinitionFilter[];
  dateRange: { column: number; preset: RangePreset; from?: string; to?: string } | null;
  limit: number;
}

export interface DatasetField {
  position: number;
  name: string;
  type: ColumnDataType;
  distinctCount: number;
  samples: string[];
  min: string | null;
  max: string | null;
}

export interface QueryableDataset {
  id: string;
  slug: string;
  name: string;
  rowCount: number;
  queryRowCount: number;
  ready: boolean;
  fields: DatasetField[];
}

export const aggregationLabels: Record<Aggregation, string> = {
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
  count: "Count of rows",
  count_distinct: "Count distinct",
};

export const grainLabels: Record<DateGrain, string> = { day: "Day", week: "Week", month: "Month", quarter: "Quarter", year: "Year" };

export const rangeLabels: Record<RangePreset, string> = {
  all: "All time",
  last_30_days: "Last 30 days",
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  last_12_months: "Last 12 months",
  year_to_date: "Year to date",
  custom: "Custom range",
};

export const opLabels: Record<FilterOp, string> = {
  eq: "is",
  neq: "is not",
  in: "is any of",
  not_in: "is none of",
  contains: "contains",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  empty: "is empty",
  not_empty: "is not empty",
};

const numericTypes: ColumnDataType[] = ["integer", "decimal", "currency", "percent"];
export const isNumeric = (type: ColumnDataType) => numericTypes.includes(type);
export const isDimension = (type: ColumnDataType) => type === "text" || type === "date" || type === "boolean" || type === "integer";

export function opsFor(type: ColumnDataType): FilterOp[] {
  if (isNumeric(type)) return ["eq", "neq", "gt", "gte", "lt", "lte", "empty", "not_empty"];
  if (type === "date") return ["gte", "lte", "eq", "empty", "not_empty"];
  if (type === "boolean") return ["eq", "empty", "not_empty"];
  return ["eq", "neq", "in", "not_in", "contains", "empty", "not_empty"];
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Relative presets end at the latest date in the dataset (not today), so historical data still shows. */
export function resolveRange(range: VisualizationDefinition["dateRange"], latest: string | null): { from?: string; to?: string } | null {
  if (!range || range.preset === "all") return null;
  if (range.preset === "custom") return range.from || range.to ? { from: range.from || undefined, to: range.to || undefined } : null;
  if (!latest) return null;
  const end = new Date(`${latest.slice(0, 10)}T00:00:00Z`);
  const start = new Date(end);
  switch (range.preset) {
    case "last_30_days":
      start.setUTCDate(start.getUTCDate() - 29);
      break;
    case "last_3_months":
    case "last_6_months":
    case "last_12_months": {
      const months = { last_3_months: 3, last_6_months: 6, last_12_months: 12 }[range.preset];
      start.setUTCDate(1);
      start.setUTCMonth(start.getUTCMonth() - months + 1);
      break;
    }
    case "year_to_date":
      start.setUTCMonth(0, 1);
      break;
  }
  return { from: isoDay(start), to: isoDay(end) };
}

/** Returns a user-facing problem with the definition, or null when it can be run. */
export function validateDefinition(def: VisualizationDefinition, fields: DatasetField[], kind: ChartKind): string | null {
  const field = (position: number | null | undefined) => (position === null || position === undefined ? undefined : fields.find((f) => f.position === position));
  if (!aggregations.includes(def.y.aggregation)) return "Choose how to aggregate the measure.";
  if (def.y.aggregation !== "count") {
    const y = field(def.y.column);
    if (!y) return "Choose a measure for the Y axis.";
    if (def.y.aggregation !== "count_distinct" && !isNumeric(y.type)) return `“${y.name}” isn't a number column. Use Count distinct, or pick a number column.`;
  }
  if (kind !== "kpi") {
    if (!def.x) return "Choose a dimension for the X axis.";
    const x = field(def.x.column);
    if (!x) return "Choose a dimension for the X axis.";
    if (kind === "scatter" && !isNumeric(x.type)) return "Scatter plots need a number column on the X axis.";
    if (x.type === "date" && def.x.grain && !dateGrains.includes(def.x.grain)) return "Choose a date grouping.";
  }
  if (def.series) {
    const s = field(def.series.column);
    if (!s || (s.type !== "text" && s.type !== "boolean")) return "Series can only be split by a text or yes/no column.";
    if (kind === "donut" || kind === "kpi" || kind === "scatter") return "This chart type can't be split into series. Set Group by to None.";
  }
  for (const filter of def.filters) {
    const f = field(filter.column);
    if (!f) return "A filter refers to a column that no longer exists.";
    if (!opsFor(f.type).includes(filter.op)) return `“${opLabels[filter.op]}” doesn't apply to “${f.name}”.`;
    const needsValue = filter.op !== "empty" && filter.op !== "not_empty";
    const empty = filter.value === undefined || filter.value === "" || (Array.isArray(filter.value) && filter.value.length === 0);
    if (needsValue && empty) return `Enter a value for the “${f.name}” filter.`;
    if (needsValue && isNumeric(f.type) && !Number.isFinite(Number(filter.value))) return `The “${f.name}” filter needs a number.`;
    if (needsValue && f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(filter.value))) return `The “${f.name}” filter needs a date.`;
  }
  if (def.dateRange) {
    const d = field(def.dateRange.column);
    if (!d || d.type !== "date") return "Date ranges need a date column.";
    if (def.dateRange.preset === "custom" && def.dateRange.from && def.dateRange.to && def.dateRange.from > def.dateRange.to) return "The start date is after the end date.";
  }
  if (!Number.isInteger(def.limit) || def.limit < 1 || def.limit > 500) return "Show between 1 and 500 categories.";
  return null;
}

/** The JSON spec the query_dataset() function expects. */
export function toQuerySpec(def: VisualizationDefinition, fields: DatasetField[], kind: ChartKind) {
  const x = kind === "kpi" || !def.x ? null : def.x;
  const xField = x ? fields.find((f) => f.position === x.column) : undefined;
  const rangeField = def.dateRange ? fields.find((f) => f.position === def.dateRange!.column) : undefined;
  const range = def.dateRange ? resolveRange(def.dateRange, rangeField?.max ?? null) : null;
  return {
    x: x ? { col: x.column, ...(xField?.type === "date" ? { grain: x.grain ?? "month" } : {}) } : null,
    y: def.y.aggregation === "count" ? { agg: "count" } : { col: def.y.column, agg: def.y.aggregation },
    series: x && def.series && kind !== "donut" && kind !== "scatter" ? { col: def.series.column } : null,
    filters: def.filters.map((f) => ({ col: f.column, op: f.op, value: f.value })),
    range: def.dateRange && range ? { col: def.dateRange.column, ...range } : null,
    limit: def.limit,
  };
}

/** A reasonable first chart: over time if there's a date, otherwise by the first category. */
export function defaultDefinition(fields: DatasetField[]): VisualizationDefinition {
  const date = fields.find((f) => f.type === "date");
  const category = fields.find((f) => f.type === "text" && f.distinctCount > 1 && f.distinctCount <= 50) ?? fields.find((f) => f.type === "text");
  const measure = fields.find((f) => f.type === "currency") ?? fields.find((f) => isNumeric(f.type));
  const x = date ?? category ?? fields[0];
  return {
    version: 1,
    x: x ? { column: x.position, ...(x.type === "date" ? { grain: "month" as const } : {}) } : null,
    y: measure ? { column: measure.position, aggregation: "sum" } : { column: null, aggregation: "count" },
    series: null,
    filters: [],
    dateRange: null,
    limit: 50,
  };
}

export function defaultKind(def: VisualizationDefinition, fields: DatasetField[]): ChartKind {
  const x = def.x ? fields.find((f) => f.position === def.x!.column) : undefined;
  return x?.type === "date" ? "area" : "bar";
}

/** Parses stored JSON defensively; returns null if it isn't a usable definition. */
export function parseDefinition(value: unknown): VisualizationDefinition | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<VisualizationDefinition>;
  if (v.version !== 1 || !v.y || typeof v.y !== "object") return null;
  return {
    version: 1,
    x: v.x && typeof v.x.column === "number" ? { column: v.x.column, grain: v.x.grain } : null,
    y: { column: typeof v.y.column === "number" ? v.y.column : null, aggregation: v.y.aggregation ?? "count" },
    series: v.series && typeof v.series.column === "number" ? { column: v.series.column } : null,
    filters: Array.isArray(v.filters) ? v.filters.filter((f) => f && typeof f.column === "number" && typeof f.op === "string") : [],
    dateRange: v.dateRange && typeof v.dateRange.column === "number" ? { column: v.dateRange.column, preset: v.dateRange.preset ?? "all", from: v.dateRange.from, to: v.dateRange.to } : null,
    limit: typeof v.limit === "number" ? v.limit : 50,
  };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type ValueFormat = "currency" | "percent" | "integer" | "decimal";

/** Serialisable query result sent from the server to the builder and library. */
export interface ChartData {
  points: Array<{ x: string | null; s: string | null; v: number | null }>;
  total: number | null;
  matched: number;
  truncatedX: boolean;
  truncatedSeries: boolean;
  valueFormat: ValueFormat;
  xType: ColumnDataType | null;
  grain: DateGrain | null;
  measureLabel: string;
  xLabel: string | null;
  range: { from?: string; to?: string } | null;
}

export function measureLabel(def: VisualizationDefinition, fields: DatasetField[]) {
  if (def.y.aggregation === "count") return "Rows";
  const name = fields.find((f) => f.position === def.y.column)?.name ?? "Value";
  return def.y.aggregation === "count_distinct" ? `Distinct ${name}` : `${aggregationLabels[def.y.aggregation]} of ${name}`;
}

export function valueFormatFor(def: VisualizationDefinition, fields: DatasetField[]): ValueFormat {
  if (def.y.aggregation === "count" || def.y.aggregation === "count_distinct") return "integer";
  const type = fields.find((f) => f.position === def.y.column)?.type;
  if (type === "currency") return "currency";
  if (type === "percent") return "percent";
  if (type === "integer" && def.y.aggregation !== "avg") return "integer";
  return "decimal";
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatXLabel(x: string | null, type: ColumnDataType | null, grain: DateGrain | null) {
  if (x === null) return "(empty)";
  if (type === "boolean") return x === "true" ? "Yes" : x === "false" ? "No" : x;
  if (type !== "date") return x;
  const [y, m, d] = x.slice(0, 10).split("-").map(Number);
  if (!y || !m) return x;
  switch (grain) {
    case "year":
      return String(y);
    case "quarter":
      return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
    case "month":
      return `${monthNames[m - 1]} ${y}`;
    case "week":
      return `Wk of ${d} ${monthNames[m - 1]}`;
    default:
      return `${d} ${monthNames[m - 1]} ${y}`;
  }
}

export function makeFormatter(format: ValueFormat) {
  return (value: number, compact = true) => {
    const abs = Math.abs(value);
    const short = (n: number) => (abs >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : abs >= 1e6 ? `${(n / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M` : abs >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : null);
    if (format === "currency") {
      if (compact && short(value)) return `${value < 0 ? "−" : ""}$${short(abs)}`;
      return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: abs >= 1000 ? 0 : 2 });
    }
    if (format === "percent") return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    if (compact && short(value)) return `${value < 0 ? "−" : ""}${short(abs)}`;
    return value.toLocaleString("en-US", { maximumFractionDigits: format === "integer" ? 0 : 2 });
  };
}

/** Converts server results into the row/series shape the chart renderer draws. */
export function toQueryResult(data: ChartData, kind: ChartKind): QueryResult {
  const format = makeFormatter(data.valueFormat);
  const seriesNames: string[] = [];
  const byX = new Map<string, Record<string, string | number>>();
  const numericX = data.xType === "integer" || data.xType === "decimal" || data.xType === "currency" || data.xType === "percent";
  for (const p of data.points) {
    const key = p.x ?? "(empty)";
    const seriesName = p.s === null ? data.measureLabel : p.s === "true" ? "Yes" : p.s === "false" ? "No" : p.s;
    if (!seriesNames.includes(seriesName)) seriesNames.push(seriesName);
    const row = byX.get(key) ?? { label: formatXLabel(p.x, data.xType, data.grain), ...(numericX ? { sx: Number(p.x) } : {}) };
    row[seriesName] = p.v ?? 0;
    byX.set(key, row);
  }
  const rows = Array.from(byX.entries());
  if (data.xType === "date") rows.sort(([a], [b]) => a.localeCompare(b));
  else if (numericX) rows.sort(([a], [b]) => Number(a) - Number(b));
  else rows.sort(([, a], [, b]) => seriesNames.reduce((s, n) => s + Number(b[n] ?? 0), 0) - seriesNames.reduce((s, n) => s + Number(a[n] ?? 0), 0));
  const result: QueryResult = {
    rows: rows.map(([, r]) => r),
    series: seriesNames.length ? seriesNames : [data.measureLabel],
    measure: "Revenue",
    total: data.total ?? 0,
    format,
  };
  if (kind === "scatter" && numericX) result.scatter = { xLabel: data.xLabel ?? "X", yLabel: data.measureLabel };
  const notes: string[] = [];
  if (data.truncatedX) notes.push(`Showing the top ${rows.length} categories.`);
  if (data.truncatedSeries) notes.push("Showing the 8 largest series.");
  if (data.matched === 0) notes.push("No rows match these filters.");
  if (notes.length) result.note = notes.join(" ");
  return result;
}
