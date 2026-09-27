import "server-only";
import { datasets as demoDatasets, projects as demoProjects } from "../demo-data";
import type { Project } from "../demo-data/types";
import { formatRelative, slugify } from "../format";
import { appMode } from "../supabase/config";
import type { ProjectRow, ProjectStatus } from "../supabase/database.types";
import { createSupabaseServerClient } from "../supabase/server";
import type { SupabaseServerClient } from "../supabase/server";
import { demoResolve } from "./client";
import { fromDbError, ServiceError } from "./errors";
import { loadPeople } from "./people";

const statusLabels: Record<ProjectStatus, Project["status"]> = {
  active: "Active",
  in_review: "In review",
  draft: "Draft",
  archived: "Archived",
};

export interface CreateProjectInput {
  name: string;
  description: string;
  datasetId: string | null;
}

async function toUiProjects(supabase: SupabaseServerClient, rows: ProjectRow[]): Promise<Project[]> {
  const datasetIds = Array.from(new Set(rows.map((r) => r.dataset_id).filter((id): id is string => Boolean(id))));
  const [people, datasetsResult] = await Promise.all([
    loadPeople(supabase, rows.map((r) => r.created_by)),
    datasetIds.length ? supabase.from("datasets").select("id, slug, name").in("id", datasetIds) : Promise.resolve({ data: [] as Array<{ id: string; slug: string; name: string }> }),
  ]);
  const datasetsById = new Map((datasetsResult.data ?? []).map((d) => [d.id, d]));
  return rows.map((r) => {
    const dataset = r.dataset_id ? datasetsById.get(r.dataset_id) : undefined;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      ownerId: r.created_by ?? "",
      owner: r.created_by ? people.get(r.created_by) : undefined,
      collaboratorIds: [],
      collaborators: [],
      datasetSlug: dataset?.slug ?? "",
      datasetName: dataset?.name,
      status: statusLabels[r.status],
      updated: formatRelative(r.updated_at),
      reportSlugs: [],
      visualizationIds: [],
    };
  });
}

async function uniqueSlug(supabase: SupabaseServerClient, workspaceId: string, name: string) {
  const base = slugify(name);
  const { data } = await supabase.from("projects").select("slug").eq("workspace_id", workspaceId).like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export const projectService = {
  async list(workspaceId: string): Promise<Project[]> {
    if (appMode === "demo") return demoResolve(demoProjects, 0);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
    if (error) throw fromDbError(error, "Projects could not be loaded.");
    return toUiProjects(supabase, data ?? []);
  },

  async get(workspaceId: string, slug: string): Promise<Project | null> {
    if (appMode === "demo") return demoProjects.find((p) => p.slug === slug) ?? null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("projects").select("*").eq("workspace_id", workspaceId).eq("slug", slug).maybeSingle();
    if (error) throw fromDbError(error, "The project could not be loaded.");
    if (!data) return null;
    const [project] = await toUiProjects(supabase, [data]);
    return project;
  },

  async create(workspaceId: string, input: CreateProjectInput): Promise<Project> {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 160) throw new ServiceError("Project name needs between 3 and 160 characters.", "validation");
    const description = input.description.trim().slice(0, 2000);

    if (appMode === "demo") {
      const dataset = demoDatasets.find((d) => d.slug === input.datasetId);
      return {
        slug: slugify(name),
        name,
        description: description || "New analysis project.",
        ownerId: "alex",
        collaboratorIds: [],
        datasetSlug: dataset?.slug ?? "",
        status: "Draft",
        updated: "Just now",
        reportSlugs: [],
        visualizationIds: [],
      };
    }

    const supabase = await createSupabaseServerClient();
    const slug = await uniqueSlug(supabase, workspaceId, name);
    const { data, error } = await supabase
      .from("projects")
      .insert({ workspace_id: workspaceId, name, slug, description, dataset_id: input.datasetId || null, status: "active" })
      .select("*")
      .single();
    if (error) throw fromDbError(error, "The project could not be created.");
    const [project] = await toUiProjects(supabase, [data]);
    return project;
  },
};
