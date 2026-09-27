"use server";

import { enforceUserRateLimit } from "../rate-limit";
import { revalidatePath } from "next/cache";
import { datasetService } from "../services/datasets";
import { ServiceError } from "../services/errors";
import { requireSession } from "../services/session";
import { appMode } from "../supabase/config";
import { runAction } from "./helpers";

async function writableSession() {
  if (appMode !== "live") throw new ServiceError("Uploads need a connected database.", "forbidden");
  const session = await requireSession();
  if (!session.canEdit) throw new ServiceError("Viewers can't add or delete datasets in this workspace.", "forbidden");
  return session;
}

export async function startDatasetUploadAction(input: { name: string; fileName: string; size: number }) {
  return runAction(async () => {
    const session = await writableSession();
    return datasetService.startUpload(session.workspace.id, {
      name: String(input.name ?? ""),
      fileName: String(input.fileName ?? ""),
      size: Number(input.size),
    });
  });
}

export async function completeDatasetUploadAction(input: { datasetId: string }) {
  return runAction(async () => {
    const session = await writableSession();
    await enforceUserRateLimit("dataset_process");
    const dataset = await datasetService.completeUpload(session.workspace.id, String(input.datasetId));
    revalidatePath("/app/datasets");
    return dataset;
  });
}

export async function deleteDatasetAction(input: { datasetId: string }) {
  return runAction(async () => {
    const session = await writableSession();
    await datasetService.remove(session.workspace.id, String(input.datasetId));
    revalidatePath("/app/datasets");
    revalidatePath("/app/projects");
  });
}

export async function prepareDatasetForChartsAction(input: { datasetId: string }) {
  return runAction(async () => {
    const session = await writableSession();
    await enforceUserRateLimit("dataset_process");
    const dataset = await datasetService.prepareForCharts(session.workspace.id, String(input.datasetId));
    revalidatePath("/app/datasets");
    revalidatePath("/app/visualizations/new");
    return dataset;
  });
}
