import { TeamTable } from "@/components/team/team-table";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team" description="People in the Northstar Retail Group workspace and what they can do." />
      <TeamTable />
      <section aria-labelledby="roles" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 grid-cols-1">
        <h2 id="roles" className="sr-only">Role permissions</h2>
        {[
          ["Owner", "Manages billing, members and every project."],
          ["Analyst", "Imports data, builds visualizations and reports."],
          ["Marketing", "Edits marketing projects and campaign reports."],
          ["Executive", "Views and comments on dashboards and reports."],
        ].map(([r, d]) => (
          <div key={r} className="rounded-panel border border-line bg-surface p-4">
            <p className="text-[13px] font-semibold">{r}</p>
            <p className="mt-1 text-[13px] text-ink-muted">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
