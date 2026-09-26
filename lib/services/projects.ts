import { projects } from "../demo-data";
import type { Project } from "../demo-data";
import { demoResolve } from "./client";

export const projectService = {
  list: () => demoResolve(projects),
  get: (slug: string) => demoResolve(projects.find((p) => p.slug === slug) ?? null),
  create: (input: Pick<Project, "name" | "description" | "datasetSlug">) =>
    demoResolve<Project>(
      {
        ...input,
        slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        ownerId: "alex",
        collaboratorIds: [],
        status: "Draft",
        updated: "Just now",
        reportSlugs: [],
        visualizationIds: [],
      },
      650,
    ),
};
