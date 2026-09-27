"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updatePasswordAction } from "@/lib/actions/auth";

export function ResetForm() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Use at least 8 characters.";
    else if (password !== confirm) next.confirm = "The passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    const result = await updatePasswordAction({ password });
    setLoading(false);
    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }
    toast({ tone: "success", title: "Password updated" });
    router.replace("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="New password" htmlFor="new-password" error={errors.password} hint="At least 8 characters.">
        <Input id="new-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "new-password-error" : "new-password-hint"} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirm}>
        <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-password-error" : undefined} />
      </Field>
      {errors.form ? <p role="alert" className="rounded-md bg-rust-100 px-3 py-2 text-[13px] text-rust-700">{errors.form}</p> : null}
      <Button type="submit" size="lg" className="w-full" loading={loading}>Update password</Button>
    </form>
  );
}
