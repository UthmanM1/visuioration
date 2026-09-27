"use client";

import Link from "next/link";
import { AlertTriangle, Database, Hash, Loader2, Plus, Settings2, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAppSession } from "@/components/app/session-context";
import { track } from "@/lib/analytics";
import { prepareDatasetForChartsAction } from "@/lib/actions/datasets";
import { runVisualizationAction, saveVisualizationAction } from "@/lib/actions/visualizations";
import type { ChartKind } from "@/lib/demo-data";
import { cn } from "@/lib/format";
import {
  aggregationLabels,
  dateGrains,
  defaultDefinition,
  defaultKind,
  grainLabels,
  isDimension,
  isNumeric,
  makeFormatter,
  measureLabel,
  opLabels,
  opsFor,
  rangeLabels,
  rangePresets,
  resolveRange,
  toQueryResult,
  validateDefinition,
} from "@/lib/visualizations/definition";
import type { Aggregation, ChartData, DateGrain, DatasetField, DefinitionFilter, QueryableDataset, RangePreset, VisualizationDefinition } from "@/lib/visualizations/definition";
import { AxisDropZone, chartTypes, FieldChip } from "./visualization-builder";

export interface LiveBuilderProps {
  datasets: QueryableDataset[];
  initial?: { id: string; name: string; description: string; kind: ChartKind; datasetId: string; definition: VisualizationDefinition; pinned: boolean } | null;
  initialDatasetId?: string | null;
}

const ROW_COUNT = "rows";
const iconFor = (f: DatasetField) => (f.type === "date" ? "date" : isNumeric(f.type) ? "number" : "text") as "date" | "text" | "number";

function describeRange(range: { from?: string; to?: string } | null) {
  if (!range) return "All dates";
  if (range.from && range.to) return `${range.from} to ${range.to}`;
  return range.from ? `From ${range.from}` : `Until ${range.to}`;
}

export function LiveVisualizationBuilder({ datasets: initialDatasets, initial, initialDatasetId }: LiveBuilderProps) {
  const router = useRouter();
  const toast = useToast();
  const session = useAppSession();
  const [datasets, setDatasets] = useState(initialDatasets);
  const [datasetId, setDatasetId] = useState<string | null>(initial?.datasetId ?? initialDatasetId ?? initialDatasets.find((d) => d.ready)?.id ?? initialDatasets[0]?.id ?? null);
  const dataset = datasets.find((d) => d.id === datasetId) ?? null;
  const fields = useMemo(() => dataset?.fields ?? [], [dataset]);
  const [definition, setDefinition] = useState<VisualizationDefinition>(() => initial?.definition ?? defaultDefinition(fields));
  const [kind, setKind] = useState<ChartKind>(() => initial?.kind ?? defaultKind(initial?.definition ?? defaultDefinition(fields), fields));
  const [title, setTitle] = useState(initial?.name ?? "");
  const [titleTouched, setTitleTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [panel, setPanel] = useState<null | "fields" | "config">(null);
  const [dropTarget, setDropTarget] = useState<"x" | "y" | null>(null);

  const field = (position: number | null | undefined) => fields.find((f) => f.position === position);
  const xField = definition.x ? field(definition.x.column) : undefined;
  const yField = definition.y.aggregation === "count" ? undefined : field(definition.y.column);
  const dateFields = fields.filter((f) => f.type === "date");
  const problem = dataset ? validateDefinition(definition, fields, kind) : "Choose a dataset.";
  const autoTitle = dataset ? `${measureLabel(definition, fields)}${kind !== "kpi" && xField ? ` by ${xField.name.toLowerCase()}` : ""}` : "";
  const shownTitle = titleTouched ? title : autoTitle;

  function update(patch: Partial<VisualizationDefinition>) {
    setDefinition((d) => ({ ...d, ...patch }));
  }

  function changeDataset(id: string) {
    const next = datasets.find((d) => d.id === id);
    setDatasetId(id);
    if (next) {
      const def = defaultDefinition(next.fields);
      setDefinition(def);
      setKind(defaultKind(def, next.fields));
    }
  }

  // Run the query shortly after the settings stop changing. Each result is keyed by the settings it was
  // computed for, so loading and error states are derived rather than mirrored into state from the effect,
  // and responses to superseded settings are discarded by the effect's cleanup.
  const runKey = dataset && dataset.ready && !problem ? JSON.stringify({ d: dataset.id, definition, kind }) : null;
  const [result, setResult] = useState<{ key: string; data: ChartData | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!runKey || !dataset) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const response = await runVisualizationAction({ datasetId: dataset.id, definition, kind });
      if (cancelled) return;
      setResult(response.ok ? { key: runKey, data: response.data, error: null } : { key: runKey, data: null, error: response.error });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [runKey, dataset, definition, kind]);
  const running = runKey !== null && result?.key !== runKey;
  const data = runKey ? result?.data ?? null : null;
  const error = !dataset || !dataset.ready ? null : problem ? problem : result?.key === runKey ? result.error : null;

  const chart = useMemo(() => (data ? toQueryResult(data, kind) : null), [data, kind]);

  function pickDimension(f: DatasetField) {
    update({ x: { column: f.position, ...(f.type === "date" ? { grain: definition.x?.grain ?? "month" } : {}) } });
    if (kind === "kpi") setKind(f.type === "date" ? "area" : "bar");
  }

  function pickMeasure(position: number | typeof ROW_COUNT) {
    if (position === ROW_COUNT) return update({ y: { column: null, aggregation: "count" } });
    const f = field(position);
    if (!f) return;
    const aggregation: Aggregation = isNumeric(f.type) ? (definition.y.aggregation === "count" || definition.y.aggregation === "count_distinct" ? "sum" : definition.y.aggregation) : "count_distinct";
    update({ y: { column: position, aggregation } });
  }

  function onDrop(target: "x" | "y", e: DragEvent) {
    e.preventDefault();
    setDropTarget(null);
    try {
      const dropped = JSON.parse(e.dataTransfer.getData("text/plain")) as { label: string; type: "dimension" | "measure" };
      if (dropped.label === "Row count" && target === "y") return pickMeasure(ROW_COUNT);
      const f = fields.find((x) => x.name === dropped.label);
      if (!f) return;
      if (target === "x" && isDimension(f.type)) pickDimension(f);
      else if (target === "y" && dropped.type === "measure") pickMeasure(f.position);
      else toast({ tone: "info", title: target === "x" ? "X axis takes a dimension" : "Y axis takes a measure", body: "Dimensions are dates or categories; measures are numbers." });
    } catch {
      /* ignore invalid drops */
    }
  }

  function setFilter(index: number, patch: Partial<DefinitionFilter>) {
    update({ filters: definition.filters.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  }

  function addFilter() {
    const f = fields.find((x) => x.type === "text") ?? fields[0];
    if (!f) return;
    update({ filters: [...definition.filters, { column: f.position, op: opsFor(f.type)[0], value: "" }] });
  }

  async function prepare() {
    if (!dataset) return;
    setPreparing(true);
    const result = await prepareDatasetForChartsAction({ datasetId: dataset.id });
    setPreparing(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't prepare the dataset", body: result.error });
      return;
    }
    setDatasets((all) => all.map((d) => (d.id === dataset.id ? { ...d, ready: true, queryRowCount: result.data.rows } : d)));
    toast({ tone: "success", title: "Ready for charts", body: `${result.data.rows.toLocaleString("en-US")} rows loaded.` });
  }

  async function save() {
    if (!dataset) return;
    if (problem) {
      toast({ tone: "error", title: "This chart can't be saved yet", body: problem });
      return;
    }
    const name = shownTitle.trim();
    if (!name) {
      toast({ tone: "error", title: "Add a title before saving", body: "Titles make charts findable in search and reports." });
      return;
    }
    setSaving(true);
    const result = await saveVisualizationAction({ id: initial?.id, name, description, kind, datasetId: dataset.id, definition, pinned });
    setSaving(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't save the visualization", body: result.error });
      return;
    }
    if (!initial) track("visualization_created", { kind });
    toast({ tone: "success", title: initial ? "Visualization updated" : "Visualization saved", body: pinned ? `${name} was added to the dashboard.` : `${name} is in your library.` });
    router.push("/app/visualizations");
    router.refresh();
  }

  if (datasets.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon={<Database className="h-5 w-5" />}
        title="Import a dataset to start charting"
        body="Visualizations are built from the datasets in this workspace. Upload a CSV or Excel file first."
        action={<ButtonLink href="/app/datasets?import=1">Import dataset</ButtonLink>}
      />
    );
  }

  const dimensions = fields.filter((f) => isDimension(f.type));
  const measures = fields.filter((f) => isNumeric(f.type));
  const categoryX = xField && xField.type !== "date" && !isNumeric(xField.type);

  const fieldsPanel = (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted"><Tag className="h-3 w-3" aria-hidden />Dimensions</h3>
        <div className="space-y-0.5">
          {dimensions.length ? dimensions.map((f) => <FieldChip key={f.position} label={f.name} type="dimension" icon={iconFor(f)} active={definition.x?.column === f.position && kind !== "kpi"} onPick={() => pickDimension(f)} />) : <p className="px-2.5 text-[12px] text-ink-faint">No date or category columns.</p>}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-muted"><Hash className="h-3 w-3" aria-hidden />Measures</h3>
        <div className="space-y-0.5">
          <FieldChip label="Row count" type="measure" icon="number" active={definition.y.aggregation === "count"} onPick={() => pickMeasure(ROW_COUNT)} />
          {measures.map((f) => <FieldChip key={f.position} label={f.name} type="measure" icon="number" active={definition.y.column === f.position && definition.y.aggregation !== "count"} onPick={() => pickMeasure(f.position)} />)}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-faint">Click a field, or drag it onto the X or Y axis above the chart.</p>
    </div>
  );

  const aggregationOptions: Aggregation[] = yField && isNumeric(yField.type) ? ["sum", "avg", "min", "max", "count_distinct"] : yField ? ["count_distinct"] : ["count"];

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
          <Select id="cfg-x" value={definition.x?.column ?? ""} disabled={kind === "kpi"} onChange={(e) => { const f = field(Number(e.target.value)); if (f) pickDimension(f); }}>
            {dimensions.map((f) => <option key={f.position} value={f.position}>{f.name}</option>)}
            {kind === "scatter" ? measures.filter((f) => !dimensions.includes(f)).map((f) => <option key={f.position} value={f.position}>{f.name}</option>) : null}
          </Select>
        </Field>
        {xField?.type === "date" && kind !== "kpi" ? (
          <Field label="Group dates by" htmlFor="cfg-grain">
            <Select id="cfg-grain" value={definition.x?.grain ?? "month"} onChange={(e) => update({ x: { column: xField.position, grain: e.target.value as DateGrain } })}>
              {dateGrains.map((g) => <option key={g} value={g}>{grainLabels[g]}</option>)}
            </Select>
          </Field>
        ) : categoryX ? (
          <Field label="Show top" htmlFor="cfg-limit">
            <Select id="cfg-limit" value={definition.limit} onChange={(e) => update({ limit: Number(e.target.value) })}>
              {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} categories</option>)}
            </Select>
          </Field>
        ) : <div />}
        <Field label="Y axis" htmlFor="cfg-y">
          <Select id="cfg-y" value={definition.y.aggregation === "count" ? ROW_COUNT : String(definition.y.column)} onChange={(e) => pickMeasure(e.target.value === ROW_COUNT ? ROW_COUNT : Number(e.target.value))}>
            <option value={ROW_COUNT}>Row count</option>
            {measures.map((f) => <option key={f.position} value={f.position}>{f.name}</option>)}
            <optgroup label="Count distinct values of">
              {fields.filter((f) => !isNumeric(f.type)).map((f) => <option key={`d${f.position}`} value={f.position}>{f.name}</option>)}
            </optgroup>
          </Select>
        </Field>
        <Field label="Aggregation" htmlFor="cfg-agg">
          <Select id="cfg-agg" value={definition.y.aggregation} disabled={aggregationOptions.length < 2} onChange={(e) => update({ y: { ...definition.y, aggregation: e.target.value as Aggregation } })}>
            {aggregationOptions.map((a) => <option key={a} value={a}>{aggregationLabels[a]}</option>)}
          </Select>
        </Field>
        <Field label="Group by" htmlFor="cfg-group" className="col-span-2">
          <Select id="cfg-group" value={definition.series?.column ?? ""} disabled={kind === "kpi" || kind === "donut" || kind === "scatter"} onChange={(e) => update({ series: e.target.value === "" ? null : { column: Number(e.target.value) } })}>
            <option value="">None</option>
            {fields.filter((f) => (f.type === "text" || f.type === "boolean") && f.position !== definition.x?.column).map((f) => <option key={f.position} value={f.position}>{f.name}</option>)}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13px] font-medium text-ink-soft">Filters</legend>
        {definition.filters.map((filter, i) => {
          const f = field(filter.column);
          const ops = f ? opsFor(f.type) : [];
          const needsValue = filter.op !== "empty" && filter.op !== "not_empty";
          const listId = `filter-values-${i}`;
          return (
            <div key={i} className="space-y-1.5 rounded-lg border border-line p-2">
              <div className="flex gap-1.5">
                <Select aria-label="Filter column" className="h-9 flex-1" value={filter.column} onChange={(e) => { const nf = field(Number(e.target.value)); if (nf) setFilter(i, { column: nf.position, op: opsFor(nf.type)[0], value: "" }); }}>
                  {fields.map((x) => <option key={x.position} value={x.position}>{x.name}</option>)}
                </Select>
                <Button variant="ghost" size="icon" onClick={() => update({ filters: definition.filters.filter((_, j) => j !== i) })} aria-label={`Remove ${f?.name ?? ""} filter`}><X className="h-4 w-4" aria-hidden /></Button>
              </div>
              <div className="flex gap-1.5">
                <Select aria-label="Condition" className="h-9 w-[46%]" value={filter.op} onChange={(e) => setFilter(i, { op: e.target.value as DefinitionFilter["op"], value: e.target.value === "in" || e.target.value === "not_in" ? [] : "" })}>
                  {ops.map((op) => <option key={op} value={op}>{opLabels[op]}</option>)}
                </Select>
                {needsValue ? (
                  f?.type === "boolean" ? (
                    <Select aria-label="Value" className="h-9 flex-1" value={String(filter.value ?? "")} onChange={(e) => setFilter(i, { value: e.target.value })}>
                      <option value="">Choose…</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  ) : (
                    <>
                      <Input
                        aria-label="Value"
                        className="h-9 flex-1"
                        type={f?.type === "date" ? "date" : isNumeric(f?.type ?? "text") ? "number" : "text"}
                        list={f?.type === "text" ? listId : undefined}
                        placeholder={filter.op === "in" || filter.op === "not_in" ? "a, b, c" : "Value"}
                        value={Array.isArray(filter.value) ? filter.value.join(", ") : String(filter.value ?? "")}
                        onChange={(e) => setFilter(i, { value: filter.op === "in" || filter.op === "not_in" ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean) : e.target.value })}
                      />
                      {f?.type === "text" ? <datalist id={listId}>{f.samples.map((s) => <option key={s} value={s} />)}</datalist> : null}
                    </>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
        <Button variant="secondary" size="sm" onClick={addFilter} icon={<Plus className="h-3.5 w-3.5" aria-hidden />}>Add filter</Button>
      </fieldset>

      {dateFields.length ? (
        <div className="grid grid-cols-2 gap-3">
          {dateFields.length > 1 ? (
            <Field label="Date column" htmlFor="cfg-range-col" className="col-span-2">
              <Select id="cfg-range-col" value={definition.dateRange?.column ?? dateFields[0].position} onChange={(e) => update({ dateRange: { column: Number(e.target.value), preset: definition.dateRange?.preset ?? "all" } })}>
                {dateFields.map((f) => <option key={f.position} value={f.position}>{f.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Date range" htmlFor="cfg-range" className="col-span-2" hint={definition.dateRange && definition.dateRange.preset !== "all" && definition.dateRange.preset !== "custom" ? `Ends ${field(definition.dateRange.column)?.max?.slice(0, 10) ?? ""}, the latest date in this dataset.` : undefined}>
            <Select id="cfg-range" value={definition.dateRange?.preset ?? "all"} onChange={(e) => { const preset = e.target.value as RangePreset; update({ dateRange: preset === "all" ? null : { column: definition.dateRange?.column ?? dateFields[0].position, preset, from: definition.dateRange?.from, to: definition.dateRange?.to } }); }}>
              {rangePresets.map((p) => <option key={p} value={p}>{rangeLabels[p]}</option>)}
            </Select>
          </Field>
          {definition.dateRange?.preset === "custom" ? (
            <>
              <Field label="From" htmlFor="cfg-from"><Input id="cfg-from" type="date" value={definition.dateRange.from ?? ""} onChange={(e) => update({ dateRange: { ...definition.dateRange!, from: e.target.value || undefined } })} /></Field>
              <Field label="To" htmlFor="cfg-to"><Input id="cfg-to" type="date" value={definition.dateRange.to ?? ""} onChange={(e) => update({ dateRange: { ...definition.dateRange!, to: e.target.value || undefined } })} /></Field>
            </>
          ) : null}
        </div>
      ) : null}

      <Field label="Title" htmlFor="cfg-title">
        <Input id="cfg-title" value={shownTitle} onChange={(e) => { setTitleTouched(true); setTitle(e.target.value); }} maxLength={160} />
      </Field>
      <Field label="Description" htmlFor="cfg-desc">
        <Textarea id="cfg-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[72px]" maxLength={500} />
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-petrol-600" />
        Add to dashboard
      </label>
    </div>
  );


  const range = data?.range ?? (definition.dateRange ? resolveRange(definition.dateRange, field(definition.dateRange.column)?.max ?? null) : null);
  const format = data ? makeFormatter(data.valueFormat) : null;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 pb-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <label htmlFor="builder-dataset" className="sr-only">Dataset</label>
          <Select id="builder-dataset" value={datasetId ?? ""} onChange={(e) => changeDataset(e.target.value)} className="h-8 w-auto max-w-[280px] rounded-full border-amber-500/40 bg-amber-100/60 py-0 pl-3 text-[12px] font-medium text-amber-700">
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <h1 className="mt-1.5 truncate font-display text-2xl font-semibold tracking-[-0.02em]">{initial ? `Edit: ${initial.name}` : "New visualization"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="lg:hidden" onClick={() => setPanel("fields")}>Fields</Button>
          <Button variant="secondary" className="lg:hidden" onClick={() => setPanel("config")} icon={<Settings2 className="h-4 w-4" aria-hidden />}>Configure</Button>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => router.push("/app/visualizations")}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!session.canEdit || !dataset?.ready} title={session.canEdit ? undefined : "Viewers can’t save visualizations"}>{initial ? "Save changes" : "Save visualization"}</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_300px]">
        <aside aria-label="Data fields" className="hidden border-r border-line lg:block">{fieldsPanel}</aside>
        <section aria-label="Visualization preview" className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <AxisDropZone target="x" label="X axis" value={kind === "kpi" ? "None (single value)" : xField?.name ?? "Choose a dimension"} active={dropTarget === "x"} onActive={setDropTarget} onDropField={onDrop} />
            <AxisDropZone target="y" label="Y axis" value={definition.y.aggregation === "count" ? "Row count" : yField?.name ?? "Choose a measure"} active={dropTarget === "y"} onActive={setDropTarget} onDropField={onDrop} />
          </div>
          <div className="mt-4 rounded-panel border border-line bg-surface p-4 shadow-panel sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.01em]">{shownTitle || "Untitled visualization"}</h2>
            {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
            <div className="relative mt-5 min-h-[340px]" aria-busy={running}>
              {dataset && !dataset.ready ? (
                <div className="flex h-[340px] flex-col items-center justify-center rounded-lg border border-dashed border-line-strong text-center">
                  <Database className="h-6 w-6 text-petrol-600" aria-hidden />
                  <p className="mt-3 font-medium">This dataset isn&apos;t ready for charts yet</p>
                  <p className="mt-1 max-w-sm text-[13px] text-ink-muted">Its rows need to be loaded into the database once. This takes a few seconds for most files.</p>
                  <Button className="mt-4" onClick={prepare} loading={preparing} disabled={!session.canEdit}>Prepare for charts</Button>
                </div>
              ) : error ? (
                <div role="alert" className="flex h-[340px] flex-col items-center justify-center rounded-lg bg-paper px-6 text-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden />
                  <p className="mt-3 max-w-md text-[14px] text-ink-soft">{error}</p>
                </div>
              ) : chart ? (
                <div key={`${kind}-${chart.series.join("|")}`} className={cn("transition-opacity", running && "opacity-50")}>
                  <ChartRenderer kind={kind} result={chart} height={340} title={shownTitle} />
                </div>
              ) : (
                <Skeleton className="h-[340px] w-full" />
              )}
              {running && chart ? <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-petrol-600" aria-label="Updating chart" /> : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-muted">
              <span className="tnum">
                {data && format ? <>{measureLabel(definition, fields)}: <strong className="text-ink">{data.total === null ? "—" : format(data.total, false)}</strong> · {data.matched.toLocaleString("en-US")} rows</> : "—"}
              </span>
              <span>{describeRange(range)} · {definition.filters.length ? `${definition.filters.length} filter${definition.filters.length === 1 ? "" : "s"}` : "No filters"}</span>
            </div>
            {chart?.note ? <p className="mt-2 rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted" role="note">{chart.note}</p> : null}
            {dataset && dataset.queryRowCount < dataset.rowCount && dataset.ready ? <p className="mt-2 text-[12px] text-ink-faint">Charts use the first {dataset.queryRowCount.toLocaleString("en-US")} of {dataset.rowCount.toLocaleString("en-US")} rows.</p> : null}
          </div>
          {dataset ? <p className="mt-3 text-[12px] text-ink-faint">Data from <Link href={`/app/datasets/${dataset.slug}`} className="underline underline-offset-2">{dataset.name}</Link>, calculated in the database from all {dataset.queryRowCount.toLocaleString("en-US")} rows.</p> : null}
        </section>
        <aside aria-label="Configuration" className="hidden border-l border-line lg:block">{configPanel}</aside>
      </div>
      <Sheet open={panel === "fields"} onClose={() => setPanel(null)} title="Data fields" side="bottom">{fieldsPanel}</Sheet>
      <Sheet open={panel === "config"} onClose={() => setPanel(null)} title="Configure chart" side="bottom">{configPanel}</Sheet>
    </div>
  );
}
