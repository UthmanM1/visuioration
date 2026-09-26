import { ProjectList } from "@/components/projects/project-list";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Each project connects a dataset to the visualizations, insights and reports built from it." />
      <ProjectList />
    </>
  );
}
