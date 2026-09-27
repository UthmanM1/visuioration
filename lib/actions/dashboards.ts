"use server";

import { revalidatePath } from "next/cache";
import type { DashboardWidget } from "../dashboards/layout";
import { dashboardService } from "../services/dashboards";
import { ServiceError } from "../services/errors";
import { requireSession } from "../services/session";
import { visualizationService } from "../services/visualizations";
import { renderVisualization } from "../services/widgets";
import { appMode } from "../supabase/config";
import { requireText, runAction } from "./helpers";

async function liveSession({ write }: { write: boolean }) {
  if (appMode !== "live") throw new ServiceError("Dashboards need a connected database.", "forbidden");
  const session = await requireSession();
  if (write && !session.canEdit) throw new ServiceError("Viewers can't change dashboards in this workspace.", "forbidden");
  return session;
}

export async function createDashboardAction(input: { name: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const dashboard = await dashboardService.create(session.workspace.id, requireText(input.name, "Dashboard name", { max: 160 }));
    revalidatePath("/app");
    return dashboard;
  });
}

export async function saveDashboardAction(input: { id: string; name: string; widgets: DashboardWidget[] }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    if (!Array.isArray(input.widgets)) throw new ServiceError("The layout is invalid.", "validation");
    await dashboardService.save(session.workspace.id, String(input.id), { name: String(input.name ?? ""), widgets: input.widgets });
    revalidatePath("/app");
    revalidatePath("/app/visualizations");
  });
}

export async function deleteDashboardAction(input: { id: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await dashboardService.remove(session.workspace.id, String(input.id));
    revalidatePath("/app");
    revalidatePath("/app/visualizations");
  });
}

export async function setDefaultDashboardAction(input: { id: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await dashboardService.setDefault(session.workspace.id, String(input.id));
    revalidatePath("/app");
    revalidatePath("/app/visualizations");
  });
}

/** Calculates one chart for a widget being added in edit mode. */
export async function loadWidgetAction(input: { visualizationId: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: false });
    const viz = await visualizationService.get(session.workspace.id, String(input.visualizationId));
    if (!viz) throw new ServiceError("That chart no longer exists.", "not_found");
    return renderVisualization(session.workspace.id, viz);
  });
}
