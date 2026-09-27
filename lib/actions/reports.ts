"use server";

import { enforceUserRateLimit } from "../rate-limit";
import { revalidatePath } from "next/cache";
import { liveReportService } from "../services/live-reports";
import { ServiceError } from "../services/errors";
import { requireSession } from "../services/session";
import { appMode } from "../supabase/config";
import { runAction } from "./helpers";

async function liveSession({ write }: { write: boolean }) {
  if (appMode !== "live") throw new ServiceError("Reports need a connected database.", "forbidden");
  const session = await requireSession();
  if (write && !session.canEdit) throw new ServiceError("Viewers can't change reports in this workspace.", "forbidden");
  return session;
}

async function renderFor(session: Awaited<ReturnType<typeof requireSession>>, reportId: string) {
  await enforceUserRateLimit("report_render");
  const report = await liveReportService.get(session.workspace.id, { id: reportId });
  if (!report) throw new ServiceError("That report no longer exists.", "not_found");
  return liveReportService.render(session.workspace.id, report, { workspaceName: session.workspace.name, preparedBy: session.user.name });
}

export async function saveReportAction(input: { id?: string; name: string; description: string; period: string; sections: unknown }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const saved = await liveReportService.save(session.workspace.id, {
      id: input.id ? String(input.id) : undefined,
      name: String(input.name ?? ""),
      description: String(input.description ?? ""),
      period: String(input.period ?? ""),
      sections: input.sections,
    });
    revalidatePath("/app/reports");
    return { id: saved.id, slug: saved.slug };
  });
}

export async function deleteReportAction(input: { id: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await liveReportService.remove(session.workspace.id, String(input.id));
    revalidatePath("/app/reports");
  });
}

export async function listSharesAction(input: { reportId: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: false });
    return liveReportService.listShares(session.workspace.id, String(input.reportId));
  });
}

/** Creates an expiring link that serves a snapshot of the report as it looks right now. */
export async function createShareAction(input: { reportId: string; label: string; expiresInDays: number | null; expiresAt?: string | null }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const rendered = await renderFor(session, String(input.reportId));
    const link = await liveReportService.createShare(
      session.workspace.id,
      String(input.reportId),
      { label: String(input.label ?? ""), expiresInDays: input.expiresInDays === null ? null : Number(input.expiresInDays), expiresAt: input.expiresAt ? String(input.expiresAt) : null },
      rendered,
    );
    revalidatePath("/app/reports");
    return link;
  });
}

export async function refreshShareAction(input: { shareId: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    const reportId = await liveReportService.shareReportId(session.workspace.id, String(input.shareId));
    if (!reportId) throw new ServiceError("That link no longer exists.", "not_found");
    await liveReportService.refreshShare(session.workspace.id, String(input.shareId), await renderFor(session, reportId));
  });
}

export async function revokeShareAction(input: { shareId: string }) {
  return runAction(async () => {
    const session = await liveSession({ write: true });
    await liveReportService.revokeShare(session.workspace.id, String(input.shareId));
    revalidatePath("/app/reports");
  });
}
