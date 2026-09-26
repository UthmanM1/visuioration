import type { CategoryName, RegionName } from "./types";
import { topProducts } from "./metrics";

export interface SalesRow {
  date: string;
  orderId: string;
  region: RegionName;
  product: string;
  category: CategoryName;
  customerType: "New" | "Returning" | "Business";
  revenue: number;
  units: number;
  channel: "Web" | "App" | "Store" | "Marketplace";
  device: "Mobile" | "Desktop" | "Tablet" | "In store";
}

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick<T>(random: () => number, items: T[], weights: number[]) {
  const roll = random() * weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  for (let i = 0; i < items.length; i += 1) {
    cursor += weights[i];
    if (roll <= cursor) return items[i];
  }
  return items[items.length - 1];
}

const extraProducts: Array<{ name: string; category: CategoryName; price: number }> = [
  { name: "Halo Smart Speaker", category: "Electronics", price: 89 },
  { name: "Stillwater Bath Towel Set", category: "Home", price: 42 },
  { name: "Everyday Merino Tee", category: "Apparel", price: 38 },
  { name: "Summit Trekking Poles", category: "Outdoor", price: 64 },
  { name: "Canvas Card Wallet", category: "Accessories", price: 24 },
];

/** A deterministic 600-row preview sample of Northstar Sales Data (June 2026). */
export const salesSample: SalesRow[] = (() => {
  const random = seeded(2026);
  const catalog = [
    ...topProducts.map((p) => ({ name: p.name, category: p.category, price: p.revenue / p.orders })),
    ...extraProducts,
  ];
  const rows: SalesRow[] = [];
  for (let i = 0; i < 600; i += 1) {
    const product = catalog[Math.floor(random() * catalog.length)];
    const channel = pick(random, ["Web", "App", "Store", "Marketplace"] as const, [44, 23, 25, 8]);
    const device = channel === "Store" ? "In store" : pick(random, ["Mobile", "Desktop", "Tablet"] as const, [58, 36, 6]);
    const units = product.price > 200 ? 1 : 1 + Math.floor(random() * 3);
    const day = 30 - Math.floor(i / 20);
    rows.push({
      date: `2026-06-${String(day).padStart(2, "0")}`,
      orderId: `NS-${(884210 - i * 7).toString()}`,
      region: pick(random, ["North", "South", "East", "West"] as const, [28, 21, 26, 25]),
      product: product.name,
      category: product.category,
      customerType: pick(random, ["New", "Returning", "Business"] as const, [37, 55, 8]),
      revenue: Math.round(product.price * units * (0.92 + random() * 0.12) * 100) / 100,
      units,
      channel,
      device,
    });
  }
  return rows;
})();

export const salesColumns = [
  { key: "date", label: "Date", type: "Date", nulls: "0%", distinct: "365" },
  { key: "orderId", label: "Order ID", type: "Text", nulls: "0%", distinct: "184,290" },
  { key: "region", label: "Region", type: "Category", nulls: "0%", distinct: "4" },
  { key: "product", label: "Product", type: "Text", nulls: "0%", distinct: "1,412" },
  { key: "category", label: "Category", type: "Category", nulls: "0%", distinct: "5" },
  { key: "customerType", label: "Customer type", type: "Category", nulls: "0.4%", distinct: "3" },
  { key: "revenue", label: "Revenue", type: "Currency", nulls: "0%", distinct: "41,208" },
  { key: "units", label: "Units", type: "Integer", nulls: "0%", distinct: "12" },
  { key: "channel", label: "Channel", type: "Category", nulls: "0%", distinct: "4" },
  { key: "device", label: "Device", type: "Category", nulls: "1.1%", distinct: "4" },
] as const;
