import { CheckCircle2 } from "lucide-react";
import { Assistant } from "@/components/insights/assistant";
import { LiveAssistant } from "@/components/insights/live-assistant";
import { InsightCard } from "@/components/insights/insight-card";
import { PageHeader } from "@/components/ui/page-header";
import { isAiConfigured } from "@/lib/ai/config";
import { suggestedQuestions } from "@/lib/ai/pipeline";
import { insights } from "@/lib/demo-data";
import { requireSession } from "@/lib/services/session";

export const metadata = { title: "AI Insights" };

// Answering a question makes up to four model calls plus database queries.
export const maxDuration = 60;

const STAGES = [
  ["Understands your data", "Reads column names, types and ranges; never the rows."],
  ["Plans the queries", "Turns the question into structured queries using only real columns."],
  ["Validates them", "Checks every query with the same rules as the chart builder."],
  ["Runs them in the database", "With your permissions, so it only sees your workspace."],
  ["Explains the results", "Writes a short answer using only the numbers the queries returned."],
  ["Checks every number", "Numbers that can't be traced to a result are rejected."],
];

export default async function InsightsPage() {
  const session = await requireSession();
  if (session.mode === "live") {
    const suggestions = await suggestedQuestions(session.workspace.id);
    return (
      <>
        <PageHeader title="AI Insights" description="Ask questions in plain language. Answers come with the queries, figures and charts behind them." />
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] grid-cols-1">
          <LiveAssistant key={session.workspace.id} configured={isAiConfigured} suggestions={suggestions} hasData={suggestions.length > 0} />
          <section aria-labelledby="how-it-works" className="h-fit rounded-panel border border-line bg-surface p-5">
            <h2 id="how-it-works" className="text-[15px] font-semibold">How answers are made</h2>
            <ol className="mt-4 space-y-3">
              {STAGES.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-petrol-50 text-[12px] font-semibold text-petrol-700">{i + 1}</span>
                  <div>
                    <p className="text-[13px] font-medium">{title}</p>
                    <p className="text-[12px] text-ink-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-petrol-600" aria-hidden />If the wording can&apos;t be verified, you get a plain summary built from the computed figures instead.</p>
          </section>
        </div>
      </>
    );
  }

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
