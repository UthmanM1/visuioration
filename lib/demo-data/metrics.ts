import type { CategoryName, MonthlyPoint, RegionName } from "./types";

/**
 * Northstar Retail Group demo ledger, July 2025 – June 2026 (fiscal year FY26).
 * Every figure shown in the product is derived from the series below, so totals,
 * charts, insights and reports always agree with each other.
 */
const monthKeys = ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const monthLabels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const revenueK = [960, 975, 1000, 1035, 1205, 1340, 950, 1090, 998.44, 1050, 1095, 1141.56];
const orders = [13933, 14110, 14430, 14871, 16877, 18407, 13930, 15797, 14597, 15152, 15733, 16453];
const sessions = [297190, 299060, 303284, 311250, 331158, 348256, 309616, 326549, 318107, 317794, 325897, 335281];
const newCustomers = [5120, 5190, 5310, 5480, 6620, 7310, 4980, 5840, 5410, 5560, 5700, 5900];
const cacBase = [43.09, 42.79, 42.29, 41.99, 40.39, 39.79, 44.29, 42.49, 43.99, 42.59, 42.09, 41.89];

export const monthly: MonthlyPoint[] = monthKeys.map((key, index) => ({
  key,
  label: monthLabels[index],
  revenue: Math.round(revenueK[index] * 1000),
  orders: orders[index],
  sessions: sessions[index],
  newCustomers: newCustomers[index],
  marketingSpend: Math.round(newCustomers[index] * cacBase[index]),
}));

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const totals = (() => {
  const revenue = sum(monthly.map((m) => m.revenue));
  const orderCount = sum(monthly.map((m) => m.orders));
  const sessionCount = sum(monthly.map((m) => m.sessions));
  const acquired = sum(monthly.map((m) => m.newCustomers));
  const spend = sum(monthly.map((m) => m.marketingSpend));
  return {
    revenue,
    orders: orderCount,
    sessions: sessionCount,
    customers: 68420,
    conversion: (orderCount / sessionCount) * 100,
    averageOrderValue: revenue / orderCount,
    cac: spend / acquired,
    yoyGrowth: 14.8,
    previousYearRevenue: revenue / 1.148,
  };
})();

export const regions: RegionName[] = ["North", "South", "East", "West"];
const regionShare: Record<RegionName, number> = { North: 0.28, South: 0.21, East: 0.26, West: 0.25 };
const westMarchRetention = 0.853;

export interface RegionalMonth {
  key: string;
  label: string;
  North: number;
  South: number;
  East: number;
  West: number;
}

export const regionalMonthly: RegionalMonth[] = monthly.map((m, index) => {
  const row = { key: m.key, label: m.label } as RegionalMonth;
  if (m.key === "2026-03") {
    const februaryWest = monthly[index - 1].revenue * regionShare.West;
    const west = Math.round(februaryWest * westMarchRetention);
    const rest = m.revenue - west;
    const restShare = regionShare.North + regionShare.South + regionShare.East;
    row.North = Math.round((rest * regionShare.North) / restShare);
    row.South = Math.round((rest * regionShare.South) / restShare);
    row.East = m.revenue - west - row.North - row.South;
    row.West = west;
    return row;
  }
  row.North = Math.round(m.revenue * regionShare.North);
  row.South = Math.round(m.revenue * regionShare.South);
  row.East = Math.round(m.revenue * regionShare.East);
  row.West = m.revenue - row.North - row.South - row.East;
  return row;
});

export const regionOrders = (monthKey: string, region: RegionName) => {
  const index = monthly.findIndex((m) => m.key === monthKey);
  const base = monthly[index].orders * regionShare[region];
  if (monthKey === "2026-03" && region === "West") return Math.round(monthly[index - 1].orders * regionShare.West * 0.87);
  return Math.round(base);
};

export const regionSummary = regions.map((region) => {
  const revenue = sum(regionalMonthly.map((m) => m[region]));
  const q2 = sum(regionalMonthly.slice(9).map((m) => m[region]));
  const q1 = sum(regionalMonthly.slice(6, 9).map((m) => m[region]));
  const stores: Record<RegionName, number> = { North: 38, South: 29, East: 34, West: 31 };
  return { region, revenue, q1, q2, growth: ((q2 - q1) / q1) * 100, share: (revenue / totals.revenue) * 100, stores: stores[region] };
});

export const categories: CategoryName[] = ["Electronics", "Home", "Apparel", "Outdoor", "Accessories"];

const quarterMonths = { "Q3 FY26": [0, 3], "Q4 FY26": [3, 6], "Q1 CY26": [6, 9], "Q2 CY26": [9, 12] } as const;
const categoryShareByQuarter: Record<keyof typeof quarterMonths, Record<CategoryName, number>> = {
  "Q3 FY26": { Electronics: 0.35, Home: 0.22, Apparel: 0.2, Outdoor: 0.13, Accessories: 0.1 },
  "Q4 FY26": { Electronics: 0.37, Home: 0.22, Apparel: 0.19, Outdoor: 0.12, Accessories: 0.1 },
  "Q1 CY26": { Electronics: 0.345, Home: 0.225, Apparel: 0.2, Outdoor: 0.13, Accessories: 0.1 },
  "Q2 CY26": { Electronics: 0.33, Home: 0.217, Apparel: 0.1947, Outdoor: 0.1463, Accessories: 0.112 },
};

export const quarters = (Object.keys(quarterMonths) as Array<keyof typeof quarterMonths>).map((quarter) => {
  const [start, end] = quarterMonths[quarter];
  const revenue = sum(monthly.slice(start, end).map((m) => m.revenue));
  const labels: Record<string, string> = { "Q3 FY26": "Jul–Sep 2025", "Q4 FY26": "Oct–Dec 2025", "Q1 CY26": "Jan–Mar 2026", "Q2 CY26": "Apr–Jun 2026" };
  const byCategory = Object.fromEntries(
    categories.map((c) => [c, Math.round(revenue * categoryShareByQuarter[quarter][c])]),
  ) as Record<CategoryName, number>;
  return { quarter, label: labels[quarter], revenue, byCategory };
});

export const categorySummary = categories.map((category) => {
  const q1 = quarters[2].byCategory[category];
  const q2 = quarters[3].byCategory[category];
  const year = sum(quarters.map((q) => q.byCategory[category]));
  return { category, revenue: year, q1, q2, growth: ((q2 - q1) / q1) * 100 };
});

export const deviceConversion = [
  { device: "Desktop", conversion: 5.52, sessionShare: 42 },
  { device: "Mobile", conversion: 4.32, sessionShare: 58 },
];

export const channelMix = [
  { channel: "Web", share: 44, revenue: 0 },
  { channel: "App", share: 23, revenue: 0 },
  { channel: "Store", share: 25, revenue: 0 },
  { channel: "Marketplace", share: 8, revenue: 0 },
].map((c) => ({ ...c, revenue: Math.round((totals.revenue * c.share) / 100) }));

export const acquisitionChannels = [
  { channel: "Paid search", customers: 21480, spend: 970896 },
  { channel: "Paid social", customers: 16920, spend: 781366 },
  { channel: "Email & CRM", customers: 11240, spend: 352936 },
  { channel: "Affiliates", customers: 8730, spend: 384993 },
  { channel: "Content & referral", customers: 10050, spend: 395765 },
].map((c) => ({ ...c, cac: c.spend / c.customers }));

export const topProducts = [
  { sku: "EL-2041", name: "Aurora 55\" 4K Display", category: "Electronics" as CategoryName, revenue: 1184200, orders: 2268, conversion: 3.9, growth: 6.2 },
  { sku: "OD-1187", name: "Ridgeline 3P Tent", category: "Outdoor" as CategoryName, revenue: 642800, orders: 3214, conversion: 5.6, growth: 24.1 },
  { sku: "HM-3302", name: "Linea Cookware Set", category: "Home" as CategoryName, revenue: 588300, orders: 4202, conversion: 5.1, growth: 9.8 },
  { sku: "EL-2210", name: "Pulse Noise-Cancelling Headphones", category: "Electronics" as CategoryName, revenue: 546900, orders: 3646, conversion: 4.7, growth: -3.4 },
  { sku: "AP-5520", name: "Northline Waterproof Jacket", category: "Apparel" as CategoryName, revenue: 431700, orders: 3083, conversion: 4.4, growth: 11.5 },
  { sku: "AC-7014", name: "Carry Everyday Backpack", category: "Accessories" as CategoryName, revenue: 298500, orders: 3731, conversion: 6.2, growth: 18.3 },
  { sku: "OD-1302", name: "Trailhead Insulated Bottle", category: "Outdoor" as CategoryName, revenue: 244600, orders: 7412, conversion: 7.1, growth: 27.9 },
];

/** Daily revenue for the last 90 days of the dataset (2 Apr – 30 Jun 2026), consistent with monthly totals. */
export const dailyRevenue = (() => {
  const seeds = [0.97, 1.02, 0.99, 1.04, 1.12, 1.18, 0.86];
  const result: Array<{ date: string; label: string; revenue: number; orders: number }> = [];
  const quarterMonthsIndex = [9, 10, 11];
  quarterMonthsIndex.forEach((monthIndex) => {
    const m = monthly[monthIndex];
    const [year, month] = m.key.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const weights = Array.from({ length: days }, (_, d) => {
      const weekday = new Date(year, month - 1, d + 1).getDay();
      const wobble = 1 + Math.sin((d + monthIndex) * 1.7) * 0.035;
      return seeds[weekday] * wobble * (1 + d * 0.0025);
    });
    const weightTotal = sum(weights);
    weights.forEach((w, d) => {
      const date = new Date(Date.UTC(year, month - 1, d + 1));
      result.push({
        date: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
        revenue: Math.round((m.revenue * w) / weightTotal),
        orders: Math.round((m.orders * w) / weightTotal),
      });
    });
  });
  return result.slice(-90);
})();

export function monthIndex(key: string) {
  return monthly.findIndex((m) => m.key === key);
}

export function monthOverMonth(key: string) {
  const index = monthIndex(key);
  const current = monthly[index];
  const previous = monthly[index - 1];
  return {
    current,
    previous,
    revenueChange: ((current.revenue - previous.revenue) / previous.revenue) * 100,
    ordersChange: ((current.orders - previous.orders) / previous.orders) * 100,
  };
}

/** Pre-computed facts referenced by insights, reports and the simulated assistant. */
export const facts = (() => {
  const march = monthOverMonth("2026-03");
  const febIndex = monthIndex("2026-02");
  const marIndex = monthIndex("2026-03");
  const westFeb = regionalMonthly[febIndex].West;
  const westMar = regionalMonthly[marIndex].West;
  const westOrdersFeb = regionOrders("2026-02", "West");
  const westOrdersMar = regionOrders("2026-03", "West");
  const outdoor = categorySummary.find((c) => c.category === "Outdoor")!;
  const electronics = categorySummary.find((c) => c.category === "Electronics")!;
  const desktop = deviceConversion[0];
  const mobile = deviceConversion[1];
  const q2 = quarters[3];
  const q1 = quarters[2];
  const june = monthOverMonth("2026-06");
  return {
    marchRevenueChange: march.revenueChange,
    marchRevenueDelta: march.current.revenue - march.previous.revenue,
    westMarchChange: ((westMar - westFeb) / westFeb) * 100,
    westMarchDelta: westMar - westFeb,
    westShareOfDecline: ((westMar - westFeb) / (march.current.revenue - march.previous.revenue)) * 100,
    westOrdersChange: ((westOrdersMar - westOrdersFeb) / westOrdersFeb) * 100,
    outdoorQoQ: outdoor.growth,
    electronicsQoQ: electronics.growth,
    mobileGap: desktop.conversion - mobile.conversion,
    q2Revenue: q2.revenue,
    q1Revenue: q1.revenue,
    q2Growth: ((q2.revenue - q1.revenue) / q1.revenue) * 100,
    juneRevenueChange: june.revenueChange,
  };
})();

/** Prior fiscal year (FY25) comparison figures used for KPI deltas. */
export const previousYear = {
  revenue: Math.round(totals.revenue / 1.148),
  orders: 164720,
  conversion: 4.61,
  cac: 44.05,
  customers: 61530,
};

export const kpiSeries = {
  revenue: monthly.map((m) => m.revenue),
  orders: monthly.map((m) => m.orders),
  conversion: monthly.map((m) => (m.orders / m.sessions) * 100),
  cac: monthly.map((m) => m.marketingSpend / m.newCustomers),
};
