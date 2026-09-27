import type { User } from "./demo-data/types";
import type { AppMode } from "./supabase/config";
import type { WorkspaceRole } from "./supabase/database.types";

/** Shapes shared by server code and client components. Safe to import anywhere. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  role: WorkspaceRole;
  initials: string;
}

export interface AppSession {
  mode: AppMode;
  user: User;
  workspaces: WorkspaceSummary[];
  workspace: WorkspaceSummary;
  canEdit: boolean;
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const palette = ["#12656A", "#4D6A9C", "#C98A1B", "#6F9A7B", "#B5452F", "#5E6873"];

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export const roleLabels: Record<WorkspaceRole, User["role"]> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const rolePermissions: Record<WorkspaceRole, User["permissions"]> = {
  owner: "Full access",
  admin: "Full access",
  member: "Can edit",
  viewer: "Can view",
};

export function toUiUser(input: { id: string; name: string; email: string; title?: string; role?: WorkspaceRole; lastActive?: string }): User {
  const role = input.role ?? "member";
  return {
    id: input.id,
    name: input.name || input.email.split("@")[0],
    initials: initialsFor(input.name || input.email),
    email: input.email,
    role: roleLabels[role],
    title: input.title ?? "",
    lastActive: input.lastActive ?? "",
    permissions: rolePermissions[role],
    color: colorFor(input.id),
  };
}
