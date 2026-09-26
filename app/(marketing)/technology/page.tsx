import { ArchitectureDiagram } from "@/components/marketing/architecture-diagram";
import { PageHero, Section, SectionHeading } from "@/components/marketing/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Technology", description: "The demo implementation of Visuioration and the proposed production architecture, clearly separated.", path: "/technology" });

const steps = [
  { label: "User", detail: "Browser on desktop, tablet or mobile" },
  { label: "Visuioration web application", detail: "Next.js, React, TypeScript" },
  { label: "Authentication", detail: "Identity provider, SSO for Enterprise" },
  { label: "API / application layer", detail: "Validated, rate-limited service endpoints" },
  { label: "Database", detail: "PostgreSQL for metadata; warehouse for datasets" },
  { label: "Secure file storage", detail: "Object storage for uploads and exports" },
  { label: "AI services", detail: "LLM explains results computed by queries" },
  { label: "Analytics", detail: "Product events without personal data" },
];

const layers = [
  { name: "Frontend", demo: "Next.js App Router with server components for marketing pages and client components for interactive charts. Recharts for visualization.", prod: "Same frontend, with routes under /app protected by middleware and data fetched from the API layer." },
  { name: "Data layer", demo: "Centralised demo data in /lib/demo-data. Every figure is derived from one monthly ledger, so totals agree across pages.", prod: "PostgreSQL (or Supabase) for workspaces, projects and reports; a columnar warehouse for dataset rows and aggregation queries." },
  { name: "AI layer", demo: "A rule-based simulated assistant that composes answers from precomputed facts. No model is called.", prod: "An LLM receives the question and a schema summary, proposes a query, the server runs it, and the model explains only the returned numbers." },
  { name: "Storage", demo: "Imports are simulated; no files leave the browser.", prod: "Signed uploads to object storage, virus scanning, then a parsing and profiling job." },
  { name: "Security", demo: "Demo-only sign-in with published credentials. No sessions, tokens or personal data.", prod: "See the proposed controls below." },
  { name: "Monitoring", demo: "None beyond the browser console.", prod: "Error tracking, uptime checks, structured logs and alerting on failed refreshes." },
  { name: "Integrations", demo: "CSV, Excel, Google Sheets and API sources are demonstrated in the import flow only.", prod: "Connectors with OAuth, scheduled refresh and per-source credentials held in a secrets manager." },
];

const controls = ["Authentication", "Role-based access control", "Encryption in transit and at rest", "Secure data storage", "Audit logging", "API validation", "Rate limiting", "Secrets management", "Backups", "Monitoring", "Data retention policies"];

export default function TechnologyPage() {
  return (
    <>
      <PageHero title="Designed for serious data workflows." body="What the demo does today, and how a production version would be built. The two are kept separate on purpose." />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] grid-cols-1">
          <SectionHeading title="Proposed production architecture" body="Requests move top to bottom. The AI layer never computes figures itself; it explains results the database has already calculated." />
          <ArchitectureDiagram steps={steps} />
        </div>
      </Section>
      <Section tone="surface">
        <SectionHeading title="Demo implementation vs production architecture" />
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Comparison of demo implementation and production architecture by layer</caption>
            <thead className="border-b border-line-strong">
              <tr>
                <th scope="col" className="w-40 py-3 pr-6 font-semibold">Layer</th>
                <th scope="col" className="py-3 pr-6 font-semibold">Demo implementation</th>
                <th scope="col" className="py-3 font-semibold">Production architecture (proposed)</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.name} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pr-6 font-medium">{l.name}</th>
                  <td className="py-4 pr-6 text-ink-muted">{l.demo}</td>
                  <td className="py-4 text-ink-soft">{l.prod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 grid-cols-1">
          <SectionHeading title="Security, stated honestly" body="Visuioration holds no certifications and makes no compliance claims. These are the controls a production build would need, not controls that exist in this demo." />
          <ul className="grid gap-2 sm:grid-cols-2 grid-cols-1">
            {controls.map((c) => (
              <li key={c} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                {c}
                <span className="text-2xs text-ink-faint">Proposed</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
