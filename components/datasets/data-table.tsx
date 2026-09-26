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
import { salesColumns, salesSample } from "@/lib/demo-data";
import type { SalesRow } from "@/lib/demo-data";
import { cn, formatCurrency } from "@/lib/format";

type SortKey = keyof SalesRow;
const PAGE_SIZE = 15;
const filterKeys = ["region", "category", "channel", "device"] as const;
type Filters = Record<(typeof filterKeys)[number], string>;
const emptyFilters: Filters = { region: "All", category: "All", channel: "All", device: "All" };

function FilterControls({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  return (
    <>
      {filterKeys.map((key) => {
        const options = Array.from(new Set(salesSample.map((r) => r[key]))).sort();
        return (
          <Field key={key} label={key[0].toUpperCase() + key.slice(1)} htmlFor={`filter-${key}`}>
            <Select id={`filter-${key}`} value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
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

export function DataTable() {
  const [tab, setTab] = useState<"preview" | "columns">("preview");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState(false);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = salesSample.filter(
      (r) => filterKeys.every((k) => filters[k] === "All" || r[k] === filters[k]) && (!q || `${r.orderId} ${r.product} ${r.region} ${r.category}`.toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [query, filters, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const activeFilters = filterKeys.filter((k) => filters[k] !== "All");

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(0);
  }

  return (
    <Panel className="overflow-hidden">
      <div className="px-5 pt-3">
        <Tabs tabs={[{ id: "preview", label: "Data preview" }, { id: "columns", label: "Column information", count: salesColumns.length }]} value={tab} onChange={setTab} label="Dataset views" idPrefix="dataset" />
      </div>
      <TabPanel id="preview" idPrefix="dataset" active={tab === "preview"}>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <label className="relative flex-1">
            <span className="sr-only">Search rows</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search order ID, product, region…" className="pl-9" />
          </label>
          <div className="hidden grid-cols-4 gap-2 lg:grid">
            <FilterControls filters={filters} setFilters={(f) => { setFilters(f); setPage(0); }} />
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setSheet(true)} icon={<Filter className="h-4 w-4" aria-hidden />}>
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
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <caption className="sr-only">Northstar Sales Data preview, sorted by {sort.key} {sort.dir === "asc" ? "ascending" : "descending"}</caption>
              <thead className="bg-paper/70 text-ink-muted">
                <tr>
                  {salesColumns.map((c) => {
                    const active = sort.key === c.key;
                    const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                    const numeric = c.key === "revenue" || c.key === "units";
                    return (
                      <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("whitespace-nowrap px-3 py-2 font-medium first:pl-5", numeric && "text-right")}>
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
                {pageRows.map((r) => (
                  <tr key={r.orderId} className="border-t border-line hover:bg-paper/50">
                    <td className="tnum whitespace-nowrap px-3 py-2 pl-5 text-ink-soft">{r.date}</td>
                    <td className="tnum px-3 py-2 font-medium">{r.orderId}</td>
                    <td className="px-3 py-2">{r.region}</td>
                    <td className="max-w-[220px] truncate px-3 py-2" title={r.product}>{r.product}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.category}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.customerType}</td>
                    <td className="tnum px-3 py-2 text-right font-medium">{formatCurrency(r.revenue, { decimals: 2 })}</td>
                    <td className="tnum px-3 py-2 text-right">{r.units}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.channel}</td>
                    <td className="px-3 py-2 text-ink-soft">{r.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="tnum">
            {rows.length ? `${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, rows.length)} of ${rows.length.toLocaleString("en-US")}` : "0"} sample rows <span className="text-ink-faint">(full dataset: 184,290)</span>
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
              {salesColumns.map((c) => (
                <tr key={c.key} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-2.5 font-medium">{c.label}</th>
                  <td className="px-3 py-2.5"><Badge tone={c.type === "Currency" || c.type === "Integer" ? "petrol" : c.type === "Date" ? "dusk" : "neutral"}>{c.type}</Badge></td>
                  <td className={cn("tnum px-3 py-2.5 text-right", c.nulls !== "0%" && "font-medium text-amber-700")}>{c.nulls}</td>
                  <td className="tnum px-5 py-2.5 text-right text-ink-soft">{c.distinct}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[12px] text-ink-muted">14 additional columns (store ID, SKU, discount, fulfilment and campaign fields) are available in the full dataset.</p>
        </div>
      </TabPanel>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filter rows" side="bottom">
        <div className="grid gap-4 p-5">
          <FilterControls filters={filters} setFilters={(f) => { setFilters(f); setPage(0); }} />
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
