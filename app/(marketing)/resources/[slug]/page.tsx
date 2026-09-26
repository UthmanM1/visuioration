import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/marketing/cta-band";
import { articles } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = articles.find((x) => x.slug === params.slug);
  if (!a) return {};
  return pageMetadata({ title: a.title, description: a.summary, path: `/resources/${a.slug}` });
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = articles.find((a) => a.slug === params.slug);
  if (!article) notFound();
  const related = articles.filter((a) => a.slug !== article.slug).slice(0, 3);
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.summary, datePublished: article.date, author: { "@type": "Organization", name: "Visuioration" }, mainEntityOfPage: absoluteUrl(`/resources/${article.slug}`) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="container-page py-14 sm:py-20">
        <nav aria-label="Breadcrumb" className="text-[13px] text-ink-muted">
          <Link href="/resources" className="hover:text-ink">Resources</Link> <span aria-hidden>/</span> {article.category}
        </nav>
        <header className="mt-6 max-w-3xl">
          <h1 className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[3rem]">{article.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{article.summary}</p>
          <p className="mt-5 text-[13px] text-ink-faint">Visuioration editorial, {article.date}, {article.readTime}</p>
        </header>
        <div className="prose-body mt-12 max-w-[68ch] border-t border-line pt-10">
          {article.sections.map((s) => (
            <section key={s.heading} className="mb-8">
              <h2 className="mb-3 text-xl font-semibold tracking-[-0.01em]">{s.heading}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
        <aside className="mt-16 border-t border-line pt-10" aria-labelledby="related">
          <h2 id="related" className="text-lg font-semibold">Keep reading</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3 grid-cols-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/resources/${r.slug}`} className="block rounded-lg border border-line bg-surface p-4 hover:border-petrol-500">
                  <p className="text-[12px] text-petrol-700">{r.category}</p>
                  <p className="mt-1 font-medium">{r.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </article>
      <CtaBand />
    </>
  );
}
