"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { EvidenceChart, evidenceTitles } from "./evidence-chart";
import type { EvidenceKind } from "@/lib/services/insights";

export function TrackInsightOpened({ id }: { id: string }) {
  useEffect(() => {
    track("insight_opened", { insight: id });
  }, [id]);
  return null;
}

export function EvidencePanel({ kinds, height = 240 }: { kinds: EvidenceKind[]; height?: number }) {
  return (
    <div className="space-y-5">
      {kinds.map((k) => (
        <figure key={k}>
          <figcaption className="mb-2 text-[13px] font-medium text-ink-soft">{evidenceTitles[k]}</figcaption>
          <EvidenceChart kind={k} height={height} />
        </figure>
      ))}
    </div>
  );
}
