/**
 * Types for the schema in supabase/migrations. Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ProjectStatus = "active" | "in_review" | "draft" | "archived";
export type DatasetStatus = "uploading" | "processing" | "ready" | "needs_review" | "failed";
export type DatasetSource = "csv" | "excel" | "google_sheets" | "api";
export type ReportStatus = "draft" | "published" | "scheduled";
export type ShareResource = "report" | "dashboard" | "visualization";

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  email: string | null;
  full_name: string;
  job_title: string;
  avatar_url: string | null;
}

export type WorkspaceRow = Timestamps & {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string | null;
}

export type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export type DatasetRow = Timestamps & {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string;
  source: DatasetSource;
  status: DatasetStatus;
  storage_path: string | null;
  file_name: string | null;
  size_bytes: number | null;
  row_count: number | null;
  column_count: number | null;
  issues: Json;
  processed_at: string | null;
  rows_loaded_at: string | null;
  query_row_count: number | null;
  error_message: string | null;
  created_by: string | null;
}

export type ColumnDataType = "text" | "integer" | "decimal" | "currency" | "percent" | "boolean" | "date";

export type DatasetColumnRow = {
  id: string;
  dataset_id: string;
  workspace_id: string;
  position: number;
  name: string;
  data_type: ColumnDataType;
  null_count: number;
  distinct_count: number;
  distinct_capped: boolean;
  min_value: string | null;
  max_value: string | null;
  sample_values: Json;
  created_at: string;
};

export type DatasetPreviewRow = {
  dataset_id: string;
  workspace_id: string;
  rows: Json;
  created_at: string;
};

export type DatasetRowsRow = {
  dataset_id: string;
  workspace_id: string;
  row_number: number;
  cells: Json;
};

export type AiRequestRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  question: string;
  status: "answered" | "cannot_answer" | "failed";
  dataset_id: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  verified: boolean | null;
  duration_ms: number | null;
  created_at: string;
};

export type StorageCleanupRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  dry_run: boolean;
  status: "running" | "ok" | "partial" | "failed";
  candidates: number;
  deleted: number;
  failed: number;
  rate_limit_rows_removed: number;
  error: string | null;
};

export type ProjectRow = Timestamps & {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  dataset_id: string | null;
  created_by: string | null;
}

export type VisualizationRow = Timestamps & {
  id: string;
  workspace_id: string;
  project_id: string | null;
  dataset_id: string | null;
  name: string;
  description: string;
  kind: string;
  config: Json;
  pinned: boolean;
  created_by: string | null;
}

export type DashboardRow = Timestamps & {
  id: string;
  workspace_id: string;
  name: string;
  layout: Json;
  is_default: boolean;
  created_by: string | null;
}

export type ReportRow = Timestamps & {
  id: string;
  workspace_id: string;
  project_id: string | null;
  slug: string;
  name: string;
  description: string;
  period: string;
  status: ReportStatus;
  sections: Json;
  created_by: string | null;
}

export type ShareRow = {
  id: string;
  workspace_id: string;
  resource_type: ShareResource;
  resource_id: string;
  token: string;
  label: string;
  snapshot: Json | null;
  snapshot_at: string | null;
  created_by: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      workspaces: Table<WorkspaceRow, "name">;
      workspace_members: Table<WorkspaceMemberRow, "workspace_id" | "user_id">;
      datasets: Table<DatasetRow, "workspace_id" | "slug" | "name">;
      dataset_columns: Table<DatasetColumnRow, "dataset_id" | "workspace_id" | "position" | "name" | "data_type">;
      dataset_previews: Table<DatasetPreviewRow, "dataset_id" | "workspace_id">;
      dataset_rows: Table<DatasetRowsRow, "dataset_id" | "workspace_id" | "row_number" | "cells">;
      ai_requests: Table<AiRequestRow, "workspace_id" | "question" | "status">;
      storage_cleanup_runs: Table<StorageCleanupRunRow, never>;
      projects: Table<ProjectRow, "workspace_id" | "slug" | "name">;
      visualizations: Table<VisualizationRow, "workspace_id" | "name" | "kind">;
      dashboards: Table<DashboardRow, "workspace_id" | "name">;
      reports: Table<ReportRow, "workspace_id" | "slug" | "name">;
      shares: Table<ShareRow, "workspace_id" | "resource_type" | "resource_id">;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_workspace: { Args: { workspace_name: string; workspace_description?: string }; Returns: string };
      is_workspace_member: { Args: { target_workspace: string }; Returns: boolean };
      can_edit_workspace: { Args: { target_workspace: string }; Returns: boolean };
      query_dataset: { Args: { p_dataset: string; p_spec: Json }; Returns: Json };
      get_shared_report: { Args: { p_token: string }; Returns: Json };
      consume_rate_limit: { Args: { p_bucket: string; p_subject?: string }; Returns: Json };
      rate_limit_gc: { Args: Record<string, never>; Returns: number };
      storage_orphan_candidates: { Args: { p_min_age_seconds?: number; p_limit?: number }; Returns: Array<{ name: string; workspace_id: string; dataset_id: string; created_at: string; reason: string }> };
      storage_orphans_recheck: { Args: { p_names: string[]; p_min_age_seconds?: number }; Returns: string[] };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      project_status: ProjectStatus;
      dataset_status: DatasetStatus;
      dataset_source: DatasetSource;
      report_status: ReportStatus;
      share_resource: ShareResource;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
