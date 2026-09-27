import { Check } from "lucide-react";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { PageHero, Section } from "@/components/marketing/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Pricing", description: "Explorer, Professional, Business and Enterprise plans for Visuioration. Demo pricing, no billing connected.", path: "/pricing" });

const faqs = [
  ["Is billing live?", "No. Visuioration is a product concept, and these prices illustrate how the product would be packaged. Nothing is charged."],
  ["What counts as a user?", "Anyone who can edit in a workspace. Viewers of shared report links are free and unlimited."],
  ["Can I change plans later?", "In a production version, yes: upgrades would apply immediately and downgrades at the end of the billing period."],
  ["Where would my data be stored?", "The sample-data demo keeps everything in your browser. In live mode, data is stored in the deployment's own Supabase project (Postgres and private Storage). See the technology page."],
];

export default function PricingPage() {
  return (
    <>
      <PageHero title="Priced per editor. Viewers are free." body="Start with the Explorer plan and the demo datasets. Prices shown are illustrative; no billing is connected." />
      <Section>
        <PricingToggle />
        <div className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="mb-4 text-left text-lg font-semibold">Compare plans</caption>
            <thead className="border-b border-line-strong text-ink-muted">
              <tr>
                <th scope="col" className="py-3 pr-4 font-medium">Capability</th>
                {["Explorer", "Professional", "Business", "Enterprise"].map((p) => (
                  <th key={p} scope="col" className="px-4 py-3 font-medium">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Projects", "3", "Unlimited", "Unlimited", "Unlimited"],
                ["AI insights", "—", "Included", "Included", "Included"],
                ["Report builder", "Basic", "Full", "Full", "Full"],
                ["Custom branding", "—", "—", "Planned", "Planned"],
                ["Audit history", "—", "—", "Planned", "Planned"],
                ["SSO", "—", "—", "—", "Planned"],
                ["API access", "—", "—", "—", "Planned"],
              ].map(([cap, ...vals]) => (
                <tr key={cap} className="border-b border-line">
                  <th scope="row" className="py-3 pr-4 font-medium">{cap}</th>
                  {vals.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-ink-soft">
                      {v === "Included" ? <Check className="h-4 w-4 text-petrol-600" aria-label="Included" /> : v === "—" ? <span aria-label="Not included" className="text-ink-faint">—</span> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section tone="surface">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}
                <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 max-w-2xl text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
