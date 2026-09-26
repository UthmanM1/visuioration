import { Logo } from "@/components/brand/logo";
import { facts } from "@/lib/demo-data";
import { formatChange, formatCurrency } from "@/lib/format";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr] grid-cols-1">
      <main id="main" className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-[12px] text-ink-faint">Demo environment. No real accounts, passwords or personal data are stored.</p>
      </main>
      <aside className="relative hidden overflow-hidden bg-night p-10 text-white lg:flex lg:flex-col lg:justify-end" aria-label="Product preview">
        <div className="grid-paper absolute inset-0 opacity-[0.06] invert" aria-hidden />
        <div className="relative max-w-md">
          <p className="text-sm text-white/55">Northstar Retail Group · Q2 2026</p>
          <p className="tnum mt-3 font-display text-6xl font-semibold tracking-[-0.04em]">{formatCurrency(facts.q2Revenue, { compact: true })}</p>
          <p className="mt-2 text-white/70">Q2 revenue, {formatChange(facts.q2Growth)} on Q1. Outdoor grew {(facts.outdoorQoQ).toFixed(1)}%.</p>
          <p className="mt-10 text-sm text-white/45">Fictional demo data.</p>
        </div>
      </aside>
    </div>
  );
}
