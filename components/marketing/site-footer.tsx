import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const groups = [
  { title: "Product", links: [["Data visualization", "/solutions/data-visualization"], ["AI insights", "/solutions/ai-insights"], ["Reporting", "/solutions/reporting"], ["Data storytelling", "/solutions/data-storytelling"], ["Pricing", "/pricing"]] },
  { title: "Industries", links: [["Retail", "/industries/retail"], ["Finance", "/industries/finance"], ["Marketing", "/industries/marketing"], ["Operations", "/industries/operations"]] },
  { title: "Learn", links: [["Resources", "/resources"], ["Customers", "/customers"], ["Technology", "/technology"], ["Case study", "/case-study"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Live demo", "/app"], ["Shared report", "/share/q2-performance"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)] grid-cols-1">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">Turn complex data into clear decisions.</p>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
            Visuioration is a product concept. Companies, people and figures shown are fictional demo content.
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-[13px] font-semibold text-ink">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-ink-muted hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-[12px] text-ink-faint sm:flex-row sm:justify-between">
          <p>© 2026 Visuioration (portfolio concept)</p>
          <p>No real customer data is used anywhere in this demo.</p>
        </div>
      </div>
    </footer>
  );
}
