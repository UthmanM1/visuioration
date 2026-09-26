"use client";

import { ArrowRight, BarChart3, CornerDownLeft, Database, FileText, FolderKanban, Search, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialog } from "@/components/ui/use-dialog";
import { cn } from "@/lib/format";
import { search } from "@/lib/search";
import type { SearchGroup } from "@/lib/search";

const groupIcons: Record<SearchGroup, typeof Search> = { Commands: Zap, Projects: FolderKanban, Datasets: Database, Visualizations: BarChart3, Reports: FileText, Insights: Sparkles };
const groupOrder: SearchGroup[] = ["Commands", "Projects", "Datasets", "Visualizations", "Reports", "Insights"];

export function CommandPalette({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: "command" | "search" }) {
  const router = useRouter();
  const ref = useDialog(open, onClose);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => search(query, mode === "command"), [query, mode]);
  const grouped = useMemo(() => groupOrder.map((g) => ({ group: g, items: results.filter((r) => r.group === g) })).filter((g) => g.items.length), [results]);
  const flat = grouped.flatMap((g) => g.items);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open, mode]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function go(index: number) {
    const item = flat[index];
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[10vh]">
      <div className="absolute inset-0 animate-fade-in bg-night/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={mode === "command" ? "Command menu" : "Search workspace"} className="relative w-full max-w-xl animate-rise overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-ink-faint" aria-hidden />
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(active);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat[active] ? `${listId}-${flat[active].id}` : undefined}
            aria-autocomplete="list"
            placeholder={mode === "command" ? "Type a command or search…" : "Search projects, datasets, reports, insights…"}
            className="h-14 flex-1 bg-transparent text-[15px] placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-faint sm:block">Esc</kbd>
        </div>
        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">{query ? `No results for “${query}”` : "Start typing to search"}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{query ? "Try a project, dataset, report or insight name, like “West” or “Q2”." : "Search covers projects, datasets, visualizations, reports and insights."}</p>
            </div>
          ) : (
            grouped.map(({ group, items }) => {
              const Icon = groupIcons[group];
              return (
                <div key={group} role="group" aria-label={group} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-ink-faint">{group}</p>
                  {items.map((item) => {
                    const index = flat.indexOf(item);
                    const selected = index === active;
                    return (
                      <div
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={index}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(index)}
                        className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", selected ? "bg-petrol-50" : "")}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-petrol-600" : "text-ink-faint")} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                          {item.subtitle ? <span className="block truncate text-[12px] text-ink-muted">{item.subtitle}</span> : null}
                        </span>
                        {selected ? <CornerDownLeft className="h-3.5 w-3.5 text-ink-faint" aria-hidden /> : <ArrowRight className="h-3.5 w-3.5 text-transparent" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-ink-faint sm:flex">
          <span><kbd className="font-sans">↑↓</kbd> to move</span>
          <span><kbd className="font-sans">Enter</kbd> to open</span>
          <span className="ml-auto">{flat.length} result{flat.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
