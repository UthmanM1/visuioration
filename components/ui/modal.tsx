"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/format";
import { useDialog } from "./use-dialog";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  const descId = useId();
  if (!open) return null;
  const widths = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-night/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn("relative flex max-h-[92dvh] w-full animate-rise flex-col rounded-t-2xl bg-surface shadow-overlay sm:rounded-2xl", widths[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-[13px] text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-ink-muted hover:bg-paper hover:text-ink" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
