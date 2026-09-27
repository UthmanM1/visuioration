"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/format";

const nav = [
  { href: "/solutions", label: "Solutions" },
  { href: "/industries", label: "Industries" },
  { href: "/customers", label: "Customers" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/technology", label: "Technology" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("rounded-md px-3 py-2 text-sm transition-colors", active ? "text-ink font-medium" : "text-ink-muted hover:text-ink")}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-md px-3 py-2 text-sm text-ink-muted hover:text-ink sm:block">
            Log in
          </Link>
          <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
            Start exploring
          </ButtonLink>
          <button className="rounded-md p-2 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Menu" side="right">
        <nav aria-label="Mobile" className="flex flex-col p-3">
          {[...nav, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium text-ink hover:bg-paper">
              {item.label}
            </Link>
          ))}
          <div className="mt-4 grid gap-2 border-t border-line pt-4">
            <ButtonLink href="/signup" onClick={() => setOpen(false)}>Start exploring</ButtonLink>
            <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>Log in</ButtonLink>
          </div>
        </nav>
      </Sheet>
    </header>
  );
}
