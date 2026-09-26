"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, FolderKanban, LayoutDashboard, Menu, Sparkles } from "lucide-react";
import { cn } from "@/lib/format";
import { isActive } from "./nav-items";

const items = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/insights", label: "Ask AI", icon: Sparkles },
  { href: "/app/reports", label: "Reports", icon: FileText },
];

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick navigation" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-petrol-700 font-medium" : "text-ink-muted")}>
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button onClick={onMore} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] text-ink-muted">
            <Menu className="h-5 w-5" aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
