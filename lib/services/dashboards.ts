import "server-only";
import type { ChartKind } from "../demo-data/types";
import { defaultSizeFor, MAX_WIDGETS, newWidgetId, parseLayout } from "../dashboards/layout";
import type { DashboardWidget } from "../dashboards/layout";
import type { Json } from "../supabase/database.types";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseServerClient } from "../supabase/server";
import { fromDbError, ServiceError } from "./errors";

export interface DashboardSummary {
  id: string;
  name: string;
  isDefault: boolean;
  widgetCount: number;
}

export interface DashboardRecord extends DashboardSummary {
  widgets: DashboardWidget[];
  updatedAt: string;
}

function layoutError(error: { code?: string; message: string }) {
  // Layout rules are enforced by a database trigger whose messages are written for users (SQLSTATE 22023).
  if (error.code === "22023") return new ServiceError(error.message, "validation");
  return fromDbError(error, "The dashboard couldn't be saved.");
}

async function getDefault(supabase: SupabaseServerClient, workspaceId: string) {
  const { data, error } = await supabase.from("dashboards").select("*").eq("workspace_id", workspaceId).eq("is_default", true).maybeSingle();
  if (error) throw fromDbError(error);
  return data;
}

export const dashboardService = {
  async list(workspaceId: string): Promise<DashboardSummary[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("dashboards").select("id, name, is_default, layout").eq("workspace_id", workspaceId).order("is_default", { ascending: false }).order("created_at");
    if (error) throw fromDbError(error, "Dashboards could not be loaded.");
    return (data ?? []).map((d) => ({ id: d.id, name: d.name, isDefault: d.is_default, widgetCount: parseLayout(d.layout).length }));
  },

  /** The requested dashboard, or the default one when no id is given. */
  async get(workspaceId: string, id?: string | null): Promise<DashboardRecord | null> {
    const supabase = await createSupabaseServerClient();
    const query = supabase.from("dashboards").select("*").eq("workspace_id", workspaceId);
    const { data, error } = id && /^[0-9a-f-]{36}$/i.test(id) ? await query.eq("id", id).maybeSingle() : await query.order("is_default", { ascending: false }).order("created_at").limit(1).maybeSingle();
    if (error) throw fromDbError(error, "The dashboard could not be loaded.");
    if (!data) return null;
    const widgets = parseLayout(data.layout);
    return { id: data.id, name: data.name, isDefault: data.is_default, widgetCount: widgets.length, widgets, updatedAt: data.updated_at };
  },

  async create(workspaceId: string, name: string): Promise<DashboardSummary> {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 160) throw new ServiceError("Dashboard names need between 1 and 160 characters.", "validation");
    const supabase = await createSupabaseServerClient();
    const existing = await getDefault(supabase, workspaceId);
    const { data, error } = await supabase.from("dashboards").insert({ workspace_id: workspaceId, name: trimmed, is_default: !existing, layout: [] as unknown as Json }).select("id, name, is_default").single();
    if (error) throw layoutError(error);
    return { id: data.id, name: data.name, isDefault: data.is_default, widgetCount: 0 };
  },

  async save(workspaceId: string, id: string, input: { name: string; widgets: DashboardWidget[] }) {
    const name = input.name.trim();
    if (!name || name.length > 160) throw new ServiceError("Dashboard names need between 1 and 160 characters.", "validation");
    const widgets = parseLayout(input.widgets);
    if (widgets.length !== input.widgets.length) throw new ServiceError("Some widgets were invalid. Reload the page and try again.", "validation");
    if (widgets.length > MAX_WIDGETS) throw new ServiceError(`A dashboard can hold up to ${MAX_WIDGETS} widgets.`, "validation");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("dashboards")
      .update({ name, layout: widgets as unknown as Json }, { count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) throw layoutError(error);
    if (!count) throw new ServiceError("That dashboard no longer exists, or you can't edit it.", "not_found");
  },

  /** Deletes a dashboard. If it was the default, the oldest remaining dashboard becomes the default. */
  async remove(workspaceId: string, id: string) {
    const supabase = await createSupabaseServerClient();
    const { data: row } = await supabase.from("dashboards").select("is_default").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
    const { error, count } = await supabase.from("dashboards").delete({ count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw fromDbError(error, "The dashboard couldn't be deleted.");
    if (!count) throw new ServiceError("That dashboard no longer exists, or you can't delete it.", "not_found");
    if (row?.is_default) {
      const { data: next } = await supabase.from("dashboards").select("id").eq("workspace_id", workspaceId).order("created_at").limit(1).maybeSingle();
      if (next) await supabase.from("dashboards").update({ is_default: true }).eq("id", next.id);
    }
  },

  async setDefault(workspaceId: string, id: string) {
    const supabase = await createSupabaseServerClient();
    const current = await getDefault(supabase, workspaceId);
    if (current?.id === id) return;
    // Clear first: only one default is allowed per workspace (unique partial index).
    if (current) {
      const { error } = await supabase.from("dashboards").update({ is_default: false }).eq("id", current.id);
      if (error) throw fromDbError(error, "The default dashboard couldn't be changed.");
    }
    const { error, count } = await supabase.from("dashboards").update({ is_default: true }, { count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error || !count) {
      if (current) await supabase.from("dashboards").update({ is_default: true }).eq("id", current.id);
      throw error ? fromDbError(error) : new ServiceError("That dashboard no longer exists.", "not_found");
    }
  },

  /** Ids of charts on the default dashboard (what "On dashboard" means in the chart library). */
  async defaultVisualizationIds(workspaceId: string): Promise<Set<string>> {
    const supabase = await createSupabaseServerClient();
    const row = await getDefault(supabase, workspaceId);
    return new Set(parseLayout(row?.layout).map((w) => w.visualizationId));
  },

  /** Adds or removes a chart on the default dashboard, creating an "Overview" dashboard if the workspace has none. */
  async setOnDefault(workspaceId: string, visualizationId: string, kind: ChartKind, onDashboard: boolean) {
    const supabase = await createSupabaseServerClient();
    let row = await getDefault(supabase, workspaceId);
    if (!row && !onDashboard) return;
    if (!row) {
      const { data, error } = await supabase.from("dashboards").insert({ workspace_id: workspaceId, name: "Overview", is_default: true, layout: [] as unknown as Json }).select("*").single();
      if (error) throw layoutError(error);
      row = data;
    }
    const widgets = parseLayout(row.layout);
    const present = widgets.some((w) => w.visualizationId === visualizationId);
    if (present === onDashboard) return;
    if (onDashboard && widgets.length >= MAX_WIDGETS) throw new ServiceError(`The dashboard already has ${MAX_WIDGETS} widgets. Remove one first.`, "validation");
    const next = onDashboard
      ? [...widgets, { id: newWidgetId(), visualizationId, size: defaultSizeFor(kind), height: "regular" as const }]
      : widgets.filter((w) => w.visualizationId !== visualizationId);
    const { error } = await supabase.from("dashboards").update({ layout: next as unknown as Json }).eq("id", row.id);
    if (error) throw layoutError(error);
  },
};
