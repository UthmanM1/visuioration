"use client";

import { ArrowDown, ArrowUp, BarChart3, Eye, FileText, GripVertical, Hash, Lightbulb, ListChecks, Map as MapIcon, Paperclip, Plus, Trash2, Type } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EvidenceChart } from "@/components/insights/evidence-chart";
import { DemoTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { facts, insights, regionSummary, reports, totals } from "@/lib/demo-data";
import { formatChange, formatCurrency, formatNumber } from "@/lib/format";
import { reportSectionTypes } from "@/lib/services/reports";
import type { ReportSectionType } from "@/lib/services/reports";

const icons: Record<ReportSectionType, typeof FileText> = { cover: FileText, summary: Type, kpis: Hash, chart: BarChart3, insights: Lightbulb, regional: MapIcon, recommendations: ListChecks, appendix: Paperclip };

interface Section {
  id: string;
  type: ReportSectionType;
}

const defaultSections: ReportSectionType[] = ["cover", "summary", "kpis", "chart", "insights", "recommendations"];
const templates: Record<string, ReportSectionType[]> = {
  "regional-growth": ["cover", "summary", "regional", "chart", "recommendations"],
  "customer-acquisition": ["cover", "summary", "kpis", "chart", "insights", "appendix"],
  "product-performance": ["cover", "summary", "chart", "recommendations"],
};

let counter = 0;
const make = (type: ReportSectionType): Section => ({ id: `${type}-${++counter}`, type });

function SectionPreview({ type, title, period }: { type: ReportSectionType; title: string; period: string }) {
  switch (type) {
    case "cover":
      return (
        <div className="rounded-md bg-night px-5 py-8 text-white">
          <p className="text-[11px] text-white/50">Northstar Retail Group</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">{title || "Untitled report"}</p>
          <p className="mt-1 text-sm text-white/70">{period}</p>
        </div>
      );
    case "summary":
      return <p className="text-[13px] leading-relaxed text-ink-soft">Q2 revenue reached {formatCurrency(facts.q2Revenue, { compact: true })}, {formatChange(facts.q2Growth)} on Q1. Outdoor led category growth, and mobile conversion is the largest open opportunity.</p>;
    case "kpis":
      return (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["Revenue", formatCurrency(totals.revenue, { compact: true })], ["Orders", formatNumber(totals.orders)], ["Conversion", `${totals.conversion.toFixed(2)}%`], ["CAC", `$${totals.cac.toFixed(2)}`]].map(([k, v]) => (
            <div key={k} className="rounded-md border border-line px-3 py-2"><dt className="text-[11px] text-ink-muted">{k}</dt><dd className="tnum text-[15px] font-semibold">{v}</dd></div>
          ))}
        </dl>
      );
    case "chart":
      return <EvidenceChart kind="revenue-trend" height={160} />;
    case "insights":
      return (
        <ul className="space-y-1.5 text-[13px]">
          {insights.slice(0, 3).map((i) => <li key={i.id} className="flex gap-2"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />{i.title}</li>)}
        </ul>
      );
    case "regional":
      return (
        <ul className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
          {regionSummary.map((r) => <li key={r.region} className="rounded-md border border-line px-3 py-2"><span className="block text-[11px] text-ink-muted">{r.region}</span><span className="tnum font-semibold">{formatCurrency(r.revenue, { compact: true, decimals: 2 })}</span></li>)}
        </ul>
      );
    case "recommendations":
      return (
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-ink-soft">
          <li>Review West mobile checkout.</li>
          <li>Plan Outdoor inventory for Q3.</li>
          <li>Rebalance paid social budget.</li>
        </ol>
      );
    case "appendix":
      return <p className="text-[12px] text-ink-muted">Definitions, data sources and refresh times for Northstar Sales Data and Marketing Performance.</p>;
  }
}

export function ReportBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const from = params.get("from");
  const base = from ? reports.find((r) => r.slug === from) : null;
  const [title, setTitle] = useState("Monthly Performance Update");
  const [period, setPeriod] = useState("June 2026");
  const [sections, setSections] = useState<Section[]>(() => defaultSections.map(make));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (base) {
      setTitle(base.name);
      setPeriod(base.period);
      setSections((templates[base.slug] ?? defaultSections).map(make));
    }
  }, [base]);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    const label = reportSectionTypes.find((t) => t.type === next[target].type)!.label;
    setAnnouncement(`${label} moved to position ${target + 1} of ${next.length}.`);
  }

  function add(type: ReportSectionType) {
    setSections((s) => [...s, make(type)]);
    setAnnouncement(`${reportSectionTypes.find((t) => t.type === type)!.label} added at the end.`);
  }

  async function save() {
    if (!title.trim()) {
      toast({ tone: "error", title: "Add a report title", body: "The title appears on the cover and in the library." });
      return;
    }
    if (sections.length === 0) {
      toast({ tone: "error", title: "Add at least one section" });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    track("report_created", { sections: sections.length });
    toast({ tone: "success", title: base ? "Report updated" : "Report created", body: `${title} (${sections.length} sections) was saved as a draft.` });
    router.push("/app/reports");
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <DemoTag>Draft</DemoTag>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{base ? `Edit: ${base.name}` : "New report"}</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Add sections, put them in order, then preview the finished report.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPreview(true)} icon={<Eye className="h-4 w-4" aria-hidden />}>Preview</Button>
          <Button onClick={save} loading={saving}>Save report</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] grid-cols-1">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-[1fr_200px] grid-cols-1">
            <Field label="Report title" htmlFor="report-title"><Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Period" htmlFor="report-period">
              <Select id="report-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {["June 2026", "April–June 2026", "Q2 2026", "FY26"].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <p className="sr-only" aria-live="polite">{announcement}</p>
          {sections.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="This report is empty" body="Add sections from the panel to start building." />
          ) : (
            <ol className="space-y-3" aria-label="Report sections">
              {sections.map((s, i) => {
                const meta = reportSectionTypes.find((t) => t.type === s.type)!;
                const Icon = icons[s.type];
                return (
                  <li key={s.id} className="rounded-panel border border-line bg-surface shadow-panel">
                    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                      <GripVertical className="h-4 w-4 text-ink-faint" aria-hidden />
                      <span className="tnum w-5 text-[12px] text-ink-faint">{i + 1}</span>
                      <Icon className="h-4 w-4 text-petrol-600" aria-hidden />
                      <h2 className="flex-1 text-[14px] font-semibold">{meta.label}</h2>
                      <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${meta.label} up`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Move ${meta.label} down`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSections((all) => all.filter((x) => x.id !== s.id)); setAnnouncement(`${meta.label} removed.`); }} aria-label={`Remove ${meta.label}`} className="hover:text-rust-700"><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </div>
                    <div className="p-4"><SectionPreview type={s.type} title={title} period={period} /></div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <aside aria-labelledby="add-sections" className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-panel border border-line bg-surface p-4">
            <h2 id="add-sections" className="text-[14px] font-semibold">Add a section</h2>
            <ul className="mt-3 space-y-1.5">
              {reportSectionTypes.map((t) => {
                const Icon = icons[t.type];
                return (
                  <li key={t.type}>
                    <button onClick={() => add(t.type)} className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left hover:border-line hover:bg-paper">
                      <Icon className="mt-0.5 h-4 w-4 text-petrol-600" aria-hidden />
                      <span className="flex-1">
                        <span className="block text-[13px] font-medium">{t.label}</span>
                        <span className="block text-[12px] text-ink-muted">{t.description}</span>
                      </span>
                      <Plus className="mt-0.5 h-4 w-4 text-ink-faint group-hover:text-petrol-600" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Report preview" description={`${sections.length} sections · ${period}`} size="lg" footer={<><Button variant="secondary" onClick={() => setPreview(false)}>Keep editing</Button><Button onClick={() => { setPreview(false); save(); }}>Save report</Button></>}>
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.id}>
              {s.type !== "cover" ? <h3 className="mb-2 font-display text-lg font-semibold">{reportSectionTypes.find((t) => t.type === s.type)!.label}</h3> : null}
              <SectionPreview type={s.type} title={title} period={period} />
            </section>
          ))}
          <p className="border-t border-line pt-3 text-[11px] text-ink-faint">Prepared by Visuioration</p>
        </div>
      </Modal>
    </>
  );
}
