import { formatChange, formatCurrency } from "../format";
import { categorySummary, facts } from "./metrics";
import type { Activity, Dataset, Insight, Notification, Project, Report, User, Visualization } from "./types";

export const workspace = {
  name: "Northstar Retail Group",
  description: "Retail performance intelligence",
  plan: "Business (demo)",
  dataPeriod: "Jul 2025 – Jun 2026",
};

export const workspaces = [
  { id: "northstar", name: "Northstar Retail Group", description: "Retail performance intelligence" },
  { id: "sandbox", name: "Personal sandbox", description: "Scratch space" },
];

export const users: User[] = [
  { id: "alex", name: "Alex Morgan", initials: "AM", email: "alex.morgan@northstar.example", role: "Owner", title: "Head of Commercial Analytics", lastActive: "Active now", permissions: "Full access", color: "#12656A" },
  { id: "sarah", name: "Sarah Chen", initials: "SC", email: "sarah.chen@northstar.example", role: "Analyst", title: "Senior Data Analyst", lastActive: "12 minutes ago", permissions: "Can edit", color: "#4D6A9C" },
  { id: "marcus", name: "Marcus Reed", initials: "MR", email: "marcus.reed@northstar.example", role: "Marketing", title: "Growth Marketing Lead", lastActive: "2 hours ago", permissions: "Can edit", color: "#C98A1B" },
  { id: "priya", name: "Priya Shah", initials: "PS", email: "priya.shah@northstar.example", role: "Executive", title: "Chief Operating Officer", lastActive: "Yesterday", permissions: "Can comment", color: "#6F9A7B" },
];

export const currentUser = users[0];

export const datasets: Dataset[] = [
  { slug: "northstar-sales", name: "Northstar Sales Data", description: "Order-level sales across all regions, channels and devices.", rows: 184290, columns: 24, source: "CSV upload", updated: "Today, 07:42", status: "Ready", sizeLabel: "48.6 MB", owner: "alex" },
  { slug: "marketing-performance", name: "Marketing Performance", description: "Spend, sessions and acquisition by campaign and channel.", rows: 12840, columns: 18, source: "Google Sheets", updated: "Yesterday, 16:10", status: "Ready", sizeLabel: "3.1 MB", owner: "marcus" },
  { slug: "customer-cohorts", name: "Customer Cohorts", description: "Monthly acquisition cohorts with repeat-purchase behaviour.", rows: 68420, columns: 14, source: "REST API", updated: "Refreshing now", status: "Refreshing", sizeLabel: "9.8 MB", owner: "sarah" },
  { slug: "regional-operations", name: "Regional Operations", description: "Store staffing, fulfilment times and stock availability.", rows: 4712, columns: 21, source: "Excel", updated: "3 days ago", status: "Needs review", sizeLabel: "1.4 MB", owner: "sarah" },
];

export const projects: Project[] = [
  { slug: "northstar-retail", name: "Northstar Retail Performance", description: "Company-wide performance monitoring for FY26, from revenue to regional operations.", ownerId: "alex", collaboratorIds: ["sarah", "marcus", "priya"], datasetSlug: "northstar-sales", status: "Active", updated: "Today", reportSlugs: ["q2-executive-review", "product-performance"], visualizationIds: ["revenue-overview", "regional-performance", "product-mix", "mobile-desktop"] },
  { slug: "q2-marketing", name: "Q2 Marketing Analysis", description: "Channel efficiency and acquisition cost trends across Q2 campaigns.", ownerId: "marcus", collaboratorIds: ["alex", "sarah"], datasetSlug: "marketing-performance", status: "In review", updated: "Yesterday", reportSlugs: ["customer-acquisition"], visualizationIds: ["customer-acquisition"] },
  { slug: "regional-expansion", name: "Regional Expansion Study", description: "Where to open the next ten stores, based on demand density and fulfilment reach.", ownerId: "sarah", collaboratorIds: ["alex", "priya"], datasetSlug: "regional-operations", status: "Draft", updated: "4 days ago", reportSlugs: ["regional-growth"], visualizationIds: ["regional-performance"] },
  { slug: "customer-retention", name: "Customer Retention Analysis", description: "Repeat-purchase behaviour by cohort, region and first-order category.", ownerId: "sarah", collaboratorIds: ["marcus"], datasetSlug: "customer-cohorts", status: "Active", updated: "2 days ago", reportSlugs: [], visualizationIds: ["customer-retention"] },
];

export const visualizations: Visualization[] = [
  { id: "revenue-overview", name: "Revenue Overview", description: "Monthly revenue and orders, FY26", kind: "area", datasetSlug: "northstar-sales", ownerId: "sarah", updated: "Today", onDashboard: true },
  { id: "regional-performance", name: "Regional Performance", description: "Revenue by region with quarter-over-quarter growth", kind: "bar", datasetSlug: "northstar-sales", ownerId: "sarah", updated: "Yesterday", onDashboard: true },
  { id: "customer-acquisition", name: "Customer Acquisition", description: "New customers and CAC by channel", kind: "bar", datasetSlug: "marketing-performance", ownerId: "marcus", updated: "2 days ago", onDashboard: false },
  { id: "product-mix", name: "Product Mix", description: "Revenue share by category, Q2", kind: "donut", datasetSlug: "northstar-sales", ownerId: "alex", updated: "3 days ago", onDashboard: true },
  { id: "mobile-desktop", name: "Mobile vs Desktop", description: "Conversion rate by device", kind: "bar", datasetSlug: "northstar-sales", ownerId: "sarah", updated: "5 days ago", onDashboard: false },
  { id: "customer-retention", name: "Customer Retention", description: "Repeat purchase rate by acquisition cohort", kind: "heatmap", datasetSlug: "customer-cohorts", ownerId: "sarah", updated: "1 week ago", onDashboard: false },
];

const pct = (value: number) => formatChange(value);

export const insights: Insight[] = [
  {
    id: "west-region-decline",
    title: "West region revenue declined in March",
    summary: `West revenue fell ${pct(facts.westMarchChange)} month-over-month (${formatCurrency(facts.westMarchDelta, { compact: true })}), driven mainly by a ${Math.abs(facts.westOrdersChange).toFixed(0)}% drop in order volume. It accounts for ${facts.westShareOfDecline.toFixed(0)}% of the company-wide March decline.`,
    tone: "risk",
    category: "Region",
    period: "March 2026",
    impact: formatCurrency(facts.westMarchDelta, { compact: true }),
    primaryDriver: "Order volume",
    secondaryDriver: "Mobile conversion",
    created: "Today, 07:48",
  },
  {
    id: "outdoor-acceleration",
    title: "Outdoor category is accelerating",
    summary: `Outdoor revenue grew ${facts.outdoorQoQ.toFixed(1)}% in Q2 versus Q1, the fastest of any category. The Ridgeline 3P Tent contributed the largest share of the gain.`,
    tone: "opportunity",
    category: "Product",
    period: "Q2 2026",
    impact: `+${formatCurrency(categorySummary.find((c) => c.category === "Outdoor")!.q2 - categorySummary.find((c) => c.category === "Outdoor")!.q1, { compact: true })}`,
    primaryDriver: "Seasonal demand",
    secondaryDriver: "New SKUs",
    created: "Today, 07:48",
  },
  {
    id: "mobile-conversion-gap",
    title: "Mobile conversion trails desktop",
    summary: `Mobile converts at 4.32% against 5.52% on desktop, a ${facts.mobileGap.toFixed(1)} percentage point gap. Mobile carries 58% of sessions, so closing half the gap is worth roughly 6,500 orders a year.`,
    tone: "opportunity",
    category: "Conversion",
    period: "FY26",
    impact: "≈ 6.5K orders",
    primaryDriver: "Checkout completion",
    secondaryDriver: "Page load time",
    created: "Yesterday, 18:02",
  },
  {
    id: "march-revenue-change",
    title: "Company revenue dipped 8.4% in March",
    summary: `March revenue was ${formatCurrency(Math.abs(facts.marchRevenueDelta), { compact: true })} below February (${pct(facts.marchRevenueChange)}). Revenue recovered in April and grew every month through June.`,
    tone: "neutral",
    category: "Revenue",
    period: "March 2026",
    impact: formatCurrency(facts.marchRevenueDelta, { compact: true }),
    primaryDriver: "West region orders",
    secondaryDriver: "Post-holiday normalisation",
    created: "2 days ago",
  },
  {
    id: "paid-social-cac",
    title: "Paid social CAC is 9% above average",
    summary: "Paid social acquires customers at $46.18 against a blended $42.18. Email and CRM remains the most efficient source of new customers at $31.40.",
    tone: "risk",
    category: "Acquisition",
    period: "FY26",
    impact: "+$4.00 per customer",
    primaryDriver: "Rising CPMs",
    secondaryDriver: "Lower click-through",
    created: "3 days ago",
  },
  {
    id: "q2-growth",
    title: "Q2 revenue up 8.2% on Q1",
    summary: `Q2 closed at ${formatCurrency(facts.q2Revenue, { compact: true })}, ${pct(facts.q2Growth)} above Q1. All four regions grew; East and North led in absolute terms.`,
    tone: "opportunity",
    category: "Revenue",
    period: "Q2 2026",
    impact: formatCurrency(facts.q2Revenue - facts.q1Revenue, { compact: true }),
    primaryDriver: "Order volume",
    secondaryDriver: "Outdoor mix",
    created: "3 days ago",
  },
  {
    id: "accessories-attach",
    title: "Accessories attach rate is rising",
    summary: "Accessories grew its share of revenue from 10.0% to 11.2% in Q2, mostly as add-ons to Outdoor and Electronics orders.",
    tone: "neutral",
    category: "Product",
    period: "Q2 2026",
    impact: "+1.2 pts share",
    primaryDriver: "Bundle placement",
    secondaryDriver: "Backpack launch",
    created: "4 days ago",
  },
];

export const reports: Report[] = [
  { slug: "q2-executive-review", name: "Q2 Executive Performance Review", description: "Quarterly performance for the leadership team: revenue, regions, acquisition and products.", period: "April–June 2026", ownerId: "alex", status: "Published", updated: "Today", pages: 7, shareSlug: "q2-performance" },
  { slug: "regional-growth", name: "Regional Growth Analysis", description: "Regional revenue trends and the case for expansion in the East.", period: "FY26", ownerId: "sarah", status: "Draft", updated: "4 days ago", pages: 5 },
  { slug: "customer-acquisition", name: "Customer Acquisition Report", description: "Channel efficiency, CAC and new-customer quality for Q2 campaigns.", period: "April–June 2026", ownerId: "marcus", status: "Scheduled", updated: "Yesterday", pages: 6 },
  { slug: "product-performance", name: "Product Performance Review", description: "Category and SKU performance with growth drivers.", period: "Q2 2026", ownerId: "sarah", status: "Published", updated: "1 week ago", pages: 4 },
];

export const notifications: Notification[] = [
  { id: "n1", message: "Q2 Executive Report was published.", detail: "Alex Morgan published it to the leadership group.", time: "8 min ago", href: "/app/reports/q2-executive-review", unread: true, kind: "report" },
  { id: "n2", message: "AI identified 3 new insights.", detail: "From today's refresh of Northstar Sales Data.", time: "34 min ago", href: "/app/insights", unread: true, kind: "insight" },
  { id: "n3", message: "Sarah shared Regional Performance.", detail: "Shared with Priya Shah and Marcus Reed.", time: "2 hours ago", href: "/app/visualizations", unread: true, kind: "share" },
  { id: "n4", message: "Dataset refresh completed.", detail: "Northstar Sales Data: 184,290 rows, no errors.", time: "Today, 07:42", href: "/app/datasets/northstar-sales", unread: false, kind: "dataset" },
  { id: "n5", message: "Regional Operations needs review.", detail: "212 rows have a missing store ID.", time: "3 days ago", href: "/app/datasets", unread: false, kind: "dataset" },
];

export const activity: Activity[] = [
  { id: "a1", actorId: "alex", action: "published", target: "Q2 Executive Report", time: "8 min ago" },
  { id: "a2", actorId: "ai", action: "generated", target: "7 insights", time: "Today, 07:48" },
  { id: "a3", actorId: "alex", action: "imported", target: "Northstar Sales Data", time: "Today, 07:42" },
  { id: "a4", actorId: "sarah", action: "created", target: "Revenue Overview", time: "Yesterday" },
  { id: "a5", actorId: "marcus", action: "commented on", target: "Customer Acquisition", time: "2 days ago" },
  { id: "a6", actorId: "priya", action: "viewed", target: "Q2 Executive Report", time: "2 days ago" },
];

export function getUser(id: string) {
  return users.find((u) => u.id === id);
}
