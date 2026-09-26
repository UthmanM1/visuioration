import Link from "next/link";
import { DemoContinue } from "@/components/auth/demo-continue";
import { SignupForm } from "@/components/auth/signup-form";
import { DemoTag } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Start exploring", description: "Create a demo Visuioration workspace.", path: "/signup", noIndex: true });

export default function SignupPage() {
  return (
    <>
      <DemoTag>Demo environment</DemoTag>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">Start exploring</h1>
      <p className="mt-2 text-ink-muted">Set up a workspace in a few steps. No account is created; everything stays in this browser.</p>
      <div className="mt-6 space-y-6">
        <SignupForm />
        <div className="flex items-center gap-3 text-[12px] text-ink-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <DemoContinue label="Skip setup, open the demo workspace" />
      </div>
      <p className="mt-8 text-sm text-ink-muted">Already exploring? <Link href="/login" className="font-medium text-petrol-700 underline underline-offset-4">Log in</Link></p>
    </>
  );
}
