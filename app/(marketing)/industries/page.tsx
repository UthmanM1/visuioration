import Link from "next/link";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, Section } from "@/components/marketing/section";
import { industries } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Industries", description: "How retail, finance, marketing and operations teams use Visuioration.", path: "/industries" });

export default function IndustriesPage() {
  return (
    <>
      <PageHero title="Different questions, the same need for clarity." body="Every team measures something different. The workflow from data to decision stays the same." />
      <Section>
        <div className="grid gap-5 md:grid-cols-2 grid-cols-1">
          {industries.map((ind) => (
            <Link key={ind.slug} href={`/industries/${ind.slug}`} className="group flex flex-col rounded-panel border border-line bg-surface p-6 transition-colors hover:border-petrol-500 sm:p-8">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] group-hover:text-petrol-700">{ind.name}</h2>
              <p className="mt-2 text-ink-muted">{ind.summary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {ind.metrics.map((m) => (
                  <li key={m} className="rounded-full bg-paper px-2.5 py-1 text-[12px] text-ink-soft">{m}</li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
