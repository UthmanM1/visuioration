import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, Section } from "@/components/marketing/section";
import { solutions } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Solutions", description: "Data visualization, AI insights, reporting and data storytelling in one workspace.", path: "/solutions" });

export default function SolutionsPage() {
  return (
    <>
      <PageHero title="Everything between a spreadsheet and a decision." body="Four capabilities that share one dataset, so a chart, its explanation and the report it appears in always agree." />
      <Section>
        <ul className="divide-y divide-line border-y border-line">
          {solutions.map((s, i) => (
            <li key={s.slug}>
              <Link href={`/solutions/${s.slug}`} className="group grid gap-2 py-8 sm:grid-cols-[80px_1fr_1.2fr_auto] sm:items-baseline sm:gap-8 grid-cols-1">
                <span className="tnum text-sm text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] group-hover:text-petrol-700">{s.name}</h2>
                <p className="text-ink-muted">{s.summary}</p>
                <ArrowUpRight className="hidden h-5 w-5 text-ink-faint group-hover:text-petrol-600 sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </>
  );
}
