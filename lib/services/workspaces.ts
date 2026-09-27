import "server-only";
import { users as demoUsers, workspace as demoWorkspace } from "../demo-data";
import type { User } from "../demo-data/types";
import { appMode } from "../supabase/config";
import { createSupabaseServerClient } from "../supabase/server";
import { toUiUser } from "../session-types";
import { fromDbError, ServiceError } from "./errors";

export const workspaceService = {
  async get(workspaceId: string) {
    if (appMode === "demo") return { id: workspaceId, name: demoWorkspace.name, description: demoWorkspace.description };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("workspaces").select("id, name, description").eq("id", workspaceId).maybeSingle();
    if (error) throw fromDbError(error);
    if (!data) throw new ServiceError("Workspace not found.", "not_found");
    return data;
  },

  async update(workspaceId: string, input: { name: string; description: string }) {
    if (appMode === "demo") return;
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("workspaces")
      .update({ name: input.name, description: input.description }, { count: "exact" })
      .eq("id", workspaceId);
    if (error) throw fromDbError(error, "The workspace could not be updated.");
    if (count === 0) throw new ServiceError("Only owners and admins can change workspace settings.", "forbidden");
  },

  async create(name: string, description = "") {
    if (appMode === "demo") return "demo";
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_workspace", { workspace_name: name, workspace_description: description });
    if (error || !data) throw fromDbError(error ?? { message: "No id returned" }, "The workspace could not be created.");
    return data;
  },

  async members(workspaceId: string): Promise<User[]> {
    if (appMode === "demo") return demoUsers;
    const supabase = await createSupabaseServerClient();
    const { data: rows, error } = await supabase.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", workspaceId);
    if (error) throw fromDbError(error);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, job_title").in("id", (rows ?? []).map((r) => r.user_id));
    return (rows ?? []).map((r) => {
      const p = profiles?.find((x) => x.id === r.user_id);
      return toUiUser({ id: r.user_id, name: p?.full_name ?? "", email: p?.email ?? "", title: p?.job_title ?? "", role: r.role });
    });
  },
};

export const profileService = {
  async update(userId: string, input: { fullName: string; jobTitle: string }) {
    if (appMode === "demo") return;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("profiles").update({ full_name: input.fullName, job_title: input.jobTitle }).eq("id", userId);
    if (error) throw fromDbError(error, "Your profile could not be saved.");
  },
};
