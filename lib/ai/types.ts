import type { ChartKind } from "../demo-data/types";
import type { ChartData, VisualizationDefinition } from "../visualizations/definition";

/** One computed fact that the explanation may quote. Every number here came from the database. */
export interface EvidenceFact {
  label: string;
  value: number;
  format: "currency" | "percent" | "integer" | "decimal";
}

export interface EvidenceItem {
  id: string; // "E1", "E2", ...
  title: string;
  /** What was computed, in plain words: measure, grouping, filters, range, rows matched. */
  description: string;
  kind: ChartKind;
  datasetId: string;
  definition: VisualizationDefinition;
  data: ChartData;
  facts: EvidenceFact[];
  /** Top rows shown in the evidence table. */
  rows: Array<{ label: string; series: string | null; value: number | null }>;
}

export interface AiAnswer {
  id: string;
  question: string;
  status: "answered" | "cannot_answer";
  answer: string;
  /** "model": written by the LLM and every number verified. "template": built from computed facts only. */
  explanation: "model" | "template";
  evidence: EvidenceItem[];
  followUps: string[];
  dataset: { id: string; name: string; slug: string } | null;
  notes: string[];
}
