import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { AvatarStack } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getUser, projects } from "@/lib/demo-data";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: projects.find((p) => p.slug === params.slug)?.name ?? "New project" };
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const project = projects.find((p) => p.slug === params.slug);
  if (!project) {
    return (
      <>
        <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted"><Link href="/app/projects" className="hover:text-ink">Projects</Link></nav>
        <PageHeader title="New project" description="Projects created during this demo session are not saved on a server." />
        <EmptyState icon={<FolderPlus className="h-5 w-5" />} title="This project has no data yet" body="Import a dataset or create a visualization to start building this project." action={<div className="flex gap-2"><ButtonLink href="/app/datasets?import=1">Import dataset</ButtonLink><ButtonLink href="/app/visualizations/new" variant="secondary">Create visualization</ButtonLink></div>} />
      </>
    );
  }
  const people = [project.ownerId, ...project.collaboratorIds].map((id) => getUser(id)!).filter(Boolean);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted">
        <Link href="/app/projects" className="hover:text-ink">Projects</Link> <span aria-hidden>/</span> <span className="text-ink">{project.name}</span>
      </nav>
      <PageHeader
        title={project.name}
        meta={<><StatusBadge status={project.status} /><span className="text-[12px] text-ink-muted">Updated {project.updated.toLowerCase()}</span></>}
        actions={<><AvatarStack users={people} /><ButtonLink href="/app/reports/new" variant="secondary">New report</ButtonLink><ButtonLink href="/app/visualizations/new">New visualization</ButtonLink></>}
      />
      <ProjectWorkspace project={project} />
    </>
  );
}
