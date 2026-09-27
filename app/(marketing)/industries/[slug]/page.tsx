import { notFound } from "next/navigation";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteractivePreview } from "@/components/marketing/interactive-preview";
import { PageHero, Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { industries } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const i = industries.find((x) => x.slug === params.slug);
  if (!i) return {};
  return pageMetadata({ title: `Visuioration for ${i.name.toLowerCase()}`, description: i.summary, path: `/industries/${i.slug}` });
}

export default async function IndustryPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const industry = industries.find((i) => i.slug === params.slug);
  if (!industry) notFound();
  return (
    <>
      <PageHero title={`Visuioration for ${industry.name.toLowerCase()}`} body={industry.summary}>
        <ButtonLink href="/app">Explore the demo workspace</ButtonLink>
      </PageHero>
      <Section>
        <div className="grid gap-12 lg:grid-cols-3 grid-cols-1">
          <div>
            <h2 className="text-lg font-semibold">The problem</h2>
            <p className="mt-2 leading-relaxed text-ink-muted">{industry.challenge}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">What teams build</h2>
            <ul className="mt-2 space-y-2">
              {industry.uses.map((u) => (
                <li key={u} className="flex gap-2 text-ink-muted"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-petrol-500" aria-hidden />{u}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Metrics they track</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {industry.metrics.map((m) => (
                <li key={m} className="rounded-full border border-line-strong px-3 py-1 text-sm">{m}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14">
          <InteractivePreview />
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
