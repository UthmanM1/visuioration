import Link from "next/link";
import { DemoContinue } from "@/components/auth/demo-continue";
import { DemoCredentials } from "@/components/auth/demo-credentials";
import { LoginForm } from "@/components/auth/login-form";
import { DemoTag } from "@/components/ui/badge";
import { safeNextPath } from "@/lib/redirects";
import { pageMetadata } from "@/lib/seo";
import { appMode } from "@/lib/supabase/config";

export const metadata = pageMetadata({ title: "Log in", description: "Log in to Visuioration.", path: "/login", noIndex: true });

export default async function LoginPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const searchParams = await searchParamsPromise;
  const live = appMode === "live";
  const next = safeNextPath(searchParams.next);
  return (
    <>
      {live ? null : <DemoTag>Demo environment</DemoTag>}
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">Log in</h1>
      <p className="mt-2 text-ink-muted">{live ? "Welcome back. Log in to your workspace." : "Use the demo account below, or skip straight into the workspace."}</p>
      {searchParams.error === "link" ? (
        <p role="alert" className="mt-4 rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">That link has expired or was already used. Log in, or request a new password reset link.</p>
      ) : null}
      <div className="mt-6 space-y-6">
        {live ? (
          <LoginForm live next={next} />
        ) : (
          <>
            <DemoContinue />
            <div className="flex items-center gap-3 text-[12px] text-ink-faint"><span className="h-px flex-1 bg-line" />or sign in with the demo account<span className="h-px flex-1 bg-line" /></div>
            <DemoCredentials />
            <LoginForm next={next} />
          </>
        )}
      </div>
      <p className="mt-8 text-sm text-ink-muted">New here? <Link href="/signup" className="font-medium text-petrol-700 underline underline-offset-4">{live ? "Create an account" : "Create a demo workspace"}</Link></p>
    </>
  );
}
