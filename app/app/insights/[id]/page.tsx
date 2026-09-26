import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Info, Sparkles, TrendingUp } from "lucide-react";
import { EvidencePanel, TrackInsightOpened } from "@/components/insights/insight-detail-view";
import { InsightCard } from "@/components/insights/insight-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoTag } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getUser, insightDetails, insights } from "@/lib/demo-data";

export function generateStaticParams() {
  return insights.map((i) => ({ id: i.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  return { title: insights.find((i) => i.id === params.id)?.title ?? "Insight" };
}

const toneMeta = {
  risk: { label: "Needs attention", icon: AlertTriangle, tone: "rust" as const },
  opportunity: { label: "Opportunity", icon: TrendingUp, tone: "sage" as const },
  neutral: { label: "Observation", icon: Info, tone: "dusk" as const },
};

export default function InsightPage({ params }: { params: { id: string } }) {
  const insight = insights.find((i) => i.id === params.id);
  const detail = insightDetails[params.id];
  if (!insight || !detail) notFound();
  const tone = toneMeta[insight.tone];
  const ToneIcon = tone.icon;
  const others = insights.filter((i) => i.id !== insight.id).slice(0, 3);
  const activityItems = [
    { who: null, text: "Detected by Visuioration Intelligence", time: insight.created },
    { who: getUser("sarah"), text: "Viewed and added a note: “Checking against store traffic.”", time: "Today, 09:12" },
    { who: getUser("priya"), text: "Shared with the leadership channel", time: "Today, 10:40" },
  ];
  return (
    <>
      <TrackInsightOpened id={insight.id} />
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-ink-muted">
        <Link href="/app/insights" className="hover:text-ink">AI Insights</Link> <span aria-hidden>/</span> <span className="text-ink">{insight.category}</span>
      </nav>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={tone.tone}><ToneIcon className="h-3 w-3" aria-hidden />{tone.label}</Badge>
            <DemoTag>Confidence: Demo analysis</DemoTag>
          </div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[2.25rem]">{insight.title}</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{insight.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/app/insights" variant="secondary" icon={<Sparkles className="h-4 w-4" aria-hidden />}>Ask a follow-up</ButtonLink>
          <ButtonLink href="/app/reports/new">Add to report</ButtonLink>
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-surface md:grid-cols-4">
        {[
          ["Impact", insight.impact],
          ["Period", insight.period],
          ["Primary driver", insight.primaryDriver],
          ["Secondary driver", insight.secondaryDriver],
        ].map(([k, v], i) => (
          <div key={k} className={`px-5 py-4 ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
            <dt className="text-[12px] text-ink-muted">{k}</dt>
            <dd className="tnum mt-1 text-[17px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] grid-cols-1">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Evidence" description="Charts computed from Northstar Sales Data" />
            <div className="p-5">
              <EvidencePanel kinds={detail.evidence} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Contributing factors" description="Estimated share of the change explained by each factor" />
            <ul className="space-y-4 p-5">
              {detail.factors.map((f) => (
                <li key={f.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{f.label}</p>
                    <p className="tnum text-[13px] font-semibold">{f.weight}%</p>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-paper" aria-hidden>
                    <div className="h-2 rounded-full bg-petrol-600" style={{ width: `${f.weight}%` }} />
                  </div>
                  <p className="mt-1.5 text-[13px] text-ink-muted">{f.detail}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Related charts" />
            <div className="p-5">
              <EvidencePanel kinds={detail.related} height={200} />
            </div>
          </Panel>
        </div>
        <div className="space-y-4">
          <section aria-labelledby="investigate" className="rounded-panel bg-night p-5 text-white">
            <h2 id="investigate" className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="h-4 w-4 text-amber-100" aria-hidden />Recommended investigation</h2>
            <ol className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-white/85">
              {detail.investigate.map((s, i) => (
                <li key={s} className="flex gap-2"><span className="tnum text-white/45">{i + 1}.</span>{s}</li>
              ))}
            </ol>
          </section>
          <Panel>
            <PanelHeader title="Data points" />
            <dl className="divide-y divide-line px-5 py-2 text-[13px]">
              {detail.dataPoints.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="tnum text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Activity" />
            <ol className="space-y-3 p-5 text-[13px]">
              {activityItems.map((a) => (
                <li key={a.text} className="flex gap-3">
                  {a.who ? <Avatar user={a.who} size="sm" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Sparkles className="h-3 w-3" aria-hidden /></span>}
                  <p>
                    {a.who ? <span className="font-medium">{a.who.name} </span> : null}
                    <span className="text-ink-soft">{a.text}</span>
                    <span className="block text-[11px] text-ink-faint">{a.time}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <section aria-labelledby="more-insights" className="mt-10">
        <h2 id="more-insights" className="mb-3 text-[15px] font-semibold">More insights</h2>
        <ul className="grid gap-3 md:grid-cols-3 grid-cols-1">
          {others.map((o) => <li key={o.id}><InsightCard insight={o} compact /></li>)}
        </ul>
      </section>
    </>
  );
}
