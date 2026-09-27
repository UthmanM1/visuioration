import Link from "next/link";
import { ArchitectureDiagram } from "@/components/marketing/architecture-diagram";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Case study", description: "Portfolio case study: designing Visuioration, an AI-powered visual intelligence platform.", path: "/case-study" });

const areas = [
  ["Data workspace", "Datasets are profiled on import: row counts, column types, missing values.", "/app/datasets/northstar-sales"],
  ["Visualization builder", "Dimensions and measures on the left, live preview in the centre, configuration on the right.", "/app/visualizations/new"],
  ["AI insights", "Questions answered with the evidence charts that support them.", "/app/insights"],
  ["Dashboard", "KPIs with comparison periods, a revenue trend and regional drill-down.", "/app"],
  ["Report builder", "Reorderable sections that compose into an executive report.", "/app/reports/new"],
  ["Sharing", "A clean public view with presentation mode, separate from the app.", "/share/q2-performance"],
  ["Team collaboration", "Roles, permissions and activity across the workspace.", "/app/team"],
];

const principles = [
  ["Clarity", "Every chart has a takeaway title and direct labels."],
  ["Hierarchy", "Answer first: KPIs, then trend, then breakdown, then detail."],
  ["Speed", "Keyboard-first command palette and search; server-rendered marketing pages."],
  ["Trust", "Demo data is always labelled. AI answers cite their numbers."],
  ["Actionability", "Insights end in a recommended investigation, reports in next steps."],
];

const flow = ["Data", "Analysis", "Visualization", "AI insights", "Dashboard", "Report", "Share"].map((label) => ({ label, detail: "" }));

export default function CaseStudyPage() {
  return (
    <>
      <header className="border-b border-line bg-night text-white">
        <div className="container-page py-16 sm:py-24">
          <p className="text-sm text-white/60">Portfolio case study</p>
          <h1 className="mt-4 font-display text-[3rem] font-semibold leading-none tracking-[-0.04em] sm:text-[5rem]">Visuioration</h1>
          <p className="mt-5 max-w-xl text-lg text-white/70">An AI-powered visual intelligence platform, designed and built end to end as a working product rather than a set of mockups.</p>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 border-t border-night-line pt-6 text-sm sm:grid-cols-4">
            {[["Role", "Product design, frontend"], ["Scope", "Marketing site + app"], ["Stack", "Next.js, TypeScript"], ["Status", "Working demo"]].map(([k, v]) => (
              <div key={k}>
                <dt className="text-white/45">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2 grid-cols-1">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Challenge</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-muted">Businesses have large amounts of data but struggle to turn it into clear decisions. The gap is not tooling for charts; it is the handoff between analysis, explanation and communication.</p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Approach</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">Combine the six stages people normally spread across tools into one connected workspace:</p>
            <ol className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {["Data ingestion", "Visualization", "AI-assisted analysis", "Dashboard building", "Reporting", "Sharing"].map((s, i) => (
                <li key={s} className="rounded-lg border border-line bg-surface px-3 py-2"><span className="tnum mr-1.5 text-ink-faint">{i + 1}</span>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] grid-cols-1">
          <SectionHeading title="Product architecture" body="The core story, from the user's point of view: I have data, the product helps me understand it, I visualize it, AI explains what changed, I turn it into a report, and I share it." />
          <ArchitectureDiagram steps={flow} />
        </div>
      </Section>

      <Section>
        <SectionHeading title="Key product areas" body="Each area is live in the demo. Open any of them in a new tab." />
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {areas.map(([name, body, href]) => (
            <li key={name} className="grid gap-2 py-5 sm:grid-cols-[220px_1fr_auto] sm:items-center sm:gap-8 grid-cols-1">
              <h3 className="font-semibold">{name}</h3>
              <p className="text-ink-muted">{body}</p>
              <Link href={href} className="text-sm font-medium text-petrol-700 underline underline-offset-4">Open</Link>
            </li>
          ))}
        </ul>
        <div className="mt-14">
          <ProductPreview />
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 lg:grid-cols-2 grid-cols-1">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Design principles</h2>
            <dl className="mt-6 space-y-4">
              {principles.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-4">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-ink-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Technology</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {["Next.js", "React", "TypeScript", "Tailwind CSS", "Recharts", "Lucide icons", "Demo data architecture", "Vercel-ready deployment"].map((t) => (
                <li key={t} className="rounded-full border border-line-strong bg-paper px-3 py-1.5 text-sm">{t}</li>
              ))}
            </ul>
            <p className="mt-6 leading-relaxed text-ink-muted">All figures derive from one monthly ledger in <code className="rounded bg-paper px-1 text-[13px]">/lib/demo-data</code>, and every data call goes through service abstractions in <code className="rounded bg-paper px-1 text-[13px]">/lib/services</code> that can be pointed at a real API later.</p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="rounded-panel border border-amber-500/40 bg-amber-100/40 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Demo vs production</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">This portfolio implementation uses demo/local data and simulated services. Sign-in, imports, AI answers, exports and sharing are demonstrations. A production version would connect authentication, databases, cloud storage, AI providers, analytics and enterprise integrations, as described on the technology page. It is not presented as a production enterprise platform.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/app">Open the demo</ButtonLink>
            <ButtonLink href="/technology" variant="secondary">Read the architecture</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
