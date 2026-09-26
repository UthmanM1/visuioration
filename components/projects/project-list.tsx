"use client";

import Link from "next/link";
import { FileText, FolderKanban, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AvatarStack, Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { datasets, getUser, projects as initialProjects, users } from "@/lib/demo-data";
import type { Project } from "@/lib/demo-data";
import { projectService } from "@/lib/services/projects";

const filters = ["All", "Active", "In review", "Draft", "Archived"] as const;

export function ProjectList() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => projects.filter((p) => (filter === "All" || p.status === filter) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase())),
    [projects, filter, query],
  );

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (name.length < 3) {
      setError("Project name needs at least 3 characters.");
      return;
    }
    setError(null);
    setSaving(true);
    const project = await projectService.create({ name, description: String(data.get("description")).trim() || "New analysis project.", datasetSlug: String(data.get("dataset")) });
    setProjects((all) => [project, ...all]);
    setSaving(false);
    setOpen(false);
    setFilter("All");
    track("project_created", { dataset: project.datasetSlug });
    toast({ tone: "success", title: "Project created", body: `${project.name} was added to this workspace.` });
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <Segmented options={filters} value={filter} onChange={setFilter} label="Filter by status" size="md" />
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1 md:w-64 md:flex-none">
            <span className="sr-only">Search projects</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className="pl-9" />
          </label>
          <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" aria-hidden />}>New project</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title={query ? "No projects match your search" : filter === "Archived" ? "No archived projects" : "No projects yet"}
          body={query ? `Nothing matches “${query}”. Check the spelling or clear the search.` : "Projects group datasets, visualizations and reports for one piece of analysis."}
          action={query ? <Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button> : <Button onClick={() => setOpen(true)}>New project</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 grid-cols-1">
          {visible.map((p) => {
            const owner = getUser(p.ownerId)!;
            const dataset = datasets.find((d) => d.slug === p.datasetSlug);
            const collaborators = p.collaboratorIds.map((id) => getUser(id)!).filter(Boolean);
            return (
              <li key={p.slug}>
                <Link href={`/app/projects/${p.slug}`} className="group flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-panel transition-colors hover:border-petrol-500">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[16px] font-semibold tracking-[-0.01em] group-hover:text-petrol-700">{p.name}</h2>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-muted">{p.description}</p>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-[12px] sm:grid-cols-4">
                    <div>
                      <dt className="text-ink-faint">Owner</dt>
                      <dd className="mt-1 flex items-center gap-1.5 font-medium"><Avatar user={owner} size="sm" />{owner.name.split(" ")[0]}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Dataset</dt>
                      <dd className="mt-1 truncate font-medium">{dataset?.name ?? "None"}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Collaborators</dt>
                      <dd className="mt-1">{collaborators.length ? <AvatarStack users={collaborators} /> : <span className="text-ink-muted">Just you</span>}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Reports</dt>
                      <dd className="tnum mt-1 flex items-center gap-1 font-medium"><FileText className="h-3.5 w-3.5 text-ink-faint" aria-hidden />{p.reportSlugs.length}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[12px] text-ink-faint">Updated: {p.updated}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New project"
        description="Group a dataset with the charts and reports built from it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-project" loading={saving}>Create project</Button>
          </>
        }
      >
        <form id="new-project" onSubmit={onCreate} className="space-y-4" noValidate>
          <Field label="Project name" htmlFor="project-name" error={error ?? undefined}>
            <Input id="project-name" name="name" data-autofocus placeholder="Holiday season readiness" aria-invalid={!!error} aria-describedby={error ? "project-name-error" : undefined} />
          </Field>
          <Field label="Description" htmlFor="project-description" hint="Optional. What question is this project answering?">
            <Textarea id="project-description" name="description" />
          </Field>
          <Field label="Dataset" htmlFor="project-dataset">
            <Select id="project-dataset" name="dataset" defaultValue="northstar-sales">
              {datasets.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Invite collaborators" htmlFor="project-collab" hint="Demo only; no invitations are sent.">
            <Select id="project-collab" name="collab" defaultValue="">
              <option value="">Nobody yet</option>
              {users.slice(1).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
