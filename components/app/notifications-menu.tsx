"use client";

import Link from "next/link";
import { Bell, Database, FileText, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Menu } from "@/components/ui/menu";
import { notifications as initial } from "@/lib/demo-data";
import { cn } from "@/lib/format";

const icons = { report: FileText, insight: Sparkles, share: Share2, dataset: Database };

export function NotificationsMenu() {
  const [items, setItems] = useState(initial);
  const unread = items.filter((n) => n.unread).length;
  return (
    <Menu
      id="notifications-menu"
      className="w-[min(92vw,380px)]"
      trigger={({ open, toggle, id }) => (
        <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative rounded-lg p-2 text-ink-muted hover:bg-ink/[0.05] hover:text-ink">
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread ? <span className="tnum absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rust-500 px-1 text-[10px] font-semibold text-white" aria-hidden>{unread}</span> : null}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button onClick={() => setItems((all) => all.map((n) => ({ ...n, unread: false })))} disabled={!unread} className="text-[12px] font-medium text-petrol-700 disabled:text-ink-faint">
              Mark all as read
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {items.map((n) => {
              const Icon = icons[n.kind];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      setItems((all) => all.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
                      close();
                    }}
                    className="flex gap-3 px-4 py-3 hover:bg-paper"
                  >
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", n.unread ? "bg-petrol-50 text-petrol-600" : "bg-paper text-ink-faint")}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px]", n.unread ? "font-semibold text-ink" : "text-ink-soft")}>{n.message}</span>
                      <span className="block text-[12px] text-ink-muted">{n.detail}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{n.time}</span>
                    </span>
                    {n.unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-petrol-500"><span className="sr-only">Unread</span></span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Menu>
  );
}
