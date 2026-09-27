"use server";

import { revalidatePath } from "next/cache";
import { projectService } from "../services/projects";
import { requireSession } from "../services/session";
import { ServiceError } from "../services/errors";
import { runAction } from "./helpers";

export async function createProjectAction(input: { name: string; description: string; datasetId: string | null }) {
  return runAction(async () => {
    const session = await requireSession();
    if (!session.canEdit) throw new ServiceError("Viewers can't create projects in this workspace.", "forbidden");
    const project = await projectService.create(session.workspace.id, input);
    revalidatePath("/app/projects");
    return project;
  });
}
