import "server-only";
import { datasets as demoDatasets } from "../demo-data";
import type { Dataset } from "../demo-data/types";
import { DatasetParseError, forEachNormalizedBatch, profileRows } from "../datasets/profile";
import type { DatasetProfile, RowSource } from "../datasets/profile";
import type { DatasetField, QueryableDataset } from "../visualizations/definition";
import { typeLabels } from "../datasets/table-data";
import type { DatasetTableData, TableColumn, TableRow } from "../datasets/table-data";
import { formatBytes, formatNumber, formatRelative, slugify } from "../format";
import { appMode } from "../supabase/config";
import type { ColumnDataType, DatasetColumnRow, DatasetRow, DatasetSource, DatasetStatus, Json } from "../supabase/database.types";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseServerClient } from "../supabase/server";
import { demoResolve } from "./client";
import { fromDbError, ServiceError } from "./errors";
import { loadPeople } from "./people";

export type { ImportSource } from "./import-source";

export const DATASET_BUCKET = "datasets";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PREVIEW_ROWS = 200;
/** Rows beyond this are profiled but not loaded for charts. */
export const MAX_QUERY_ROWS = 1_000_000;
const ROW_BATCH = 4000;
/** Uploads that never finished (tab closed mid-upload) are shown as failed after this long. */
const STALE_UPLOAD_MS = 60 * 60 * 1000;

const sourceLabels: Record<DatasetSource, Dataset["source"]> = {
  csv: "CSV upload",
  excel: "Excel",
  google_sheets: "Google Sheets",
  api: "REST API",
};

const statusLabels: Record<DatasetStatus, Dataset["status"]> = {
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  needs_review: "Needs review",
  failed: "Failed",
};

/**
 * Retries a write once when the connection dropped before a response arrived (for example a keep-alive socket
 * closed while a large file was being parsed). Only used for writes that are safe to repeat.
 */
async function retryOnNetworkError<T extends { error: { message: string } | null }>(write: () => PromiseLike<T>): Promise<T> {
  const first = await write();
  if (first.error && /fetch failed|network|ECONNRESET|socket/i.test(first.error.message)) return write();
  return first;
}

function isStale(row: DatasetRow) {
  return (row.status === "uploading" || row.status === "processing") && Date.now() - new Date(row.updated_at).getTime() > STALE_UPLOAD_MS;
}

function toUiDataset(row: DatasetRow, ownerName?: string): Dataset {
  const stale = isStale(row);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    rows: row.row_count ?? 0,
    columns: row.column_count ?? 0,
    source: sourceLabels[row.source],
    updated: formatRelative(row.updated_at),
    status: stale ? "Failed" : statusLabels[row.status],
    sizeLabel: row.size_bytes ? formatBytes(row.size_bytes) : "—",
    owner: row.created_by ?? "",
    ownerName,
    fileName: row.file_name,
    errorMessage: stale ? "The upload didn't finish. Delete this dataset and import the file again." : row.error_message,
    issues: Array.isArray(row.issues) ? (row.issues as unknown as Dataset["issues"]) : [],
    chartReady: Boolean(row.rows_loaded_at),
  };
}

async function readSource(supabase: SupabaseServerClient, row: DatasetRow): Promise<RowSource | { error: string }> {
  if (!row.storage_path) return { error: "This dataset has no stored file." };
  const { data: blob, error } = await supabase.storage.from(DATASET_BUCKET).download(row.storage_path);
  if (error || !blob) {
    console.error("[storage] download", error?.message);
    return { error: "The uploaded file couldn't be found. Delete this dataset and import the file again." };
  }
  if (blob.size > MAX_UPLOAD_BYTES) return { error: `Files can be up to ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  return row.source === "excel" ? { kind: "xlsx", data: await blob.arrayBuffer() } : { kind: "csv", text: await blob.text() };
}

/**
 * Writes every data row (converted to its column type) into dataset_rows so charts can aggregate the full
 * dataset in the database. Replaces any rows from an earlier attempt. Returns the number of rows loaded.
 */
async function loadRows(supabase: SupabaseServerClient, row: DatasetRow, source: RowSource, types: ColumnDataType[]) {
  const { error: clearError } = await supabase.from("dataset_rows").delete().eq("dataset_id", row.id);
  if (clearError) throw fromDbError(clearError, "Previous chart data couldn't be cleared.");
  const loaded = await forEachNormalizedBatch(
    source,
    types,
    ROW_BATCH,
    async (rows, first) => {
      const payload = rows.map((cells, i) => ({ dataset_id: row.id, workspace_id: row.workspace_id, row_number: first + i, cells: cells as unknown as Json }));
      // "Insert or skip" keyed on (dataset, row number): safe to retry after a dropped connection.
      const { error } = await retryOnNetworkError(() => supabase.from("dataset_rows").upsert(payload, { onConflict: "dataset_id,row_number", ignoreDuplicates: true }));
      if (error) throw fromDbError(error, "Rows couldn't be saved for charts.");
    },
    MAX_QUERY_ROWS,
  );
  const { error } = await retryOnNetworkError(() => supabase.from("datasets").update({ rows_loaded_at: new Date().toISOString(), query_row_count: loaded }).eq("id", row.id));
  if (error) throw fromDbError(error);
  return loaded;
}

function detectSource(fileName: string): "csv" | "excel" | null {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "csv" || ext === "tsv" || ext === "txt") return "csv";
  if (ext === "xlsx") return "excel";
  return null;
}

/** Keeps the original name readable while making it safe as a storage key. */
function storageFileName(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const base = slugify(dot > 0 ? fileName.slice(0, dot) : fileName) || "file";
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return ext ? `${base}.${ext}` : base;
}

async function uniqueDatasetSlug(supabase: SupabaseServerClient, workspaceId: string, name: string) {
  const base = slugify(name);
  const { data } = await supabase.from("datasets").select("slug").eq("workspace_id", workspaceId).like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function formatShare(part: number, whole: number) {
  if (whole === 0 || part === 0) return "0%";
  const pct = (part / whole) * 100;
  return pct < 0.1 ? "<0.1%" : `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

/** Builds the preview table: text columns with few distinct values become filters. */
function toTableData(dataset: DatasetRow, columns: DatasetColumnRow[], previewRows: unknown[][]): DatasetTableData {
  const tableColumns: TableColumn[] = columns.map((c) => ({
    key: `c${c.position}`,
    label: c.name,
    type: typeLabels[c.data_type],
    kind: c.data_type,
    nulls: formatShare(c.null_count, dataset.row_count ?? 0),
    distinct: c.distinct_capped ? `More than ${formatNumber(c.distinct_count - 1)}` : formatNumber(c.distinct_count),
    min: c.min_value,
    max: c.max_value,
    samples: Array.isArray(c.sample_values) ? (c.sample_values as string[]) : [],
  }));
  const rows: TableRow[] = previewRows.map((cells) => Object.fromEntries(tableColumns.map((c, i) => [c.key, (cells[i] ?? null) as TableRow[string]])));
  const filterKeys = columns
    .filter((c) => (c.data_type === "text" || c.data_type === "boolean") && !c.distinct_capped && c.distinct_count >= 2 && c.distinct_count <= 12)
    .slice(0, 4)
    .map((c) => `c${c.position}`);
  const searchKeys = columns.filter((c) => c.data_type === "text" || c.data_type === "date").map((c) => `c${c.position}`);
  return {
    columns: tableColumns,
    rows,
    totalRows: dataset.row_count ?? rows.length,
    filterKeys,
    searchKeys: searchKeys.length ? searchKeys : tableColumns.map((c) => c.key),
    rowKey: null,
    defaultSort: null,
  };
}

export interface DatasetDetail {
  dataset: Dataset;
  table: DatasetTableData | null;
}

export const datasetService = {
  async list(workspaceId: string): Promise<Dataset[]> {
    if (appMode === "demo") return demoResolve(demoDatasets, 0);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("datasets").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
    if (error) throw fromDbError(error, "Datasets could not be loaded.");
    const people = await loadPeople(supabase, (data ?? []).map((d) => d.created_by));
    return (data ?? []).map((row) => toUiDataset(row, row.created_by ? people.get(row.created_by)?.name : undefined));
  },

  /** Dataset with its column profile and stored preview rows. Demo mode uses the Northstar sample page instead. */
  async getDetail(workspaceId: string, slug: string): Promise<DatasetDetail | null> {
    if (appMode === "demo") return null;
    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase.from("datasets").select("*").eq("workspace_id", workspaceId).eq("slug", slug).maybeSingle();
    if (error) throw fromDbError(error, "The dataset could not be loaded.");
    if (!row) return null;
    const [{ data: columns }, { data: preview }, people] = await Promise.all([
      supabase.from("dataset_columns").select("*").eq("dataset_id", row.id).order("position"),
      supabase.from("dataset_previews").select("rows").eq("dataset_id", row.id).maybeSingle(),
      loadPeople(supabase, [row.created_by]),
    ]);
    const dataset = toUiDataset(row, row.created_by ? people.get(row.created_by)?.name : undefined);
    const ready = row.status === "ready" || row.status === "needs_review";
    return {
      dataset,
      table: ready && columns ? toTableData(row, columns, Array.isArray(preview?.rows) ? (preview.rows as unknown[][]) : []) : null,
    };
  },

  /**
   * Step 1 of an upload: validates the file details, creates the dataset record and returns a signed URL
   * the browser uploads to directly. The file never passes through this server on the way in.
   */
  async startUpload(workspaceId: string, input: { name: string; fileName: string; size: number }) {
    const source = detectSource(input.fileName);
    if (!source) throw new ServiceError("Choose a .csv or .xlsx file. Older .xls workbooks need to be saved as .xlsx first.", "validation");
    if (!Number.isFinite(input.size) || input.size <= 0) throw new ServiceError("The file is empty.", "validation");
    if (input.size > MAX_UPLOAD_BYTES) throw new ServiceError(`Files can be up to ${formatBytes(MAX_UPLOAD_BYTES)}. This one is ${formatBytes(input.size)}.`, "validation");
    const name = (input.name.trim() || input.fileName.replace(/\.[^.]+$/, "")).slice(0, 160);

    const supabase = await createSupabaseServerClient();
    const slug = await uniqueDatasetSlug(supabase, workspaceId, name);
    const fileName = input.fileName.slice(0, 255);
    const { data: row, error } = await supabase
      .from("datasets")
      .insert({ workspace_id: workspaceId, name, slug, source, status: "uploading", file_name: fileName, size_bytes: input.size, description: `Imported from ${fileName}` })
      .select("*")
      .single();
    if (error) throw fromDbError(error, "The dataset could not be created.");

    const path = `${workspaceId}/${row.id}/${storageFileName(fileName)}`;
    const { error: pathError } = await supabase.from("datasets").update({ storage_path: path }).eq("id", row.id);
    if (pathError) throw fromDbError(pathError, "The upload could not be prepared.");
    const { data: signed, error: signError } = await supabase.storage.from(DATASET_BUCKET).createSignedUploadUrl(path);
    if (signError || !signed) {
      console.error("[storage] sign upload", signError?.message);
      await supabase.from("datasets").delete().eq("id", row.id);
      throw new ServiceError("The upload could not be prepared. Please try again.");
    }
    return { datasetId: row.id, slug: row.slug, uploadUrl: signed.signedUrl };
  },

  /**
   * Step 2: after the browser finishes uploading, reads the stored file, profiles it and saves the
   * column profile and preview. Always leaves the dataset ready, needs_review or failed.
   */
  async completeUpload(workspaceId: string, datasetId: string): Promise<Dataset> {
    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase.from("datasets").select("*").eq("workspace_id", workspaceId).eq("id", datasetId).maybeSingle();
    if (error) throw fromDbError(error);
    if (!row) throw new ServiceError("Dataset not found.", "not_found");
    if (row.status !== "uploading" || !row.storage_path) throw new ServiceError("This dataset has already been processed.", "conflict");

    const { error: claimError } = await supabase.from("datasets").update({ status: "processing" }).eq("id", row.id).eq("status", "uploading");
    if (claimError) throw fromDbError(claimError);

    const fail = async (message: string) => {
      const { data: failed } = await retryOnNetworkError(() =>
        supabase.from("datasets").update({ status: "failed", error_message: message, processed_at: new Date().toISOString() }).eq("id", row.id).select("*").single(),
      );
      return toUiDataset(failed ?? { ...row, status: "failed", error_message: message });
    };

    const source = await readSource(supabase, row);
    if ("error" in source) return fail(source.error);

    let profile: DatasetProfile;
    try {
      profile = await profileRows(source, { previewRows: PREVIEW_ROWS });
    } catch (parseError) {
      if (parseError instanceof DatasetParseError) return fail(parseError.message);
      console.error("[datasets] parse", parseError);
      return fail("The file couldn't be read. Check that it's a valid CSV or .xlsx file and try again.");
    }

    const columns = profile.columns.map((c) => ({
      dataset_id: row.id,
      workspace_id: workspaceId,
      position: c.position,
      name: c.name,
      data_type: c.dataType,
      null_count: c.nullCount,
      distinct_count: c.distinctCount,
      distinct_capped: c.distinctCapped,
      min_value: c.min,
      max_value: c.max,
      sample_values: c.samples as unknown as Json,
    }));
    // Upserts keyed on (dataset, position) and dataset id, so a retried write can't create duplicates.
    const [{ error: columnsError }, { error: previewError }] = await Promise.all([
      columns.length ? retryOnNetworkError(() => supabase.from("dataset_columns").upsert(columns, { onConflict: "dataset_id,position" })) : Promise.resolve({ error: null }),
      retryOnNetworkError(() => supabase.from("dataset_previews").upsert({ dataset_id: row.id, workspace_id: workspaceId, rows: profile.preview as unknown as Json })),
    ]);
    if (columnsError || previewError) {
      console.error("[datasets] save profile", columnsError?.message, previewError?.message);
      return fail("The file was read, but its profile couldn't be saved. Delete this dataset and try again.");
    }

    const status: DatasetStatus = profile.issues.length ? "needs_review" : "ready";
    const { data: updated, error: updateError } = await retryOnNetworkError(() =>
      supabase
        .from("datasets")
        .update({
          status,
          row_count: profile.rowCount,
          column_count: profile.columns.length,
          issues: (profile.rowCount > MAX_QUERY_ROWS
            ? [...profile.issues, { code: "row_limit", message: `Charts use the first ${MAX_QUERY_ROWS.toLocaleString("en-US")} of ${profile.rowCount.toLocaleString("en-US")} rows.` }]
            : profile.issues) as unknown as Json,
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single(),
    );
    if (updateError) throw fromDbError(updateError, "The dataset could not be updated.");

    // Load the rows for charts. If this fails the dataset stays usable and can be prepared again later.
    try {
      await loadRows(supabase, updated, source, profile.columns.map((c) => c.dataType));
      const { data: refreshed } = await supabase.from("datasets").select("*").eq("id", row.id).single();
      return toUiDataset(refreshed ?? updated);
    } catch (loadError) {
      console.error("[datasets] load rows", loadError);
      return toUiDataset(updated);
    }
  },

  /** Loads (or reloads) a profiled dataset's rows for charts, for datasets imported before charts existed or after a failed load. */
  async prepareForCharts(workspaceId: string, datasetId: string): Promise<Dataset> {
    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase.from("datasets").select("*").eq("workspace_id", workspaceId).eq("id", datasetId).maybeSingle();
    if (error) throw fromDbError(error);
    if (!row) throw new ServiceError("Dataset not found.", "not_found");
    if (row.status !== "ready" && row.status !== "needs_review") throw new ServiceError("Only processed datasets can be prepared for charts.", "conflict");
    const { data: columns, error: columnsError } = await supabase.from("dataset_columns").select("position, data_type").eq("dataset_id", row.id).order("position");
    if (columnsError) throw fromDbError(columnsError);
    const source = await readSource(supabase, row);
    if ("error" in source) throw new ServiceError(source.error);
    try {
      await loadRows(supabase, row, source, (columns ?? []).map((c) => c.data_type));
    } catch (loadError) {
      if (loadError instanceof ServiceError) throw loadError;
      if (loadError instanceof DatasetParseError) throw new ServiceError(loadError.message);
      console.error("[datasets] prepare", loadError);
      throw new ServiceError("The dataset couldn't be prepared for charts. Please try again.");
    }
    const { data: refreshed } = await supabase.from("datasets").select("*").eq("id", row.id).single();
    return toUiDataset(refreshed ?? row);
  },

  /** Datasets that can be charted, with their fields. Demo mode has none (the builder uses sample data). */
  async listQueryable(workspaceId: string): Promise<QueryableDataset[]> {
    if (appMode === "demo") return [];
    const supabase = await createSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", ["ready", "needs_review"])
      .order("updated_at", { ascending: false });
    if (error) throw fromDbError(error, "Datasets could not be loaded.");
    const ids = (rows ?? []).map((r) => r.id);
    const { data: columns } = ids.length ? await supabase.from("dataset_columns").select("*").in("dataset_id", ids).order("position") : { data: [] as DatasetColumnRow[] };
    return (rows ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      rowCount: r.row_count ?? 0,
      queryRowCount: r.query_row_count ?? 0,
      ready: Boolean(r.rows_loaded_at),
      fields: (columns ?? [])
        .filter((c) => c.dataset_id === r.id)
        .map<DatasetField>((c) => ({
          position: c.position,
          name: c.name,
          type: c.data_type,
          distinctCount: c.distinct_count,
          samples: Array.isArray(c.sample_values) ? (c.sample_values as string[]) : [],
          min: c.min_value,
          max: c.max_value,
        })),
    }));
  },

  /** Removes the file from storage, then the record. Columns and preview cascade; projects keep existing without it. */
  async remove(workspaceId: string, datasetId: string) {
    const supabase = await createSupabaseServerClient();
    const { data: row, error } = await supabase.from("datasets").select("id, storage_path").eq("workspace_id", workspaceId).eq("id", datasetId).maybeSingle();
    if (error) throw fromDbError(error);
    if (!row) throw new ServiceError("Dataset not found.", "not_found");
    const { error: deleteError, count } = await supabase.from("datasets").delete({ count: "exact" }).eq("id", row.id);
    if (deleteError) throw fromDbError(deleteError, "The dataset could not be deleted.");
    if (count === 0) throw new ServiceError("Only owners, admins and members can delete datasets.", "forbidden");
    if (row.storage_path) {
      const { error: storageError } = await supabase.storage.from(DATASET_BUCKET).remove([row.storage_path]);
      // The record is gone, so the file is unreachable; log for clean-up rather than failing the user's action.
      if (storageError) console.error("[storage] remove", row.storage_path, storageError.message);
    }
  },
};
