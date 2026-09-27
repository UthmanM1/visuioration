import { redirect } from "next/navigation";
import { ResetForm } from "@/components/auth/reset-form";
import { pageMetadata } from "@/lib/seo";
import { appMode } from "@/lib/supabase/config";

export const metadata = pageMetadata({ title: "Choose a new password", description: "Set a new Visuioration password.", path: "/reset-password", noIndex: true });

export default function ResetPasswordPage() {
  if (appMode !== "live") redirect("/forgot-password");
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">Choose a new password</h1>
      <p className="mt-2 text-ink-muted">You&apos;re signed in from your reset link. Pick a new password to finish.</p>
      <div className="mt-6">
        <ResetForm />
      </div>
    </>
  );
}
