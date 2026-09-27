import { TeamTable } from "@/components/team/team-table";
import { PageHeader } from "@/components/ui/page-header";
import { projectService } from "@/lib/services/projects";
import { requireSession } from "@/lib/services/session";
import { workspaceService } from "@/lib/services/workspaces";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await requireSession();
  const [members, projects] = await Promise.all([workspaceService.members(session.workspace.id), projectService.list(session.workspace.id)]);
  const projectCounts: Record<string, number> = {};
  for (const p of projects) {
    for (const id of [p.ownerId, ...p.collaboratorIds]) if (id) projectCounts[id] = (projectCounts[id] ?? 0) + 1;
  }
  return (
    <>
      <PageHeader title="Team" description={`People in the ${session.workspace.name} workspace and what they can do.`} />
      <TeamTable key={session.workspace.id} initialMembers={members} projectCounts={projectCounts} />
      <section aria-labelledby="roles" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 grid-cols-1">
        <h2 id="roles" className="sr-only">Role permissions</h2>
        {(session.mode === "live"
          ? [
              ["Owner", "Full control, including deleting the workspace. Can't be removed by others."],
              ["Admin", "Manages members, roles and workspace settings, and edits all content."],
              ["Member", "Creates and edits projects, datasets, visualizations and reports."],
              ["Viewer", "Reads everything in the workspace but can't change it."],
            ]
          : [
              ["Owner", "Manages billing, members and every project."],
              ["Analyst", "Imports data, builds visualizations and reports."],
              ["Marketing", "Edits marketing projects and campaign reports."],
              ["Executive", "Views and comments on dashboards and reports."],
            ]
        ).map(([r, d]) => (
          <div key={r} className="rounded-panel border border-line bg-surface p-4">
            <p className="text-[13px] font-semibold">{r}</p>
            <p className="mt-1 text-[13px] text-ink-muted">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
