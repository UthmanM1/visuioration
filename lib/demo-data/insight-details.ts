import type { EvidenceKind } from "../services/insights";
import { categorySummary, deviceConversion, facts, monthIndex, monthly, regionOrders, regionalMonthly, totals, acquisitionChannels } from "./metrics";
import { formatChange, formatCurrency, formatNumber } from "../format";

export interface InsightDetail {
  evidence: EvidenceKind[];
  related: EvidenceKind[];
  factors: Array<{ label: string; detail: string; weight: number }>;
  dataPoints: Array<[string, string]>;
  investigate: string[];
}

const feb = monthIndex("2026-02");
const mar = monthIndex("2026-03");
const outdoor = categorySummary.find((c) => c.category === "Outdoor")!;
const accessories = categorySummary.find((c) => c.category === "Accessories")!;
const social = acquisitionChannels.find((c) => c.channel === "Paid social")!;
const email = acquisitionChannels.find((c) => c.channel === "Email & CRM")!;

export const insightDetails: Record<string, InsightDetail> = {
  "west-region-decline": {
    evidence: ["regional-contribution", "revenue-trend"],
    related: ["device-conversion", "category-contribution"],
    factors: [
      { label: "Order volume", detail: `West orders fell ${Math.abs(facts.westOrdersChange).toFixed(0)}% month-over-month.`, weight: 72 },
      { label: "Mobile conversion", detail: "Mobile converts 1.2 points below desktop, and West has the highest mobile share.", weight: 18 },
      { label: "Average order value", detail: "AOV in West was broadly flat, contributing little.", weight: 10 },
    ],
    dataPoints: [
      ["West revenue, Feb 2026", formatCurrency(regionalMonthly[feb].West)],
      ["West revenue, Mar 2026", formatCurrency(regionalMonthly[mar].West)],
      ["West orders, Feb → Mar", `${formatNumber(regionOrders("2026-02", "West"))} → ${formatNumber(regionOrders("2026-03", "West"))}`],
      ["Company revenue change", formatChange(facts.marchRevenueChange)],
      ["West share of decline", `${facts.westShareOfDecline.toFixed(0)}%`],
    ],
    investigate: ["Compare West mobile checkout completion for February and March.", "Check whether any West promotions ended in late February.", "Review West store traffic against online orders to separate channels."],
  },
  "outdoor-acceleration": {
    evidence: ["category-contribution"],
    related: ["revenue-trend"],
    factors: [
      { label: "Seasonal demand", detail: "Spring and early summer lift camping and hiking categories.", weight: 55 },
      { label: "New tent range", detail: "Ridgeline 3P Tent grew 24.1% and is now the second-largest product.", weight: 35 },
      { label: "Store placement", detail: "Outdoor moved to front-of-store displays in April.", weight: 10 },
    ],
    dataPoints: [
      ["Outdoor revenue, Q1", formatCurrency(outdoor.q1)],
      ["Outdoor revenue, Q2", formatCurrency(outdoor.q2)],
      ["Growth", formatChange(outdoor.growth)],
      ["Electronics growth", formatChange(facts.electronicsQoQ)],
    ],
    investigate: ["Check Outdoor stock cover for July and August.", "Test Outdoor bundles with Accessories.", "Compare regional Outdoor growth to find where demand is strongest."],
  },
  "mobile-conversion-gap": {
    evidence: ["device-conversion"],
    related: ["regional-contribution"],
    factors: [
      { label: "Checkout steps", detail: "Mobile checkout has five steps against three on desktop.", weight: 50 },
      { label: "Payment options", detail: "Wallet payments are only available on the app, not mobile web.", weight: 30 },
      { label: "Page speed", detail: "Product pages load slower on mobile networks.", weight: 20 },
    ],
    dataPoints: [
      ["Desktop conversion", `${deviceConversion[0].conversion.toFixed(2)}%`],
      ["Mobile conversion", `${deviceConversion[1].conversion.toFixed(2)}%`],
      ["Gap", `${facts.mobileGap.toFixed(1)} pts`],
      ["Mobile share of sessions", `${deviceConversion[1].sessionShare}%`],
    ],
    investigate: ["Measure step-by-step drop-off in mobile checkout.", "Estimate the order impact of adding wallet payments to mobile web.", "Segment the gap by region, starting with West."],
  },
  "march-revenue-change": {
    evidence: ["revenue-trend", "regional-contribution"],
    related: ["category-contribution"],
    factors: [
      { label: "West region", detail: `Accounts for ${facts.westShareOfDecline.toFixed(0)}% of the decline.`, weight: Math.round(facts.westShareOfDecline) },
      { label: "Other regions", detail: "North, South and East softened slightly after February promotions.", weight: 100 - Math.round(facts.westShareOfDecline) },
    ],
    dataPoints: [
      ["Revenue, Feb 2026", formatCurrency(monthly[feb].revenue)],
      ["Revenue, Mar 2026", formatCurrency(monthly[mar].revenue)],
      ["Change", `${formatChange(facts.marchRevenueChange)} (${formatCurrency(facts.marchRevenueDelta, { compact: true })})`],
    ],
    investigate: ["Review the West region first.", "Check whether February was inflated by a promotion.", "Confirm the April recovery held in all regions."],
  },
  "paid-social-cac": {
    evidence: ["acquisition"],
    related: ["device-conversion"],
    factors: [
      { label: "Audience saturation", detail: "Frequency rose while click-through fell across Q2 campaigns.", weight: 60 },
      { label: "Creative fatigue", detail: "Three of the top five ads have run for more than eight weeks.", weight: 40 },
    ],
    dataPoints: [
      ["Paid social CAC", `$${social.cac.toFixed(2)}`],
      ["Blended CAC", `$${totals.cac.toFixed(2)}`],
      ["Email & CRM CAC", `$${email.cac.toFixed(2)}`],
      ["Paid social customers", formatNumber(social.customers)],
    ],
    investigate: ["Refresh the longest-running creatives.", "Shift a test budget from paid social to email acquisition.", "Compare 90-day value of paid social customers with other channels."],
  },
  "q2-growth": {
    evidence: ["revenue-trend", "category-contribution"],
    related: ["regional-contribution"],
    factors: [
      { label: "Outdoor growth", detail: `Outdoor grew ${(outdoor.growth).toFixed(1)}%.`, weight: 45 },
      { label: "Regional recovery", detail: "West recovered from its March low.", weight: 35 },
      { label: "Accessories attach", detail: `Accessories grew ${(accessories.growth).toFixed(1)}%.`, weight: 20 },
    ],
    dataPoints: [
      ["Q1 revenue", formatCurrency(facts.q1Revenue)],
      ["Q2 revenue", formatCurrency(facts.q2Revenue)],
      ["Quarter growth", formatChange(facts.q2Growth)],
      ["June vs May", formatChange(facts.juneRevenueChange)],
    ],
    investigate: ["Check whether Q2 growth came from new or returning customers.", "Set Q3 targets by category rather than company-wide."],
  },
  "accessories-attach": {
    evidence: ["category-contribution"],
    related: ["revenue-trend"],
    factors: [
      { label: "Checkout recommendations", detail: "Add-on prompts were introduced for Electronics orders.", weight: 65 },
      { label: "Bundle pricing", detail: "Cable and case bundles priced below individual items.", weight: 35 },
    ],
    dataPoints: [
      ["Accessories, Q1", formatCurrency(accessories.q1)],
      ["Accessories, Q2", formatCurrency(accessories.q2)],
      ["Growth", formatChange(accessories.growth)],
    ],
    investigate: ["Extend add-on prompts to Outdoor orders.", "Track Accessories margin as volume grows."],
  },
};
