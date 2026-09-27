"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/format";

const plans = [
  { name: "Explorer", monthly: 0, blurb: "For individuals exploring the platform.", features: ["1 workspace", "3 projects", "Basic visualizations", "Demo datasets", "Basic reports"], cta: "Start exploring", href: "/signup" },
  { name: "Professional", monthly: 39, blurb: "For analysts and small teams.", features: ["Unlimited projects", "Advanced dashboards", "AI insights", "Report builder", "Data imports", "Sharing", "Export"], cta: "Try Professional", href: "/signup", featured: true },
  { name: "Business", monthly: 99, blurb: "For growing teams.", features: ["Team workspaces", "Advanced permissions", "Shared dashboards", "Custom branding (planned)", "Advanced reporting", "Audit history (planned)", "Priority support"], cta: "Try Business", href: "/signup" },
  { name: "Enterprise", monthly: null, blurb: "For organisations with governance needs.", features: ["SSO (planned)", "Advanced permissions", "Dedicated environments (planned)", "Data governance (planned)", "API access (planned)", "Custom integrations"], cta: "Talk to us", href: "/contact" },
];

export function PricingToggle() {
  const [cycle, setCycle] = useState<"Monthly" | "Annual">("Monthly");
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={["Monthly", "Annual"] as const} value={cycle} onChange={setCycle} label="Billing cycle" size="md" />
        <span className="text-[13px] text-ink-muted">Annual billing saves two months.</span>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4 grid-cols-1">
        {plans.map((plan) => {
          const price = plan.monthly === null ? null : cycle === "Annual" ? Math.round((plan.monthly * 10) / 12) : plan.monthly;
          return (
            <article key={plan.name} className={cn("flex flex-col rounded-panel border p-6", plan.featured ? "border-night bg-night text-white" : "border-line bg-surface")}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.featured ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-2xs">Most chosen</span> : null}
              </div>
              <p className={cn("mt-1 text-sm", plan.featured ? "text-white/65" : "text-ink-muted")}>{plan.blurb}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="tnum font-display text-4xl font-semibold tracking-[-0.03em]">{price === null ? "Custom" : `$${price}`}</span>
                {price ? <span className={cn("text-sm", plan.featured ? "text-white/60" : "text-ink-muted")}>/user/month</span> : null}
              </p>
              <ButtonLink href={plan.href} variant={plan.featured ? "light" : "secondary"} className="mt-6">{plan.cta}</ButtonLink>
              <ul className="mt-6 space-y-2.5 border-t border-current/10 pt-6 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-petrol-200" : "text-petrol-600")} aria-hidden />{f}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}
