"use client";

import { useState } from "react";
import { RegionBars } from "@/components/charts/region-bars";
import { Delta } from "@/components/ui/delta";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { regionSummary } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";

export function RegionalPanel() {
  const [period, setPeriod] = useState<"FY26" | "Q2">("FY26");
  const [selected, setSelected] = useState<string | null>("West");
  const data = regionSummary.map((r) => ({ region: r.region, value: period === "FY26" ? r.revenue : r.q2 }));
  const detail = regionSummary.find((r) => r.region === selected);
  return (
    <Panel className="flex flex-col">
      <PanelHeader title="Regional performance" description="Select a region to see detail" actions={<Segmented options={["FY26", "Q2"] as const} value={period} onChange={setPeriod} label="Period" />} />
      <div className="px-3 pt-3">
        <RegionBars data={data} selected={selected} onSelect={(r) => setSelected(selected === r ? null : r)} height={200} />
      </div>
      <div className="mt-auto grid grid-cols-4 gap-1 border-t border-line p-2" role="group" aria-label="Choose region">
        {regionSummary.map((r) => (
          <button key={r.region} onClick={() => setSelected(r.region)} aria-pressed={selected === r.region} className={selected === r.region ? "rounded-md bg-petrol-50 py-1.5 text-[12px] font-medium text-petrol-700" : "rounded-md py-1.5 text-[12px] text-ink-muted hover:bg-paper"}>
            {r.region}
          </button>
        ))}
      </div>
      {detail ? (
        <dl className="grid grid-cols-3 gap-3 border-t border-line px-5 py-4 text-[13px]" aria-live="polite">
          <div>
            <dt className="text-ink-muted">Share</dt>
            <dd className="tnum font-semibold">{detail.share.toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Q2 vs Q1</dt>
            <dd><Delta value={detail.growth} /></dd>
          </div>
          <div>
            <dt className="text-ink-muted">Stores</dt>
            <dd className="tnum font-semibold">{detail.stores}</dd>
          </div>
          <p className="col-span-3 text-[12px] text-ink-muted">
            {detail.region} generated {formatCurrency(period === "FY26" ? detail.revenue : detail.q2)} in {period === "FY26" ? "FY26" : "Q2 2026"}.
            {detail.region === "West" ? " West had the year's sharpest monthly decline in March." : ""}
          </p>
        </dl>
      ) : null}
    </Panel>
  );
}
