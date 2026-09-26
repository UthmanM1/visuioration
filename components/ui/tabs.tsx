"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/format";

interface TabsProps<T extends string> {
  tabs: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
  idPrefix: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, label, className, idPrefix }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className={cn("scrollbar-thin -mb-px flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative whitespace-nowrap px-3 pb-3 pt-2 text-sm font-medium transition-colors",
              selected ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-petrol-600" : "text-ink-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="tnum ml-1.5 rounded-full bg-ink/[0.06] px-1.5 text-2xs text-ink-muted">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, idPrefix, active, children }: { id: string; idPrefix: string; active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className="animate-fade-in focus-visible:outline-none">
      {children}
    </div>
  );
}
