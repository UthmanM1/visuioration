"use client";

import { ArrowLeft, Check, FileSpreadsheet, FileText, Globe, Sheet as SheetIcon, Database } from "lucide-react";
import { useClientValue } from "@/components/ui/use-client-value";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { DemoTag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { completeOnboardingAction } from "@/lib/actions/workspace";
import { cn } from "@/lib/format";

const roles = ["Executive", "Analyst", "Marketing", "Operations", "Consultant", "Other"];
const goals = ["Understand performance", "Build dashboards", "Create reports", "Find trends", "Share insights"];
const sources = [
  { id: "demo", label: "Northstar demo dataset", body: "184,290 retail orders, ready to explore", icon: Database },
  { id: "csv", label: "CSV file", body: "Upload later from Datasets", icon: FileText },
  { id: "excel", label: "Excel workbook", body: "Upload later from Datasets", icon: FileSpreadsheet },
  { id: "sheets", label: "Google Sheets", body: "Demo connection only", icon: SheetIcon },
  { id: "api", label: "API", body: "Demo connection only", icon: Globe },
];
const stepNames = ["Welcome", "Workspace", "Role", "Goal", "Data", "Finish"];

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn("flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors", selected ? "border-petrol-600 bg-petrol-50 text-ink" : "border-line-strong bg-surface hover:border-ink-faint")}
    >
      {children}
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-petrol-600 bg-petrol-600 text-white" : "border-line-strong")} aria-hidden>
        {selected ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

export function OnboardingFlow({ live = false, initialName = "Alex", initialWorkspace = "Northstar Retail Group" }: { live?: boolean; initialName?: string; initialWorkspace?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const savedName = useClientValue(() => {
    if (live) return null;
    try {
      const saved = JSON.parse(window.localStorage.getItem("visuioration.onboarding") ?? "{}");
      return saved.name ? String(saved.name).split(" ")[0] : null;
    } catch {
      return null;
    }
  }, null);
  const name = savedName ?? initialName;
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [source, setSource] = useState("demo");


  const canContinue = [true, workspace.trim().length > 1, !!role, !!goal, !!source, true][step];

  async function next() {
    if (step === stepNames.length - 1) {
      if (live) {
        setSaving(true);
        setSaveError(null);
        const result = await completeOnboardingAction({ workspaceName: workspace, role });
        if (!result.ok) {
          setSaving(false);
          setSaveError(result.error);
          return;
        }
      }
      try {
        window.localStorage.setItem("visuioration.onboarding", JSON.stringify({ name, workspace, role, goal, source, done: true }));
        window.localStorage.removeItem("visuioration.tour-done");
      } catch {
        /* storage unavailable */
      }
      router.push("/app");
      if (live) router.refresh();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Logo />
        <DemoTag>Demo environment</DemoTag>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-lg">
          <nav aria-label="Setup progress">
            <ol className="flex gap-1.5">
              {stepNames.map((s, i) => (
                <li key={s} className="flex-1">
                  <span className={cn("block h-1 rounded-full", i <= step ? "bg-petrol-600" : "bg-line")} aria-hidden />
                  <span className="sr-only">{`${s}${i === step ? " (current step)" : i < step ? " (done)" : ""}`}</span>
                </li>
              ))}
            </ol>
            <p className="tnum mt-3 text-[13px] text-ink-muted">Step {step + 1} of {stepNames.length}</p>
          </nav>
          <section className="mt-6 animate-rise rounded-[18px] border border-line bg-surface p-6 shadow-panel sm:p-8" key={step} aria-live="polite">
            {step === 0 ? (
              <>
                <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">Welcome, {name}.</h1>
                <p className="mt-3 text-ink-muted">Five quick questions and your workspace is ready. You can change every answer later in Settings.</p>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Name your workspace</h1>
                <p className="mt-2 text-ink-muted">Usually your company or team name.</p>
                <Field label="Workspace name" htmlFor="ws-name" className="mt-6">
                  <Input id="ws-name" value={workspace} onChange={(e) => setWorkspace(e.target.value)} data-autofocus />
                </Field>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <h1 id="role-q" className="font-display text-2xl font-semibold tracking-[-0.02em]">What best describes your role?</h1>
                <div role="radiogroup" aria-labelledby="role-q" className="mt-6 grid gap-2 sm:grid-cols-2 grid-cols-1">
                  {roles.map((r) => (
                    <OptionCard key={r} selected={role === r} onClick={() => setRole(r)}>{r}</OptionCard>
                  ))}
                </div>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <h1 id="goal-q" className="font-display text-2xl font-semibold tracking-[-0.02em]">What do you want to do first?</h1>
                <div role="radiogroup" aria-labelledby="goal-q" className="mt-6 grid gap-2">
                  {goals.map((g) => (
                    <OptionCard key={g} selected={goal === g} onClick={() => setGoal(g)}>{g}</OptionCard>
                  ))}
                </div>
              </>
            ) : null}
            {step === 4 ? (
              <>
                <h1 id="src-q" className="font-display text-2xl font-semibold tracking-[-0.02em]">Where is your data?</h1>
                <p className="mt-2 text-ink-muted">Start with the demo dataset; you can import your own format later.</p>
                <div role="radiogroup" aria-labelledby="src-q" className="mt-6 grid gap-2">
                  {sources.map(({ id, label, body, icon: Icon }) => (
                    <OptionCard key={id} selected={source === id} onClick={() => setSource(id)}>
                      <span className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-petrol-600" aria-hidden />
                        <span>
                          <span className="block font-medium">{label}</span>
                          <span className="block text-[12px] text-ink-muted">{body}</span>
                        </span>
                      </span>
                    </OptionCard>
                  ))}
                </div>
              </>
            ) : null}
            {step === 5 ? (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-petrol-50 text-petrol-600"><Check className="h-6 w-6" aria-hidden /></span>
                <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.03em]">Your workspace is ready.</h1>
                <dl className="mt-6 divide-y divide-line rounded-lg border border-line text-sm">
                  {[["Workspace", workspace], ["Role", role], ["First goal", goal], ["Data", sources.find((s) => s.id === source)?.label]].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                {source !== "demo" && !live ? <p className="mt-3 text-[13px] text-ink-muted">The workspace opens with demo data. You can start an import from Datasets.</p> : null}
                {live ? <p className="mt-3 text-[13px] text-ink-muted">Sample Northstar charts stay available on the dashboard while you add your own data.</p> : null}
                {saveError ? <p role="alert" className="mt-3 rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">{saveError}</p> : null}
              </>
            ) : null}
            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft className="h-4 w-4" aria-hidden />}>Back</Button>
              ) : <span />}
              <Button onClick={next} disabled={!canContinue} loading={saving} size="lg">
                {step === 0 ? "Get started" : step === stepNames.length - 1 ? "Open Visuioration" : "Continue"}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
