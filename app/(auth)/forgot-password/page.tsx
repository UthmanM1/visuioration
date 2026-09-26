import Link from "next/link";
import { ForgotForm } from "@/components/auth/forgot-form";
import { DemoTag } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Reset password", description: "Password reset for the Visuioration demo environment.", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage() {
  return (
    <>
      <DemoTag>Demo environment</DemoTag>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em]">Reset your password</h1>
      <p className="mt-2 text-ink-muted">Enter your email and we will show the confirmation step. No email is sent in the demo; the demo password is always <strong className="text-ink">demo</strong>.</p>
      <div className="mt-6">
        <ForgotForm />
      </div>
      <p className="mt-8 text-sm text-ink-muted"><Link href="/login" className="font-medium text-petrol-700 underline underline-offset-4">Back to log in</Link></p>
    </>
  );
}
