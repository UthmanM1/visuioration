import { facts, regionSummary, totals } from "@/lib/demo-data";
import { formatChange, formatCurrency } from "@/lib/format";
import { LogoMark } from "@/components/brand/logo";

export function ReportCardPreview() {
  const max = Math.max(...regionSummary.map((r) => r.q2));
  return (
    <div className="relative mx-auto max-w-md">
      <div className="absolute right-1 top-4 h-full w-[96%] rotate-[2deg] sm:-right-3 sm:w-full sm:rotate-[2.5deg] rounded-xl border border-line bg-surface" aria-hidden />
      <article className="relative rounded-xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <p className="text-2xs text-ink-muted">Northstar Retail Group</p>
            <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">Q2 Performance Review</h3>
          </div>
          <LogoMark className="h-6 w-6" />
        </header>
        <p className="mt-4 text-[13px] font-semibold">Executive summary</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          Q2 revenue reached {formatCurrency(facts.q2Revenue, { compact: true })}, {formatChange(facts.q2Growth)} on Q1. Outdoor led category growth; mobile conversion is the largest open opportunity.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
          {[
            ["Revenue", formatCurrency(facts.q2Revenue, { compact: true })],
            ["AOV", `$${totals.averageOrderValue.toFixed(2)}`],
            ["CAC", `$${totals.cac.toFixed(2)}`],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-2xs text-ink-muted">{l}</p>
              <p className="tnum text-[15px] font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] font-semibold">Revenue by region, Q2</p>
        <ul className="mt-2 space-y-1.5">
          {regionSummary.map((r) => (
            <li key={r.region} className="flex items-center gap-2 text-[12px]">
              <span className="w-10 text-ink-muted">{r.region}</span>
              <span className="h-2 flex-1 rounded-full bg-paper">
                <span className="block h-2 rounded-full bg-petrol-600" style={{ width: `${(r.q2 / max) * 100}%` }} />
              </span>
              <span className="tnum w-12 text-right">{formatCurrency(r.q2, { compact: true })}</span>
            </li>
          ))}
        </ul>
        <footer className="mt-6 flex justify-between text-2xs text-ink-faint">
          <span>Prepared by Visuioration</span>
          <span>Page 2 of 7</span>
        </footer>
      </article>
    </div>
  );
}
