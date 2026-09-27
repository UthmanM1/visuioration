import { formatXLabel, makeFormatter, measureLabel, opLabels, rangeLabels } from "../visualizations/definition";
import type { ChartData, QueryableDataset } from "../visualizations/definition";
import type { EvidenceFact, EvidenceItem } from "./types";
import type { ValidQuery } from "./plan";

/**
 * Evidence: query results plus facts derived from them in code (totals, changes, top categories, shares).
 * The explanation may only quote these numbers; verifyNumbers() enforces that.
 */

function describe(query: ValidQuery, dataset: QueryableDataset, data: ChartData) {
  const field = (position: number | null | undefined) => dataset.fields.find((f) => f.position === position);
  const def = query.definition;
  const parts = [measureLabel(def, dataset.fields)];
  if (def.x && query.kind !== "kpi") parts.push(`by ${field(def.x.column)?.name ?? "?"}${data.grain ? ` (${data.grain})` : ""}`);
  if (def.series) parts.push(`split by ${field(def.series.column)?.name ?? "?"}`);
  const filters = def.filters.map((f) => {
    const value = Array.isArray(f.value) ? f.value.join(", ") : f.value === undefined ? "" : String(f.value);
    return `${field(f.column)?.name ?? "?"} ${opLabels[f.op]}${value ? ` ${value}` : ""}`;
  });
  if (filters.length) parts.push(`where ${filters.join(" and ")}`);
  if (data.range) parts.push(data.range.from && data.range.to ? `from ${data.range.from} to ${data.range.to}` : data.range.from ? `from ${data.range.from}` : `until ${data.range.to}`);
  else if (def.dateRange) parts.push(rangeLabels[def.dateRange.preset].toLowerCase());
  parts.push(`· ${data.matched.toLocaleString("en-US")} of ${dataset.queryRowCount.toLocaleString("en-US")} rows in ${dataset.name}`);
  return parts.join(" ");
}

export function buildEvidence(id: string, query: ValidQuery, dataset: QueryableDataset, data: ChartData): EvidenceItem {
  const format = data.valueFormat;
  const facts: EvidenceFact[] = [];
  const add = (label: string, value: number | null | undefined, f: EvidenceFact["format"] = format) => {
    if (value !== null && value !== undefined && Number.isFinite(value)) facts.push({ label, value, format: f });
  };
  const agg = query.definition.y.aggregation;
  const additive = agg === "sum" || agg === "count";
  const measure = data.measureLabel;
  add(additive ? `Total ${measure.toLowerCase()}` : `Overall ${measure.toLowerCase()}`, data.total);
  add("Rows matched", data.matched, "integer");

  const label = (x: string | null) => formatXLabel(x, data.xType, data.grain);
  const points = data.points.filter((p) => p.v !== null) as Array<{ x: string | null; s: string | null; v: number }>;
  const hasSeries = points.some((p) => p.s !== null);

  if (query.kind !== "kpi" && points.length) {
    if (data.xType === "date" && !hasSeries) {
      const sorted = [...points].sort((a, b) => String(a.x).localeCompare(String(b.x)));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (sorted.length > 1) {
        add(`First period (${label(first.x)})`, first.v);
        add(`Latest period (${label(last.x)})`, last.v);
        add(`Change from ${label(first.x)} to ${label(last.x)}`, last.v - first.v);
        if (first.v !== 0) add(`Percent change from ${label(first.x)} to ${label(last.x)}`, Math.round(((last.v - first.v) / Math.abs(first.v)) * 1000) / 10, "percent");
        const peak = sorted.reduce((a, b) => (b.v > a.v ? b : a));
        const low = sorted.reduce((a, b) => (b.v < a.v ? b : a));
        add(`Highest period (${label(peak.x)})`, peak.v);
        add(`Lowest period (${label(low.x)})`, low.v);
        const previous = sorted[sorted.length - 2];
        if (previous.v !== 0) add(`Percent change from ${label(previous.x)} to ${label(last.x)}`, Math.round(((last.v - previous.v) / Math.abs(previous.v)) * 1000) / 10, "percent");
      }
      add("Periods", sorted.length, "integer");
    } else if (!hasSeries) {
      const sorted = [...points].sort((a, b) => b.v - a.v);
      sorted.slice(0, 3).forEach((p, i) => {
        add(`${["Highest", "Second highest", "Third highest"][i]}: ${label(p.x)}`, p.v);
        if (additive && data.total) add(`${label(p.x)} share of total`, Math.round((p.v / data.total) * 1000) / 10, "percent");
      });
      if (sorted.length > 1) add(`Lowest: ${label(sorted[sorted.length - 1].x)}`, sorted[sorted.length - 1].v);
      add("Categories", sorted.length, "integer");
    } else {
      const totals = new Map<string, number>();
      for (const p of points) totals.set(p.s ?? "(empty)", (totals.get(p.s ?? "(empty)") ?? 0) + p.v);
      const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
      if (additive) ranked.slice(0, 3).forEach(([name, v]) => add(`Series total: ${name === "true" ? "Yes" : name === "false" ? "No" : name}`, v));
      add("Series", ranked.length, "integer");
    }
  }

  const ordered = data.xType === "date" ? [...points].sort((a, b) => String(a.x).localeCompare(String(b.x))) : [...points].sort((a, b) => b.v - a.v);
  return {
    id,
    title: query.title,
    description: describe(query, dataset, data),
    kind: query.kind,
    datasetId: dataset.id,
    definition: query.definition,
    data,
    facts,
    rows: ordered.slice(0, 24).map((p) => ({ label: label(p.x), series: p.s, value: p.v })),
  };
}

/** Compact JSON given to the explanation step: formatted and raw values, nothing else. */
export function evidenceForModel(items: EvidenceItem[]) {
  return items.map((e) => {
    const f = makeFormatter(e.data.valueFormat);
    return {
      id: e.id,
      title: e.title,
      computed: e.description,
      value_format: e.data.valueFormat,
      facts: e.facts.map((x) => ({ label: x.label, value: x.value, formatted: x.format === "percent" ? `${x.value}%` : x.format === "integer" ? x.value.toLocaleString("en-US") : makeFormatter(x.format)(x.value, false) })),
      results: e.rows.map((r) => ({ label: r.label, ...(r.series ? { series: r.series } : {}), value: r.value, formatted: r.value === null ? null : f(r.value, false) })),
    };
  });
}

// ---------------------------------------------------------------------------
// Number verification
// ---------------------------------------------------------------------------

export interface MentionedNumber {
  raw: string;
  value: number;
  /** Half the smallest unit shown, e.g. 0.005 for "1.23", 5,000 for "$3.54M". */
  tolerance: number;
}

const SCALES: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 };

/** Finds numbers written in text, including $1,234.5, 12%, 3.5M, 2 million. */
export function extractNumbers(text: string): MentionedNumber[] {
  const out: MentionedNumber[] = [];
  const re = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\s?(?:%|k\b|m\b|bn\b|b\b|thousand\b|million\b|billion\b))?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const integer = match[1].replace(/,/g, "");
    const fraction = match[2] ?? "";
    const suffix = (match[3] ?? "").trim().toLowerCase();
    const scale = SCALES[suffix] ?? 1;
    const decimals = fraction ? fraction.length - 1 : 0;
    out.push({ raw: match[0], value: Number(integer + fraction) * scale, tolerance: (Math.pow(10, -decimals) * scale) / 2 + 1e-9 });
  }
  return out;
}

/** Every number the explanation may use: facts, results, labels and the user's own question. */
export function allowedNumbers(items: EvidenceItem[], question: string): number[] {
  const values: number[] = [];
  for (const e of items) {
    for (const f of e.facts) values.push(f.value);
    for (const p of e.data.points) if (p.v !== null) values.push(p.v);
    if (e.data.total !== null) values.push(e.data.total);
    values.push(e.data.matched);
    for (const r of e.rows) extractNumbers(`${r.label} ${r.series ?? ""}`).forEach((n) => values.push(n.value));
    extractNumbers(e.description).forEach((n) => values.push(n.value));
  }
  extractNumbers(question).forEach((n) => values.push(n.value));
  return values;
}

/** Returns the numbers in the text that don't match any allowed value (after rounding to what was written). */
export function unsupportedNumbers(text: string, allowed: number[]): string[] {
  const absAllowed = allowed.map((v) => Math.abs(v));
  return extractNumbers(text)
    .filter((n) => !absAllowed.some((a) => Math.abs(a - n.value) <= n.tolerance))
    .map((n) => n.raw.trim());
}

/** A plain answer assembled only from computed facts, used when the model's wording can't be verified. */
export function templateAnswer(items: EvidenceItem[]): string {
  const first = items[0];
  if (!first) return "No results were found.";
  if (first.data.matched === 0) return `No rows matched: ${first.description}.`;
  const describeFact = (f: EvidenceFact) =>
    `${f.label}: ${f.format === "percent" ? `${f.value}%` : f.format === "integer" ? f.value.toLocaleString("en-US") : makeFormatter(f.format)(f.value, false)}`;
  const facts = first.facts.filter((f) => f.label !== "Rows matched").slice(0, 5).map(describeFact);
  return `${first.title}. ${facts.join(". ")}. Based on ${first.data.matched.toLocaleString("en-US")} rows.`;
}
