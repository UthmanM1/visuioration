"use client";

import Link from "next/link";
import { BarChart3, Copy, LayoutDashboard, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { vizResult } from "@/components/projects/project-workspace";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { visualizations as initial } from "@/lib/demo-data";
import type { Visualization } from "@/lib/demo-data";

export function VizLibrary() {
  const toast = useToast();
  const [items, setItems] = useState<Visualization[]>(initial);
  const [renaming, setRenaming] = useState<Visualization | null>(null);
  const [deleting, setDeleting] = useState<Visualization | null>(null);
  const [onDashboard, setOnDashboard] = useState<string[]>(["revenue-overview", "regional-performance"]);

  function duplicate(v: Visualization) {
    const copy = { ...v, id: `${v.id}-copy-${Date.now()}`, name: `${v.name} (copy)`, updated: "Just now" };
    setItems((all) => [copy, ...all]);
    toast({ tone: "success", title: "Visualization duplicated", body: copy.name });
  }

  function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!renaming || !name) return;
    setItems((all) => all.map((x) => (x.id === renaming.id ? { ...x, name } : x)));
    setRenaming(null);
    toast({ tone: "success", title: "Renamed", body: name });
  }

  function remove() {
    if (!deleting) return;
    setItems((all) => all.filter((x) => x.id !== deleting.id));
    toast({ tone: "info", title: "Visualization deleted", body: `${deleting.name} was removed from this session.` });
    setDeleting(null);
  }

  function toggleDashboard(v: Visualization) {
    const added = !onDashboard.includes(v.id);
    setOnDashboard((ids) => (added ? [...ids, v.id] : ids.filter((id) => id !== v.id)));
    toast({ tone: "success", title: added ? "Added to dashboard" : "Removed from dashboard", body: v.name });
  }

  if (items.length === 0) {
    return <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No saved visualizations" body="Build a chart from any dataset and save it to reuse in dashboards and reports." action={<ButtonLink href="/app/visualizations/new">Create visualization</ButtonLink>} />;
  }

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 grid-cols-1">
        <li>
          <Link href="/app/visualizations/new" className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/50 p-6 text-center hover:border-petrol-500 hover:bg-surface">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-petrol-50 text-petrol-600"><Plus className="h-5 w-5" aria-hidden /></span>
            <span className="mt-3 font-semibold">Create visualization</span>
            <span className="mt-1 text-[13px] text-ink-muted">Start from any dataset</span>
          </Link>
        </li>
        {items.map((v) => {
          const baseId = v.id.split("-copy-")[0];
          return (
            <li key={v.id} className="flex flex-col rounded-panel border border-line bg-surface shadow-panel">
              <div className="flex items-start justify-between gap-2 px-4 pt-4">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{v.name}</h2>
                  <p className="truncate text-[12px] text-ink-muted">{v.description}</p>
                </div>
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
                      <li><Link href={`/app/visualizations/new?from=${baseId}`} onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Pencil className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Edit</Link></li>
                      <li><button onClick={() => { close(); toggleDashboard(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><LayoutDashboard className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{onDashboard.includes(v.id) ? "Remove from dashboard" : "Add to dashboard"}</button></li>
                      <li><button onClick={() => { close(); duplicate(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Copy className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Duplicate</button></li>
                      <li><button onClick={() => { close(); setRenaming(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><Pencil className="h-3.5 w-3.5 text-ink-faint" aria-hidden />Rename</button></li>
                      <li className="mt-1 border-t border-line pt-1"><button onClick={() => { close(); setDeleting(v); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rust-700 hover:bg-rust-100/60"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></li>
                    </ul>
                  )}
                </Menu>
              </div>
              <div className="flex-1 px-3 py-3">
                <ChartRenderer kind={v.kind} result={vizResult(baseId)} height={180} title={v.name} />
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] text-ink-muted">
                <span>Updated {v.updated.toLowerCase()}</span>
                {onDashboard.includes(v.id) ? <Badge tone="petrol">On dashboard</Badge> : <Badge tone="outline">{v.kind}</Badge>}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename visualization" size="sm" footer={<><Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button><Button type="submit" form="rename-viz">Rename</Button></>}>
        <form id="rename-viz" onSubmit={rename}>
          <Field label="Name" htmlFor="viz-name">
            <Input id="viz-name" name="name" defaultValue={renaming?.name} data-autofocus required />
          </Field>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete visualization?" description={deleting ? `“${deleting.name}” will be removed from dashboards and reports that use it.` : undefined} size="sm" footer={<><Button variant="secondary" onClick={() => setDeleting(null)} data-autofocus>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-ink-muted">This is a demo, so the chart returns when you reload the page.</p>
      </Modal>
    </>
  );
}
