"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText, Globe, Sheet as SheetIcon, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { track } from "@/lib/analytics";
import { completeDatasetUploadAction, startDatasetUploadAction } from "@/lib/actions/datasets";
import type { Dataset } from "@/lib/demo-data";
import { cn, formatBytes } from "@/lib/format";
import { uploadToSignedUrl } from "./upload-file";

const MAX_BYTES = 50 * 1024 * 1024;
type Source = "csv" | "excel" | "sheets" | "api";
type Stage = "choose" | "configure" | "uploading" | "processing" | "done" | "error";

const sources: Array<{ id: Source; label: string; body: string; icon: typeof FileText; available: boolean }> = [
  { id: "csv", label: "CSV", body: "Comma, semicolon or tab separated", icon: FileText, available: true },
  { id: "excel", label: "Excel", body: ".xlsx workbook, first sheet", icon: FileSpreadsheet, available: true },
  { id: "sheets", label: "Google Sheets", body: "Coming in a later update", icon: SheetIcon, available: false },
  { id: "api", label: "API", body: "Coming in a later update", icon: Globe, available: false },
];

function validate(file: File, source: Source): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (source === "csv" && !["csv", "tsv", "txt"].includes(ext)) return "Choose a .csv file, or switch to Excel for workbooks.";
  if (source === "excel" && ext === "xls") return "Older .xls workbooks aren't supported. Open it in Excel and save it as .xlsx.";
  if (source === "excel" && ext !== "xlsx") return "Choose an .xlsx workbook, or switch to CSV.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_BYTES) return `Files can be up to ${formatBytes(MAX_BYTES)}. This one is ${formatBytes(file.size)}.`;
  return null;
}

export function LiveImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (d: Dataset) => void }) {
  const [source, setSource] = useState<Source>("csv");
  const [stage, setStage] = useState<Stage>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Dataset | null>(null);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busy = stage === "uploading" || stage === "processing";

  function reset() {
    setStage("choose");
    setFile(null);
    setName("");
    setProgress(0);
    setError(null);
    setResult(null);
  }

  function close() {
    if (stage === "uploading") abortRef.current?.abort();
    if (stage === "processing") return; // Finishing on the server; closing now would hide the result.
    onClose();
    window.setTimeout(reset, 200);
  }

  function pick(next: File | null) {
    setError(null);
    if (!next) return setFile(null);
    const problem = validate(next, source);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0] ?? null);
  }

  async function start() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setStage("uploading");
    setProgress(0);
    track("dataset_import_started", { source });

    const started = await startDatasetUploadAction({ name, fileName: file.name, size: file.size });
    if (!started.ok) {
      setError(started.error);
      setStage("error");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await uploadToSignedUrl(started.data.uploadUrl, file, (fraction) => setProgress(Math.round(fraction * 100)), controller.signal);
    } catch (uploadError) {
      const cancelled = uploadError instanceof DOMException && uploadError.name === "AbortError";
      setError(cancelled ? "Upload cancelled." : "The upload didn't finish. Check your connection and try again.");
      setStage("error");
      return;
    }

    setStage("processing");
    const completed = await completeDatasetUploadAction({ datasetId: started.data.datasetId });
    if (!completed.ok) {
      setError(completed.error);
      setStage("error");
      return;
    }
    const dataset = completed.data;
    setResult(dataset);
    onImported(dataset);
    if (dataset.status === "Failed") {
      setError(dataset.errorMessage ?? "The file couldn't be read.");
      setStage("error");
      return;
    }
    track("dataset_import_completed", { source, rows: dataset.rows, columns: dataset.columns });
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
        <Button variant="secondary" onClick={() => { setStage("choose"); setFile(null); setError(null); }}>Back</Button>
        <Button onClick={start} disabled={!file}>Import dataset</Button>
      </>
    ) : stage === "uploading" ? (
      <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel upload</Button>
    ) : stage === "done" || stage === "error" ? (
      <>
        {stage === "error" ? <Button variant="secondary" onClick={() => { setStage("configure"); setError(null); setResult(null); }}>Try again</Button> : null}
        {stage === "done" && result ? <Link href={`/app/datasets/${result.slug}`} onClick={() => { onClose(); window.setTimeout(reset, 200); }} className="inline-flex h-10 items-center justify-center rounded-control border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-paper">Open dataset</Link> : null}
        <Button onClick={close}>{stage === "done" ? "Done" : "Close"}</Button>
      </>
    ) : null;

  const issues = result?.issues ?? [];

  return (
    <Modal open={open} onClose={close} title="Import dataset" description="Files are stored privately in this workspace and profiled automatically." footer={footer} size="lg">
      {stage === "choose" ? (
        <div role="radiogroup" aria-label="Data source" className="grid grid-cols-2 gap-3">
          {sources.map(({ id, label, body, icon: Icon, available }) => (
            <button
              key={id}
              role="radio"
              aria-checked={source === id}
              aria-disabled={!available}
              disabled={!available}
              onClick={() => setSource(id)}
              className={cn("rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55", source === id ? "border-petrol-600 bg-petrol-50" : "border-line-strong hover:border-ink-faint")}
            >
              <Icon className="h-5 w-5 text-petrol-600" aria-hidden />
              <p className="mt-3 font-semibold">{label}</p>
              <p className="text-[12px] text-ink-muted">{body}</p>
            </button>
          ))}
        </div>
      ) : null}
      {stage === "configure" ? (
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept={source === "csv" ? ".csv,.tsv,.txt,text/csv" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
              className="sr-only"
              id="import-file"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="import-file"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn("flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-petrol-500", error ? "border-rust-500" : dragging ? "border-petrol-500 bg-petrol-50" : "border-line-strong")}
            >
              <UploadCloud className="h-8 w-8 text-petrol-600" aria-hidden />
              <span className="mt-3 break-all font-medium">{file ? file.name : `Choose or drop a ${source === "csv" ? "CSV" : "Excel"} file`}</span>
              <span className="mt-1 text-[12px] text-ink-muted">{file ? formatBytes(file.size) : `Up to ${formatBytes(MAX_BYTES)}. The first row should contain column names.`}</span>
            </label>
          </div>
          <Field label="Dataset name" htmlFor="import-name" hint="Optional. Defaults to the file name.">
            <Input id="import-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 store sales" maxLength={160} />
          </Field>
          {error ? <p role="alert" className="text-[13px] text-rust-700">{error}</p> : null}
        </div>
      ) : null}
      {busy ? (
        <div className="py-6" role="status" aria-live="polite">
          <p className="font-medium">{stage === "uploading" ? (progress < 100 ? "Uploading file…" : "Finishing upload…") : "Detecting column types and profiling data…"}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={stage === "processing" ? undefined : progress} aria-valuemin={0} aria-valuemax={100} aria-label="Import progress">
            {stage === "processing" ? (
              <div className="skeleton h-full w-full" />
            ) : (
              <div className="h-full rounded-full bg-petrol-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            )}
          </div>
          <p className="tnum mt-2 text-[12px] text-ink-muted">{stage === "uploading" ? `${progress}% of ${file ? formatBytes(file.size) : ""}` : "Large files can take up to a minute. Keep this window open."}</p>
        </div>
      ) : null}
      {stage === "done" && result ? (
        <div className="py-4 text-center" role="status">
          {issues.length ? <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden /> : <CheckCircle2 className="mx-auto h-10 w-10 text-petrol-600" aria-hidden />}
          <p className="mt-3 text-lg font-semibold">{issues.length ? "Imported, with a few things to review" : "Dataset imported"}</p>
          <p className="tnum mt-1 text-[13px] text-ink-muted">
            {result.rows.toLocaleString("en-US")} rows and {result.columns.toLocaleString("en-US")} columns detected.
          </p>
          {issues.length ? (
            <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-[13px] text-amber-700">
              {issues.slice(0, 4).map((issue, i) => (
                <li key={i} className="flex gap-2"><span aria-hidden>•</span>{issue.message}</li>
              ))}
              {issues.length > 4 ? <li className="text-ink-muted">and {issues.length - 4} more on the dataset page.</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
      {stage === "error" ? (
        <div className="py-4 text-center" role="alert">
          <p className="text-lg font-semibold">{result ? "The file couldn't be processed" : "Import didn't finish"}</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-muted">{error}</p>
        </div>
      ) : null}
    </Modal>
  );
}
