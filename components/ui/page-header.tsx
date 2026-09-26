import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, meta }: { title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {meta ? <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
