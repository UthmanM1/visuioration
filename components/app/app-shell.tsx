"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, HelpCircle, LogOut, Menu as MenuIcon, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { track } from "@/lib/analytics";
import { currentUser, workspaces } from "@/lib/demo-data";
import { cn } from "@/lib/format";
import { CommandPalette } from "./command-palette";
import { MobileBottomNav } from "./mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { ProductTour } from "./product-tour";
import { SidebarContent } from "./sidebar";

function WorkspaceSwitcher() {
  const [selected, setSelected] = useState(workspaces[0].id);
  const current = workspaces.find((w) => w.id === selected)!;
  return (
    <Menu
      id="workspace-menu"
      align="left"
      className="w-64 p-1.5"
      trigger={({ open, toggle, id }) => (
        <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label={`Workspace: ${current.name}. Switch workspace`} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-ink/[0.04]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-petrol-600 text-[11px] font-semibold text-white" aria-hidden>NR</span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[13px] font-semibold leading-tight">{current.name}</span>
            <span className="block truncate text-[11px] leading-tight text-ink-muted">{current.description}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <ul role="listbox" aria-label="Workspaces">
          {workspaces.map((w) => (
            <li key={w.id} role="option" aria-selected={w.id === selected}>
              <button onClick={() => { setSelected(w.id); close(); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] hover:bg-paper">
                <span>
                  <span className="block font-medium">{w.name}</span>
                  <span className="block text-[11px] text-ink-muted">{w.description}</span>
                </span>
                {w.id === selected ? <Check className="h-4 w-4 text-petrol-600" aria-hidden /> : null}
              </button>
            </li>
          ))}
          <li className="mt-1 border-t border-line pt-1">
            <Link href="/onboarding" onClick={close} className="block rounded-md px-3 py-2 text-[13px] text-ink-muted hover:bg-paper hover:text-ink">Create workspace</Link>
          </li>
        </ul>
      )}
    </Menu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState<null | "command" | "search">(null);

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((p) => (p ? null : "command"));
      }
      if (event.key === "/" && !palette && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target as HTMLElement)?.isContentEditable) {
        event.preventDefault();
        setPalette("search");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]);

  return (
    <div className="min-h-dvh bg-paper">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-paper lg:block" aria-label="Sidebar">
        <SidebarContent />
      </aside>
      <Sheet open={drawer} onClose={() => setDrawer(false)} title="Navigation" side="left" hideTitle className="bg-paper">
        <SidebarContent onNavigate={() => setDrawer(false)} />
      </Sheet>
      <div className="lg:pl-[248px]">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-6">
            <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-ink lg:hidden" aria-label="Open navigation">
              <MenuIcon className="h-5 w-5" aria-hidden />
            </button>
            <Link href="/app" className="lg:hidden" aria-label="Dashboard"><LogoMark className="h-6 w-6" /></Link>
            <WorkspaceSwitcher />
            <button
              onClick={() => setPalette("search")}
              className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-faint hover:border-line-strong sm:ml-4 sm:w-full sm:max-w-sm md:mr-auto"
              aria-label="Search workspace"
            >
              <Search className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Search projects, data, reports…</span>
              <kbd className="ml-auto hidden rounded border border-line px-1.5 text-[11px] sm:inline">⌘K</kbd>
            </button>
            <NotificationsMenu />
            <Menu
              id="help-menu"
              className="w-60 p-1.5"
              trigger={({ open, toggle, id }) => (
                <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label="Help" className="hidden rounded-lg p-2 text-ink-muted hover:bg-ink/[0.05] hover:text-ink sm:block">
                  <HelpCircle className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
            >
              {(close) => (
                <ul className="text-[13px]">
                  <li><button onClick={() => { close(); setPalette("command"); }} className="flex w-full justify-between rounded-md px-3 py-2 hover:bg-paper">Command menu <kbd className="text-ink-faint">⌘K</kbd></button></li>
                  <li><button onClick={() => { try { window.localStorage.removeItem("visuioration.tour-done"); } catch { /* ignore */ } window.location.assign("/app"); }} className="w-full rounded-md px-3 py-2 text-left hover:bg-paper">Replay product tour</button></li>
                  <li><Link href="/resources" onClick={close} className="block rounded-md px-3 py-2 hover:bg-paper">Guides and resources</Link></li>
                  <li><Link href="/technology" onClick={close} className="block rounded-md px-3 py-2 hover:bg-paper">How the demo works</Link></li>
                </ul>
              )}
            </Menu>
            <Menu
              id="user-menu"
              className="w-60 p-1.5"
              trigger={({ open, toggle, id }) => (
                <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label="Account menu" className="rounded-full">
                  <Avatar user={currentUser} />
                </button>
              )}
            >
              {(close) => (
                <div className="text-[13px]">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="font-semibold">{currentUser.name}</p>
                    <p className="truncate text-ink-muted">{currentUser.email}</p>
                  </div>
                  <ul className="py-1">
                    <li><Link href="/app/settings?section=profile" onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><User className="h-4 w-4 text-ink-faint" aria-hidden />Profile</Link></li>
                    <li><Link href="/" onClick={close} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-paper"><LogOut className="h-4 w-4 text-ink-faint" aria-hidden />Leave demo</Link></li>
                  </ul>
                </div>
              )}
            </Menu>
          </div>
        </header>
        <main id="main" className={cn("mx-auto w-full max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16")}>
          {children}
        </main>
      </div>
      <MobileBottomNav onMore={() => setDrawer(true)} />
      <CommandPalette open={palette !== null} mode={palette ?? "command"} onClose={() => setPalette(null)} />
      <ProductTour />
    </div>
  );
}
