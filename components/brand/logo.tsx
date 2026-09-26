import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("h-7 w-7", className)} aria-hidden>
      <rect width="28" height="28" rx="7" fill={inverted ? "#FFFFFF" : "#12181B"} />
      <rect x="6.5" y="15" width="3.4" height="7" rx="1" fill={inverted ? "#12656A" : "#5FB3B6"} />
      <rect x="12.3" y="11" width="3.4" height="11" rx="1" fill={inverted ? "#12181B" : "#FFFFFF"} />
      <rect x="18.1" y="6" width="3.4" height="16" rx="1" fill="#C98A1B" />
    </svg>
  );
}

export function Logo({ href = "/", inverted = false, className }: { href?: string; inverted?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-md", className)} aria-label="Visuioration home">
      <LogoMark inverted={inverted} />
      <span className={cn("font-display text-[17px] font-semibold tracking-[-0.02em]", inverted ? "text-white" : "text-ink")}>Visuioration</span>
    </Link>
  );
}
