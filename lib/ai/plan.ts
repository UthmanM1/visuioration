import type { ChartKind } from "../demo-data/types";
import { aggregations, dateGrains, filterOps, rangePresets, validateDefinition } from "../visualizations/definition";
import type { DatasetField, DefinitionFilter, QueryableDataset, VisualizationDefinition } from "../visualizations/definition";

/**
 * Stages 2 and 3: the model proposes queries as structured JSON referring to columns by name; this module
 * maps names to real columns and validates every query with the same rules as the chart builder.
 * The model never writes SQL.
 */

export const PLAN_KINDS = ["line", "bar", "area", "donut", "table", "kpi"] as const;

export interface PlannedQuery {
  title: string;
  chart: (typeof PLAN_KINDS)[number];
  x?: { column: string; grain?: string } | null;
  measure: { column?: string | null; aggregation: string };
  series?: string | null;
  filters?: Array<{ column: string; op: string; value?: string | number | string[] }>;
  date_range?: { column: string; preset: string; from?: string; to?: string } | null;
  limit?: number;
}

export interface Plan {
  status: "ok" | "cannot_answer";
  reason?: string;
  dataset?: string;
  queries?: PlannedQuery[];
}

export const planTool = {
  name: "plan_queries",
  description: "Plan up to three aggregate queries over one dataset that together answer the user's question.",
  input_schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["ok", "cannot_answer"], description: "cannot_answer if the question can't be answered from these columns." },
      reason: { type: "string", description: "Only for cannot_answer: one short sentence for the user explaining what data is missing." },
      dataset: { type: "string", description: "Alias of the dataset to query, for example D1." },
      queries: {
        type: "array",
        maxItems: 3,
        description: "The first query answers the question directly. Optional extra queries add context such as a breakdown or trend.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short chart title, for example 'Revenue by region'." },
            chart: { type: "string", enum: [...PLAN_KINDS], description: "line/area for trends over dates, bar for comparing categories, donut for share of total, kpi for a single number, table for detailed lists." },
            x: {
              type: ["object", "null"],
              description: "Grouping column. Omit or null for kpi.",
              properties: { column: { type: "string" }, grain: { type: "string", enum: [...dateGrains] } },
              required: ["column"],
            },
            measure: {
              type: "object",
              properties: {
                column: { type: ["string", "null"], description: "Number column to aggregate; null when aggregation is count." },
                aggregation: { type: "string", enum: [...aggregations] },
              },
              required: ["aggregation"],
            },
            series: { type: ["string", "null"], description: "Optional text or yes/no column to split into series." },
            filters: {
              type: "array",
              items: {
                type: "object",
                properties: { column: { type: "string" }, op: { type: "string", enum: [...filterOps] }, value: { description: "String, number, ISO date (YYYY-MM-DD), or a list of strings for in/not_in." } },
                required: ["column", "op"],
              },
            },
            date_range: {
              type: ["object", "null"],
              properties: { column: { type: "string" }, preset: { type: "string", enum: [...rangePresets] }, from: { type: "string" }, to: { type: "string" } },
              required: ["column", "preset"],
            },
            limit: { type: "integer", minimum: 1, maximum: 100, description: "Categories to show for text x axes (default 20)." },
          },
          required: ["title", "chart", "measure"],
        },
      },
    },
    required: ["status"],
  },
};

export interface ValidQuery {
  title: string;
  kind: ChartKind;
  definition: VisualizationDefinition;
}

function findField(fields: DatasetField[], name: unknown) {
  if (typeof name !== "string") return undefined;
  const key = name.trim().toLowerCase();
  return fields.find((f) => f.name.toLowerCase() === key);
}

/** Converts one planned query into a validated chart definition, or returns the problem. */
export function toDefinition(query: PlannedQuery, fields: DatasetField[]): { ok: true; value: ValidQuery } | { ok: false; error: string } {
  const title = String(query.title ?? "").trim().slice(0, 120) || "Result";
  const kind: ChartKind = (PLAN_KINDS as readonly string[]).includes(query.chart) ? (query.chart as ChartKind) : "bar";
  const aggregation = String(query.measure?.aggregation ?? "");
  if (!(aggregations as readonly string[]).includes(aggregation)) return { ok: false, error: `Unknown aggregation "${aggregation}".` };

  let yColumn: number | null = null;
  if (aggregation !== "count") {
    const f = findField(fields, query.measure?.column);
    if (!f) return { ok: false, error: `Unknown measure column "${query.measure?.column}".` };
    yColumn = f.position;
  }

  let x: VisualizationDefinition["x"] = null;
  if (kind !== "kpi") {
    const f = findField(fields, query.x?.column);
    if (!f) return { ok: false, error: `Unknown x column "${query.x?.column}".` };
    const grain = query.x?.grain && (dateGrains as readonly string[]).includes(query.x.grain) ? (query.x.grain as (typeof dateGrains)[number]) : undefined;
    x = { column: f.position, ...(f.type === "date" ? { grain: grain ?? "month" } : {}) };
  }

  let series: VisualizationDefinition["series"] = null;
  if (query.series) {
    const f = findField(fields, query.series);
    if (!f) return { ok: false, error: `Unknown series column "${query.series}".` };
    series = { column: f.position };
  }

  const filters: DefinitionFilter[] = [];
  for (const filter of query.filters ?? []) {
    const f = findField(fields, filter.column);
    if (!f) return { ok: false, error: `Unknown filter column "${filter.column}".` };
    if (!(filterOps as readonly string[]).includes(filter.op)) return { ok: false, error: `Unknown filter operator "${filter.op}".` };
    const value = Array.isArray(filter.value) ? filter.value.map(String).slice(0, 50) : filter.value === undefined || filter.value === null ? undefined : typeof filter.value === "number" ? filter.value : String(filter.value).slice(0, 200);
    filters.push({ column: f.position, op: filter.op as DefinitionFilter["op"], value });
  }
  if (filters.length > 5) return { ok: false, error: "Use at most 5 filters." };

  let dateRange: VisualizationDefinition["dateRange"] = null;
  if (query.date_range) {
    const f = findField(fields, query.date_range.column);
    if (!f) return { ok: false, error: `Unknown date column "${query.date_range.column}".` };
    const preset = (rangePresets as readonly string[]).includes(query.date_range.preset) ? (query.date_range.preset as (typeof rangePresets)[number]) : "all";
    const iso = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
    dateRange = preset === "all" ? null : { column: f.position, preset, from: iso(query.date_range.from), to: iso(query.date_range.to) };
  }

  const definition: VisualizationDefinition = {
    version: 1,
    x,
    y: { column: yColumn, aggregation: aggregation as VisualizationDefinition["y"]["aggregation"] },
    series,
    filters,
    dateRange,
    limit: Math.min(100, Math.max(1, Math.round(Number(query.limit) || 20))),
  };
  const problem = validateDefinition(definition, fields, kind);
  if (problem) return { ok: false, error: problem };
  return { ok: true, value: { title, kind, definition } };
}

/** Validates a whole plan against the workspace's datasets. */
export function validatePlan(plan: Plan, aliases: Map<string, QueryableDataset>):
  | { status: "cannot_answer"; reason: string }
  | { status: "ok"; dataset: QueryableDataset; queries: ValidQuery[]; errors: string[] }
  | { status: "invalid"; errors: string[] } {
  if (plan.status === "cannot_answer") {
    return { status: "cannot_answer", reason: String(plan.reason ?? "").trim().slice(0, 300) || "That question can't be answered from the datasets in this workspace." };
  }
  const dataset = plan.dataset ? aliases.get(plan.dataset.trim()) : undefined;
  if (!dataset) return { status: "invalid", errors: [`Unknown dataset "${plan.dataset}". Use one of: ${Array.from(aliases.keys()).join(", ")}.`] };
  if (!dataset.ready) return { status: "invalid", errors: [`Dataset ${plan.dataset} isn't ready for queries.`] };
  const queries: ValidQuery[] = [];
  const errors: string[] = [];
  (plan.queries ?? []).slice(0, 3).forEach((q, i) => {
    const result = toDefinition(q, dataset.fields);
    if (result.ok) queries.push(result.value);
    else errors.push(`Query ${i + 1}: ${result.error}`);
  });
  if (queries.length === 0) return { status: "invalid", errors: errors.length ? errors : ["No queries were planned."] };
  return { status: "ok", dataset, queries, errors };
}
