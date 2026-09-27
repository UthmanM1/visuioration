import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { workspaceSearchItems } from "@/lib/search";
import { datasetService } from "@/lib/services/datasets";
import { projectService } from "@/lib/services/projects";
import { requireSession } from "@/lib/services/session";
import { liveReportService } from "@/lib/services/live-reports";
import { visualizationService } from "@/lib/services/visualizations";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Visuioration" },
  robots: { index: false, follow: false },
};

// Workspace pages depend on the signed-in user, so they are rendered per request.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [projects, datasets, visualizations, reports] = await Promise.all([
    projectService.list(session.workspace.id),
    datasetService.list(session.workspace.id),
    session.mode === "live" ? visualizationService.list(session.workspace.id) : Promise.resolve(undefined),
    session.mode === "live" ? liveReportService.list(session.workspace.id) : Promise.resolve(undefined),
  ]);
  const searchItems = workspaceSearchItems({
    projects,
    datasets,
    visualizations,
    reports,
    datasetHref: (slug) => (session.mode === "live" || slug === "northstar-sales" ? `/app/datasets/${slug}` : "/app/datasets"),
  });
  return (
    <AppShell session={session} recentProjects={projects.slice(0, 3).map((p) => ({ slug: p.slug, name: p.name }))} searchItems={searchItems}>
      {children}
    </AppShell>
  );
}
