"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, Copy, LayoutDashboard, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { useAppSession } from "@/components/app/session-context";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { deleteVisualizationAction, duplicateVisualizationAction, pinVisualizationAction, renameVisualizationAction } from "@/lib/actions/visualizations";
import type { ChartKind } from "@/lib/demo-data";
import { toQueryResult } from "@/lib/visualizations/definition";
import type { ChartData } from "@/lib/visualizations/definition";

export interface LibraryItem {
  id: string;
  name: string;
  description: string;
  kind: ChartKind;
  datasetName: string | null;
  pinned: boolean;
  updated: string;
  data: ChartData | null;
  error: string | null;
}

export function LiveVizLibrary({ items: initialItems }: { items: LibraryItem[] }) {
  const toast = useToast();
  const router = useRouter();
  const { canEdit } = useAppSession();
  const [items, setItems] = useState(initialItems);
  const [renaming, setRenaming] = useState<LibraryItem | null>(null);
  const [deleting, setDeleting] = useState<LibraryItem | null>(null);
  const [busy, setBusy] = useState(false);
  // Take fresh server data when it arrives (adjust state during render, not in an effect).
  const [lastInitial, setLastInitial] = useState(initialItems);
  if (initialItems !== lastInitial) {
    setLastInitial(initialItems);
    setItems(initialItems);
  }

  async function duplicate(v: LibraryItem) {
    const result = await duplicateVisualizationAction({ id: v.id });
    if (!result.ok) return toast({ tone: "error", title: "Couldn't duplicate", body: result.error });
    toast({ tone: "success", title: "Visualization duplicated", body: result.data.name });
    router.refresh();
  }

  async function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!renaming) return;
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    setBusy(true);
    const result = await renameVisualizationAction({ id: renaming.id, name });
    setBusy(false);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't rename", body: result.error });
    setItems((all) => all.map((x) => (x.id === renaming.id ? { ...x, name } : x)));
    setRenaming(null);
    toast({ tone: "success", title: "Renamed", body: name });
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteVisualizationAction({ id: deleting.id });
    setBusy(false);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't delete", body: result.error });
    setItems((all) => all.filter((x) => x.id !== deleting.id));
    toast({ tone: "info", title: "Visualization deleted", body: deleting.name });
    setDeleting(null);
  }

  async function togglePinned(v: LibraryItem) {
    const result = await pinVisualizationAction({ id: v.id, pinned: !v.pinned });
    if (!result.ok) return toast({ tone: "error", title: "Couldn't update the dashboard", body: result.error });
    setItems((all) => all.map((x) => (x.id === v.id ? { ...x, pinned: !v.pinned } : x)));
    toast({ tone: "success", title: v.pinned ? "Removed from dashboard" : "Added to dashboard", body: v.name });
  }

  if (items.length === 0) {
    return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No saved visualizations" body="Build a chart from any dataset and save it to reuse in dashboards and reports." action={canEdit ? <ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink> : undefined} />;
  }

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 grid-cols-1">
        {canEdit ? (
          <li>
            <Link href="/app/visualizations/new" className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/50 p-6 text-center hover:border-petrol-500 hover:bg-surface">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-petrol-50 text-petrol-600"><Plus className="h-5 w-5" aria-hidden /></span>
              <span className="mt-3 font-semibold">Create visualization</span>
              <span className="mt-1 text-[13px] text-ink-muted">Start from any dataset</span>
            </Link>
          </li>
        ) : null}
        {items.map((v) => (
          <li key={v.id} className="flex flex-col rounded-panel border border-line bg-surface shadow-panel">
            <div className="flex items-start justify-between gap-2 px-4 pt-4">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{v.name}</h2>
                <p className="truncate text-[12px] text-ink-muted">{v.description || (v.datasetName ? `From ${v.datasetName}` : "Dataset deleted")}</p>
              </div>
              {canEdit ? (
                <Menu
                  id={`viz-menu-${v.id}`}
                  className="w-52 p-1"
                  trigger={({ open, toggle, id }) => (
                    <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label={`Actions for ${v.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-paper hover:text-ink">
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                >
                  {(close) => (
                    <ul className="text-[13px]">
                      {v.datasetName ? <li><Link href={`/app/visualizations/new?id=${v.id}`} onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Pencil className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Edit</Link></li> : null}
                      <li><button onClick={() => { close(); togglePinned(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><LayoutDashboard className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{v.pinned ? "Remove from dashboard" : "Add to dashboard"}</button></li>
                      <li><button onClick={() => { close(); duplicate(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Copy className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Duplicate</button></li>
                      <li><button onClick={() => { close(); setRenaming(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Pencil className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Rename</button></li>
                      <li className="mt-1 border-t border-line pt-1"><button onClick={() => { close(); setDeleting(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rust-700 hover:bg-rust-100/60"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></li>
                    </ul>
                  )}
                </Menu>
              ) : null}
            </div>
            <div className="flex-1 px-3 py-3">
              {v.data ? (
                <ChartRenderer kind={v.kind} result={toQueryResult(v.data, v.kind)} height={180} title={v.name} />
              ) : (
                <div className="flex h-[180px] flex-col items-center justify-center rounded-lg bg-paper px-4 text-center text-[12px] text-ink-muted">
                  <AlertTriangle className="mb-2 h-4 w-4 text-amber-500" aria-hidden />
                  {v.error ?? "This chart couldn't be drawn."}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] text-ink-muted">
              <span>Updated {v.updated.toLowerCase()}</span>
              {v.pinned ? <Badge tone="petrol">On dashboard</Badge> : <Badge tone="outline">{v.kind}</Badge>}
            </div>
          </li>
        ))}
      </ul>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename visualization" size="sm" footer={<><Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button><Button type="submit" form="rename-viz" loading={busy}>Rename</Button></>}>
        <form id="rename-viz" onSubmit={rename}>
          <Field label="Name" htmlFor="viz-name">
            <Input id="viz-name" name="name" defaultValue={renaming?.name} data-autofocus required maxLength={160} />
          </Field>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete visualization?" description={deleting ? `“${deleting.name}” will be permanently deleted.` : undefined} size="sm" footer={<><Button variant="secondary" onClick={() => setDeleting(null)} data-autofocus>Cancel</Button><Button variant="danger" onClick={remove} loading={busy}>Delete</Button></>}>
        <p className="text-sm text-ink-muted">This can&apos;t be undone. The dataset isn&apos;t affected.</p>
      </Modal>
    </>
  );
}
