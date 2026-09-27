"use client";

import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signUpAction } from "@/lib/actions/auth";

type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;

export function SignupForm({ live = false }: { live?: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: Errors = {};
    if (!name) next.name = "Enter your name so we can greet you in the workspace.";
    if (live && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Enter a valid email address.";
    if (live && password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    if (!live) {
      try {
        window.localStorage.setItem("visuioration.onboarding", JSON.stringify({ name }));
      } catch {
        /* storage unavailable: onboarding still works without persistence */
      }
      router.push("/onboarding");
      return;
    }

    const result = await signUpAction({ name, email, password });
    setLoading(false);
    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }
    if (result.data.signedIn) {
      router.replace("/onboarding");
      router.refresh();
    } else {
      setConfirmEmail(email);
    }
  }

  if (confirmEmail) {
    return (
      <div role="status" className="rounded-panel border border-line bg-surface p-5">
        <MailCheck className="h-6 w-6 text-petrol-600" aria-hidden />
        <p className="mt-3 font-semibold">Confirm your email</p>
        <p className="mt-1 text-sm text-ink-muted">We sent a link to <span className="break-all font-medium text-ink">{confirmEmail}</span>. Open it to finish creating your workspace.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Your name" htmlFor="signup-name" error={errors.name}>
        <Input id="signup-name" name="name" autoComplete="name" placeholder="Alex Morgan" aria-invalid={!!errors.name} aria-describedby={errors.name ? "signup-name-error" : undefined} />
      </Field>
      <Field label="Work email" htmlFor="signup-email" error={errors.email} hint={live ? undefined : "Optional in the demo. Not stored or sent."}>
        <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "signup-email-error" : undefined} />
      </Field>
      {live ? (
        <Field label="Password" htmlFor="signup-password" error={errors.password} hint="At least 8 characters.">
          <Input id="signup-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "signup-password-error" : "signup-password-hint"} />
        </Field>
      ) : null}
      {errors.form ? <p role="alert" className="rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">{errors.form}</p> : null}
      <Button type="submit" size="lg" className="w-full" loading={loading}>{live ? "Create account" : "Continue"}</Button>
    </form>
  );
}
