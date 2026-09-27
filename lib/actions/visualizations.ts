"use server";

import { revalidatePath } from "next/cache";
import type { ChartKind } from "../demo-data/types";
import { dashboardService } from "../services/dashboards";
import { ServiceError } from "../services/errors";
import { requireSession } from "../services/session";
import { visualizationService } from "../services/visualizations";
import { appMode } from "../supabase/config";
import { parseDefinition } from "../visualizations/definition";
import { runAction } from "./helpers";

async function liveSession({ write }: { write: boolean }) {
  if (appMode !== "live") throw new ServiceError("Saving charts needs a connected database.", "forbidden");
  const session = await requireSession();
  if (write && !session.canEdit) throw new ServiceError("Viewers can't change visualizations in this workspace.", "forbidden");
  return session;
}

function definitionFrom(value: unknown) {
  const definition = parseDefinition(value);
  if (!definition) throw new ServiceError("The chart settings are incomplete.", "validation");
  return definition;
}

export async function runVisualizationAction(input: { datasetId: string; definition: unknown; kind: ChartKind }) {
  return runAction(async () => {
    const session = await liveSession({ write: false });
    return visualizationService.run(session.workspace.id, String(input.datasetId), definitionFrom(input.definition), input.kind);
  });
}

export async function saveVisualizationAction(input: { id?: string; name: string; description: string; kind: ChartKind; datasetId: string; definition: unknown; pinned: boolean }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const saved = await visualizationService.save(session.workspace.id, {
      id: input.id ? String(input.id) : undefined,
      name: String(input.name ?? ""),
      description: String(input.description ?? ""),
      kind: input.kind,
      datasetId: String(input.datasetId),
      definition: definitionFrom(input.definition),
      pinned: Boolean(input.pinned),
    });
    await dashboardService.setOnDefault(session.workspace.id, saved.id, saved.kind, Boolean(input.pinned));
    revalidatePath("/app/visualizations");
    revalidatePath("/app");
    return saved;
  });
}

export async function renameVisualizationAction(input: { id: string; name: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await visualizationService.rename(session.workspace.id, String(input.id), String(input.name ?? ""));
    revalidatePath("/app/visualizations");
  });
}

/** "Add to dashboard" / "Remove from dashboard": updates the workspace's default dashboard. */
export async function pinVisualizationAction(input: { id: string; pinned: boolean }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const viz = await visualizationService.get(session.workspace.id, String(input.id));
    if (!viz) throw new ServiceError("That visualization no longer exists.", "not_found");
    await dashboardService.setOnDefault(session.workspace.id, viz.id, viz.kind, Boolean(input.pinned));
    await visualizationService.setPinned(session.workspace.id, viz.id, Boolean(input.pinned));
    revalidatePath("/app/visualizations");
    revalidatePath("/app");
  });
}

export async function duplicateVisualizationAction(input: { id: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const copy = await visualizationService.duplicate(session.workspace.id, String(input.id));
    revalidatePath("/app/visualizations");
    return copy;
  });
}

export async function deleteVisualizationAction(input: { id: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await visualizationService.remove(session.workspace.id, String(input.id));
    revalidatePath("/app/visualizations");
  });
}
