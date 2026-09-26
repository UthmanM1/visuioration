import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, Section } from "@/components/marketing/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "About", description: "Visuioration is a product concept demonstrating how analytics, visualization and AI-assisted workflows come together in one workspace.", path: "/about" });

const principles = [
  ["Clarity", "A chart has one job. If a reader cannot say what it shows in a sentence, it needs a better title or a different chart."],
  ["Hierarchy", "The answer comes first, the evidence second, the detail last."],
  ["Speed", "Analysis loses value by the day. The path from import to shared report should take minutes."],
  ["Trust", "Every number can be traced to its source. AI explanations show their working."],
  ["Actionability", "Every report ends with what to do or investigate next."],
];

export default function AboutPage() {
  return (
    <>
      <PageHero title="Complex information, made easier to understand." body="Visuioration is a product concept demonstrating how modern analytics, visualization, and AI-assisted workflows can come together in one workspace." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] grid-cols-1">
          <div className="prose-body">
            <h2 className="mb-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Why it exists</h2>
            <p>Most organisations do not lack data. They lack the time between receiving a number and understanding it. Analysts rebuild the same charts every month, leaders read decks assembled from screenshots, and the question &ldquo;why did this change?&rdquo; takes a week to answer.</p>
            <p>Visuioration explores a different arrangement: one workspace where the dataset, the chart, the explanation and the report are connected, so a change in one carries through to the others.</p>
            <p>This site and its demo workspace are a portfolio project. The company, its customers and its team are fictional; the product design and the working software are real.</p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Principles</h2>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {principles.map(([t, b]) => (
                <div key={t} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-6 grid-cols-1">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="text-ink-muted">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
