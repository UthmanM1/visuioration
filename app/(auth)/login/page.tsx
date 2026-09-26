import Link from "next/link";
import { DemoContinue } from "@/components/auth/demo-continue";
import { DemoCredentials } from "@/components/auth/demo-credentials";
import { LoginForm } from "@/components/auth/login-form";
import { DemoTag } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Log in", description: "Log in to the Visuioration demo environment.", path: "/login", noIndex: true });

export default function LoginPage() {
  return (
    <>
      <DemoTag>Demo environment</DemoTag>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">Log in</h1>
      <p className="mt-2 text-ink-muted">Use the demo account below, or skip straight into the workspace.</p>
      <div className="mt-6 space-y-6">
        <DemoContinue />
        <div className="flex items-center gap-3 text-[12px] text-ink-faint"><span className="h-px flex-1 bg-line" />or sign in with the demo account<span className="h-px flex-1 bg-line" /></div>
        <DemoCredentials />
        <LoginForm />
      </div>
      <p className="mt-8 text-sm text-ink-muted">New here? <Link href="/signup" className="font-medium text-petrol-700 underline underline-offset-4">Create a demo workspace</Link></p>
    </>
  );
}
