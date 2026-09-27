import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Info, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const toneStyle = {
  risk: { icon: AlertTriangle, label: "Needs attention", className: "text-rust-700 bg-rust-100" },
  opportunity: { icon: TrendingUp, label: "Opportunity", className: "text-sage-700 bg-sage-100" },
  neutral: { icon: Info, label: "Observation", className: "text-dusk-700 bg-dusk-100" },
};

export function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const tone = toneStyle[insight.tone];
  const Icon = tone.icon;
  return (
    <Link href={`/app/insights/${insight.id}`} className="group flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-petrol-500">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium", tone.className)}>
          <Icon className="h-3 w-3" aria-hidden />
          {tone.label}
        </span>
        <span className="text-2xs text-ink-faint">{insight.period}</span>
      </div>
      <h3 className="mt-3 text-[14px] font-semibold leading-snug text-ink group-hover:text-petrol-700">{insight.title}</h3>
      <p className={cn("mt-1.5 text-[13px] leading-relaxed text-ink-muted", compact && "line-clamp-3")}>{insight.summary}</p>
      <div className="mt-auto flex items-center justify-between pt-4 text-[12px]">
        <span className="tnum font-medium text-ink-soft">Impact {insight.impact}</span>
        <span className="inline-flex items-center gap-0.5 text-petrol-700">Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></span>
      </div>
    </Link>
  );
}
