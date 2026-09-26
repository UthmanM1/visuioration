"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { axisStyle, gridStroke } from "@/components/charts/palette";
import { RegionBars } from "@/components/charts/region-bars";
import { LogoMark } from "@/components/brand/logo";
import { EvidenceChart } from "@/components/insights/evidence-chart";
import { Delta } from "@/components/ui/delta";
import { acquisitionChannels, categorySummary, facts, insightDetails, insights, monthly, regionSummary, topProducts, totals } from "@/lib/demo-data";
import { cn, formatChange, formatCurrency, formatNumber } from "@/lib/format";

const q2Months = monthly.slice(9);
const q1Months = monthly.slice(6, 9);
const sumOf = (list: typeof monthly, key: "orders" | "sessions" | "newCustomers" | "marketingSpend" | "revenue") => list.reduce((s, m) => s + m[key], 0);
export const q2 = {
  revenue: sumOf(q2Months, "revenue"),
  orders: sumOf(q2Months, "orders"),
  conversion: (sumOf(q2Months, "orders") / sumOf(q2Months, "sessions")) * 100,
  cac: sumOf(q2Months, "marketingSpend") / sumOf(q2Months, "newCustomers"),
  newCustomers: sumOf(q2Months, "newCustomers"),
};
const q1 = {
  revenue: sumOf(q1Months, "revenue"),
  orders: sumOf(q1Months, "orders"),
  conversion: (sumOf(q1Months, "orders") / sumOf(q1Months, "sessions")) * 100,
  cac: sumOf(q1Months, "marketingSpend") / sumOf(q1Months, "newCustomers"),
  newCustomers: sumOf(q1Months, "newCustomers"),
};
const pct = (a: number, b: number) => ((a - b) / b) * 100;

export const reportPageTitles = ["Cover", "Executive Summary", "Financial Performance", "Regional Performance", "Customer Acquisition", "Product Performance", "Key Insights and Next Steps"];

function Page({ index, children, className, cover }: { index: number; children: ReactNode; className?: string; cover?: boolean }) {
  return (
    <section aria-label={`Page ${index + 1}: ${reportPageTitles[index]}`} className={cn("print-page relative mx-auto flex w-full max-w-[860px] flex-col rounded-lg border border-line bg-surface px-6 py-8 shadow-lift sm:min-h-[1000px] sm:px-14 sm:py-14", cover && "bg-night text-white border-night", className)}>
      <div className="flex-1">{children}</div>
      <footer className={cn("mt-10 flex items-center justify-between border-t pt-4 text-[11px]", cover ? "border-night-line text-white/50" : "border-line text-ink-faint")}>
        <span>Prepared by Visuioration · Northstar Retail Group</span>
        <span className="tnum">Page {index + 1} of {reportPageTitles.length}</span>
      </footer>
    </section>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">{children}</h2>;
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">{children}</p>;
}

const pages: Array<(i: number) => ReactNode> = [
  (i) => (
    <Page index={i} cover key={i}>
      <div className="flex h-full min-h-[420px] flex-col justify-between sm:min-h-[820px]">
        <div className="flex items-center gap-3">
          <LogoMark inverted className="h-8 w-8" />
          <span className="text-sm text-white/60">Northstar Retail Group</span>
        </div>
        <div>
          <p className="text-sm text-white/55">Quarterly report for the leadership team</p>
          <h1 className="mt-3 font-display text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[4.5rem]">Q2 Performance Review</h1>
          <p className="mt-4 text-xl text-white/75">April–June 2026</p>
        </div>
        <dl className="grid grid-cols-3 gap-6 border-t border-night-line pt-6 text-sm">
          <div><dt className="text-white/45">Revenue</dt><dd className="tnum mt-1 text-2xl font-semibold">{formatCurrency(q2.revenue, { compact: true, decimals: 2 })}</dd></div>
          <div><dt className="text-white/45">vs Q1</dt><dd className="tnum mt-1 text-2xl font-semibold">{formatChange(pct(q2.revenue, q1.revenue))}</dd></div>
          <div><dt className="text-white/45">Orders</dt><dd className="tnum mt-1 text-2xl font-semibold">{formatNumber(q2.orders)}</dd></div>
        </dl>
      </div>
    </Page>
  ),
  (i) => (
    <Page index={i} key={i}>
      <H2>Executive Summary</H2>
      <Lede>
        Q2 revenue reached {formatCurrency(q2.revenue, { compact: true, decimals: 2 })}, up {pct(q2.revenue, q1.revenue).toFixed(1)}% on Q1, with growth in every month of the quarter. Outdoor was the fastest-growing category at {formatChange(facts.outdoorQoQ)}. The West region recovered from its March decline but remains the region to watch, and mobile conversion is the largest open opportunity.
      </Lede>
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Revenue", formatCurrency(q2.revenue, { compact: true, decimals: 2 }), pct(q2.revenue, q1.revenue), false],
          ["Orders", formatNumber(q2.orders), pct(q2.orders, q1.orders), false],
          ["Conversion", `${q2.conversion.toFixed(2)}%`, q2.conversion - q1.conversion, true],
          ["CAC", `$${q2.cac.toFixed(2)}`, pct(q2.cac, q1.cac), false],
        ].map(([label, value, change, pts], idx) => (
          <div key={String(label)} className="bg-surface p-4">
            <dt className="text-[12px] text-ink-muted">{label}</dt>
            <dd className="tnum mt-1 text-2xl font-semibold tracking-[-0.02em]">{value}</dd>
            <dd className="mt-1"><Delta value={Number(change)} suffix={pts ? "pts" : "%"} decimals={pts ? 2 : 1} inverse={idx === 3} /></dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] text-ink-faint">All changes compare Q2 (Apr–Jun 2026) with Q1 (Jan–Mar 2026).</p>
      <h3 className="mt-10 text-[15px] font-semibold">Three things to know</h3>
      <ol className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">
        <li><strong className="text-ink">1. Growth is broad.</strong> All four regions grew quarter-on-quarter; the East is now the second-largest region.</li>
        <li><strong className="text-ink">2. Outdoor is carrying momentum.</strong> It added {formatCurrency(categorySummary.find((c) => c.category === "Outdoor")!.q2 - categorySummary.find((c) => c.category === "Outdoor")!.q1, { compact: true })} in the quarter.</li>
        <li><strong className="text-ink">3. Mobile is the constraint.</strong> Mobile converts {facts.mobileGap.toFixed(1)} points below desktop on 58% of sessions.</li>
      </ol>
    </Page>
  ),
  (i) => (
    <Page index={i} key={i}>
      <H2>Financial Performance</H2>
      <Lede>Revenue grew in each month of the quarter, ending June at {formatCurrency(monthly[11].revenue, { compact: true, decimals: 2 })}. Average order value held at ${totals.averageOrderValue.toFixed(2)} for the year, so growth came from order volume rather than price.</Lede>
      <figure className="mt-8">
        <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">Monthly revenue, FY26 (Q2 highlighted in the table below)</figcaption>
        <EvidenceChart kind="revenue-trend" height={260} />
      </figure>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <caption className="sr-only">Q2 monthly financial summary</caption>
          <thead className="border-b border-line-strong text-ink-muted">
            <tr><th scope="col" className="py-2 font-medium">Month</th><th scope="col" className="py-2 text-right font-medium">Revenue</th><th scope="col" className="py-2 text-right font-medium">Orders</th><th scope="col" className="py-2 text-right font-medium">AOV</th><th scope="col" className="py-2 text-right font-medium">vs prior month</th></tr>
          </thead>
          <tbody>
            {q2Months.map((m, idx) => {
              const prev = monthly[9 + idx - 1];
              return (
                <tr key={m.key} className="border-b border-line">
                  <th scope="row" className="py-2.5 font-medium">{m.label}</th>
                  <td className="tnum py-2.5 text-right">{formatCurrency(m.revenue)}</td>
                  <td className="tnum py-2.5 text-right">{formatNumber(m.orders)}</td>
                  <td className="tnum py-2.5 text-right">${(m.revenue / m.orders).toFixed(2)}</td>
                  <td className="py-2.5 text-right"><Delta value={pct(m.revenue, prev.revenue)} /></td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <th scope="row" className="py-2.5">Q2 total</th>
              <td className="tnum py-2.5 text-right">{formatCurrency(q2.revenue)}</td>
              <td className="tnum py-2.5 text-right">{formatNumber(q2.orders)}</td>
              <td className="tnum py-2.5 text-right">${(q2.revenue / q2.orders).toFixed(2)}</td>
              <td className="py-2.5 text-right"><Delta value={pct(q2.revenue, q1.revenue)} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Page>
  ),
  (i) => (
    <Page index={i} key={i}>
      <H2>Regional Performance</H2>
      <Lede>North remains the largest region. West posted the strongest quarter-on-quarter growth, but from a low base after March, when it drove {facts.westShareOfDecline.toFixed(0)}% of the company-wide dip.</Lede>
      <figure className="mt-8">
        <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">Revenue by region, Q2 2026</figcaption>
        <RegionBars data={regionSummary.map((r) => ({ region: r.region, value: r.q2 }))} height={220} />
      </figure>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <caption className="sr-only">Regional summary</caption>
          <thead className="border-b border-line-strong text-ink-muted">
            <tr><th scope="col" className="py-2 font-medium">Region</th><th scope="col" className="py-2 text-right font-medium">Q1</th><th scope="col" className="py-2 text-right font-medium">Q2</th><th scope="col" className="py-2 text-right font-medium">Change</th><th scope="col" className="py-2 text-right font-medium">FY26 share</th></tr>
          </thead>
          <tbody>
            {regionSummary.map((r) => (
              <tr key={r.region} className="border-b border-line">
                <th scope="row" className="py-2.5 font-medium">{r.region}</th>
                <td className="tnum py-2.5 text-right">{formatCurrency(r.q1)}</td>
                <td className="tnum py-2.5 text-right">{formatCurrency(r.q2)}</td>
                <td className="py-2.5 text-right"><Delta value={r.growth} /></td>
                <td className="tnum py-2.5 text-right">{r.share.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figure className="mt-8">
        <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">What happened in March: revenue change by region, Mar vs Feb</figcaption>
        <EvidenceChart kind="regional-contribution" height={200} />
      </figure>
    </Page>
  ),
  (i) => (
    <Page index={i} key={i}>
      <H2>Customer Acquisition</H2>
      <Lede>Northstar acquired {formatNumber(q2.newCustomers)} new customers in Q2 at a blended CAC of ${q2.cac.toFixed(2)}. Email and CRM remains the most efficient channel; paid social is the most expensive and should be reviewed before Q3 budgets are set.</Lede>
      <figure className="mt-8">
        <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">Customer acquisition cost by channel, FY26</figcaption>
        <EvidenceChart kind="acquisition" height={240} />
      </figure>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <caption className="sr-only">Acquisition by channel</caption>
          <thead className="border-b border-line-strong text-ink-muted">
            <tr><th scope="col" className="py-2 font-medium">Channel</th><th scope="col" className="py-2 text-right font-medium">New customers</th><th scope="col" className="py-2 text-right font-medium">Spend</th><th scope="col" className="py-2 text-right font-medium">CAC</th></tr>
          </thead>
          <tbody>
            {acquisitionChannels.map((c) => (
              <tr key={c.channel} className="border-b border-line">
                <th scope="row" className="py-2.5 font-medium">{c.channel}</th>
                <td className="tnum py-2.5 text-right">{formatNumber(c.customers)}</td>
                <td className="tnum py-2.5 text-right">{formatCurrency(c.spend)}</td>
                <td className="tnum py-2.5 text-right font-semibold">${c.cac.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  ),
  (i) => (
    <Page index={i} key={i}>
      <H2>Product Performance</H2>
      <Lede>Electronics is still the largest category, but Outdoor and Accessories grew fastest. Electronics grew only {formatChange(facts.electronicsQoQ)}, so its share of revenue continues to decline.</Lede>
      <figure className="mt-8">
        <figcaption className="mb-3 text-[13px] font-medium text-ink-muted">Revenue by category, Q1 vs Q2 2026</figcaption>
        <ChartFrame label="Revenue by category, Q1 vs Q2 2026" columns={["Category", "Q1", "Q2"]} rows={categorySummary.map((c) => [c.category, formatCurrency(c.q1), formatCurrency(c.q2)])}>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySummary.map((c) => ({ category: c.category, Q1: c.q1, Q2: c.q2 }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={gridStroke} />
                <XAxis dataKey="category" tick={axisStyle} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} cursor={{ fill: "rgba(18,101,106,0.05)" }} />
                <Bar dataKey="Q1" fill="#C9D9D8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Q2" fill="#12656A" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </figure>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <caption className="mb-2 text-left text-[13px] font-medium text-ink-muted">Top five products, FY26</caption>
          <thead className="border-b border-line-strong text-ink-muted">
            <tr><th scope="col" className="py-2 font-medium">Product</th><th scope="col" className="py-2 text-right font-medium">Revenue</th><th scope="col" className="py-2 text-right font-medium">Orders</th><th scope="col" className="py-2 text-right font-medium">Q2 vs Q1</th></tr>
          </thead>
          <tbody>
            {topProducts.slice(0, 5).map((p) => (
              <tr key={p.sku} className="border-b border-line">
                <th scope="row" className="py-2.5 font-medium">{p.name}<span className="block text-[11px] font-normal text-ink-muted">{p.category}</span></th>
                <td className="tnum py-2.5 text-right">{formatCurrency(p.revenue)}</td>
                <td className="tnum py-2.5 text-right">{formatNumber(p.orders)}</td>
                <td className="py-2.5 text-right"><Delta value={p.growth} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  ),
  (i) => {
    const keyIds = ["west-region-decline", "outdoor-acceleration", "mobile-conversion-gap", "paid-social-cac"];
    return (
      <Page index={i} key={i}>
        <H2>Key Insights</H2>
        <ol className="mt-6 space-y-5">
          {keyIds.map((id, n) => {
            const ins = insights.find((x) => x.id === id)!;
            return (
              <li key={id} className="grid grid-cols-[32px_1fr] gap-3">
                <span className="tnum font-display text-xl font-semibold text-petrol-600">{n + 1}</span>
                <div>
                  <h3 className="font-semibold">{ins.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{ins.summary}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <h2 className="mt-12 font-display text-[1.5rem] font-semibold tracking-[-0.02em]">Next Areas to Investigate</h2>
        <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-ink-soft">
          {[insightDetails["west-region-decline"].investigate[0], insightDetails["mobile-conversion-gap"].investigate[1], insightDetails["outdoor-acceleration"].investigate[0], insightDetails["paid-social-cac"].investigate[1]].map((s) => (
            <li key={s} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />{s}</li>
          ))}
        </ul>
        <p className="mt-10 rounded-md bg-paper px-4 py-3 text-[12px] text-ink-muted">Data source: Northstar Sales Data and Marketing Performance, refreshed 30 June 2026. Insights generated by Visuioration Intelligence (demo analysis) and reviewed by Alex Morgan. All figures are fictional demo data.</p>
      </Page>
    );
  },
];

export function Q2Report({ only }: { only?: number }) {
  if (only !== undefined) return <>{pages[only](only)}</>;
  return <div className="space-y-6">{pages.map((render, i) => render(i))}</div>;
}
