import { Assistant } from "@/components/insights/assistant";
import { InsightCard } from "@/components/insights/insight-card";
import { PageHeader } from "@/components/ui/page-header";
import { insights } from "@/lib/demo-data";

export const metadata = { title: "AI Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="AI Insights" description="Ask questions in plain language, or review what the workspace has already flagged." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] grid-cols-1">
        <Assistant />
        <section aria-labelledby="detected">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="detected" className="text-[15px] font-semibold">Detected insights</h2>
            <span className="tnum text-[12px] text-ink-muted">{insights.length} this period</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 grid-cols-1">
            {insights.map((i) => (
              <li key={i.id}><InsightCard insight={i} compact /></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
