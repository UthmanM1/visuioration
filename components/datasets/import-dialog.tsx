"use client";

import { CheckCircle2, FileSpreadsheet, FileText, Globe, Sheet as SheetIcon, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/format";
import type { Dataset } from "@/lib/demo-data";
import { LiveImportDialog } from "./live-import-dialog";
import { simulateDemoImport } from "@/lib/services/import-source";
import type { ImportSource } from "@/lib/services/import-source";

const sources: Array<{ id: ImportSource; label: string; body: string; icon: typeof FileText }> = [
  { id: "csv", label: "CSV", body: "Comma-separated file", icon: FileText },
  { id: "excel", label: "Excel", body: ".xlsx workbook", icon: FileSpreadsheet },
  { id: "sheets", label: "Google Sheets", body: "Demo connection", icon: SheetIcon },
  { id: "api", label: "API", body: "REST endpoint", icon: Globe },
];

type Stage = "choose" | "configure" | "processing" | "done" | "error";

export function ImportDialog({ open, onClose, onImported, live = false }: { open: boolean; onClose: () => void; onImported: (d: Dataset) => void; live?: boolean }) {
  const [source, setSource] = useState<ImportSource>("csv");
  const [stage, setStage] = useState<Stage>("choose");
  const [fileName, setFileName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStage("choose");
    setFileName(null);
    setName("");
    setEndpoint("");
    setProgress(0);
    setError(null);
  }

  function close() {
    onClose();
    window.setTimeout(reset, 200);
  }

  async function start() {
    if ((source === "csv" || source === "excel") && !fileName) {
      setError("Choose a file, or use the sample file.");
      return;
    }
    if ((source === "sheets" || source === "api") && !/^https?:\/\//.test(endpoint)) {
      setError("Enter a URL starting with https://");
      return;
    }
    if (endpoint.includes("fail")) {
      setStage("error");
      return;
    }
    setError(null);
    setStage("processing");
    track("dataset_import_started", { source });
    for (const p of [18, 42, 67, 88, 100]) {
      await new Promise((r) => setTimeout(r, 320));
      setProgress(p);
    }
    const dataset = await simulateDemoImport({ name: name.trim() || (fileName ? fileName.replace(/\.[^.]+$/, "") : "Imported dataset"), source, fileName: fileName ?? undefined });
    track("dataset_import_completed", { source });
    onImported(dataset);
    setStage("done");
  }

  const footer =
    stage === "choose" ? (
      <>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button onClick={() => setStage("configure")}>Continue</Button>
      </>
    ) : stage === "configure" ? (
      <>
        <Button variant="secondary" onClick={() => setStage("choose")}>Back</Button>
        <Button onClick={start}>Import dataset</Button>
      </>
    ) : stage === "done" || stage === "error" ? (
      <>
        {stage === "error" ? <Button variant="secondary" onClick={() => setStage("configure")}>Try again</Button> : null}
        <Button onClick={close}>{stage === "done" ? "Done" : "Close"}</Button>
      </>
    ) : null;

  if (live) return <LiveImportDialog open={open} onClose={onClose} onImported={onImported} />;

  return (
    <Modal open={open} onClose={close} title="Import dataset" description="Demo import. Files are read by name only and never uploaded." footer={footer} size="lg">
      {stage === "choose" ? (
        <div role="radiogroup" aria-label="Data source" className="grid grid-cols-2 gap-3">
          {sources.map(({ id, label, body, icon: Icon }) => (
            <button key={id} role="radio" aria-checked={source === id} onClick={() => setSource(id)} className={cn("rounded-xl border p-4 text-left transition-colors", source === id ? "border-petrol-600 bg-petrol-50" : "border-line-strong hover:border-ink-faint")}>
              <Icon className="h-5 w-5 text-petrol-600" aria-hidden />
              <p className="mt-3 font-semibold">{label}</p>
              <p className="text-[12px] text-ink-muted">{body}</p>
            </button>
          ))}
        </div>
      ) : null}
      {stage === "configure" ? (
        <div className="space-y-4">
          {source === "csv" || source === "excel" ? (
            <div>
              <input ref={fileRef} type="file" accept={source === "csv" ? ".csv" : ".xlsx,.xls"} className="sr-only" id="import-file" onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? null); setError(null); }} />
              <label htmlFor="import-file" className={cn("flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-petrol-500", error ? "border-rust-500" : "border-line-strong")}>
                <UploadCloud className="h-8 w-8 text-petrol-600" aria-hidden />
                <span className="mt-3 font-medium">{fileName ?? `Choose a ${source === "csv" ? "CSV" : "Excel"} file`}</span>
                <span className="mt-1 text-[12px] text-ink-muted">Up to 250 MB in production. Only the file name is used here.</span>
              </label>
              <button type="button" onClick={() => { setFileName(source === "csv" ? "q3-store-sales.csv" : "q3-store-sales.xlsx"); setError(null); }} className="mt-2 text-[13px] font-medium text-petrol-700 underline underline-offset-4">Use sample file</button>
            </div>
          ) : (
            <Field label={source === "sheets" ? "Sheet URL" : "API endpoint"} htmlFor="import-url" hint="Demo only. Include the word “fail” to preview the error state.">
              <Input id="import-url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://" />
            </Field>
          )}
          <Field label="Dataset name" htmlFor="import-name" hint="Optional. Defaults to the file name.">
            <Input id="import-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 store sales" />
          </Field>
          {error ? <p role="alert" className="text-[13px] text-rust-700">{error}</p> : null}
        </div>
      ) : null}
      {stage === "processing" ? (
        <div className="py-6" role="status" aria-live="polite">
          <p className="font-medium">{progress < 45 ? "Reading file…" : progress < 90 ? "Detecting column types…" : "Profiling data…"}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Import progress">
            <div className="h-full rounded-full bg-petrol-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="tnum mt-2 text-[12px] text-ink-muted">{progress}%</p>
        </div>
      ) : null}
      {stage === "done" ? (
        <div className="py-4 text-center" role="status">
          <CheckCircle2 className="mx-auto h-10 w-10 text-petrol-600" aria-hidden />
          <p className="mt-3 text-lg font-semibold">Dataset imported</p>
          <p className="mt-1 text-[13px] text-ink-muted">2,400 rows and 12 columns detected. 3 columns have missing values; review them before building charts.</p>
        </div>
      ) : null}
      {stage === "error" ? (
        <div className="py-4 text-center" role="alert">
          <p className="text-lg font-semibold">Connection failed</p>
          <p className="mt-1 text-[13px] text-ink-muted">The endpoint returned an authentication error (401). Check the URL and credentials, then try again.</p>
        </div>
      ) : null}
    </Modal>
  );
}
