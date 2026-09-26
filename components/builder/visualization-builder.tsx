"use client";

import { AreaChart, BarChart3, Calendar, Grid3x3, Hash, LineChart, PieChart, ScatterChart, Settings2, Table2, Tag, Type } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { DemoTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { visualizations } from "@/lib/demo-data";
import type { ChartKind } from "@/lib/demo-data";
import { cn } from "@/lib/format";
import { aggregations, dateRanges, dimensions, formatMeasure, groupOptions, measures, runQuery } from "@/lib/query";
import type { QueryInput } from "@/lib/query";

const chartTypes: Array<{ kind: ChartKind; label: string; icon: typeof LineChart }> = [
  { kind: "line", label: "Line", icon: LineChart },
  { kind: "bar", label: "Bar", icon: BarChart3 },
  { kind: "area", label: "Area", icon: AreaChart },
  { kind: "donut", label: "Donut", icon: PieChart },
  { kind: "scatter", label: "Scatter", icon: ScatterChart },
  { kind: "table", label: "Table", icon: Table2 },
  { kind: "kpi", label: "KPI", icon: Hash },
  { kind: "heatmap", label: "Heatmap", icon: Grid3x3 },
];

const presets: Record<string, { kind: ChartKind; title: string; description: string; query: Partial<QueryInput> }> = {
  "revenue-overview": { kind: "area", title: "Revenue Overview", description: "Monthly revenue, FY26", query: { dimension: "Date", measure: "Revenue" } },
  "regional-performance": { kind: "bar", title: "Regional Performance", description: "Revenue by region", query: { dimension: "Region", measure: "Revenue" } },
  "customer-acquisition": { kind: "bar", title: "Customer Acquisition", description: "CAC by region", query: { dimension: "Region", measure: "CAC" } },
  "product-mix": { kind: "donut", title: "Product Mix", description: "Revenue share by category", query: { dimension: "Category", measure: "Revenue" } },
  "mobile-desktop": { kind: "bar", title: "Mobile vs Desktop", description: "Conversion rate by device", query: { dimension: "Device", measure: "Conversion" } },
  "customer-retention": { kind: "heatmap", title: "Customer Retention", description: "Orders by region and month", query: { dimension: "Date", measure: "Orders", groupBy: "Region" } },
};

const defaultQuery: QueryInput = { dimension: "Date", measure: "Revenue", groupBy: "None", aggregation: "Sum", range: "Last 12 months", regionFilter: "All regions" };

function FieldChip({ label, type, active, onPick }: { label: string; type: "dimension" | "measure"; active: boolean; onPick: () => void }) {
  const Icon = type === "measure" ? Hash : label === "Date" ? Calendar : Type;
  return (
    <button
      draggable
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ label, type }));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] transition-colors active:cursor-grabbing",
        active ? (type === "measure" ? "border-amber-500/50 bg-amber-100/60 font-medium" : "border-petrol-500/50 bg-petrol-50 font-medium") : "border-transparent hover:border-line hover:bg-surface",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", type === "measure" ? "text-amber-700" : "text-petrol-600")} aria-hidden />
      {label}
    </button>
  );
}

export function VisualizationBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [kind, setKind] = useState<ChartKind>("area");
  const [query, setQuery] = useState<QueryInput>(defaultQuery);
  const [title, setTitle] = useState("Monthly revenue");
  const [description, setDescription] = useState("Northstar revenue by month, FY26.");
  const [dropTarget, setDropTarget] = useState<"x" | "y" | null>(null);
  const [panel, setPanel] = useState<null | "fields" | "config">(null);
  const [saving, setSaving] = useState(false);
  const [addToDashboard, setAddToDashboard] = useState(true);

  useEffect(() => {
    const from = params.get("from");
    const preset = from ? presets[from] : null;
    if (preset) {
      setKind(preset.kind);
      setQuery({ ...defaultQuery, ...preset.query });
      setTitle(preset.title);
      setDescription(preset.description);
    }
  }, [params]);

  const result = useMemo(() => runQuery(query), [query]);
  const update = (patch: Partial<QueryInput>) => setQuery((q) => ({ ...q, ...patch }));
  const editing = params.get("from") && presets[params.get("from")!] ? visualizations.find((v) => v.id === params.get("from")) : null;

  function onDrop(target: "x" | "y", e: DragEvent) {
    e.preventDefault();
    setDropTarget(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain")) as { label: string; type: "dimension" | "measure" };
      if (target === "x" && data.type === "dimension") update({ dimension: data.label as QueryInput["dimension"] });
      else if (target === "y" && data.type === "measure") update({ measure: data.label as QueryInput["measure"] });
      else toast({ tone: "info", title: target === "x" ? "X axis takes a dimension" : "Y axis takes a measure", body: "Dimensions are categories like Region; measures are numbers like Revenue." });
    } catch {
      /* ignore invalid drops */
    }
  }

  async function save() {
    if (!title.trim()) {
      toast({ tone: "error", title: "Add a title before saving", body: "Titles make charts findable in search and reports." });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    track("visualization_created", { kind, dimension: query.dimension, measure: query.measure });
    toast({ tone: "success", title: editing ? "Visualization updated" : "Visualization saved", body: addToDashboard ? `${title} was added to the dashboard.` : `${title} is in your library.` });
    router.push("/app/visualizations");
  }

  const fieldsPanel = (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted"><Tag className="h-3 w-3" aria-hidden />Dimensions</h3>
        <div className="space-y-0.5">
          {dimensions.map((d) => (
            <FieldChip key={d} label={d} type="dimension" active={query.dimension === d} onPick={() => update({ dimension: d })} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted"><Hash className="h-3 w-3" aria-hidden />Measures</h3>
        <div className="space-y-0.5">
          {measures.map((m) => (
            <FieldChip key={m} label={m} type="measure" active={query.measure === m} onPick={() => update({ measure: m })} />
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-faint">Click a field, or drag it onto the X or Y axis above the chart.</p>
    </div>
  );

  const configPanel = (
    <div className="space-y-5 p-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink-soft">Chart type</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {chartTypes.map(({ kind: k, label, icon: Icon }) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={cn("flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] transition-colors", kind === k ? "border-petrol-600 bg-petrol-50 text-petrol-700" : "border-line text-ink-muted hover:border-ink-faint hover:text-ink")}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="X axis" htmlFor="cfg-x">
          <Select id="cfg-x" value={query.dimension} onChange={(e) => update({ dimension: e.target.value as QueryInput["dimension"] })}>
            {dimensions.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Y axis" htmlFor="cfg-y">
          <Select id="cfg-y" value={query.measure} onChange={(e) => update({ measure: e.target.value as QueryInput["measure"] })}>
            {measures.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Group by" htmlFor="cfg-group">
          <Select id="cfg-group" value={query.groupBy} onChange={(e) => update({ groupBy: e.target.value as QueryInput["groupBy"] })}>
            {groupOptions.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Aggregation" htmlFor="cfg-agg">
          <Select id="cfg-agg" value={query.aggregation} onChange={(e) => update({ aggregation: e.target.value as QueryInput["aggregation"] })}>
            {aggregations.map((a) => <option key={a}>{a}</option>)}
          </Select>
        </Field>
        <Field label="Filter" htmlFor="cfg-filter">
          <Select id="cfg-filter" value={query.regionFilter} onChange={(e) => update({ regionFilter: e.target.value as QueryInput["regionFilter"] })}>
            {["All regions", "North", "South", "East", "West"].map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="Date range" htmlFor="cfg-range">
          <Select id="cfg-range" value={query.range} onChange={(e) => update({ range: e.target.value as QueryInput["range"] })}>
            {dateRanges.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Title" htmlFor="cfg-title">
        <Input id="cfg-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description" htmlFor="cfg-desc">
        <Textarea id="cfg-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[72px]" />
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={addToDashboard} onChange={(e) => setAddToDashboard(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-petrol-600" />
        Add to dashboard
      </label>
    </div>
  );

  const DropZone = ({ target, label, value }: { target: "x" | "y"; label: string; value: string }) => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDropTarget(target); }}
      onDragLeave={() => setDropTarget(null)}
      onDrop={(e) => onDrop(target, e)}
      className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[13px] transition-colors", dropTarget === target ? "border-petrol-500 bg-petrol-50" : "border-line-strong bg-surface")}
    >
      <span className="text-ink-faint">{label}</span>
      <span className={cn("truncate rounded px-1.5 py-0.5 font-medium", target === "x" ? "bg-petrol-50 text-petrol-700" : "bg-amber-100 text-amber-700")}>{value}</span>
    </div>
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 pb-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><DemoTag>Northstar Sales Data</DemoTag></div>
          <h1 className="mt-1.5 truncate font-display text-2xl font-semibold tracking-[-0.02em]">{editing ? `Edit: ${editing.name}` : "New visualization"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="lg:hidden" onClick={() => setPanel("fields")}>Fields</Button>
          <Button variant="secondary" className="lg:hidden" onClick={() => setPanel("config")} icon={<Settings2 className="h-4 w-4" aria-hidden />}>Configure</Button>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => router.push("/app/visualizations")}>Cancel</Button>
          <Button onClick={save} loading={saving}>{editing ? "Save changes" : "Save visualization"}</Button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[210px_1fr_300px] grid-cols-1">
        <aside aria-label="Data fields" className="hidden border-r border-line lg:block">{fieldsPanel}</aside>
        <section aria-label="Visualization preview" className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <DropZone target="x" label="X axis" value={query.dimension} />
            <DropZone target="y" label="Y axis" value={query.measure} />
          </div>
          <div className="mt-4 rounded-panel border border-line bg-surface p-4 shadow-panel sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.01em]">{title || "Untitled visualization"}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
            <div className="mt-5" key={`${kind}-${JSON.stringify(query)}`}>
              <ChartRenderer kind={kind} result={result} height={340} title={title} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-muted">
              <span className="tnum">{query.aggregation} of {query.measure.toLowerCase()}: <strong className="text-ink">{formatMeasure(query.measure, result.total, false)}</strong></span>
              <span>{query.range} · {query.regionFilter}</span>
            </div>
            {result.note ? <p className="mt-2 rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted" role="note">{result.note}</p> : null}
          </div>
        </section>
        <aside aria-label="Configuration" className="hidden border-l border-line lg:block">{configPanel}</aside>
      </div>
      <Sheet open={panel === "fields"} onClose={() => setPanel(null)} title="Data fields" side="bottom">{fieldsPanel}</Sheet>
      <Sheet open={panel === "config"} onClose={() => setPanel(null)} title="Configure chart" side="bottom">{configPanel}</Sheet>
    </div>
  );
}
