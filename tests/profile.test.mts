import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DatasetParseError, profileCsv, profileXlsx } from "../lib/datasets/profile.ts";

const fx = (name: string) => readFileSync(`tests/fixtures/${name}`);
const col = (p: Awaited<ReturnType<typeof profileCsv>>, name: string) => p.columns.find((c) => c.name === name)!;

test("CSV: types, counts, stats, preview", async () => {
  const p = await profileCsv(fx("sales.csv").toString("utf8"));
  assert.equal(p.rowCount, 1200);
  assert.deepEqual(p.columns.map((c) => c.name), ["Order ID", "Date", "Region", "Revenue", "Units", "Discount", "Returned", "Notes"]);
  assert.deepEqual(p.columns.map((c) => c.dataType), ["text", "date", "text", "currency", "integer", "percent", "boolean", "text"]);
  assert.equal(col(p, "Region").distinctCount, 4);
  assert.equal(col(p, "Revenue").min, "1000");
  assert.equal(col(p, "Revenue").max, String(1000 + 1199 * 3.25));
  assert.equal(col(p, "Notes").nullCount, 800);
  assert.equal(col(p, "Order ID").distinctCount, 1200);
  assert.equal(p.preview.length, 200);
  assert.equal(p.preview[0][3], 1000, "currency parsed to number in preview");
  assert.equal(p.preview[0][6], true, "yes -> true");
  assert.ok(p.issues.some((i) => i.code === "mostly_empty" && i.column === "Notes"));
  assert.ok(!p.issues.some((i) => i.code === "ragged_rows"));
});

test("CSV: delimiter detection", async () => {
  const p = await profileCsv(fx("semicolon.csv").toString("utf8"));
  assert.deepEqual(p.columns.map((c) => c.name), ["name", "score", "passed"]);
  assert.equal(p.rowCount, 2);
  assert.equal(col(p, "passed").dataType, "boolean");
});

test("CSV: messy headers, ragged rows, mixed types", async () => {
  const p = await profileCsv(fx("messy.csv").toString("utf8"));
  assert.deepEqual(p.columns.map((c) => c.name), ["Column 1", "Amount", "Amount (2)", "City"]);
  assert.equal(p.rowCount, 11);
  const codes = p.issues.map((i) => i.code);
  for (const code of ["empty_header", "duplicate_header", "ragged_rows", "mostly_empty"]) assert.ok(codes.includes(code as never), code);
  assert.equal(col(p, "Amount").dataType, "text", "1 of 10 non-numeric is below the 95% threshold");
  assert.equal(col(p, "Column 1").dataType, "integer");
});

test("CSV: header only and empty files", async () => {
  const p = await profileCsv(fx("headers-only.csv").toString("utf8"));
  assert.equal(p.rowCount, 0);
  assert.ok(p.issues.some((i) => i.code === "no_rows"));
  await assert.rejects(profileCsv(fx("empty.csv").toString("utf8")), DatasetParseError);
});

test("CSV: distinct cap", async () => {
  const text = "id\n" + Array.from({ length: 50 }, (_, i) => `v${i}`).join("\n");
  const p = await profileCsv(text, { maxDistinct: 10 });
  assert.equal(p.columns[0].distinctCapped, true);
});

test("XLSX: first sheet, header after blank row, dates, formulas, rich text", async () => {
  const p = await profileXlsx(fx("workbook.xlsx"));
  assert.equal(p.rowCount, 300);
  assert.deepEqual(p.columns.map((c) => c.name), ["Month", "Region", "Revenue", "Margin", "Target met", "Formula"]);
  assert.deepEqual(p.columns.map((c) => c.dataType), ["date", "text", "decimal", "decimal", "boolean", "integer"]);
  assert.equal(p.preview[0][0], "2026-01-01");
  assert.equal(p.preview[0][5], 2001, "formula result used");
  assert.equal(p.preview[7][1], "Rich South", "rich text flattened");
  assert.equal(col(p, "Month").min, "2026-01-01");
  assert.equal(col(p, "Month").max, "2026-12-01");
  assert.ok(!p.issues.some((i) => i.code === "ragged_rows"));
});

test("XLSX: rejects non-workbooks with a helpful message", async () => {
  await assert.rejects(profileXlsx(fx("fake.xlsx")), /doesn't look like an \.xlsx file/);
});

test("CSV: large file stays fast", async () => {
  const rows = Array.from({ length: 200_000 }, (_, i) => `${i},2026-01-01,${i % 50},${(i * 1.5).toFixed(2)}`).join("\n");
  const started = performance.now();
  const p = await profileCsv("id,date,group,value\n" + rows);
  const ms = performance.now() - started;
  assert.equal(p.rowCount, 200_000);
  console.log(`  200k rows (${(rows.length / 1e6).toFixed(1)} MB) profiled in ${Math.round(ms)} ms`);
  assert.ok(ms < 8000);
});

test("CSV: quoted multi-line values across 1 MB chunk boundaries", async () => {
  const rows = Array.from({ length: 60_000 }, (_, i) => `${i},"line one\nline two, with comma ""quoted""",${i % 3 === 0 ? "yes" : "no"}`);
  const text = "id;note;flag\n".replace(/;/g, ",") + rows.join("\n");
  assert.ok(text.length > 2 * 1024 * 1024, "spans several chunks");
  const p = await profileCsv(text);
  assert.equal(p.rowCount, 60_000);
  assert.equal(p.columns[1].distinctCount, 1);
  assert.equal(p.columns[2].dataType, "boolean");
  assert.equal(p.preview[0][1], 'line one\nline two, with comma "quoted"');
  assert.ok(!p.issues.some((i) => i.code === "ragged_rows"));
});

import { forEachNormalizedBatch, normalizeCell, toIsoDate } from "../lib/datasets/profile.ts";

test("dates normalise to ISO", () => {
  assert.equal(toIsoDate("2026-03-05"), "2026-03-05");
  assert.equal(toIsoDate("2026-03-05T14:30:00Z"), "2026-03-05T14:30:00");
  assert.equal(toIsoDate("2026-03-05 00:00"), "2026-03-05");
  assert.equal(toIsoDate("2026/3/5"), "2026-03-05");
  assert.equal(toIsoDate("25/12/2026"), "2026-12-25", "first part > 12 means day-first");
  assert.equal(toIsoDate("12/25/2026"), "2026-12-25", "month-first");
  assert.equal(toIsoDate("5 Mar 2026"), "2026-03-05");
  assert.equal(toIsoDate("March 5, 2026"), "2026-03-05");
  assert.equal(toIsoDate("2026-02-30"), null, "impossible date");
  assert.equal(toIsoDate(new Date(Date.UTC(2026, 0, 1))), "2026-01-01");
});

test("cells normalise to their column type", () => {
  assert.equal(normalizeCell("$1,234.50", "currency"), 1234.5);
  assert.equal(normalizeCell("(12.00)", "currency"), -12);
  assert.equal(normalizeCell("15%", "percent"), 15);
  assert.equal(normalizeCell("abc", "decimal"), null);
  assert.equal(normalizeCell("Yes", "boolean"), true);
  assert.equal(normalizeCell("N/A", "text"), null);
});

test("normalised batches match the profile row count and order", async () => {
  const text = readFileSync("tests/fixtures/sales.csv", "utf8");
  const profile = await profileCsv(text);
  const types = profile.columns.map((c) => c.dataType);
  const seen: number[] = [];
  let first: unknown[] | null = null;
  const total = await forEachNormalizedBatch({ kind: "csv", text }, types, 500, async (rows, start) => {
    seen.push(start, rows.length);
    first ??= rows[0];
  });
  assert.equal(total, profile.rowCount);
  assert.deepEqual(seen, [1, 500, 501, 500, 1001, 200]);
  assert.deepEqual(first, ["NS-10000", "2026-01-01", "North", 1000, 1, 0, true, "priority"]);
  const capped = await forEachNormalizedBatch({ kind: "csv", text }, types, 500, async () => {}, 750);
  assert.equal(capped, 750);
  const wb = readFileSync("tests/fixtures/workbook.xlsx");
  const wp = await profileXlsx(wb);
  let xFirst: unknown[] | null = null;
  const xTotal = await forEachNormalizedBatch({ kind: "xlsx", data: wb }, wp.columns.map((c) => c.dataType), 1000, async (rows) => { xFirst ??= rows[0]; });
  assert.equal(xTotal, wp.rowCount);
  assert.deepEqual(xFirst, ["2026-01-01", "North", 1000.5, 0.25, true, 2001]);
});

import { FILE_LIMITS } from "../lib/datasets/profile.ts";

test("limits: too many columns, binary content, too many rows", async () => {
  const wide = Array.from({ length: FILE_LIMITS.maxColumns + 1 }, (_, i) => `c${i}`).join(",") + "\n" + "1,".repeat(FILE_LIMITS.maxColumns) + "1";
  await assert.rejects(() => profileCsv(wide), /up to 500 columns/);
  const binary = "PK\u0003\u0004\u0000\u0000binary,junk\n\u0000\u0001,2";
  await assert.rejects(() => profileCsv(binary), /doesn't look like a text CSV/);
  const many = "a\n" + Array.from({ length: 11 }, (_, i) => String(i)).join("\n");
  await assert.rejects(() => profileCsv(many, { maxRows: 10 }), /up to 10 rows/);
  const ok = await profileCsv("a\n" + Array.from({ length: 10 }, (_, i) => String(i)).join("\n"), { maxRows: 10 });
  assert.equal(ok.rowCount, 10);
});

test("limits: very long values are shortened and reported", async () => {
  const long = "x".repeat(FILE_LIMITS.maxCellChars + 500);
  const p = await profileCsv(`id,note\n1,${long}\n2,short`);
  assert.ok(p.issues.some((i) => i.code === "long_values"));
  assert.equal(String(p.preview[0][1]).length, FILE_LIMITS.maxCellChars);
  assert.equal(String(normalizeCell(long, "text")).length, FILE_LIMITS.maxCellChars);
});
