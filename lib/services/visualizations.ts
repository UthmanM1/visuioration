import "server-only";
import type { ChartKind } from "../demo-data/types";
import { formatRelative } from "../format";
import type { Json, VisualizationRow } from "../supabase/database.types";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseServerClient } from "../supabase/server";
import {
  chartKinds,
  measureLabel,
  parseDefinition,
  toQuerySpec,
  validateDefinition,
  valueFormatFor,
} from "../visualizations/definition";
import type { ChartData, DatasetField, VisualizationDefinition } from "../visualizations/definition";
import { fromDbError, ServiceError } from "./errors";
import { loadPeople } from "./people";

export interface SavedVisualization {
  id: string;
  name: string;
  description: string;
  kind: ChartKind;
  datasetId: string | null;
  datasetName: string | null;
  definition: VisualizationDefinition | null;
  pinned: boolean;
  updated: string;
  ownerName: string | null;
}

export interface SaveVisualizationInput {
  id?: string;
  name: string;
  description: string;
  kind: ChartKind;
  datasetId: string;
  definition: VisualizationDefinition;
  pinned: boolean;
}

async function loadFields(supabase: SupabaseServerClient, workspaceId: string, datasetId: string) {
  const { data: dataset, error } = await supabase.from("datasets").select("id, name, status, rows_loaded_at").eq("workspace_id", workspaceId).eq("id", datasetId).maybeSingle();
  if (error) throw fromDbError(error);
  if (!dataset) throw new ServiceError("That dataset isn't in this workspace.", "not_found");
  const { data: columns, error: columnsError } = await supabase.from("dataset_columns").select("*").eq("dataset_id", datasetId).order("position");
  if (columnsError) throw fromDbError(columnsError);
  const fields: DatasetField[] = (columns ?? []).map((c) => ({
    position: c.position,
    name: c.name,
    type: c.data_type,
    distinctCount: c.distinct_count,
    samples: Array.isArray(c.sample_values) ? (c.sample_values as string[]) : [],
    min: c.min_value,
    max: c.max_value,
  }));
  return { dataset, fields };
}

function toSaved(row: VisualizationRow, datasetName: string | null, ownerName: string | null): SavedVisualization {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: (chartKinds.includes(row.kind as ChartKind) ? row.kind : "bar") as ChartKind,
    datasetId: row.dataset_id,
    datasetName,
    definition: parseDefinition(row.config),
    pinned: row.pinned,
    updated: formatRelative(row.updated_at),
    ownerName,
  };
}

function queryError(error: { code?: string; message: string }): ServiceError {
  // Messages raised by query_dataset() with SQLSTATE 22023 are written for users.
  if (error.code === "22023") return new ServiceError(error.message, "validation");
  if (error.code === "PT404") return new ServiceError("That dataset isn't available.", "not_found");
  if (error.code === "57014") return new ServiceError("This chart took too long to calculate. Add a filter or a shorter date range.", "validation");
  return fromDbError(error, "The chart couldn't be calculated.");
}

export const visualizationService = {
  async list(workspaceId: string): Promise<SavedVisualization[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("visualizations").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
    if (error) throw fromDbError(error, "Visualizations could not be loaded.");
    const datasetIds = Array.from(new Set((data ?? []).map((v) => v.dataset_id).filter((id): id is string => Boolean(id))));
    const [{ data: datasets }, people] = await Promise.all([
      datasetIds.length ? supabase.from("datasets").select("id, name").in("id", datasetIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      loadPeople(supabase, (data ?? []).map((v) => v.created_by)),
    ]);
    const names = new Map((datasets ?? []).map((d) => [d.id, d.name]));
    return (data ?? []).map((v) => toSaved(v, v.dataset_id ? names.get(v.dataset_id) ?? null : null, v.created_by ? people.get(v.created_by)?.name ?? null : null));
  },

  async get(workspaceId: string, id: string): Promise<SavedVisualization | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("visualizations").select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
    if (error) throw fromDbError(error);
    if (!data) return null;
    const { data: dataset } = data.dataset_id ? await supabase.from("datasets").select("name").eq("id", data.dataset_id).maybeSingle() : { data: null };
    return toSaved(data, dataset?.name ?? null, null);
  },

  /** Runs a definition against the dataset's rows in the database. */
  async run(workspaceId: string, datasetId: string, definition: VisualizationDefinition, kind: ChartKind): Promise<ChartData> {
    const supabase = await createSupabaseServerClient();
    const { dataset, fields } = await loadFields(supabase, workspaceId, datasetId);
    if (!dataset.rows_loaded_at) throw new ServiceError("This dataset isn't ready for charts yet. Open it and choose “Prepare for charts”.", "conflict");
    const problem = validateDefinition(definition, fields, kind);
    if (problem) throw new ServiceError(problem, "validation");
    const spec = toQuerySpec(definition, fields, kind);
    const { data, error } = await supabase.rpc("query_dataset", { p_dataset: datasetId, p_spec: spec as unknown as Json });
    if (error) throw queryError(error);
    const result = (data ?? {}) as { rows?: ChartData["points"]; total?: number | string | null; matched?: number; truncated_x?: boolean; truncated_series?: boolean };
    const xField = spec.x ? fields.find((f) => f.position === spec.x!.col) : undefined;
    return {
      points: (result.rows ?? []).map((p) => ({ x: p.x, s: p.s, v: p.v === null ? null : Number(p.v) })),
      total: result.total === null || result.total === undefined ? null : Number(result.total),
      matched: Number(result.matched ?? 0),
      truncatedX: Boolean(result.truncated_x),
      truncatedSeries: Boolean(result.truncated_series),
      valueFormat: valueFormatFor(definition, fields),
      xType: xField?.type ?? null,
      grain: xField?.type === "date" ? ((spec.x as { grain?: ChartData["grain"] }).grain ?? "month") : null,
      measureLabel: measureLabel(definition, fields),
      xLabel: xField?.name ?? null,
      range: spec.range ? { from: spec.range.from, to: spec.range.to } : null,
    };
  },

  async save(workspaceId: string, input: SaveVisualizationInput): Promise<SavedVisualization> {
    const name = input.name.trim();
    if (!name) throw new ServiceError("Add a title before saving.", "validation");
    if (name.length > 160) throw new ServiceError("Titles can be up to 160 characters.", "validation");
    if (!chartKinds.includes(input.kind)) throw new ServiceError("Choose a chart type.", "validation");
    const supabase = await createSupabaseServerClient();
    const { dataset, fields } = await loadFields(supabase, workspaceId, input.datasetId);
    const problem = validateDefinition(input.definition, fields, input.kind);
    if (problem) throw new ServiceError(problem, "validation");
    const values = {
      name,
      description: input.description.trim().slice(0, 500),
      kind: input.kind,
      dataset_id: input.datasetId,
      config: input.definition as unknown as Json,
      pinned: input.pinned,
    };
    const query = input.id
      ? supabase.from("visualizations").update(values).eq("workspace_id", workspaceId).eq("id", input.id).select("*").maybeSingle()
      : supabase.from("visualizations").insert({ ...values, workspace_id: workspaceId }).select("*").single();
    const { data, error } = await query;
    if (error) throw fromDbError(error, "The visualization couldn't be saved.");
    if (!data) throw new ServiceError("That visualization no longer exists.", "not_found");
    return toSaved(data, dataset.name, null);
  },

  async rename(workspaceId: string, id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 160) throw new ServiceError("Names need between 1 and 160 characters.", "validation");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("visualizations").update({ name: trimmed }, { count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw fromDbError(error, "The visualization couldn't be renamed.");
    if (!count) throw new ServiceError("That visualization no longer exists, or you can't edit it.", "not_found");
  },

  async setPinned(workspaceId: string, id: string, pinned: boolean) {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("visualizations").update({ pinned }, { count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw fromDbError(error, "The dashboard couldn't be updated.");
    if (!count) throw new ServiceError("That visualization no longer exists, or you can't edit it.", "not_found");
  },

  async duplicate(workspaceId: string, id: string): Promise<SavedVisualization> {
    const supabase = await createSupabaseServerClient();
    const { data: source, error } = await supabase.from("visualizations").select("*").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
    if (error) throw fromDbError(error);
    if (!source) throw new ServiceError("That visualization no longer exists.", "not_found");
    const { data, error: insertError } = await supabase
      .from("visualizations")
      .insert({
        workspace_id: workspaceId,
        project_id: source.project_id,
        dataset_id: source.dataset_id,
        name: `${source.name} (copy)`.slice(0, 160),
        description: source.description,
        kind: source.kind,
        config: source.config,
        pinned: false,
      })
      .select("*")
      .single();
    if (insertError) throw fromDbError(insertError, "The visualization couldn't be duplicated.");
    return toSaved(data, null, null);
  },

  async remove(workspaceId: string, id: string) {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("visualizations").delete({ count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw fromDbError(error, "The visualization couldn't be deleted.");
    if (!count) throw new ServiceError("That visualization no longer exists, or you can't delete it.", "not_found");
  },
};
