import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatChange } from "@/lib/format";

/** Change indicator. Direction is conveyed by sign, icon and text — never colour alone. */
export function Delta({ value, inverse = false, suffix = "%", className, decimals = 1 }: { value: number; inverse?: boolean; suffix?: "%" | "pts"; className?: string; decimals?: number }) {
  const positive = value > 0;
  const neutral = Math.abs(value) < 0.05;
  const good = neutral ? null : inverse ? !positive : positive;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const text = suffix === "%" ? formatChange(value, decimals) : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(decimals)} pts`;
  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-0.5 rounded px-1 text-[12px] font-semibold",
        good === null ? "text-ink-muted" : good ? "text-sage-700 bg-sage-100/70" : "text-rust-700 bg-rust-100/70",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{text}</span>
      <span className="sr-only">{neutral ? "no change" : positive ? "increase" : "decrease"}</span>
    </span>
  );
}
