import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedNumbers, buildEvidence, extractNumbers, templateAnswer, unsupportedNumbers } from "../lib/ai/evidence.ts";
import { toDefinition, validatePlan } from "../lib/ai/plan.ts";
import { describeSchema } from "../lib/ai/schema.ts";
import type { ChartData, QueryableDataset } from "../lib/visualizations/definition.ts";

const dataset: QueryableDataset = {
  id: "ds1", slug: "sales", name: "Sales", rowCount: 1200, queryRowCount: 1200, ready: true,
  fields: [
    { position: 0, name: "Order ID", type: "text", distinctCount: 1200, samples: ["NS-1"], min: null, max: null },
    { position: 1, name: "Date", type: "date", distinctCount: 160, samples: [], min: "2026-01-01", max: "2026-06-27" },
    { position: 2, name: "Region", type: "text", distinctCount: 4, samples: ["North", "South", "East", "West"], min: null, max: null },
    { position: 3, name: "Revenue", type: "currency", distinctCount: 1200, samples: [], min: "1000", max: "4897.75" },
  ],
};

test("numbers are extracted with the precision they were written at", () => {
  const n = extractNumbers("Revenue was $3.54M, up 12.5% on 1,234 orders in Q2 2026 (2 million visits)");
  assert.deepEqual(n.map((x) => x.value), [3540000, 12.5, 1234, 2, 2026, 2000000]);
  assert.equal(n[0].tolerance, 5000 + 1e-9);
});

test("only numbers traceable to results pass verification", () => {
  const allowed = [3538050, 25.1, 1200, 2026];
  assert.deepEqual(unsupportedNumbers("Total revenue was $3,538,050 from 1,200 rows; West is 25.1% of it.", allowed), []);
  assert.deepEqual(unsupportedNumbers("Revenue was about $3.54M in 2026.", allowed), [], "rounded forms are allowed");
  assert.deepEqual(unsupportedNumbers("Revenue was $3.6M and grew 40%.", allowed), ["3.6M", "40%"]);
  assert.deepEqual(unsupportedNumbers("Revenue fell by -25.1%.", [-25.1]), [], "sign-insensitive");
});

test("plans map column names to validated definitions", () => {
  const ok = toDefinition({ title: "Revenue by region", chart: "bar", x: { column: "region" }, measure: { column: "REVENUE", aggregation: "sum" }, filters: [{ column: "Region", op: "in", value: ["North", "West"] }] }, dataset.fields);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.value.definition.x, { column: 2 });
    assert.deepEqual(ok.value.definition.y, { column: 3, aggregation: "sum" });
    assert.deepEqual(ok.value.definition.filters, [{ column: 2, op: "in", value: ["North", "West"] }]);
  }
  const time = toDefinition({ title: "t", chart: "line", x: { column: "Date", grain: "quarter" }, measure: { column: null, aggregation: "count" } }, dataset.fields);
  assert.ok(time.ok && time.value.definition.x?.grain === "quarter");
  const kpi = toDefinition({ title: "k", chart: "kpi", measure: { column: "Revenue", aggregation: "avg" } }, dataset.fields);
  assert.ok(kpi.ok && kpi.value.definition.x === null);
  assert.equal((toDefinition({ title: "x", chart: "bar", x: { column: "Profit" }, measure: { aggregation: "count" } }, dataset.fields) as { error: string }).error, 'Unknown x column "Profit".');
  const bad = toDefinition({ title: "x", chart: "bar", x: { column: "Region" }, measure: { column: "Region", aggregation: "sum" } }, dataset.fields);
  assert.ok(!bad.ok && /isn't a number column/.test(bad.error));
  const injection = toDefinition({ title: "x", chart: "bar", x: { column: "Region'; drop table datasets; --" }, measure: { aggregation: "count" } }, dataset.fields);
  assert.ok(!injection.ok);
});

test("plan validation: aliases, cannot_answer, partial plans", () => {
  const { aliases, json } = describeSchema([dataset]);
  assert.ok(json.includes('"alias":"D1"') && json.includes('"examples":["North","South","East","West"]') && !json.includes("NS-1"), "high-cardinality examples are not sent");
  assert.equal(validatePlan({ status: "cannot_answer", reason: "No profit column." }, aliases).status, "cannot_answer");
  assert.equal(validatePlan({ status: "ok", dataset: "D9", queries: [] }, aliases).status, "invalid");
  const partial = validatePlan({ status: "ok", dataset: "D1", queries: [
    { title: "a", chart: "kpi", measure: { aggregation: "count" } },
    { title: "b", chart: "bar", x: { column: "Nope" }, measure: { aggregation: "count" } },
  ] }, aliases);
  assert.ok(partial.status === "ok" && partial.queries.length === 1 && partial.errors.length === 1);
});

const base = { total: 3000, matched: 1200, truncatedX: false, truncatedSeries: false, valueFormat: "currency" as const, measureLabel: "Sum of Revenue", range: null };

test("evidence facts for a time series", () => {
  const data: ChartData = { ...base, xType: "date", grain: "month", xLabel: "Date", points: [{ x: "2026-01-01", s: null, v: 1000 }, { x: "2026-03-01", s: null, v: 1500 }, { x: "2026-02-01", s: null, v: 500 }] };
  const q = toDefinition({ title: "Revenue over time", chart: "line", x: { column: "Date", grain: "month" }, measure: { column: "Revenue", aggregation: "sum" } }, dataset.fields);
  assert.ok(q.ok);
  const e = buildEvidence("E1", q.ok ? q.value : (null as never), dataset, data);
  const fact = (label: string) => e.facts.find((f) => f.label === label)?.value;
  assert.equal(fact("First period (Jan 2026)"), 1000);
  assert.equal(fact("Latest period (Mar 2026)"), 1500);
  assert.equal(fact("Percent change from Jan 2026 to Mar 2026"), 50);
  assert.equal(fact("Lowest period (Feb 2026)"), 500);
  assert.equal(fact("Percent change from Feb 2026 to Mar 2026"), 200);
  assert.deepEqual(e.rows.map((r) => r.label), ["Jan 2026", "Feb 2026", "Mar 2026"]);
  const answer = templateAnswer([e]);
  assert.deepEqual(unsupportedNumbers(answer, allowedNumbers([e], "")), [], "template uses only evidence numbers");
});

test("evidence facts for categories include top values and shares", () => {
  const data: ChartData = { ...base, xType: "text", grain: null, xLabel: "Region", points: [{ x: "North", s: null, v: 1200 }, { x: "West", s: null, v: 600 }, { x: "South", s: null, v: 1200 * 0 + 1000 }, { x: "East", s: null, v: 200 }] };
  const q = toDefinition({ title: "By region", chart: "bar", x: { column: "Region" }, measure: { column: "Revenue", aggregation: "sum" } }, dataset.fields);
  const e = buildEvidence("E1", q.ok ? q.value : (null as never), dataset, data);
  assert.equal(e.facts.find((f) => f.label === "Highest: North")?.value, 1200);
  assert.equal(e.facts.find((f) => f.label === "North share of total")?.value, 40);
  assert.equal(e.facts.find((f) => f.label === "Lowest: East")?.value, 200);
  assert.ok(e.description.includes("Sum of Revenue by Region") && e.description.includes("1,200 of 1,200 rows in Sales"));
  assert.deepEqual(unsupportedNumbers("North led with $1,200, 40% of the total, while East had $200.", allowedNumbers([e], "")), []);
  assert.deepEqual(unsupportedNumbers("North led with $1,300.", allowedNumbers([e], "")), ["1,300"]);
});
