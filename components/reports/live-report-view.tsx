"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { sectionTitle } from "@/lib/reports/sections";
import type { RenderedReport, RenderedSection } from "@/lib/reports/sections";
import { toQueryResult } from "@/lib/visualizations/definition";

/** Groups sections into pages: the cover alone, then each content section on its own page. */
export function reportPages(report: RenderedReport) {
  return report.sections.map((section) => ({ section, title: sectionTitle(section) }));
}

function Page({ index, total, footer, cover, title, children }: { index: number; total: number; footer: string; cover?: boolean; title: string; children: ReactNode }) {
  return (
    <section aria-label={`Page ${index + 1}: ${title}`} className={cn("print-page relative mx-auto flex w-full max-w-[860px] flex-col rounded-lg border px-6 py-8 shadow-lift sm:px-14 sm:py-14", cover ? "border-night bg-night text-white sm:min-h-[900px]" : "border-line bg-surface")}>
      <div className="flex-1">{children}</div>
      <footer className={cn("mt-10 flex items-center justify-between border-t pt-4 text-[11px]", cover ? "border-night-line text-white/50" : "border-line text-ink-faint")}>
        <span>{footer}</span>
        <span className="tnum">Page {index + 1} of {total}</span>
      </footer>
    </section>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.025em] sm:text-[1.9rem]">{children}</h2>;
}

function Problem({ text }: { text: string }) {
  return (
    <p className="mt-4 flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-[13px] text-ink-muted">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
      {text}
    </p>
  );
}

function SectionBody({ section, report }: { section: RenderedSection; report: RenderedReport }) {
  switch (section.type) {
    case "cover":
      return (
        <div className="flex h-full min-h-[380px] flex-col justify-between sm:min-h-[760px]">
          <div className="flex items-center gap-3">
            <LogoMark inverted className="h-8 w-8" />
            <span className="text-sm text-white/60">{report.workspaceName}</span>
          </div>
          <div>
            <h1 className="font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[4rem]">{report.name}</h1>
            {report.period ? <p className="mt-4 text-xl text-white/75">{report.period}</p> : null}
            {section.subtitle || report.description ? <p className="mt-3 max-w-xl text-white/60">{section.subtitle || report.description}</p> : null}
          </div>
          <p className="text-sm text-white/50">Prepared by {report.preparedBy}</p>
        </div>
      );
    case "text":
      return (
        <>
          {section.heading ? <Heading>{section.heading}</Heading> : null}
          <div className="mt-3 max-w-[64ch] space-y-3 text-[15px] leading-relaxed text-ink-soft">
            {section.body.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
          </div>
        </>
      );
    case "list":
      return (
        <>
          {section.heading ? <Heading>{section.heading}</Heading> : null}
          <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-ink-soft">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-2.5"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-600" aria-hidden />{item}</li>
            ))}
          </ul>
        </>
      );
    case "kpis":
      return (
        <>
          {section.heading ? <Heading>{section.heading}</Heading> : null}
          <dl className={cn("mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line", section.items.length > 1 && "sm:grid-cols-2", section.items.length > 2 && "lg:grid-cols-4")}>
            {section.items.map((item, i) => (
              <div key={i} className="bg-surface p-4">
                <dt className="text-[12px] text-ink-muted">{item.label}</dt>
                <dd className="tnum mt-1 text-2xl font-semibold tracking-[-0.02em]">{item.value ?? "—"}</dd>
                <dd className="mt-1 text-[11px] text-ink-faint">{item.error ?? item.detail}</dd>
              </div>
            ))}
          </dl>
        </>
      );
    case "chart":
      return (
        <>
          {section.heading ? <Heading>{section.heading}</Heading> : null}
          {section.chart ? (
            <figure className="mt-6">
              <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">
                {section.chart.title}
                {section.chart.datasetName ? <span className="font-normal text-ink-faint"> · {section.chart.datasetName} · {section.chart.data.matched.toLocaleString("en-US")} rows</span> : null}
              </figcaption>
              <ChartRenderer kind={section.chart.kind} result={toQueryResult(section.chart.data, section.chart.kind)} height={section.chart.kind === "kpi" ? 160 : 280} title={section.chart.title} />
            </figure>
          ) : (
            <Problem text={section.error ?? "This chart isn't available."} />
          )}
          {section.commentary ? <p className="mt-5 max-w-[64ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{section.commentary}</p> : null}
        </>
      );
    case "appendix":
      return (
        <>
          {section.heading ? <Heading>{section.heading}</Heading> : null}
          {section.body ? <p className="mt-3 max-w-[64ch] whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{section.body}</p> : null}
          {section.sources.length ? (
            <>
              <h3 className="mt-6 text-[13px] font-semibold">Data sources</h3>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-muted">
                {section.sources.map((s) => <li key={s.name}>{s.name}: up to {s.rows.toLocaleString("en-US")} rows used</li>)}
              </ul>
            </>
          ) : null}
          <p className="mt-6 text-[12px] text-ink-faint">Generated {new Date(report.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.</p>
        </>
      );
  }
}

export function LiveReportView({ report, only }: { report: RenderedReport; only?: number }) {
  const pages = reportPages(report);
  const footer = `Prepared by Visuioration · ${report.workspaceName}`;
  const render = (i: number) => (
    <Page key={pages[i].section.id} index={i} total={pages.length} footer={footer} cover={pages[i].section.type === "cover"} title={pages[i].title}>
      <SectionBody section={pages[i].section} report={report} />
    </Page>
  );
  if (only !== undefined) return pages[only] ? render(only) : null;
  if (pages.length === 0) return <p className="text-center text-ink-muted">This report has no sections yet.</p>;
  return <div className="space-y-6">{pages.map((_, i) => render(i))}</div>;
}

export function LivePresentation({ report, open, onClose }: { report: RenderedReport; open: boolean; onClose: () => void }) {
  // Mounting a fresh body on each open starts the presentation at page 1.
  if (!open || report.sections.length === 0) return null;
  return <LivePresentationBody report={report} onClose={onClose} />;
}

function LivePresentationBody({ report, onClose }: { report: RenderedReport; onClose: () => void }) {
  const pages = reportPages(report);
  const [page, setPage] = useState(0);
  const go = useCallback((delta: number) => setPage((p) => Math.min(pages.length - 1, Math.max(0, p + delta))), [pages.length]);
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [onClose, go]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Presentation mode" className="fixed inset-0 z-[85] flex flex-col bg-[#0B1012]">
      <div className="flex items-center justify-between px-4 py-3 text-white/70">
        <p className="text-[13px]"><span className="tnum">{page + 1} / {pages.length}</span> · {pages[page].title}</p>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] hover:bg-white/10 hover:text-white" autoFocus>
          <X className="h-4 w-4" aria-hidden />Exit <kbd className="hidden text-white/40 sm:inline">Esc</kbd>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6 sm:px-6" aria-live="polite">
        <div key={page} className="animate-fade-in"><LiveReportView report={report} only={page} /></div>
      </div>
      <div className="flex items-center justify-center gap-3 pb-5">
        <Button variant="dark" onClick={() => go(-1)} disabled={page === 0} aria-label="Previous page" className="border border-night-line"><ChevronLeft className="h-4 w-4" aria-hidden /></Button>
        <div className="flex gap-1.5" aria-hidden>
          {pages.map((p, i) => <span key={p.section.id} className={i === page ? "h-1.5 w-5 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/30"} />)}
        </div>
        <Button variant="dark" onClick={() => go(1)} disabled={page === pages.length - 1} aria-label="Next page" className="border border-night-line"><ChevronRight className="h-4 w-4" aria-hidden /></Button>
      </div>
    </div>
  );
}
