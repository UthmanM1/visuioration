import Link from "next/link";
import { notFound } from "next/navigation";
import { AiConversation } from "@/components/marketing/ai-conversation";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteractivePreview } from "@/components/marketing/interactive-preview";
import { ReportCardPreview } from "@/components/marketing/report-card-preview";
import { PageHero, Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { solutions } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return solutions.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const s = solutions.find((x) => x.slug === params.slug);
  if (!s) return {};
  return pageMetadata({ title: s.name, description: s.summary, path: `/solutions/${s.slug}` });
}

const demoLinks: Record<string, { href: string; label: string }> = {
  "data-visualization": { href: "/app/visualizations/new", label: "Open the visualization builder" },
  "ai-insights": { href: "/app/insights", label: "Ask the demo a question" },
  reporting: { href: "/app/reports/new", label: "Build a report" },
  "data-storytelling": { href: "/app/reports/q2-executive-review", label: "Read a sample report" },
};

export default function SolutionPage({ params }: { params: { slug: string } }) {
  const solution = solutions.find((s) => s.slug === params.slug);
  if (!solution) notFound();
  const link = demoLinks[solution.slug];
  return (
    <>
      <PageHero title={solution.summary} body={solution.intro}>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={link.href}>{link.label}</ButtonLink>
          <ButtonLink href="/solutions" variant="secondary">All solutions</ButtonLink>
        </div>
      </PageHero>
      <Section>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] grid-cols-1">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">{solution.name}, in practice</h2>
            <dl className="mt-6 space-y-6">
              {solution.points.map((p) => (
                <div key={p.title} className="border-l-2 border-petrol-200 pl-4">
                  <dt className="font-semibold">{p.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>{solution.slug === "ai-insights" ? <AiConversation /> : solution.slug === "reporting" || solution.slug === "data-storytelling" ? <ReportCardPreview /> : <InteractivePreview />}</div>
        </div>
      </Section>
      <Section tone="surface">
        <h2 className="text-lg font-semibold">Other solutions</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {solutions.filter((s) => s.slug !== solution.slug).map((s) => (
            <li key={s.slug}>
              <Link href={`/solutions/${s.slug}`} className="inline-block rounded-full border border-line-strong px-4 py-2 text-sm hover:border-petrol-500 hover:text-petrol-700">{s.name}</Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
