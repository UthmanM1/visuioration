import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { currentUser, workspaces as demoWorkspaces } from "../demo-data";
import { appMode } from "../supabase/config";
import { createSupabaseServerClient } from "../supabase/server";
import { initialsFor, toUiUser } from "../session-types";
import type { AppSession, WorkspaceSummary } from "../session-types";

export const WORKSPACE_COOKIE = "vz_workspace";

function demoSession(): AppSession {
  const list: WorkspaceSummary[] = demoWorkspaces.map((w) => ({ id: w.id, slug: w.id, name: w.name, description: w.description, role: "owner", initials: initialsFor(w.name) }));
  return { mode: "demo", user: currentUser, workspaces: list, workspace: list[0], canEdit: true };
}

/**
 * Resolves the signed-in user and their active workspace. Cached per request.
 * Returns null in live mode when nobody is signed in.
 */
export const getOptionalSession = cache(async (): Promise<AppSession | null> => {
  if (appMode === "demo") return demoSession();
  if (appMode === "unconfigured") return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("workspace_members").select("workspace_id, role").eq("user_id", user.id),
  ]);

  let rows = memberships ?? [];
  if (rows.length === 0) {
    // The signup trigger normally creates a workspace; this covers accounts created before the migration ran.
    const name = profile?.full_name ? `${profile.full_name}'s workspace` : "My workspace";
    const { data: newId } = await supabase.rpc("create_workspace", { workspace_name: name });
    if (newId) rows = [{ workspace_id: newId, role: "owner" }];
  }

  const { data: workspaceRows } = rows.length
    ? await supabase.from("workspaces").select("id, name, slug, description").in("id", rows.map((r) => r.workspace_id))
    : { data: [] };

  const workspaces: WorkspaceSummary[] = (workspaceRows ?? [])
    .map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      role: rows.find((r) => r.workspace_id === w.id)?.role ?? "viewer",
      initials: initialsFor(w.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (workspaces.length === 0) return null;

  const preferred = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === preferred) ?? workspaces[0];
  const email = user.email ?? profile?.email ?? "";

  return {
    mode: "live",
    user: toUiUser({ id: user.id, name: profile?.full_name ?? "", email, title: profile?.job_title ?? "", role: workspace.role, lastActive: "Active now" }),
    workspaces,
    workspace,
    canEdit: workspace.role !== "viewer",
  };
});

/** Same as getOptionalSession, but sends signed-out visitors to the login page. */
export async function requireSession(): Promise<AppSession> {
  const session = await getOptionalSession();
  if (!session) redirect("/login");
  return session;
}
