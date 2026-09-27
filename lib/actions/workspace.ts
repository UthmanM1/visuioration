"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { profileService, workspaceService } from "../services/workspaces";
import { requireSession, WORKSPACE_COOKIE } from "../services/session";
import { ServiceError } from "../services/errors";
import { requireText, runAction } from "./helpers";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function switchWorkspaceAction(workspaceId: string) {
  return runAction(async () => {
    const session = await requireSession();
    if (!session.workspaces.some((w) => w.id === workspaceId)) throw new ServiceError("You're not a member of that workspace.", "forbidden");
    (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: ONE_YEAR });
    revalidatePath("/app", "layout");
  });
}

export async function createWorkspaceAction(input: { name: string }) {
  return runAction(async () => {
    await requireSession();
    const name = requireText(input.name, "Workspace name", { min: 2, max: 120 });
    const id = await workspaceService.create(name);
    (await cookies()).set(WORKSPACE_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: ONE_YEAR });
    revalidatePath("/app", "layout");
    return { id };
  });
}

export async function updateWorkspaceAction(input: { name: string; description: string }) {
  return runAction(async () => {
    const session = await requireSession();
    const name = requireText(input.name, "Workspace name", { min: 2, max: 120 });
    const description = String(input.description ?? "").trim().slice(0, 300);
    await workspaceService.update(session.workspace.id, { name, description });
    revalidatePath("/app", "layout");
  });
}

export async function updateProfileAction(input: { fullName: string; jobTitle: string }) {
  return runAction(async () => {
    const session = await requireSession();
    const fullName = requireText(input.fullName, "Full name", { max: 120 });
    const jobTitle = String(input.jobTitle ?? "").trim().slice(0, 120);
    await profileService.update(session.user.id, { fullName, jobTitle });
    revalidatePath("/app", "layout");
  });
}

/** Saves the answers from /onboarding: names the active workspace and records the user's role. */
export async function completeOnboardingAction(input: { workspaceName: string; role: string | null }) {
  return runAction(async () => {
    const session = await requireSession();
    const name = requireText(input.workspaceName, "Workspace name", { min: 2, max: 120 });
    if (session.workspace.role === "owner" || session.workspace.role === "admin") {
      await workspaceService.update(session.workspace.id, { name, description: session.workspace.description });
    }
    if (input.role) await profileService.update(session.user.id, { fullName: session.user.name, jobTitle: input.role.slice(0, 120) });
    revalidatePath("/app", "layout");
  });
}
