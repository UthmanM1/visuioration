import Link from "next/link";
import { BarChart3, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { getUser } from "@/lib/demo-data";

export const metadata = { title: "Shared" };

const items = [
  { title: "Q2 Executive Performance Review", kind: "Report", icon: FileText, by: "alex", with: "Anyone with the link", when: "8 min ago", href: "/app/reports/q2-executive-review", external: "/share/q2-performance", views: 42 },
  { title: "Regional Performance", kind: "Visualization", icon: BarChart3, by: "sarah", with: "Priya Shah, Marcus Reed", when: "2 hours ago", href: "/app/visualizations/new?from=regional-performance", views: 9 },
  { title: "West region revenue declined in March", kind: "Insight", icon: Sparkles, by: "priya", with: "Leadership group", when: "Today, 10:40", href: "/app/insights/west-region-decline", views: 14 },
  { title: "Customer Acquisition", kind: "Visualization", icon: BarChart3, by: "marcus", with: "Marketing team", when: "2 days ago", href: "/app/visualizations/new?from=customer-acquisition", views: 6 },
];

export default function SharedPage() {
  return (
    <>
      <PageHeader title="Shared" description="Everything shared from this workspace, and who can see it." />
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-panel">
        <ul className="divide-y divide-line">
          {items.map((it) => {
            const by = getUser(it.by)!;
            const Icon = it.icon;
            return (
              <li key={it.title} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-petrol-50 text-petrol-600"><Icon className="h-4 w-4" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <Link href={it.href} className="font-medium hover:text-petrol-700">{it.title}</Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-muted">
                    <Badge tone="outline">{it.kind}</Badge> Shared with {it.with}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-ink-muted">
                  <span className="flex items-center gap-1.5"><Avatar user={by} size="sm" />{by.name.split(" ")[0]}, {it.when.toLowerCase()}</span>
                  <span className="tnum">{it.views} views</span>
                  {it.external ? <Link href={it.external} className="flex items-center gap-1 font-medium text-petrol-700" aria-label={`Open shared link for ${it.title}`}><ExternalLink className="h-3.5 w-3.5" aria-hidden />Link</Link> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
