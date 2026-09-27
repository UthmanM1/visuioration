import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { renderReportPdf } from "../lib/reports/pdf.ts";
import type { RenderedReport } from "../lib/reports/sections.ts";
import type { ChartData } from "../lib/visualizations/definition.ts";

const base = { truncatedX: false, truncatedSeries: false, range: null, matched: 1200 } as const;
const byRegion: ChartData = { ...base, total: 3538050, valueFormat: "currency", xType: "text", grain: null, measureLabel: "Sum of Revenue", xLabel: "Region",
  points: [["West", 885975], ["East", 885000], ["South", 884025], ["North", 883050]].map(([x, v]) => ({ x: x as string, s: null, v: v as number })) };
const monthly: ChartData = { ...base, total: 3538050, valueFormat: "currency", xType: "date", grain: "month", measureLabel: "Sum of Revenue", xLabel: "Date",
  points: ["01", "02", "03", "04", "05", "06"].map((m, i) => ({ x: `2026-${m}-01`, s: null, v: 520000 + i * 25000 })) };
const split: ChartData = { ...byRegion, points: byRegion.points.flatMap((p) => [{ x: p.x, s: "true", v: (p.v ?? 0) * 0.15 }, { x: p.x, s: "false", v: (p.v ?? 0) * 0.85 }]) };

export const sample: RenderedReport = {
  name: "Q3 Performance Review — “Northstar” € edition",
  period: "July–September 2026",
  description: "Quarterly review for the leadership team.",
  workspaceName: "Alice Analytics",
  preparedBy: "Alice Adams",
  generatedAt: "2026-09-30T10:00:00.000Z",
  sections: [
    { id: "s1", type: "cover", subtitle: "Prepared for the board · 日本語 characters are replaced" },
    { id: "s2", type: "text", heading: "Executive summary", body: "Revenue reached $3,538,050 across all regions. West led narrowly.\n\nA second paragraph that is long enough to wrap onto several lines so we can see wrapping working correctly across the full content width of an A4 page, with a verylongwordthatmustbebrokenbecauseitdoesnotfitonasinglelineatallwhatsoeverinthisreport." },
    { id: "s3", type: "kpis", heading: "Key metrics", items: [{ label: "Total revenue", value: "$3,538,050", detail: "Sum of Revenue" }, { label: "Orders", value: "1,200", detail: "Rows" }, { label: "Deleted", value: null, detail: "", error: "This chart was deleted." }] },
    { id: "s4", type: "chart", heading: "Revenue by region", commentary: "All four regions are within 0.4% of each other.", chart: { title: "Revenue by region", kind: "bar", data: byRegion, datasetName: "Store sales" } },
    { id: "s5", type: "chart", heading: "Trend", commentary: "", chart: { title: "Monthly revenue", kind: "area", data: monthly, datasetName: "Store sales" } },
    { id: "s6", type: "chart", heading: "Share", commentary: "", chart: { title: "Share of revenue", kind: "donut", data: byRegion, datasetName: "Store sales" } },
    { id: "s7", type: "chart", heading: "Returned vs kept", commentary: "", chart: { title: "Revenue by region and returned", kind: "bar", data: split, datasetName: "Store sales" } },
    { id: "s8", type: "chart", heading: "", commentary: "", chart: null, error: "The dataset for this chart was deleted." },
    { id: "s9", type: "list", heading: "Recommendations", items: ["Review West mobile checkout.", "Plan Outdoor inventory for Q4 — a longer item that wraps onto a second line to test the hanging indent of list items in the PDF output."] },
    { id: "s10", type: "chart", heading: "Details", commentary: "", chart: { title: "Revenue table", kind: "table", data: byRegion, datasetName: "Store sales" } },
    { id: "s11", type: "chart", heading: "", commentary: "", chart: { title: "Total", kind: "kpi", data: byRegion, datasetName: "Store sales" } },
    { id: "s12", type: "appendix", heading: "Appendix", body: "Definitions: revenue excludes tax.", sources: [{ name: "Store sales", rows: 1200 }] },
  ],
};

test("renders a multi-page PDF with every section type", async () => {
  const bytes = await renderReportPdf(sample);
  writeFileSync("/tmp/report-sample.pdf", bytes);
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 3, `pages: ${doc.getPageCount()}`);
  assert.equal(doc.getTitle(), sample.name);
  assert.ok(bytes.length > 5000);
});

test("empty and no-cover reports still render", async () => {
  const bytes = await renderReportPdf({ ...sample, sections: [{ id: "a", type: "text", heading: "Only text", body: "Hello" }] });
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});
