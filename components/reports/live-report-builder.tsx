"use client";

import { ArrowDown, ArrowUp, BarChart3, FileText, GripVertical, Hash, Lightbulb, ListChecks, Paperclip, Plus, Trash2, Type, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAppSession } from "@/components/app/session-context";
import { DemoTag } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { saveReportAction } from "@/lib/actions/reports";
import type { ChartKind } from "@/lib/demo-data";
import { LIMITS, sectionPalette } from "@/lib/reports/sections";
import type { StoredSection } from "@/lib/reports/sections";

export interface BuilderChart {
  id: string;
  name: string;
  kind: ChartKind;
  datasetName: string | null;
}

const icons: Record<StoredSection["type"], typeof FileText> = { cover: FileText, text: Type, kpis: Hash, chart: BarChart3, list: ListChecks, appendix: Paperclip };
const paletteIcons: Record<string, typeof FileText> = { cover: FileText, summary: Type, kpis: Hash, chart: BarChart3, insights: Lightbulb, recommendations: ListChecks, text: Type, appendix: Paperclip };

function label(section: StoredSection, charts: BuilderChart[] = []) {
  switch (section.type) {
    case "cover":
      return "Cover";
    case "chart":
      return section.heading || charts.find((c) => c.id === section.visualizationId)?.name || "Chart section";
    case "kpis":
      return section.heading || "KPI section";
    default:
      return section.heading || (section.type === "list" ? "List" : section.type === "appendix" ? "Appendix" : "Text");
  }
}

function ChartSelect({ id, value, charts, onChange, exclude = [] }: { id: string; value: string; charts: BuilderChart[]; onChange: (id: string) => void; exclude?: string[] }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a saved chart…</option>
      {charts.filter((c) => c.id === value || !exclude.includes(c.id)).map((c) => (
        <option key={c.id} value={c.id}>{c.name} ({c.kind}{c.datasetName ? ` · ${c.datasetName}` : ""})</option>
      ))}
    </Select>
  );
}

function SectionEditor({ section, charts, onChange }: { section: StoredSection; charts: BuilderChart[]; onChange: (s: StoredSection) => void }) {
  const hid = `h-${section.id}`;
  const heading = section.type !== "cover" ? (
    <Field label="Heading" htmlFor={hid}>
      <Input id={hid} value={section.heading} maxLength={LIMITS.heading} onChange={(e) => onChange({ ...section, heading: e.target.value } as StoredSection)} placeholder={section.type === "chart" ? "Optional; the chart title is shown anyway" : ""} />
    </Field>
  ) : null;
  switch (section.type) {
    case "cover":
      return (
        <Field label="Subtitle" htmlFor={`sub-${section.id}`} hint="Shown under the title and period. The report description is used if left empty.">
          <Input id={`sub-${section.id}`} value={section.subtitle} maxLength={LIMITS.subtitle} onChange={(e) => onChange({ ...section, subtitle: e.target.value })} />
        </Field>
      );
    case "text":
      return (
        <div className="space-y-3">
          {heading}
          <Field label="Text" htmlFor={`b-${section.id}`} hint="Leave a blank line between paragraphs.">
            <Textarea id={`b-${section.id}`} value={section.body} maxLength={LIMITS.body} onChange={(e) => onChange({ ...section, body: e.target.value })} className="min-h-[120px]" />
          </Field>
        </div>
      );
    case "list":
      return (
        <div className="space-y-3">
          {heading}
          <Field label="Items" htmlFor={`i-${section.id}`} hint={`One per line, up to ${LIMITS.items}.`}>
            <Textarea id={`i-${section.id}`} value={section.items.join("\n")} onChange={(e) => onChange({ ...section, items: e.target.value.split("\n").slice(0, LIMITS.items) })} className="min-h-[110px]" />
          </Field>
        </div>
      );
    case "appendix":
      return (
        <div className="space-y-3">
          {heading}
          <Field label="Notes" htmlFor={`n-${section.id}`} hint="Data sources used by the report's charts are listed automatically.">
            <Textarea id={`n-${section.id}`} value={section.body} maxLength={LIMITS.body} onChange={(e) => onChange({ ...section, body: e.target.value })} />
          </Field>
        </div>
      );
    case "chart":
      return (
        <div className="space-y-3">
          {heading}
          <Field label="Chart" htmlFor={`c-${section.id}`}>
            <ChartSelect id={`c-${section.id}`} value={section.visualizationId} charts={charts} onChange={(v) => onChange({ ...section, visualizationId: v })} />
          </Field>
          <Field label="Commentary" htmlFor={`m-${section.id}`} hint="What should readers take from this chart?">
            <Textarea id={`m-${section.id}`} value={section.commentary} maxLength={LIMITS.body} onChange={(e) => onChange({ ...section, commentary: e.target.value })} />
          </Field>
        </div>
      );
    case "kpis":
      return (
        <div className="space-y-3">
          {heading}
          <fieldset className="space-y-2">
            <legend className="mb-1 text-[13px] font-medium text-ink-soft">Headline numbers</legend>
            <p className="text-[12px] text-ink-muted">Each chart is shown as a single total for its filters and date range.</p>
            {section.visualizationIds.map((vid, i) => (
              <div key={`${vid}-${i}`} className="flex gap-2">
                <label className="sr-only" htmlFor={`k-${section.id}-${i}`}>Headline number {i + 1}</label>
                <ChartSelect id={`k-${section.id}-${i}`} value={vid} charts={charts} exclude={section.visualizationIds} onChange={(v) => onChange({ ...section, visualizationIds: section.visualizationIds.map((x, j) => (j === i ? v : x)) })} />
                <Button variant="ghost" size="icon" onClick={() => onChange({ ...section, visualizationIds: section.visualizationIds.filter((_, j) => j !== i) })} aria-label={`Remove headline number ${i + 1}`}><X className="h-4 w-4" aria-hidden /></Button>
              </div>
            ))}
            {section.visualizationIds.length < LIMITS.kpis ? (
              <Button variant="secondary" size="sm" onClick={() => onChange({ ...section, visualizationIds: [...section.visualizationIds, ""] })} icon={<Plus className="h-3.5 w-3.5" aria-hidden />}>Add number</Button>
            ) : null}
          </fieldset>
        </div>
      );
  }
}

export function LiveReportBuilder({ charts, initial }: { charts: BuilderChart[]; initial: { id: string; name: string; description: string; period: string; sections: StoredSection[] } | null }) {
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useAppSession();
  const [name, setName] = useState(initial?.name ?? "");
  const [period, setPeriod] = useState(initial?.period ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sections, setSections] = useState<StoredSection[]>(() => initial?.sections ?? ["cover", "summary", "kpis", "chart", "recommendations"].map((k) => sectionPalette.find((p) => p.key === k)!.create()));
  const [saving, setSaving] = useState<null | "stay" | "view">(null);
  const [announcement, setAnnouncement] = useState("");
  const snapshot = useMemo(() => JSON.stringify({ name: initial?.name ?? "", period: initial?.period ?? "", description: initial?.description ?? "", sections: initial?.sections ?? null }), [initial]);
  const [savedState, setSavedState] = useState(snapshot);
  const dirty = JSON.stringify({ name, period, description, sections }) !== savedState;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(index: number, next: StoredSection) {
    setSections((all) => all.map((s, i) => (i === index ? next : s)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    setAnnouncement(`${label(next[target], charts)} moved to position ${target + 1} of ${next.length}.`);
  }

  function add(key: string) {
    if (sections.length >= LIMITS.sections) return toast({ tone: "error", title: `Reports can have up to ${LIMITS.sections} sections` });
    const section = sectionPalette.find((p) => p.key === key)!.create();
    setSections((s) => [...s, section]);
    setAnnouncement(`${label(section)} added at the end.`);
  }

  async function save(mode: "stay" | "view") {
    if (!name.trim()) return toast({ tone: "error", title: "Add a report title", body: "It appears on the cover and in the library." });
    if (sections.length === 0) return toast({ tone: "error", title: "Add at least one section" });
    const cleaned = sections
      .map((s) => (s.type === "kpis" ? { ...s, visualizationIds: s.visualizationIds.filter(Boolean) } : s.type === "list" ? { ...s, items: s.items.map((x) => x.trim()).filter(Boolean) } : s));
    const missing = cleaned.findIndex((s) => s.type === "chart" && !s.visualizationId);
    if (missing >= 0) return toast({ tone: "error", title: `Choose a chart for section ${missing + 1}`, body: "Or remove the empty chart section." });
    setSaving(mode);
    const result = await saveReportAction({ id: initial?.id, name, description, period, sections: cleaned });
    setSaving(null);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't save the report", body: result.error });
    setSavedState(JSON.stringify({ name, period, description, sections }));
    if (!initial) track("report_created", { sections: cleaned.length });
    toast({ tone: "success", title: initial ? "Report saved" : "Report created", body: `${name} (${cleaned.length} sections).` });
    if (mode === "view") router.push(`/app/reports/${result.data.slug}`);
    else router.replace(`/app/reports/new?id=${result.data.id}`, { scroll: false });
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <DemoTag>{initial ? "Saved report" : "Draft"}</DemoTag>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{initial ? `Edit: ${initial.name}` : "New report"}</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Add sections, put them in order, then view the finished report.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => save("stay")} loading={saving === "stay"} disabled={!canEdit}>Save</Button>
          <Button onClick={() => save("view")} loading={saving === "view"} disabled={!canEdit}>Save and view</Button>
        </div>
      </div>

      {charts.length === 0 ? (
        <p className="mb-4 rounded-md bg-amber-100/60 px-4 py-3 text-[13px] text-amber-700">You don&apos;t have any saved charts yet. Text sections work now; <a href="/app/visualizations/new" className="font-medium underline underline-offset-2">create a chart</a> to add chart and KPI sections.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-panel border border-line bg-surface p-4 sm:grid-cols-[1fr_200px]">
            <Field label="Report title" htmlFor="report-title"><Input id="report-title" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></Field>
            <Field label="Period" htmlFor="report-period">
              <Input id="report-period" value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={80} list="period-options" placeholder="Q3 2026" />
              <datalist id="period-options">{["This month", "Last month", "Q3 2026", "Q4 2026", "FY 2026", "July–September 2026"].map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="Description" htmlFor="report-description" className="sm:col-span-2"><Input id="report-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Who is this for?" /></Field>
          </div>
          <p className="sr-only" aria-live="polite">{announcement}</p>
          {sections.length === 0 ? (
            <EmptyState icon={<FileText className="h-5 w-5" />} title="This report is empty" body="Add sections from the panel to start building." />
          ) : (
            <ol className="space-y-3" aria-label="Report sections">
              {sections.map((s, i) => {
                const Icon = icons[s.type];
                const title = label(s, charts);
                const named = `section ${i + 1} (${title})`;
                return (
                  <li key={s.id} className="rounded-panel border border-line bg-surface shadow-panel">
                    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                      <GripVertical className="h-4 w-4 text-ink-faint" aria-hidden />
                      <span className="tnum w-5 text-[12px] text-ink-faint">{i + 1}</span>
                      <Icon className="h-4 w-4 text-petrol-600" aria-hidden />
                      <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{title}</h2>
                      <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${named} up`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
                      <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={`Move ${named} down`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSections((all) => all.filter((x) => x.id !== s.id)); setAnnouncement(`${title} removed.`); }} aria-label={`Remove ${named}`} className="hover:text-rust-700"><Trash2 className="h-4 w-4" aria-hidden /></Button>
                    </div>
                    <div className="p-4"><SectionEditor section={s} charts={charts} onChange={(next) => update(i, next)} /></div>
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
              {sectionPalette.map((t) => {
                const Icon = paletteIcons[t.key] ?? FileText;
                return (
                  <li key={t.key}>
                    <button onClick={() => add(t.key)} className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left hover:border-line hover:bg-paper">
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
          {initial ? <ButtonLink href={`/app/reports`} variant="ghost" className="mt-3 w-full">Back to reports</ButtonLink> : null}
        </aside>
      </div>
    </>
  );
}
