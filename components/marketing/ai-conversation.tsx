import { Sparkles } from "lucide-react";
import { facts } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";

export function AiConversation() {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-5 shadow-panel sm:p-6">
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-md bg-night px-4 py-2.5 text-[15px] text-white">Why did revenue decline in March?</p>
      </div>
      <div className="mt-5 flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600" aria-hidden>
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">Visuioration Intelligence</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            Revenue decreased {Math.abs(facts.marchRevenueChange).toFixed(1)}% in March compared with February. The largest contribution came from the West region, where order volume declined {Math.abs(facts.westOrdersChange).toFixed(0)}%. The Business customer segment remained stable.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Company", `${facts.marchRevenueChange.toFixed(1)}%`],
              ["West revenue", formatCurrency(facts.westMarchDelta, { compact: true })],
              ["West orders", `${facts.westOrdersChange.toFixed(0)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-paper px-3 py-2">
                <p className="text-2xs text-ink-muted">{label}</p>
                <p className="tnum text-sm font-semibold text-rust-700">{value.replace("-", "−")}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-2xs text-ink-faint">Generated from the Northstar demo dataset. Simulated assistant, no live model connected.</p>
        </div>
      </div>
    </div>
  );
}
