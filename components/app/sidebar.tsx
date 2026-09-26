"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { projects } from "@/lib/demo-data";
import { appNav, isActive } from "./nav-items";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Logo href="/app" />
      </div>
      <div className="px-3">
        <Link href="/app/visualizations/new" onClick={onNavigate} className={buttonClasses("primary", "sm", "w-full")}>
          <Plus className="h-4 w-4" aria-hidden /> New visualization
        </Link>
      </div>
      <nav aria-label="Workspace" className="mt-5 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {appNav.map(({ href, label, icon: Icon, ...rest }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  data-tour={"tour" in rest ? rest.tour : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
                    active ? "bg-surface font-medium text-ink shadow-panel ring-1 ring-line" : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-petrol-600" : "")} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <h2 className="mb-2 mt-7 px-3 text-[12px] font-medium text-ink-faint">Recent projects</h2>
        <ul className="space-y-0.5">
          {projects.slice(0, 3).map((p) => (
            <li key={p.slug}>
              <Link href={`/app/projects/${p.slug}`} onClick={onNavigate} className={cn("block truncate rounded-lg px-3 py-1.5 text-[13px]", pathname === `/app/projects/${p.slug}` ? "font-medium text-ink" : "text-ink-muted hover:text-ink")}>
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="m-3 rounded-lg border border-amber-500/30 bg-amber-100/50 p-3 text-[12px] leading-relaxed text-amber-700">
        You are in a demo workspace with fictional data. <Link href="/case-study" onClick={onNavigate} className="font-medium underline underline-offset-2">About this project</Link>
      </div>
    </div>
  );
}
