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
  { name: "Frontend", demo: "Next.js App Router with sample data. Recharts for visualization.", prod: "Implemented: the same Next.js 16 / React 19 frontend, with server components, server actions and a per-request Content-Security-Policy." },
  { name: "Data layer", demo: "Centralised sample data in /lib/demo-data. Every figure is derived from one monthly ledger, so totals agree across pages.", prod: "Implemented: Supabase Postgres with row level security on every table. Chart queries run in the database with the signed-in user's permissions. Not yet: a separate analytical warehouse." },
  { name: "AI layer", demo: "A rule-based simulated assistant that composes answers from precomputed facts. No model is called.", prod: "Implemented (optional, needs an Anthropic API key): the model plans structured queries, the database runs them, and every number in the explanation is checked against the results." },
  { name: "Storage", demo: "Imports are simulated; no files leave the browser.", prod: "Implemented: signed uploads to private Supabase Storage, server-side parsing and profiling, size and content limits, and a scheduled clean-up of orphaned files. Not yet: virus scanning." },
  { name: "Security", demo: "Demo-only sign-in with published credentials. No sessions, tokens or personal data.", prod: "Implemented: Supabase Auth, workspace roles enforced by row level security, least-privilege grants, rate limiting and security headers. See the list below." },
  { name: "Monitoring", demo: "None beyond the browser console.", prod: "Not yet: error tracking, uptime checks and alerting. Server logs only." },
  { name: "Integrations", demo: "CSV, Excel, Google Sheets and API sources are demonstrated in the import flow only.", prod: "Implemented: CSV and Excel upload. Not yet: Google Sheets, databases, APIs and other connectors." },
];

const controls: Array<[string, boolean]> = [
  ["Authentication (Supabase Auth)", true],
  ["Role-based access control", true],
  ["Row level security", true],
  ["Private file storage", true],
  ["Input validation", true],
  ["Rate limiting", true],
  ["Content-Security-Policy", true],
  ["Secrets kept server-side", true],
  ["Audit log of AI questions", true],
  ["Full audit logging", false],
  ["Backups (Supabase plan)", false],
  ["Monitoring and alerting", false],
  ["Data retention policies", false],
  ["Virus scanning of uploads", false],
];

export default function TechnologyPage() {
  return (
    <>
      <PageHero title="Designed for serious data workflows." body="What the sample-data demo does, and what the live product (with Supabase) implements today. The two are kept separate on purpose." />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] grid-cols-1">
          <SectionHeading title="Live architecture" body="Requests move top to bottom. The AI layer never computes figures itself; it explains results the database has already calculated." />
          <ArchitectureDiagram steps={steps} />
        </div>
      </Section>
      <Section tone="surface">
        <SectionHeading title="Demo mode vs live mode" />
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Comparison of demo mode and live mode by layer</caption>
            <thead className="border-b border-line-strong">
              <tr>
                <th scope="col" className="w-40 py-3 pr-6 font-semibold">Layer</th>
                <th scope="col" className="py-3 pr-6 font-semibold">Demo mode (sample data)</th>
                <th scope="col" className="py-3 font-semibold">Live mode (with Supabase)</th>
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
          <SectionHeading title="Security, stated honestly" body="Visuioration holds no certifications and makes no compliance claims. This is what is in place in live mode today, and what is not yet." />
          <ul className="grid gap-2 sm:grid-cols-2 grid-cols-1">
            {controls.map(([c, inPlace]) => (
              <li key={c} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                {c}
                <span className={inPlace ? "text-2xs font-medium text-petrol-700" : "text-2xs text-ink-faint"}>{inPlace ? "In place" : "Not yet"}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
