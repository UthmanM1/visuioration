import { cn } from "@/lib/format";

export function ArchitectureDiagram({ steps, inverted = false }: { steps: Array<{ label: string; detail: string }>; inverted?: boolean }) {
  return (
    <ol className="relative mx-auto max-w-xl">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex flex-col items-center">
          <div className={cn("w-full rounded-xl border px-5 py-4 text-center", inverted ? "border-night-line bg-night-2" : "border-line bg-surface shadow-panel", i === 0 && (inverted ? "border-[#5FB3B6]/50" : "border-petrol-500"))}>
            <p className="font-semibold">{step.label}</p>
            {step.detail ? <p className={cn("mt-0.5 text-[13px]", inverted ? "text-white/55" : "text-ink-muted")}>{step.detail}</p> : null}
          </div>
          {i < steps.length - 1 ? (
            <svg width="16" height="28" viewBox="0 0 16 28" className={inverted ? "text-white/30" : "text-ink-faint"} aria-hidden>
              <path d="M8 0v24M3 19l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
