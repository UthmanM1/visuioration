"use client";

import { Check, ChevronLeft, ChevronRight, Copy, Download, Link2, Presentation, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/site";
import { reportService } from "@/lib/services/reports";
import { Q2Report, reportPageTitles } from "./q2-report";

export function ShareDialog({ open, onClose, slug }: { open: boolean; onClose: () => void; slug: string }) {
  const toast = useToast();
  const [access, setAccess] = useState("Anyone with the link can view");
  const [copied, setCopied] = useState(false);
  const link = absoluteUrl("/share/q2-performance");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard may be unavailable; still show confirmation of the demo action */
    }
    setCopied(true);
    track("report_shared", { report: slug, method: "link" });
    toast({ tone: "success", title: "Link copied", body: "Anyone with the link can view this report." });
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Share report" description="Shared reports open without the workspace sidebar." footer={<Button variant="secondary" onClick={onClose}>Done</Button>}>
      <div className="space-y-5">
        <div>
          <label htmlFor="share-link" className="mb-1.5 block text-[13px] font-medium text-ink-soft">Report link</label>
          <div className="flex gap-2">
            <input id="share-link" readOnly value={link} className="h-10 min-w-0 flex-1 rounded-control border border-line-strong bg-paper px-3 text-[13px] text-ink-soft" onFocus={(e) => e.currentTarget.select()} />
            <Button onClick={copy} icon={copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}>{copied ? "Copied" : "Copy"}</Button>
          </div>
        </div>
        <Field label="Access" htmlFor="share-access">
          <Select id="share-access" value={access} onChange={(e) => setAccess(e.target.value)}>
            <option>Anyone with the link can view</option>
            <option>Only Northstar workspace members</option>
            <option>Only people invited</option>
          </Select>
        </Field>
        <a href="/share/q2-performance" target="_blank" rel="noreferrer" onClick={() => track("report_shared", { report: slug, method: "open" })} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-petrol-700 underline underline-offset-4">
          <Link2 className="h-3.5 w-3.5" aria-hidden />Open shared view
        </a>
        <p className="rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted">Demo: access settings are not enforced, and the shared page is public so reviewers can open it.</p>
      </div>
    </Modal>
  );
}

export function PresentationMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mounting a fresh body on each open starts the presentation at page 1.
  if (!open) return null;
  return <PresentationBody onClose={onClose} />;
}

function PresentationBody({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const total = reportPageTitles.length;
  const go = useCallback((delta: number) => setPage((p) => Math.min(total - 1, Math.max(0, p + delta))), [total]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [onClose, go]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Presentation mode" className="fixed inset-0 z-[85] flex flex-col bg-[#0B1012]">
      <div className="flex items-center justify-between px-4 py-3 text-white/70">
        <p className="text-[13px]"><span className="tnum">{page + 1} / {total}</span> · {reportPageTitles[page]}</p>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] hover:bg-white/10 hover:text-white" autoFocus>
          <X className="h-4 w-4" aria-hidden />Exit <kbd className="hidden text-white/40 sm:inline">Esc</kbd>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6 sm:px-6" aria-live="polite">
        <div key={page} className="animate-fade-in">
          <Q2Report only={page} />
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 pb-5">
        <Button variant="dark" onClick={() => go(-1)} disabled={page === 0} aria-label="Previous page" className="border border-night-line"><ChevronLeft className="h-4 w-4" aria-hidden /></Button>
        <div className="flex gap-1.5" aria-hidden>
          {reportPageTitles.map((t, i) => <span key={t} className={i === page ? "h-1.5 w-5 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/30"} />)}
        </div>
        <Button variant="dark" onClick={() => go(1)} disabled={page === total - 1} aria-label="Next page" className="border border-night-line"><ChevronRight className="h-4 w-4" aria-hidden /></Button>
      </div>
    </div>
  );
}

export function ReportToolbar({ slug, variant = "app" }: { slug: string; variant?: "app" | "share" }) {
  const toast = useToast();
  const [share, setShare] = useState(false);
  const [present, setPresent] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    await reportService.exportPdf(slug);
    setExporting(false);
    toast({ tone: "success", title: variant === "share" ? "Download ready" : "PDF export ready", body: "Demo export: your browser's print dialog opens so you can save as PDF." });
    window.setTimeout(() => window.print(), 300);
  }

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        {variant === "app" ? <Button variant="secondary" onClick={() => setShare(true)} icon={<Share2 className="h-4 w-4" aria-hidden />}>Share</Button> : (
          <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); } catch { /* ignore */ } track("report_shared", { report: slug, method: "share-page" }); toast({ tone: "success", title: "Link copied" }); }} icon={<Share2 className="h-4 w-4" aria-hidden />}>Share</Button>
        )}
        <Button variant="secondary" onClick={exportPdf} loading={exporting} icon={<Download className="h-4 w-4" aria-hidden />}>{exporting ? "Preparing…" : variant === "share" ? "Download" : "Export PDF"}</Button>
        <Button onClick={() => setPresent(true)} icon={<Presentation className="h-4 w-4" aria-hidden />}>{variant === "share" ? "Presentation mode" : "Present"}</Button>
      </div>
      <ShareDialog open={share} onClose={() => setShare(false)} slug={slug} />
      <PresentationMode open={present} onClose={() => setPresent(false)} />
    </>
  );
}
