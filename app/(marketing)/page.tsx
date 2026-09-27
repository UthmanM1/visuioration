import Link from "next/link";
import { BarChart3, Briefcase, Building2, LineChart, Megaphone, PieChart, Settings2 } from "lucide-react";
import { AiConversation } from "@/components/marketing/ai-conversation";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteractivePreview } from "@/components/marketing/interactive-preview";
import { ProductPreview } from "@/components/marketing/product-preview";
import { ReportCardPreview } from "@/components/marketing/report-card-preview";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { demoBrands } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Turn complex data into clear decisions",
  description: siteConfig.description,
  path: "/",
});

const steps = [
  { n: "01", title: "Import", body: "Upload a CSV or Excel file, or connect a sheet. Columns are typed and profiled on arrival." },
  { n: "02", title: "Understand", body: "See row counts, missing values and the metrics most likely to matter, before you build anything." },
  { n: "03", title: "Visualize", body: "Build charts from dimensions and measures. Every chart can join a dashboard or a report." },
  { n: "04", title: "Decide", body: "Ask what changed, read the explanation with its evidence, and share a report people can act on." },
];

const teams = [
  { icon: BarChart3, title: "Business intelligence", body: "Governed datasets and dashboards that everyone reads the same way." },
  { icon: Megaphone, title: "Marketing analytics", body: "Acquisition cost, conversion and channel mix on one timeline." },
  { icon: Briefcase, title: "Executive reporting", body: "Quarterly reviews built from live charts, not pasted screenshots." },
  { icon: Settings2, title: "Operations", body: "Regional throughput and service levels, with exceptions surfaced early." },
  { icon: Building2, title: "Consulting", body: "One living report per client, shared as a link that updates itself." },
  { icon: LineChart, title: "Financial analysis", body: "Variance to plan and period comparisons without spreadsheet reconciliation." },
];

const flow = ["Data", "Analysis", "Dashboard", "Insights", "Report"];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Explorer plan (demo)" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="grid-paper relative overflow-hidden border-b border-line">
        <div className="container-page pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] grid-cols-1">
            <h1 className="font-display text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[4rem] lg:text-[4.75rem]">
              Turn complex data into clear decisions.
            </h1>
            <div className="lg:pb-2">
              <p className="max-w-md text-lg leading-relaxed text-ink-muted">
                Visuioration transforms business data into interactive visualizations, intelligent insights, and presentation-ready reports.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg">Start exploring</ButtonLink>
                <ButtonLink href="/app" variant="secondary" size="lg">View demo</ButtonLink>
              </div>
            </div>
          </div>
          <div className="mt-12 sm:mt-16">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section aria-labelledby="trusted" className="border-b border-line bg-surface py-10">
        <div className="container-page flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="trusted" className="text-sm font-semibold text-ink">Built for teams that work with data</h2>
            <p className="text-[12px] text-ink-faint">Illustrative demo brands, not real customers.</p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {demoBrands.map((brand, i) => (
              <li key={brand} className={i % 2 ? "font-display text-[17px] font-semibold tracking-[-0.02em] text-ink-muted" : "text-[15px] font-bold uppercase tracking-[0.08em] text-ink-faint"}>
                {brand}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section>
        <SectionHeading title="From raw data to decisions" body="Four steps, in the order analysts actually work. Each one hands its output to the next." />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 grid-cols-1">
          {steps.map((s) => (
            <li key={s.n} className="bg-surface p-6">
              <span className="tnum font-display text-3xl font-semibold text-petrol-600">{s.n}</span>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] grid-cols-1">
          <SectionHeading title="Built for modern data teams" body="The same workspace serves the analyst building the model and the executive reading the conclusion." />
          <ul className="grid gap-x-10 sm:grid-cols-2 grid-cols-1">
            {teams.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 border-t border-line py-5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-petrol-600" aria-hidden />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Try the workspace from here" body="Switch views and metrics below. This is the same demo data you will find inside the app." />
        <div className="mt-10">
          <InteractivePreview />
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid items-center gap-12 lg:grid-cols-2 grid-cols-1">
          <div>
            <SectionHeading title="Ask your data questions." body="Ask in plain language. Every answer names the period, the comparison and the numbers it used, with the charts that support it." />
            <ButtonLink href="/app/insights" variant="secondary" className="mt-8" icon={<PieChart className="h-4 w-4" aria-hidden />}>
              Open AI insights
            </ButtonLink>
          </div>
          <AiConversation />
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-14 lg:grid-cols-2 grid-cols-1">
          <ReportCardPreview />
          <div>
            <SectionHeading title="Build reports people actually understand" body="Reports are built from sections: summary, KPIs, charts, insights and recommendations. Numbers in the text come from the same data as the charts, so they never drift apart." />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/app/reports/q2-executive-review">Open sample report</ButtonLink>
              <ButtonLink href="/share/q2-performance" variant="secondary">View shared version</ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="night">
        <SectionHeading inverted title="One workspace for visual intelligence" body="No exporting between tools. Each stage reads from the one before it." />
        <ol className="mt-12 flex flex-col gap-3 md:flex-row md:items-stretch">
          {flow.map((step, i) => (
            <li key={step} className="flex flex-1 items-center gap-3 md:flex-col md:items-stretch">
              <div className="flex-1 rounded-xl border border-night-line bg-night-2 px-4 py-5">
                <p className="tnum text-2xs text-white/40">Stage {i + 1}</p>
                <p className="mt-1 text-lg font-semibold">{step}</p>
              </div>
              {i < flow.length - 1 ? <span className="text-white/30 md:hidden" aria-hidden>↓</span> : null}
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-white/60">
          Read how it is put together on the <Link href="/technology" className="text-white underline underline-offset-4">technology page</Link> or in the <Link href="/case-study" className="text-white underline underline-offset-4">case study</Link>.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
