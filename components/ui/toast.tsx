"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

const ToastContext = createContext<(toast: Omit<ToastItem, "id">) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {items.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl bg-night px-4 py-3 text-white shadow-overlay">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toast.tone === "success" && "text-petrol-200", toast.tone === "error" && "text-rust-100", toast.tone === "info" && "text-dusk-100")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.body ? <p className="mt-0.5 text-[13px] text-white/70">{toast.body}</p> : null}
              </div>
              <button onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-white/60 hover:text-white" aria-label="Dismiss notification">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
