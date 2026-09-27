"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import type { DatasetTableData, TableCell, TableColumn, TableRow } from "@/lib/datasets/table-data";
import { cn, formatCurrency } from "@/lib/format";

const PAGE_SIZE = 15;
type Filters = Record<string, string>;

const numericKinds = new Set(["integer", "decimal", "currency", "percent"]);

function formatCell(value: TableCell, column: TableColumn) {
  if (value === null || value === "") return <span className="text-ink-faint">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (column.kind === "currency") return formatCurrency(value, { decimals: 2 });
    if (column.kind === "percent") return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
    if (column.kind === "integer") return value.toLocaleString("en-US");
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return value;
}

function compare(a: TableCell, b: TableCell) {
  if (a === null || a === "") return b === null || b === "" ? 0 : 1;
  if (b === null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function FilterControls({ data, filters, setFilters }: { data: DatasetTableData; filters: Filters; setFilters: (f: Filters) => void }) {
  return (
    <>
      {data.filterKeys.map((key) => {
        const column = data.columns.find((c) => c.key === key);
        const options = Array.from(new Set(data.rows.map((r) => r[key]).filter((v) => v !== null && v !== "").map((v) => (typeof v === "boolean" ? (v ? "Yes" : "No") : String(v))))).sort();
        return (
          <Field key={key} label={column?.label ?? key} htmlFor={`filter-${key}`}>
            <Select id={`filter-${key}`} value={filters[key] ?? "All"} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
              <option>All</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </Field>
        );
      })}
    </>
  );
}

function cellText(value: TableCell) {
  return typeof value === "boolean" ? (value ? "Yes" : "No") : value === null ? "" : String(value);
}

export function DataTable({ data }: { data: DatasetTableData }) {
  const emptyFilters: Filters = Object.fromEntries(data.filterKeys.map((k) => [k, "All"]));
  const [tab, setTab] = useState<"preview" | "columns">("preview");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(data.defaultSort);
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState(false);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = data.rows.filter(
      (r: TableRow) => data.filterKeys.every((k) => !filters[k] || filters[k] === "All" || cellText(r[k]) === filters[k]) && (!q || data.searchKeys.some((k) => cellText(r[k]).toLowerCase().includes(q))),
    );
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * compare(a[sort.key], b[sort.key]));
  }, [query, filters, sort, data]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const activeFilters = data.filterKeys.filter((k) => filters[k] && filters[k] !== "All");
  const sampleLabel = data.totalRows > data.rows.length ? `preview rows (first ${data.rows.length.toLocaleString("en-US")} of ${data.totalRows.toLocaleString("en-US")})` : "rows";

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(0);
  }

  return (
    <Panel className="overflow-hidden">
      <div className="px-5 pt-3">
        <Tabs tabs={[{ id: "preview", label: "Data preview" }, { id: "columns", label: "Column information", count: data.columns.length }]} value={tab} onChange={setTab} label="Dataset views" idPrefix="dataset" />
      </div>
      <TabPanel id="preview" idPrefix="dataset" active={tab === "preview"}>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <span className="sr-only">Search rows</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder={`Search ${data.searchKeys.slice(0, 3).map((k) => data.columns.find((c) => c.key === k)?.label.toLowerCase() ?? k).join(", ")}…`} className="pl-9" />
          </label>
          <div className={cn("hidden gap-2", data.filterKeys.length > 0 && "lg:grid")} style={{ gridTemplateColumns: `repeat(${data.filterKeys.length}, minmax(0, 1fr))` }}>
            <FilterControls data={data} filters={filters} setFilters={(f) => { setFilters(f); setPage(0); }} />
          </div>
          <Button variant="secondary" className={data.filterKeys.length ? "lg:hidden" : "hidden"} onClick={() => setSheet(true)} icon={<Filter className="h-4 w-4" aria-hidden />}>
            Filters{activeFilters.length ? ` (${activeFilters.length})` : ""}
          </Button>
        </div>
        {activeFilters.length ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {activeFilters.map((k) => (
              <button key={k} onClick={() => setFilters({ ...filters, [k]: "All" })} className="inline-flex items-center gap-1 rounded-full bg-petrol-50 px-2.5 py-1 text-[12px] text-petrol-700">
                {k}: {filters[k]} <X className="h-3 w-3" aria-label={`Remove ${k} filter`} />
              </button>
            ))}
            <button onClick={() => setFilters(emptyFilters)} className="text-[12px] text-ink-muted underline underline-offset-2">Clear all</button>
          </div>
        ) : null}
        {pageRows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Search className="h-5 w-5" />} title="No rows match" body="Try a different search term or remove a filter." action={<Button variant="secondary" onClick={() => { setQuery(""); setFilters(emptyFilters); }}>Reset search and filters</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-left text-[13px]" style={{ minWidth: Math.max(560, data.columns.length * 110) }}>
              <caption className="sr-only">Data preview{sort ? `, sorted by ${data.columns.find((c) => c.key === sort.key)?.label ?? sort.key} ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}</caption>
              <thead className="bg-paper/70 text-ink-muted">
                <tr>
                  {data.columns.map((c) => {
                    const active = sort?.key === c.key;
                    const Icon = active ? (sort?.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                    const numeric = numericKinds.has(c.kind);
                    return (
                      <th key={c.key} scope="col" aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("whitespace-nowrap px-3 py-2 font-medium first:pl-5", numeric && "text-right")}>
                        <button onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}>
                          {c.label}
                          <Icon className="h-3 w-3" aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, index) => (
                  <tr key={data.rowKey ? String(r[data.rowKey]) : `${current}-${index}`} className="border-t border-line hover:bg-paper/50">
                    {data.columns.map((c, i) => {
                      const numeric = numericKinds.has(c.kind);
                      const value = r[c.key];
                      return (
                        <td
                          key={c.key}
                          title={typeof value === "string" && value.length > 32 ? value : undefined}
                          className={cn("px-3 py-2", i === 0 && "pl-5", numeric && "tnum text-right", c.kind === "date" && "tnum whitespace-nowrap text-ink-soft", c.kind === "text" && "max-w-[240px] truncate", c.kind === "category" && "text-ink-soft", c.kind === "currency" && "font-medium")}
                        >
                          {formatCell(value ?? null, c)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="tnum">
            {rows.length ? `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, rows.length)} of ${rows.length.toLocaleString("en-US")}` : "0"} {sampleLabel}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden /></Button>
            <span className="tnum">Page {current + 1} of {pages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden /></Button>
          </div>
        </div>
      </TabPanel>
      <TabPanel id="columns" idPrefix="dataset" active={tab === "columns"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <caption className="sr-only">Column information</caption>
            <thead className="border-b border-line bg-paper/70 text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">Column</th>
                <th scope="col" className="px-3 py-2 font-medium">Type</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Missing</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Distinct values</th>
              </tr>
            </thead>
            <tbody>
              {data.columns.map((c) => (
                <tr key={c.key} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-2.5 font-medium">{c.label}</th>
                  <td className="px-3 py-2.5"><Badge tone={numericKinds.has(c.kind) ? "petrol" : c.kind === "date" ? "dusk" : c.kind === "boolean" ? "sage" : "neutral"}>{c.type}</Badge></td>
                  <td className={cn("tnum px-3 py-2.5 text-right", c.nulls !== "0%" && "font-medium text-amber-700")}>{c.nulls}</td>
                  <td className="tnum px-5 py-2.5 text-right text-ink-soft">{c.distinct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.extraColumnsNote ? <p className="px-5 py-3 text-[12px] text-ink-muted">{data.extraColumnsNote}</p> : null}
        </div>
      </TabPanel>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filter rows" side="bottom">
        <div className="grid gap-4 p-5">
          <FilterControls data={data} filters={filters} setFilters={(f) => { setFilters(f); setPage(0); }} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setFilters(emptyFilters)}>Clear</Button>
            <Button className="flex-1" onClick={() => setSheet(false)}>Show {rows.length} rows</Button>
          </div>
        </div>
      </Sheet>
    </Panel>
  );
}

export function AnalyzeAction() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  return (
    <div>
      <Button
        onClick={async () => {
          setState("running");
          await new Promise((r) => setTimeout(r, 1600));
          setState("done");
        }}
        loading={state === "running"}
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
      >
        {state === "running" ? "Analyzing…" : "Analyze dataset"}
      </Button>
      {state === "done" ? (
        <div role="status" className="mt-4 animate-rise rounded-panel border border-petrol-200 bg-petrol-50 p-4 text-[13px] sm:absolute sm:right-0 sm:z-10 sm:mt-2 sm:w-[380px] sm:shadow-overlay">
          <p className="font-semibold text-petrol-900">Analysis complete (demo)</p>
          <ul className="mt-2 space-y-1.5 text-ink-soft">
            <li>7 insights found, 2 need attention.</li>
            <li>Key metrics detected: revenue, orders, units, conversion.</li>
            <li>Data quality: 1.1% of rows have no device recorded.</li>
          </ul>
          <Link href="/app/insights" className="mt-3 inline-block font-medium text-petrol-700 underline underline-offset-4">Review insights</Link>
        </div>
      ) : null}
    </div>
  );
}
