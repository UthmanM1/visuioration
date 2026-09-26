import { Check, X } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero, Section } from "@/components/marketing/section";
import { DemoTag } from "@/components/ui/badge";
import { caseStudies } from "@/lib/demo-data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Customers", description: "Demo case studies showing how teams move from fragmented spreadsheets to shared visual intelligence.", path: "/customers" });

export default function CustomersPage() {
  return (
    <>
      <PageHero title="What changes when everyone reads the same numbers." body="These are demo case studies with fictional companies. They show the workflow, not real customer results." />
      <Section>
        <div className="space-y-8">
          {caseStudies.map((c) => (
            <article key={c.company} className="overflow-hidden rounded-panel border border-line bg-surface">
              <div className="grid lg:grid-cols-[1.1fr_1fr] grid-cols-1">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <DemoTag>Demo case study</DemoTag>
                    <span className="text-[12px] text-ink-muted">{c.sector}</span>
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em]">{c.company}</h2>
                  <h3 className="mt-6 text-sm font-semibold">Problem</h3>
                  <p className="mt-1 text-ink-muted">{c.problem}</p>
                  <h3 className="mt-5 text-sm font-semibold">Solution</h3>
                  <p className="mt-1 text-ink-muted">{c.solution}</p>
                </div>
                <div className="grid grid-cols-2 border-t border-line bg-paper lg:border-l lg:border-t-0">
                  <div className="p-6 sm:p-8">
                    <h3 className="text-sm font-semibold text-ink-muted">Before</h3>
                    <ul className="mt-4 space-y-3">
                      {c.before.map((b) => (
                        <li key={b} className="flex gap-2 text-sm"><X className="mt-0.5 h-4 w-4 shrink-0 text-rust-500" aria-hidden />{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-l border-line p-6 sm:p-8">
                    <h3 className="text-sm font-semibold text-petrol-700">After</h3>
                    <ul className="mt-4 space-y-3">
                      {c.after.map((a) => (
                        <li key={a} className="flex gap-2 text-sm font-medium"><Check className="mt-0.5 h-4 w-4 shrink-0 text-petrol-600" aria-hidden />{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <CtaBand title="Explore the Northstar workspace yourself." />
    </>
  );
}
