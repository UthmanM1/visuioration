import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { AvatarStack } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getUser } from "@/lib/demo-data";
import type { User } from "@/lib/demo-data";
import { datasetService } from "@/lib/services/datasets";
import { projectService } from "@/lib/services/projects";
import { requireSession } from "@/lib/services/session";

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();
  const project = await projectService.get(session.workspace.id, params.slug);
  return { title: project?.name ?? "Project not found" };
}

export default async function ProjectPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await requireSession();
  const project = await projectService.get(session.workspace.id, params.slug);
  if (!project) notFound();

  const sample = session.mode === "demo";
  const dataset = !sample && project.datasetSlug ? (await datasetService.list(session.workspace.id)).find((d) => d.slug === project.datasetSlug) : undefined;
  const people: User[] = sample
    ? [project.ownerId, ...project.collaboratorIds].map((id) => getUser(id)).filter((u): u is User => Boolean(u))
    : [project.owner, ...(project.collaborators ?? [])].filter((u): u is User => Boolean(u));

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted">
        <Link href="/app/projects" className="hover:text-ink">Projects</Link> <span aria-hidden>/</span> <span className="text-ink">{project.name}</span>
      </nav>
      <PageHeader
        title={project.name}
        meta={<><StatusBadge status={project.status} /><span className="text-[12px] text-ink-muted">Updated {project.updated.toLowerCase()}</span></>}
        actions={<>{people.length ? <AvatarStack users={people} /> : null}<ButtonLink href="/app/reports/new" variant="secondary">New report</ButtonLink><ButtonLink href="/app/visualizations/new">New visualization</ButtonLink></>}
      />
      <ProjectWorkspace project={project} dataset={dataset} sample={sample} />
    </>
  );
}
