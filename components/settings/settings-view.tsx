"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, DemoTag } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { currentUser, datasets, users, workspace } from "@/lib/demo-data";
import { cn, formatNumber } from "@/lib/format";

const sections = [
  { id: "workspace", label: "Workspace" },
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "members", label: "Members" },
  { id: "data", label: "Data" },
  { id: "integrations", label: "Integrations" },
  { id: "billing", label: "Billing" },
] as const;
type SectionId = (typeof sections)[number]["id"];

function Card({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface shadow-panel">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
      {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
    </section>
  );
}

function Toggle({ id, label, description, defaultChecked }: { id: string; label: string; description: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p id={`${id}-label`} className="text-[14px] font-medium">{label}</p>
        <p className="text-[13px] text-ink-muted">{description}</p>
      </div>
      <button role="switch" aria-checked={on} aria-labelledby={`${id}-label`} onClick={() => setOn(!on)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-petrol-600" : "bg-line-strong")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const requested = params.get("section");
  const active: SectionId = sections.some((s) => s.id === requested) ? (requested as SectionId) : "workspace";
  const [saving, setSaving] = useState(false);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast({ tone: "success", title: "Settings saved", body: "Demo: changes last until you reload." });
  }

  const saveButton = <Button type="submit" form={`form-${active}`} loading={saving}>Save changes</Button>;

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr] grid-cols-1">
      <nav aria-label="Settings sections" className="scrollbar-thin -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-1 lg:flex-col">
          {sections.map((s) => (
            <li key={s.id}>
              <button onClick={() => router.replace(`/app/settings?section=${s.id}`, { scroll: false })} aria-current={active === s.id ? "page" : undefined} className={cn("w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-[14px]", active === s.id ? "bg-surface font-medium shadow-panel ring-1 ring-line" : "text-ink-muted hover:text-ink")}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-4">
        {active === "workspace" ? (
          <Card title="Workspace" description="How this workspace appears to members and in shared reports." footer={saveButton}>
            <form id="form-workspace" onSubmit={save} className="grid gap-4 sm:grid-cols-2 grid-cols-1">
              <Field label="Workspace name" htmlFor="ws-name"><Input id="ws-name" defaultValue={workspace.name} /></Field>
              <Field label="Description" htmlFor="ws-desc"><Input id="ws-desc" defaultValue={workspace.description} /></Field>
              <Field label="Fiscal year starts" htmlFor="ws-fy"><Select id="ws-fy" defaultValue="July">{["January", "April", "July", "October"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Currency" htmlFor="ws-cur"><Select id="ws-cur" defaultValue="USD ($)"><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></Select></Field>
            </form>
          </Card>
        ) : null}
        {active === "profile" ? (
          <Card title="Profile" footer={saveButton}>
            <form id="form-profile" onSubmit={save} className="space-y-4">
              <div className="flex items-center gap-4"><Avatar user={currentUser} size="lg" /><div><p className="font-medium">{currentUser.name}</p><p className="text-[13px] text-ink-muted">{currentUser.title}</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2 grid-cols-1">
                <Field label="Full name" htmlFor="pf-name"><Input id="pf-name" defaultValue={currentUser.name} autoComplete="name" /></Field>
                <Field label="Email" htmlFor="pf-email" hint="Demo address, not a real inbox."><Input id="pf-email" type="email" defaultValue={currentUser.email} autoComplete="email" /></Field>
                <Field label="Job title" htmlFor="pf-title"><Input id="pf-title" defaultValue={currentUser.title} /></Field>
                <Field label="Time zone" htmlFor="pf-tz"><Select id="pf-tz" defaultValue="Europe/London"><option>Europe/London</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Asia/Singapore</option></Select></Field>
              </div>
            </form>
          </Card>
        ) : null}
        {active === "notifications" ? (
          <Card title="Notifications" description="Choose what Visuioration tells you about." footer={saveButton}>
            <form id="form-notifications" onSubmit={save} className="divide-y divide-line">
              <Toggle id="n-insights" label="New AI insights" description="When a refresh surfaces a new insight." defaultChecked />
              <Toggle id="n-reports" label="Report activity" description="When a report you own is viewed, commented on or shared." defaultChecked />
              <Toggle id="n-data" label="Dataset issues" description="When a refresh fails or data needs review." defaultChecked />
              <Toggle id="n-digest" label="Weekly digest" description="A Monday summary of KPIs and changes." />
            </form>
          </Card>
        ) : null}
        {active === "security" ? (
          <Card title="Security" description="What a production version would provide. None of this is active in the demo.">
            <div className="divide-y divide-line">
              {[["Two-step verification", "Protect sign-in with an authenticator app."], ["Single sign-on (SSO)", "Sign in through your identity provider (Enterprise)."], ["Session management", "See and revoke active sessions."], ["Audit log", "Record of sign-ins, exports and permission changes."]].map(([t, d]) => (
                <div key={t} className="flex items-center justify-between gap-4 py-3">
                  <div><p className="text-[14px] font-medium">{t}</p><p className="text-[13px] text-ink-muted">{d}</p></div>
                  <Badge tone="outline">Not in demo</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-md bg-paper px-3 py-2 text-[12px] text-ink-muted">This demo uses published credentials and stores nothing on a server. See the <Link href="/technology" className="underline underline-offset-2">technology page</Link> for the proposed controls.</p>
          </Card>
        ) : null}
        {active === "members" ? (
          <Card title="Members" description={`${users.length} people in this workspace.`}>
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <Avatar user={u} />
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{u.name}</p><p className="truncate text-[12px] text-ink-muted">{u.email}</p></div>
                  <Badge tone="outline">{u.role}</Badge>
                </li>
              ))}
            </ul>
            <ButtonLink href="/app/team" variant="secondary" className="mt-4">Manage team</ButtonLink>
          </Card>
        ) : null}
        {active === "data" ? (
          <Card title="Data" description="Refresh schedules and retention for connected datasets.">
            <ul className="divide-y divide-line">
              {datasets.map((d) => (
                <li key={d.slug} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-[14px] font-medium">{d.name}</p><p className="tnum text-[12px] text-ink-muted">{formatNumber(d.rows)} rows · {d.source}</p></div>
                  <label className="flex items-center gap-2 text-[13px]"><span className="text-ink-muted">Refresh</span>
                    <Select aria-label={`Refresh schedule for ${d.name}`} defaultValue={d.source === "CSV upload" ? "Manual" : "Daily"} className="h-9 w-32"><option>Manual</option><option>Hourly</option><option>Daily</option><option>Weekly</option></Select>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {active === "integrations" ? (
          <Card title="Integrations" description="Connections are demonstrations; no credentials are requested.">
            <ul className="grid gap-3 sm:grid-cols-2 grid-cols-1">
              {[["Google Sheets", "Sync sheets as datasets", true], ["Snowflake", "Query warehouse tables", false], ["PostgreSQL", "Connect a read replica", false], ["Slack", "Send insights to a channel", true], ["HubSpot", "Import marketing data", false], ["REST API", "Pull JSON from any endpoint", false]].map(([name, d, connected]) => (
                <li key={String(name)} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                  <div><p className="text-[14px] font-medium">{name}</p><p className="text-[12px] text-ink-muted">{d}</p></div>
                  {connected ? <Badge tone="petrol" dot>Demo connected</Badge> : <Button size="sm" variant="secondary" onClick={() => toast({ tone: "info", title: `${name} is not available in the demo`, body: "A production build would open an OAuth or credentials flow here." })}>Connect</Button>}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {active === "billing" ? (
          <Card title="Billing" description="No billing is connected. Plans shown for illustration.">
            <div className="flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2"><p className="font-semibold">Business plan</p><DemoTag>Demo</DemoTag></div><p className="tnum mt-0.5 text-[13px] text-ink-muted">4 editors · $99 per user per month (illustrative)</p></div>
              <ButtonLink href="/pricing" variant="secondary">Compare plans</ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">Invoices and payment methods would appear here once a payment provider is connected.</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
