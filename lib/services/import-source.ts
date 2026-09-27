import type { Dataset } from "../demo-data/types";
import { demoResolve } from "./client";

export type ImportSource = "csv" | "excel" | "sheets" | "api";

/** Demo-mode import simulation. Client-safe; live uploads go through the datasets service. */
export function simulateDemoImport(input: { name: string; source: ImportSource; fileName?: string }) {
  return demoResolve<Dataset>(
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
  );
}
