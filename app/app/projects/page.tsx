import { ProjectList } from "@/components/projects/project-list";
import { PageHeader } from "@/components/ui/page-header";
import { datasetService } from "@/lib/services/datasets";
import { projectService } from "@/lib/services/projects";
import { requireSession } from "@/lib/services/session";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await requireSession();
  const [projects, datasets] = await Promise.all([projectService.list(session.workspace.id), datasetService.list(session.workspace.id)]);
  return (
    <>
      <PageHeader title="Projects" description="Each project connects a dataset to the visualizations, insights and reports built from it." />
      <ProjectList key={session.workspace.id} initialProjects={projects} datasets={datasets} />
    </>
  );
}
