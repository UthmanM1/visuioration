import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type Tone = "neutral" | "petrol" | "amber" | "rust" | "sage" | "dusk" | "outline" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-ink-soft",
  petrol: "bg-petrol-50 text-petrol-700",
  amber: "bg-amber-100 text-amber-700",
  rust: "bg-rust-100 text-rust-700",
  sage: "bg-sage-100 text-sage-700",
  dusk: "bg-dusk-100 text-dusk-700",
  outline: "border border-line-strong text-ink-muted",
  dark: "bg-night text-white",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-medium", tones[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function DemoTag({ className, children = "Demo data" }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-100/60 px-2 py-0.5 text-2xs font-medium text-amber-700", className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  Active: "petrol",
  Ready: "petrol",
  Published: "petrol",
  "In review": "dusk",
  Scheduled: "dusk",
  Refreshing: "dusk",
  Uploading: "dusk",
  Processing: "dusk",
  Draft: "neutral",
  Archived: "outline",
  "Needs review": "amber",
  Failed: "rust",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone[status] ?? "neutral"} dot>
      {status}
    </Badge>
  );
}
