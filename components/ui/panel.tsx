import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-panel border border-line bg-surface shadow-panel", className)} {...props} />;
}

interface PanelHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}

export function PanelHeader({ title, description, actions, as: Heading = "h2", id, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <Heading id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </Heading>
        {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
