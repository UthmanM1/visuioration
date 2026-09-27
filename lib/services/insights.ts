import { categorySummary, facts, insights, regionalMonthly, monthly } from "../demo-data";
import { formatChange, formatCurrency } from "../format";
import { demoResolve } from "./client";

export type EvidenceKind = "revenue-trend" | "regional-contribution" | "category-contribution" | "device-conversion" | "acquisition";

export interface AssistantAnswer {
  id: string;
  question: string;
  answer: string;
  evidence: EvidenceKind[];
  followUps: string[];
  sources: string[];
}

const march = monthly.find((m) => m.key === "2026-03")!;
const feb = monthly.find((m) => m.key === "2026-02")!;

const intents: Array<{ match: RegExp; build: (q: string) => Omit<AssistantAnswer, "id" | "question"> }> = [
  {
    match: /march|decline|drop|fell|changed in march|why did revenue/i,
    build: () => ({
      answer: `March revenue declined ${Math.abs(facts.marchRevenueChange).toFixed(1)}% compared with February, from ${formatCurrency(feb.revenue, { compact: true })} to ${formatCurrency(march.revenue, { compact: true })}. The largest contributor was the West region, where order volume decreased ${Math.abs(facts.westOrdersChange).toFixed(0)}% and revenue fell ${formatCurrency(Math.abs(facts.westMarchDelta), { compact: true })} — ${facts.westShareOfDecline.toFixed(0)}% of the total decline. Electronics remained stable, while Outdoor continued to grow.`,
      evidence: ["revenue-trend", "regional-contribution", "category-contribution"],
      followUps: ["Which region is underperforming?", "How does mobile conversion compare?", "What changed in Q2?"],
      sources: ["Northstar Sales Data · revenue, orders by month and region", "Comparison: Mar 2026 vs Feb 2026"],
    }),
  },
  {
    match: /region|underperform|west|north|south|east/i,
    build: () => {
      const last = regionalMonthly[regionalMonthly.length - 1];
      return {
        answer: `The West region is the one to watch. It had the sharpest decline of the year in March (${formatChange(facts.westMarchChange)} month-over-month) which made it the only region to lose share that month. It recovered in April, but its March orders never returned — the lost volume is still visible in Q1 totals. In June the regions contributed: North ${formatCurrency(last.North, { compact: true })}, East ${formatCurrency(last.East, { compact: true })}, West ${formatCurrency(last.West, { compact: true })} and South ${formatCurrency(last.South, { compact: true })}.`,
        evidence: ["regional-contribution", "device-conversion"],
        followUps: ["What changed in March?", "Where should we investigate next?"],
        sources: ["Northstar Sales Data · revenue by region and month"],
      };
    },
  },
  {
    match: /product|category|growth|driving|outdoor|electronics/i,
    build: () => {
      const outdoor = categorySummary.find((c) => c.category === "Outdoor")!;
      const accessories = categorySummary.find((c) => c.category === "Accessories")!;
      return {
        answer: `Outdoor is driving growth: revenue rose ${(outdoor.growth).toFixed(1)}% in Q2 versus Q1, adding ${formatCurrency(outdoor.q2 - outdoor.q1, { compact: true })}. Accessories grew ${(accessories.growth).toFixed(1)}% as an add-on category. Electronics is still the largest category but grew only ${facts.electronicsQoQ.toFixed(1)}%, so its share of revenue is slowly falling.`,
        evidence: ["category-contribution", "revenue-trend"],
        followUps: ["Which region is underperforming?", "What changed this month?"],
        sources: ["Northstar Sales Data · revenue by category, Q1 vs Q2 2026"],
      };
    },
  },
  {
    match: /mobile|desktop|device|conversion/i,
    build: () => ({
      answer: `Mobile converts at 4.32% compared with 5.52% on desktop — a ${facts.mobileGap.toFixed(1)} percentage point gap. Because mobile carries 58% of sessions, it is the largest single conversion opportunity. Closing half the gap would add roughly 6,500 orders a year at current traffic.`,
      evidence: ["device-conversion"],
      followUps: ["Which region is underperforming?", "Where should we investigate next?"],
      sources: ["Northstar Sales Data · sessions and orders by device, FY26"],
    }),
  },
  {
    match: /cac|acquisition|marketing|channel|spend/i,
    build: () => ({
      answer: "Blended customer acquisition cost is $42.18. Paid social is the most expensive channel at $46.18 per customer, about 9% above average. Email and CRM is the most efficient at $31.40.",
      evidence: ["acquisition"],
      followUps: ["How does mobile conversion compare?", "What products are driving growth?"],
      sources: ["Marketing Performance · spend and new customers by channel"],
    }),
  },
  {
    match: /investigate|next|recommend|should we/i,
    build: () => ({
      answer: "Three areas deserve a closer look: (1) mobile checkout in the West region, where the March order decline and the device gap overlap; (2) Outdoor inventory for Q3, given its growth rate; and (3) paid social spend, which is acquiring customers above the blended CAC.",
      evidence: ["regional-contribution", "device-conversion", "category-contribution"],
      followUps: ["What changed in March?", "What products are driving growth?"],
      sources: ["Northstar Sales Data", "Marketing Performance"],
    }),
  },
  {
    match: /this month|june|latest|recent|q2|quarter/i,
    build: () => ({
      answer: `June revenue was ${formatCurrency(monthly[11].revenue, { compact: true })}, ${formatChange(facts.juneRevenueChange)} on May, the third consecutive month of growth. Q2 as a whole closed at ${formatCurrency(facts.q2Revenue, { compact: true })}, ${formatChange(facts.q2Growth)} above Q1.`,
      evidence: ["revenue-trend", "category-contribution"],
      followUps: ["What products are driving growth?", "Which region is underperforming?"],
      sources: ["Northstar Sales Data · monthly revenue, FY26"],
    }),
  },
];

/**
 * Simulated assistant. Matches the question to a known intent and composes an answer
 * from precomputed demo facts. Production: send the question plus a schema summary to
 * an LLM, have it produce a query, run the query against the warehouse, and ask the
 * model to explain only the returned numbers.
 */
export async function askAssistant(question: string): Promise<AssistantAnswer> {
  const intent = intents.find((i) => i.match.test(question));
  const base = intent
    ? intent.build(question)
    : {
        answer:
          "I can answer questions about revenue, regions, categories, device conversion and acquisition in the Northstar demo dataset. Try asking what changed in March, or which region is underperforming.",
        evidence: [] as EvidenceKind[],
        followUps: ["What changed in March?", "Which region is underperforming?", "What products are driving growth?"],
        sources: [],
      };
  return demoResolve({ id: crypto.randomUUID(), question, ...base }, 1100);
}

export const insightService = {
  list: () => demoResolve(insights),
  get: (id: string) => demoResolve(insights.find((i) => i.id === id) ?? null),
};
