"use client";

import { useMemo, useState } from "react";
import { ChartRenderer } from "@/components/charts/chart-renderer";
import { Segmented } from "@/components/ui/segmented";
import { runQuery } from "@/lib/query";
import type { Dimension, Measure } from "@/lib/query";
import type { ChartKind } from "@/lib/demo-data";

const views: Record<string, { dimension: Dimension; kind: ChartKind; groupBy: "None" | "Region" }> = {
  Trend: { dimension: "Date", kind: "area", groupBy: "None" },
  Regions: { dimension: "Date", kind: "bar", groupBy: "Region" },
  Categories: { dimension: "Category", kind: "donut", groupBy: "None" },
  Devices: { dimension: "Device", kind: "bar", groupBy: "None" },
};

export function InteractivePreview() {
  const [view, setView] = useState<keyof typeof views>("Trend");
  const [measure, setMeasure] = useState<Measure>("Revenue");
  const config = views[view];
  const effectiveMeasure = view === "Devices" && measure === "Revenue" ? "Conversion" : measure;
  const result = useMemo(
    () => runQuery({ dimension: config.dimension, measure: effectiveMeasure, groupBy: config.groupBy, aggregation: "Sum", range: "Last 12 months", regionFilter: "All regions" }),
    [config, effectiveMeasure],
  );
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4 shadow-panel sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented options={Object.keys(views) as Array<keyof typeof views>} value={view} onChange={setView} label="Preview view" size="md" />
        <Segmented options={["Revenue", "Orders", "Conversion"] as Measure[]} value={effectiveMeasure} onChange={setMeasure} label="Metric" />
      </div>
      <div className="mt-6">
        <ChartRenderer kind={config.kind} result={result} height={300} title={`${effectiveMeasure} by ${config.dimension.toLowerCase()}`} />
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">Northstar Retail Group demo data, FY26.{result.note ? ` ${result.note}` : ""}</p>
    </div>
  );
}
