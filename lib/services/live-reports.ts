import "server-only";
import { formatRelative, slugify } from "../format";
import { parseSections, referencedVisualizations } from "../reports/sections";
import type { RenderedReport, RenderedSection, StoredSection } from "../reports/sections";
import type { Json, ReportStatus } from "../supabase/database.types";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseServerClient } from "../supabase/server";
import { makeFormatter, rangeLabels } from "../visualizations/definition";
import { fromDbError, ServiceError } from "./errors";
import { loadPeople } from "./people";
import { visualizationService } from "./visualizations";
import type { SavedVisualization } from "./visualizations";

export interface ReportSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  period: string;
  status: ReportStatus;
  sectionCount: number;
  chartCount: number;
  updated: string;
  ownerName: string | null;
  activeLinks: number;
}

export interface ReportRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  period: string;
  status: ReportStatus;
  sections: StoredSection[];
  updated: string;
}

export interface ShareLink {
  id: string;
  token: string;
  label: string;
  createdAt: string;
  expiresAt: string | null;
  snapshotAt: string | null;
  state: "active" | "expired" | "revoked";
}

const MAX_EXPIRY_DAYS = 365;

async function uniqueSlug(supabase: SupabaseServerClient, workspaceId: string, name: string, exceptId?: string) {
  const base = slugify(name);
  const { data } = await supabase.from("reports").select("id, slug").eq("workspace_id", workspaceId).like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((r) => r.id !== exceptId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function toRecord(row: { id: string; slug: string; name: string; description: string; period: string; status: ReportStatus; sections: Json; updated_at: string }): ReportRecord {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description, period: row.period, status: row.status, sections: parseSections(row.sections), updated: formatRelative(row.updated_at) };
}

function shareState(row: { expires_at: string | null; revoked_at: string | null }): ShareLink["state"] {
  if (row.revoked_at) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

function describeRange(data: { range: { from?: string; to?: string } | null }) {
  if (!data.range) return "";
  return data.range.from && data.range.to ? `${data.range.from} to ${data.range.to}` : data.range.from ? `from ${data.range.from}` : `until ${data.range.to}`;
}

export const liveReportService = {
  async list(workspaceId: string): Promise<ReportSummary[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("reports").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
    if (error) throw fromDbError(error, "Reports could not be loaded.");
    const ids = (data ?? []).map((r) => r.id);
    const [{ data: links }, people] = await Promise.all([
      ids.length ? supabase.from("shares").select("resource_id, expires_at, revoked_at").in("resource_id", ids) : Promise.resolve({ data: [] as Array<{ resource_id: string; expires_at: string | null; revoked_at: string | null }> }),
      loadPeople(supabase, (data ?? []).map((r) => r.created_by)),
    ]);
    return (data ?? []).map((r) => {
      const sections = parseSections(r.sections);
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        period: r.period,
        status: r.status,
        sectionCount: sections.length,
        chartCount: referencedVisualizations(sections).length,
        updated: formatRelative(r.updated_at),
        ownerName: r.created_by ? people.get(r.created_by)?.name ?? null : null,
        activeLinks: (links ?? []).filter((l) => l.resource_id === r.id && shareState(l) === "active").length,
      };
    });
  },

  async get(workspaceId: string, by: { slug?: string; id?: string }): Promise<ReportRecord | null> {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("reports").select("*").eq("workspace_id", workspaceId);
    if (by.id) {
      if (!/^[0-9a-f-]{36}$/i.test(by.id)) return null;
      query = query.eq("id", by.id);
    } else query = query.eq("slug", by.slug ?? "");
    const { data, error } = await query.maybeSingle();
    if (error) throw fromDbError(error, "The report could not be loaded.");
    return data ? toRecord(data) : null;
  },

  async save(workspaceId: string, input: { id?: string; name: string; description: string; period: string; sections: unknown }): Promise<ReportRecord> {
    const name = input.name.trim();
    if (!name || name.length > 160) throw new ServiceError("Report titles need between 1 and 160 characters.", "validation");
    const sections = parseSections(input.sections);
    if (sections.length === 0) throw new ServiceError("Add at least one section.", "validation");
    const supabase = await createSupabaseServerClient();
    const needed = referencedVisualizations(sections);
    if (needed.length) {
      const { data: found } = await supabase.from("visualizations").select("id").eq("workspace_id", workspaceId).in("id", needed);
      const known = new Set((found ?? []).map((v) => v.id));
      if (needed.some((id) => !known.has(id))) throw new ServiceError("A section refers to a chart that isn't in this workspace. Choose the chart again.", "validation");
    }
    const incomplete = sections.find((s) => s.type === "chart" && !s.visualizationId);
    if (incomplete) throw new ServiceError("Choose a chart for every chart section, or remove the empty one.", "validation");
    const values = {
      name,
      description: input.description.trim().slice(0, 500),
      period: input.period.trim().slice(0, 80),
      sections: sections as unknown as Json,
      slug: await uniqueSlug(supabase, workspaceId, name, input.id),
    };
    const result = input.id
      ? await supabase.from("reports").update(values).eq("workspace_id", workspaceId).eq("id", input.id).select("*").maybeSingle()
      : await supabase.from("reports").insert({ ...values, workspace_id: workspaceId, status: "draft" }).select("*").single();
    if (result.error) throw fromDbError(result.error, "The report couldn't be saved.");
    if (!result.data) throw new ServiceError("That report no longer exists.", "not_found");
    return toRecord(result.data);
  },

  async remove(workspaceId: string, id: string) {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("reports").delete({ count: "exact" }).eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw fromDbError(error, "The report couldn't be deleted.");
    if (!count) throw new ServiceError("That report no longer exists, or you can't delete it.", "not_found");
  },

  /** Fills in every chart and KPI with live results from the database. */
  async render(workspaceId: string, report: ReportRecord, context: { workspaceName: string; preparedBy: string }): Promise<RenderedReport> {
    const needed = new Set(referencedVisualizations(report.sections));
    const charts = needed.size ? (await visualizationService.list(workspaceId)).filter((v) => needed.has(v.id)) : [];
    const byId = new Map(charts.map((c) => [c.id, c]));
    const cache = new Map<string, Promise<Awaited<ReturnType<typeof visualizationService.run>>>>();
    const run = (viz: SavedVisualization, kind: typeof viz.kind) => {
      const key = `${viz.id}:${kind}`;
      if (!cache.has(key)) cache.set(key, visualizationService.run(workspaceId, viz.datasetId!, viz.definition!, kind));
      return cache.get(key)!;
    };
    const problem = (viz: SavedVisualization | undefined) => (!viz ? "This chart was deleted." : !viz.datasetId ? "The dataset for this chart was deleted." : !viz.definition ? "This chart's settings couldn't be read." : null);
    const reason = (error: unknown) => (error instanceof ServiceError ? error.message : "This chart couldn't be calculated.");
    const sources = new Map<string, { name: string; rows: number }>();

    const sections: RenderedSection[] = await Promise.all(
      report.sections.map(async (s): Promise<RenderedSection> => {
        if (s.type === "cover" || s.type === "text" || s.type === "list") return s;
        if (s.type === "appendix") return { ...s, sources: [] };
        if (s.type === "chart") {
          const viz = byId.get(s.visualizationId);
          const issue = problem(viz);
          if (issue || !viz) return { id: s.id, type: "chart", heading: s.heading, commentary: s.commentary, chart: null, error: issue ?? undefined };
          try {
            const data = await run(viz, viz.kind);
            if (viz.datasetName) sources.set(viz.datasetId!, { name: viz.datasetName, rows: Math.max(sources.get(viz.datasetId!)?.rows ?? 0, data.matched) });
            return { id: s.id, type: "chart", heading: s.heading, commentary: s.commentary, chart: { title: viz.name, kind: viz.kind, data, datasetName: viz.datasetName } };
          } catch (error) {
            return { id: s.id, type: "chart", heading: s.heading, commentary: s.commentary, chart: null, error: reason(error) };
          }
        }
        const items = await Promise.all(
          s.visualizationIds.map(async (id) => {
            const viz = byId.get(id);
            const issue = problem(viz);
            if (issue || !viz) return { label: viz?.name ?? "Deleted chart", value: null, detail: "", error: issue ?? undefined };
            try {
              const data = await run(viz, "kpi");
              const range = describeRange(data) || (viz.definition?.dateRange ? rangeLabels[viz.definition.dateRange.preset] : "");
              return { label: viz.name, value: data.total === null ? "—" : makeFormatter(data.valueFormat)(data.total, false), detail: [data.measureLabel, range].filter(Boolean).join(" · ") };
            } catch (error) {
              return { label: viz.name, value: null, detail: "", error: reason(error) };
            }
          }),
        );
        return { id: s.id, type: "kpis", heading: s.heading, items };
      }),
    );
    const sourceList = Array.from(sources.values());
    return {
      name: report.name,
      period: report.period,
      description: report.description,
      workspaceName: context.workspaceName,
      preparedBy: context.preparedBy,
      generatedAt: new Date().toISOString(),
      sections: sections.map((s) => (s.type === "appendix" ? { ...s, sources: sourceList } : s)),
    };
  },

  async listShares(workspaceId: string, reportId: string): Promise<ShareLink[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("shares").select("*").eq("workspace_id", workspaceId).eq("resource_id", reportId).order("created_at", { ascending: false });
    if (error) throw fromDbError(error, "Share links could not be loaded.");
    return (data ?? []).map((s) => ({ id: s.id, token: s.token, label: s.label, createdAt: s.created_at, expiresAt: s.expires_at, snapshotAt: s.snapshot_at, state: shareState(s) }));
  },

  /** Creates a link that serves a snapshot of the report as rendered now. */
  async createShare(workspaceId: string, reportId: string, input: { label: string; expiresInDays: number | null; expiresAt?: string | null }, rendered: RenderedReport): Promise<ShareLink> {
    let expiresAt: string | null = null;
    if (input.expiresAt) {
      const date = new Date(`${input.expiresAt}T23:59:59Z`);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) throw new ServiceError("Choose an expiry date in the future.", "validation");
      if (date.getTime() - Date.now() > MAX_EXPIRY_DAYS * 86400000) throw new ServiceError(`Links can last at most ${MAX_EXPIRY_DAYS} days.`, "validation");
      expiresAt = date.toISOString();
    } else if (input.expiresInDays !== null) {
      if (!Number.isFinite(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > MAX_EXPIRY_DAYS) throw new ServiceError("Choose a valid expiry.", "validation");
      expiresAt = new Date(Date.now() + input.expiresInDays * 86400000).toISOString();
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("shares")
      .insert({ workspace_id: workspaceId, resource_type: "report", resource_id: reportId, label: input.label.trim().slice(0, 120), expires_at: expiresAt, snapshot: rendered as unknown as Json, snapshot_at: rendered.generatedAt })
      .select("*")
      .single();
    if (error) throw fromDbError(error, "The link couldn't be created.");
    await supabase.from("reports").update({ status: "published" }).eq("id", reportId);
    return { id: data.id, token: data.token, label: data.label, createdAt: data.created_at, expiresAt: data.expires_at, snapshotAt: data.snapshot_at, state: shareState(data) };
  },

  async refreshShare(workspaceId: string, shareId: string, rendered: RenderedReport) {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("shares")
      .update({ snapshot: rendered as unknown as Json, snapshot_at: rendered.generatedAt }, { count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("id", shareId)
      .is("revoked_at", null);
    if (error) throw fromDbError(error, "The link couldn't be updated.");
    if (!count) throw new ServiceError("That link no longer exists or was revoked.", "not_found");
  },

  async revokeShare(workspaceId: string, shareId: string) {
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase.from("shares").update({ revoked_at: new Date().toISOString() }, { count: "exact" }).eq("workspace_id", workspaceId).eq("id", shareId).is("revoked_at", null);
    if (error) throw fromDbError(error, "The link couldn't be revoked.");
    if (!count) throw new ServiceError("That link no longer exists or was already revoked.", "not_found");
  },

  async shareReportId(workspaceId: string, shareId: string) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("shares").select("resource_id").eq("workspace_id", workspaceId).eq("id", shareId).maybeSingle();
    return data?.resource_id ?? null;
  },

  /** Every share link in the workspace, newest first, with its report. */
  async listWorkspaceShares(workspaceId: string): Promise<Array<ShareLink & { reportName: string; reportSlug: string; createdBy: string | null }>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("shares").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200);
    if (error) throw fromDbError(error, "Share links could not be loaded.");
    const ids = Array.from(new Set((data ?? []).map((s) => s.resource_id)));
    const [{ data: reports }, people] = await Promise.all([
      ids.length ? supabase.from("reports").select("id, name, slug").in("id", ids) : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
      loadPeople(supabase, (data ?? []).map((s) => s.created_by)),
    ]);
    const byId = new Map((reports ?? []).map((r) => [r.id, r]));
    return (data ?? [])
      .filter((s) => byId.has(s.resource_id))
      .map((s) => ({
        id: s.id,
        token: s.token,
        label: s.label,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        snapshotAt: s.snapshot_at,
        state: shareState(s),
        reportName: byId.get(s.resource_id)!.name,
        reportSlug: byId.get(s.resource_id)!.slug,
        createdBy: s.created_by ? people.get(s.created_by)?.name ?? null : null,
      }));
  },

  /** Public lookup by token (works for anonymous visitors). Only the snapshot is ever returned. */
  async getShared(token: string): Promise<{ status: "ok"; report: RenderedReport; snapshotAt: string; expiresAt: string | null } | { status: "expired" } | null> {
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_shared_report", { p_token: token });
    if (error) {
      console.error("[share] lookup", error.message);
      return null;
    }
    const result = data as { status?: string; report?: RenderedReport; snapshot_at?: string; expires_at?: string | null } | null;
    if (!result) return null;
    if (result.status === "expired") return { status: "expired" };
    if (result.status === "ok" && result.report) {
      // Snapshots are stored JSON; treat anything that isn't a rendered report as an invalid link rather than crash.
      const r = result.report as Partial<RenderedReport>;
      if (typeof r.name !== "string" || !Array.isArray(r.sections) || typeof r.workspaceName !== "string" || typeof r.generatedAt !== "string") return null;
      return { status: "ok", report: result.report, snapshotAt: result.snapshot_at ?? result.report.generatedAt, expiresAt: result.expires_at ?? null };
    }
    return null;
  },
};
