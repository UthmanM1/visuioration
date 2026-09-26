import { datasets, salesSample } from "../demo-data";
import type { Dataset } from "../demo-data";
import { demoResolve } from "./client";

export type ImportSource = "csv" | "excel" | "sheets" | "api";

export const datasetService = {
  list: () => demoResolve(datasets),
  get: (slug: string) => demoResolve(datasets.find((d) => d.slug === slug) ?? null),
  preview: (slug: string) => demoResolve(slug === "northstar-sales" ? salesSample : []),
  /** Production: upload to object storage, then enqueue a parsing/profiling job. */
  import: (input: { name: string; source: ImportSource; fileName?: string }) =>
    demoResolve<Dataset>(
      {
        slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: input.name,
        description: input.fileName ? `Imported from ${input.fileName}` : "Imported demo dataset",
        rows: 2400,
        columns: 12,
        source: ({ csv: "CSV upload", excel: "Excel", sheets: "Google Sheets", api: "REST API" } as const)[input.source],
        updated: "Just now",
        status: "Ready",
        sizeLabel: "0.6 MB",
        owner: "alex",
      },
      400,
    ),
};
