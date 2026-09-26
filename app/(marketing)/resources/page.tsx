import Link from "next/link";
import { PageHero, Section } from "@/components/marketing/section";
import { articles } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Resources", description: "Practical guides on dashboards, KPIs, chart selection, retention and AI-assisted analysis.", path: "/resources" });

export default function ResourcesPage() {
  const [featured, ...rest] = articles;
  return (
    <>
      <PageHero title="Resources" body="Short, practical guides on building dashboards, choosing charts and explaining data to the people who act on it." />
      <Section>
        <Link href={`/resources/${featured.slug}`} className="group grid gap-6 rounded-panel border border-line bg-surface p-6 transition-colors hover:border-petrol-500 sm:p-10 lg:grid-cols-[1.2fr_1fr] grid-cols-1">
          <div>
            <p className="text-[13px] text-petrol-700">{featured.category}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.025em] group-hover:text-petrol-700">{featured.title}</h2>
            <p className="mt-3 text-ink-muted">{featured.summary}</p>
            <p className="mt-6 text-[13px] text-ink-faint">{featured.date}, {featured.readTime}</p>
          </div>
          <div className="grid-paper hidden rounded-lg border border-line lg:block" aria-hidden />
        </Link>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 grid-cols-1">
          {rest.map((a) => (
            <li key={a.slug}>
              <Link href={`/resources/${a.slug}`} className="group flex h-full flex-col rounded-panel border border-line bg-surface p-6 transition-colors hover:border-petrol-500">
                <p className="text-[13px] text-petrol-700">{a.category}</p>
                <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-petrol-700">{a.title}</h2>
                <p className="mt-2 flex-1 text-sm text-ink-muted">{a.summary}</p>
                <p className="mt-5 text-[12px] text-ink-faint">{a.readTime}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
