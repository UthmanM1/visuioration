"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, BarChart3, GripVertical, LayoutDashboard, MoreHorizontal, Pencil, Plus, Search, Sparkles, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { useAppSession } from "@/components/app/session-context";
import { Greeting } from "@/components/dashboard/greeting";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { createDashboardAction, deleteDashboardAction, loadWidgetAction, saveDashboardAction, setDefaultDashboardAction } from "@/lib/actions/dashboards";
import { chartHeights, defaultSizeFor, heightLabels, MAX_WIDGETS, moveWidget, newWidgetId, sizeClasses, sizeLabels, widgetSizes } from "@/lib/dashboards/layout";
import type { WidgetSize } from "@/lib/dashboards/layout";
import type { ChartKind } from "@/lib/demo-data";
import { cn } from "@/lib/format";
import type { WidgetView } from "@/lib/services/widgets";
import { toQueryResult } from "@/lib/visualizations/definition";

export interface LiveDashboardProps {
  dashboards: Array<{ id: string; name: string; isDefault: boolean; widgetCount: number }>;
  current: { id: string; name: string; isDefault: boolean } | null;
  widgets: WidgetView[];
  charts: Array<{ id: string; name: string; kind: ChartKind; datasetName: string | null }>;
  startInEditMode: boolean;
}

function WidgetBody({ view }: { view: WidgetView }) {
  const height = view.viz?.kind === "kpi" ? 140 : chartHeights[view.widget.height];
  if (!view.viz || !view.data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-paper px-4 text-center text-[13px] text-ink-muted" style={{ height }}>
        <AlertTriangle className="mb-2 h-4 w-4 text-amber-500" aria-hidden />
        {view.error ?? "This chart couldn't be drawn."}
      </div>
    );
  }
  return <ChartRenderer kind={view.viz.kind} result={toQueryResult(view.data, view.viz.kind)} height={height} title={view.viz.name} />;
}

export function LiveDashboard({ dashboards, current, widgets: savedWidgets, charts, startInEditMode }: LiveDashboardProps) {
  const router = useRouter();
  const toast = useToast();
  const session = useAppSession();
  const [editing, setEditing] = useState(startInEditMode && session.canEdit && Boolean(current));
  const [views, setViews] = useState<WidgetView[]>(savedWidgets);
  const [name, setName] = useState(current?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Reset local state when the server sends a different dashboard or fresh data (during render, not in an effect).
  const [lastSaved, setLastSaved] = useState({ savedWidgets, current });
  if (lastSaved.savedWidgets !== savedWidgets || lastSaved.current !== current) {
    setLastSaved({ savedWidgets, current });
    setViews(savedWidgets);
    setName(current?.name ?? "");
  }

  const dirty = useMemo(
    () => name.trim() !== (current?.name ?? "") || JSON.stringify(views.map((v) => v.widget)) !== JSON.stringify(savedWidgets.map((v) => v.widget)),
    [name, views, savedWidgets, current],
  );

  useEffect(() => {
    if (!editing || !dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, dirty]);

  const onDashboard = new Set(views.map((v) => v.widget.visualizationId));
  const available = charts.filter((c) => !onDashboard.has(c.id) && c.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()));

  function update(index: number, patch: Partial<WidgetView["widget"]>) {
    setViews((all) => all.map((v, i) => (i === index ? { ...v, widget: { ...v.widget, ...patch } } : v)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= views.length) return;
    setViews((all) => moveWidget(all, from, to));
    setAnnouncement(`${views[from].viz?.name ?? "Widget"} moved to position ${to + 1} of ${views.length}.`);
  }

  function remove(index: number) {
    const label = views[index].viz?.name ?? "Widget";
    setViews((all) => all.filter((_, i) => i !== index));
    setAnnouncement(`${label} removed from the dashboard.`);
  }

  async function add(chartId: string) {
    if (views.length >= MAX_WIDGETS) {
      toast({ tone: "error", title: `Dashboards can hold up to ${MAX_WIDGETS} widgets` });
      return;
    }
    setAdding(chartId);
    const result = await loadWidgetAction({ visualizationId: chartId });
    setAdding(null);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't add the chart", body: result.error });
      return;
    }
    const kind = result.data.viz?.kind ?? "bar";
    setViews((all) => [...all, { widget: { id: newWidgetId(), visualizationId: chartId, size: defaultSizeFor(kind), height: "regular" }, ...result.data }]);
    setAnnouncement(`${result.data.viz?.name ?? "Chart"} added to the end of the dashboard.`);
  }

  function cancel() {
    if (dirty && !window.confirm("Discard your changes to this dashboard?")) return;
    setViews(savedWidgets);
    setName(current?.name ?? "");
    setEditing(false);
    router.replace(current ? `/app?d=${current.id}` : "/app", { scroll: false });
  }

  async function save() {
    if (!current) return;
    if (!name.trim()) {
      toast({ tone: "error", title: "Give the dashboard a name" });
      return;
    }
    setSaving(true);
    const result = await saveDashboardAction({ id: current.id, name: name.trim(), widgets: views.map((v) => v.widget) });
    setSaving(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't save the dashboard", body: result.error });
      return;
    }
    toast({ tone: "success", title: "Dashboard saved", body: `${views.length} widget${views.length === 1 ? "" : "s"}.` });
    setEditing(false);
    router.replace(`/app?d=${current.id}`, { scroll: false });
    router.refresh();
  }

  async function create() {
    setBusy(true);
    const result = await createDashboardAction({ name: newName });
    setBusy(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't create the dashboard", body: result.error });
      return;
    }
    setCreating(false);
    setNewName("");
    toast({ tone: "success", title: "Dashboard created", body: "Add charts, then save." });
    router.push(`/app?d=${result.data.id}&edit=1`);
    router.refresh();
  }

  async function removeDashboard() {
    if (!current) return;
    setBusy(true);
    const result = await deleteDashboardAction({ id: current.id });
    setBusy(false);
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't delete the dashboard", body: result.error });
      return;
    }
    setConfirmDelete(false);
    toast({ tone: "info", title: "Dashboard deleted", body: current.name });
    router.replace("/app");
    router.refresh();
  }

  async function makeDefault() {
    if (!current) return;
    const result = await setDefaultDashboardAction({ id: current.id });
    if (!result.ok) {
      toast({ tone: "error", title: "Couldn't change the default", body: result.error });
      return;
    }
    toast({ tone: "success", title: "Default dashboard updated", body: `${current.name} opens first and receives charts added from the library.` });
    router.refresh();
  }

  function switchTo(id: string) {
    if (editing && dirty && !window.confirm("Discard your changes to this dashboard?")) return;
    setEditing(false);
    router.push(`/app?d=${id}`);
  }

  function onDragStart(e: DragEvent, index: number) {
    dragFrom.current = index;
    setDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function onDrop(e: DragEvent, index: number) {
    e.preventDefault();
    setDragOver(null);
    setDragging(false);
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from !== null) move(from, index);
  }

  const header = (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {current && dashboards.length ? (
            <>
              <label htmlFor="dashboard-switcher" className="sr-only">Dashboard</label>
              <Select id="dashboard-switcher" value={current.id} onChange={(e) => switchTo(e.target.value)} className="h-7 w-auto max-w-[240px] rounded-full border-petrol-500/30 bg-petrol-50 py-0 pl-3 text-[12px] font-medium text-petrol-700">
                {dashboards.map((d) => <option key={d.id} value={d.id}>{d.name}{d.isDefault ? " (default)" : ""}</option>)}
              </Select>
              {current.isDefault ? <Badge tone="outline"><Star className="h-3 w-3" aria-hidden />Default</Badge> : null}
              <span className="text-[12px] text-ink-muted">{views.length} widget{views.length === 1 ? "" : "s"}</span>
            </>
          ) : null}
        </div>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[2rem]">
          <Greeting />
        </h1>
        <p className="mt-1 text-[15px] text-ink-muted">Here&apos;s what&apos;s happening across {session.workspace.name}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button variant="secondary" onClick={() => setPicker(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>Add widget</Button>
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!dirty}>Save dashboard</Button>
          </>
        ) : (
          <>
            <ButtonLink href="/app/insights" variant="secondary" icon={<Sparkles className="h-4 w-4" aria-hidden />}>Ask AI</ButtonLink>
            {session.canEdit && current ? <Button onClick={() => { setEditing(true); router.replace(`/app?d=${current.id}&edit=1`, { scroll: false }); }} icon={<Pencil className="h-4 w-4" aria-hidden />}>Edit layout</Button> : null}
            {session.canEdit ? (
              <Menu
                id="dashboard-menu"
                className="w-56 p-1"
                trigger={({ open, toggle, id }) => (
                  <Button variant="secondary" size="icon" onClick={toggle} aria-expanded={open} aria-controls={id} aria-label="Dashboard options"><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>
                )}
              >
                {(close) => (
                  <ul className="text-[13px]">
                    <li><button onClick={() => { close(); setCreating(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Plus className="h-3.5 w-3.5 text-ink-faint" aria-hidden />New dashboard</button></li>
                    {current && !current.isDefault ? <li><button onClick={() => { close(); makeDefault(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Star className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Make default</button></li> : null}
                    {current ? <li className="mt-1 border-t border-line pt-1"><button onClick={() => { close(); setConfirmDelete(true); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rust-700 hover:bg-rust-100/60"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete dashboard</button></li> : null}
                  </ul>
                )}
              </Menu>
            ) : null}
          </>
        )}
      </div>
    </div>
  );

  const createModal = (
    <Modal open={creating} onClose={() => setCreating(false)} title="New dashboard" description="Give it a name, then add charts to it." size="sm" footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button onClick={create} loading={busy} disabled={!newName.trim()}>Create dashboard</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create(); }}>
        <Field label="Name" htmlFor="new-dashboard-name">
          <Input id="new-dashboard-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Weekly sales" maxLength={160} data-autofocus />
        </Field>
      </form>
    </Modal>
  );

  if (!current) {
    return (
      <>
        {header}
        <EmptyState
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Create your first dashboard"
          body="Dashboards collect your saved charts in one view. You can resize and reorder them, and keep several dashboards for different audiences."
          action={session.canEdit ? <Button onClick={() => setCreating(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>Create dashboard</Button> : undefined}
        />
        {createModal}
      </>
    );
  }

  return (
    <>
      {header}
      <p className="sr-only" aria-live="polite">{announcement}</p>

      {editing ? (
        <div className="mb-4 flex flex-col gap-3 rounded-panel border border-petrol-500/30 bg-petrol-50/60 p-4 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Dashboard name" htmlFor="dashboard-name" className="sm:w-80">
            <Input id="dashboard-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
          </Field>
          <p className="text-[12px] text-ink-muted">Drag a widget by its handle to reorder it, or use the arrows. Changes apply when you save.</p>
        </div>
      ) : null}

      {views.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="This dashboard is empty"
          body={charts.length ? "Add saved charts to build it up." : "Save a chart in the visualization builder first, then add it here."}
          action={
            session.canEdit ? (
              charts.length ? (
                <Button onClick={() => { setEditing(true); setPicker(true); }} icon={<Plus className="h-4 w-4" aria-hidden />}>Add widgets</Button>
              ) : (
                <ButtonLink href="/app/visualizations/new">Create a chart</ButtonLink>
              )
            ) : undefined
          }
        />
      ) : (
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12" aria-label={`${name || current.name} widgets`}>
          {views.map((view, index) => {
            const title = view.viz?.name ?? "Deleted chart";
            return (
              <li
                key={view.widget.id}
                className={cn(sizeClasses[view.widget.size], "min-w-0")}
                onDragOver={editing ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOver !== index) setDragOver(index); } : undefined}
                onDragLeave={editing ? () => setDragOver((d) => (d === index ? null : d)) : undefined}
                onDrop={editing ? (e) => onDrop(e, index) : undefined}
              >
                <Panel className={cn("flex h-full flex-col", editing && "outline-dashed outline-1 outline-offset-2 outline-petrol-500/40", dragOver === index && "ring-2 ring-petrol-500")}>
                  <div className="flex items-start justify-between gap-2 px-4 pt-4">
                    <div className="flex min-w-0 items-start gap-1.5">
                      {editing ? (
                        <span draggable onDragStart={(e) => onDragStart(e, index)} onDragEnd={() => { setDragOver(null); setDragging(false); dragFrom.current = null; }} className="-ml-1 mt-0.5 cursor-grab rounded p-0.5 text-ink-faint hover:bg-paper hover:text-ink active:cursor-grabbing" aria-hidden title="Drag to reorder">
                          <GripVertical className="h-4 w-4" />
                        </span>
                      ) : null}
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
                        <p className="truncate text-[12px] text-ink-muted">{view.viz?.description || (view.viz?.datasetName ? `From ${view.viz.datasetName}` : "")}</p>
                      </div>
                    </div>
                    {editing ? (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${title} earlier`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, index + 1)} disabled={index === views.length - 1} aria-label={`Move ${title} later`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-rust-700" onClick={() => remove(index)} aria-label={`Remove ${title}`}><X className="h-4 w-4" aria-hidden /></Button>
                      </div>
                    ) : view.viz ? (
                      <Link href={`/app/visualizations/new?id=${view.viz.id}`} className="shrink-0 rounded-md px-2 py-1 text-[12px] text-ink-muted hover:bg-paper hover:text-ink">Open</Link>
                    ) : null}
                  </div>
                  {editing ? (
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                      <label className="sr-only" htmlFor={`size-${view.widget.id}`}>Width of {title}</label>
                      <Select id={`size-${view.widget.id}`} className="h-8 w-auto py-0 text-[12px]" value={view.widget.size} onChange={(e) => update(index, { size: e.target.value as WidgetSize })}>
                        {widgetSizes.map((s) => <option key={s} value={s}>{sizeLabels[s]}</option>)}
                      </Select>
                      {view.viz?.kind !== "kpi" ? (
                        <div role="radiogroup" aria-label={`Height of ${title}`} className="inline-flex rounded-control border border-line bg-paper p-0.5">
                          {(["regular", "tall"] as const).map((h) => (
                            <button key={h} role="radio" aria-checked={view.widget.height === h} onClick={() => update(index, { height: h })} className={cn("rounded-[6px] px-2.5 py-1 text-[12px] font-medium", view.widget.height === h ? "bg-surface text-ink shadow-panel" : "text-ink-muted hover:text-ink")}>
                              {heightLabels[h]}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {/* While dragging, charts ignore the pointer so the whole widget accepts the drop. */}
                  <div className={cn("flex-1 px-3 pb-3 pt-3", dragging && "pointer-events-none")}>
                    <WidgetBody view={view} />
                  </div>
                </Panel>
              </li>
            );
          })}
          {editing ? (
            <li className="md:col-span-3 xl:col-span-4">
              <button onClick={() => setPicker(true)} className="flex h-full min-h-[200px] w-full flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/50 p-6 text-center hover:border-petrol-500 hover:bg-surface">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-petrol-50 text-petrol-600"><Plus className="h-5 w-5" aria-hidden /></span>
                <span className="mt-3 font-semibold">Add widget</span>
                <span className="mt-1 text-[13px] text-ink-muted">Choose from your saved charts</span>
              </button>
            </li>
          ) : null}
        </ol>
      )}

      <Modal open={picker} onClose={() => setPicker(false)} title="Add widget" description="Saved charts from this workspace." footer={<><ButtonLink href="/app/visualizations/new" variant="ghost">Create a new chart</ButtonLink><Button onClick={() => setPicker(false)}>Done</Button></>}>
        <label className="relative block">
          <span className="sr-only">Search charts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search charts" className="pl-9" data-autofocus />
        </label>
        <ul className="mt-3 max-h-[50vh] divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {available.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-ink-muted">{charts.length === 0 ? "No saved charts yet." : pickerQuery ? "No charts match your search." : "Every saved chart is already on this dashboard."}</li>
          ) : (
            available.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{c.name}</p>
                  <p className="truncate text-[12px] text-ink-muted">{c.kind} chart{c.datasetName ? ` · ${c.datasetName}` : ""}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => add(c.id)} loading={adding === c.id} aria-label={`Add ${c.name}`}>Add</Button>
              </li>
            ))
          )}
        </ul>
      </Modal>

      {createModal}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete dashboard?" description={`“${current.name}” will be deleted. The charts on it stay in your library.`} size="sm" footer={<><Button variant="secondary" onClick={() => setConfirmDelete(false)} data-autofocus>Cancel</Button><Button variant="danger" onClick={removeDashboard} loading={busy}>Delete dashboard</Button></>}>
        <p className="text-sm text-ink-muted">{current.isDefault && dashboards.length > 1 ? "Another dashboard will become the default." : "This can't be undone."}</p>
      </Modal>
    </>
  );
}
