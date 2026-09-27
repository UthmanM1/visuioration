import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Section({ children, className, id, tone = "paper" }: { children: ReactNode; className?: string; id?: string; tone?: "paper" | "surface" | "night" }) {
  const tones = { paper: "bg-paper", surface: "bg-surface border-y border-line", night: "bg-night text-white" };
  return (
    <section id={id} className={cn("py-20 sm:py-24", tones[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({ title, body, className, inverted, id }: { title: string; body?: ReactNode; className?: string; inverted?: boolean; id?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 id={id} className={cn("font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[2.5rem]", inverted ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {body ? <p className={cn("mt-4 text-[1.0625rem] leading-relaxed", inverted ? "text-white/70" : "text-ink-muted")}>{body}</p> : null}
    </div>
  );
}

export function PageHero({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <section className="grid-paper border-b border-line">
      <div className="container-page py-16 sm:py-24">
        <h1 className="max-w-3xl font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[3.5rem]">{title}</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">{body}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
