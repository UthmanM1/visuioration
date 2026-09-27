import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function EmptyState({ icon, title, body, action, className }: { icon: ReactNode; title: string; body: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-panel border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-petrol-600 shadow-panel">{icon}</div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
