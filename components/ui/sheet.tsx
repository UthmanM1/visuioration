"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/format";
import { useDialog } from "./use-dialog";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "bottom";
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}

export function Sheet({ open, onClose, title, side = "right", children, className, hideTitle }: SheetProps) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  if (!open) return null;
  const position = {
    left: "inset-y-0 left-0 w-[84vw] max-w-[320px] animate-slide-in",
    right: "inset-y-0 right-0 w-[92vw] max-w-[420px] animate-slide-left",
    bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl animate-slide-up",
  }[side];
  return (
    <div className="fixed inset-0 z-[65]">
      <div className="absolute inset-0 animate-fade-in bg-night/40" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={cn("absolute flex flex-col bg-surface shadow-overlay", position, className)}>
        <div className={cn("flex items-center justify-between border-b border-line px-5 py-3.5", hideTitle && "sr-only")}>
          <h2 id={titleId} className="text-[15px] font-semibold">
            {title}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted hover:bg-paper" aria-label="Close panel">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
