"use client";

import { cn } from "@/lib/format";

export function Segmented<T extends string>({ options, value, onChange, label, size = "sm" }: { options: readonly T[]; value: T; onChange: (value: T) => void; label: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control border border-line bg-paper p-0.5">
      {options.map((option) => (
        <button
          key={option}
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "tnum rounded-[6px] font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
            value === option ? "bg-surface text-ink shadow-panel" : "text-ink-muted hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
